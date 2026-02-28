from .schemas import MarketState, MarketIntelligenceReport

def calculate_trustable_price_range(state: MarketState) -> MarketIntelligenceReport:
    """
    Deterministic pricing engine with comprehensive condition assessment.
    Calculates a 'Trustable Range' based on SoH, RUL, Cycle Count, Max Temp, and Market Demand.
    """
    # 1. Calculate Baseline Total Price (Capacity * Market $/kWh)
    market_base_total = state.capacity_kwh * state.avg_market_price_per_kwh
    
    # 2. Condition Multiplier (Base=1.0)
    # A. SoH Factor (Direct linear impact)
    soh_multiplier = state.soh / 100.0
    
    # B. RUL Factor (Discount for low lifetime)
    # Standard Second-life benchmark: 2000 cycles
    rul_multiplier = min(1.0, state.rul / 2000.0)
    
    # C. Cycle Count Penalty (Fatigue penalty for high cycle count)
    # Beyond 1000 cycles, add a 1% penalty every 100 cycles
    cycle_penalty = 1.0
    if state.cycle_count > 1000:
        penalty_steps = (state.cycle_count - 1000) // 100
        cycle_penalty = max(0.8, 1.0 - (penalty_steps * 0.01))
        
    # D. Thermal Stress Penalty (Safety/Durability discount)
    # Temps above 45C indicate moderate stress, above 55C is high stress.
    temp_penalty = 1.0
    if state.max_temp > 55:
        temp_penalty = 0.85 # High thermal stress
    elif state.max_temp > 45:
        temp_penalty = 0.92 # Moderate thermal stress
        
    # E. Combined Condition Factor
    # We weight SoH Heavily (60%), RUL (20%), and secondary metrics (20% total)
    condition_factor = (soh_multiplier * 0.6) + (rul_multiplier * 0.2) + (cycle_penalty * 0.1) + (temp_penalty * 0.1)
    
    adjusted_baseline = market_base_total * condition_factor
    
    # 3. Apply Demand Multiplier
    demand_multipliers = {
        "High": 1.20,
        "Medium": 1.0,
        "Low": 0.80
    }
    demand_factor = demand_multipliers.get(state.current_demand_level, 1.0)
    optimal_price = adjusted_baseline * demand_factor
    
    # 4. Define Trustable Range (+/- 10%)
    range_low = optimal_price * 0.90
    range_high = optimal_price * 1.10
    
    # 5. Determine Verdict
    seller_price = state.seller_asking_price
    if seller_price > range_high:
        verdict = "Overpriced"
        reason = f"Asking price is significantly above the market range (${range_low:,.2f} - ${range_high:,.2f}) given the battery condition (SoH: {state.soh}%, Cycles: {state.cycle_count}, Max Temp: {state.max_temp}°C)."
    elif seller_price < range_low:
        verdict = "Bargain"
        reason = f"Asking price is below the market range. Ideal for cost-sensitive second-life applications."
    else:
        verdict = "Fair"
        reason = "Asking price aligns with current market demand and observed battery condition metrics."
    
    return MarketIntelligenceReport(
        battery_id=state.battery_id,
        estimated_soh=state.soh,
        suggested_range_min=range_low,
        suggested_range_max=range_high,
        optimal_price=optimal_price,
        market_verdict=verdict,
        reasoning=reason
    )

def market_analyst_node(state: dict) -> dict:
    """
    LangGraph node for deterministic pricing assessment.
    """
    # market_state in state is already populated by the scraper node
    input_state = MarketState(**state["market_state"])
    report = calculate_trustable_price_range(input_state)
    return {"final_report": report}
