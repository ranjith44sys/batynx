from typing import Dict, Any

def scrape_market_data(chemistry: str) -> Dict[str, Any]:
    """
    Simulates a web scraping tool to find real-time demand and supply signals.
    Extracts benchmark $/kWh prices for specific chemistries in India.
    """
    # Benchmarks (Ref: 2025/2026 India Market Trends)
    market_benchmarks = {
        "LFP": {
            "avg_base_price_kwh": 82.0, # USD per kWh (Ref: $81/kWh avg)
            "current_demand": "High"     # Growing demand for BESS/Renewables
        },
        "NMC": {
            "avg_base_price_kwh": 125.0, # USD per kWh
            "current_demand": "Medium"
        }
    }
    
    data = market_benchmarks.get(chemistry, market_benchmarks["LFP"])
    
    return {
        "avg_market_price_per_kwh": data["avg_base_price_kwh"],
        "current_demand_level": data["current_demand"]
    }
