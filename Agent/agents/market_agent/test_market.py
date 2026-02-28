import sys
import os
# Allow running directly from within the market_agent directory or the root
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from market_agent.graph import market_graph
except ImportError:
    from graph import market_graph

import json

def run_market_test(name, input_dict):
    print(f"\n--- Running Market Intelligence Test: {name} ---")
    
    try:
        initial_state = {"input": input_dict}
        result = market_graph.invoke(initial_state)
        
        report = result.get("final_report")
        if report:
            print(f"Battery ID: {report.battery_id}")
            print(f"Chemistry: {input_dict['chemistry']}")
            print(f"Condition: SoH={input_dict['soh']}%, RUL={input_dict['rul']} cycles, Cycles={input_dict['cycle_count']}, MaxTemp={input_dict['max_temp']}°C")
            print(f"Estimated Market SoH: {report.estimated_soh}%")
            print(f"Trustable Range: ${report.suggested_range_min:,.2f} - ${report.suggested_range_max:,.2f}")
            print(f"Optimal Price: ${report.optimal_price:,.2f}")
            print(f"Seller Asking Price: ${input_dict['seller_asking_price']:,.2f}")
            print(f"Reasoning: {report.reasoning}")
        else:
            print("No Report Generated")
    except Exception as e:
        print(f"Error during test '{name}': {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Case 1: Fair Price (LFP, Good condition, moderate cycles)
    run_market_test("Fair Price Assessment", {
        "battery_id": "MKT-LFP-HP-001",
        "chemistry": "LFP",
        "capacity_kwh": 10.0,
        "soh": 85.0,
        "rul": 2000.0,
        "cycle_count": 800,
        "max_temp": 42.0,
        "seller_asking_price": 700.0
    })

    # Case 2: Overpriced & Thermal Stress (NMC, high temp history)
    run_market_test("Thermal Stress Assessment", {
        "battery_id": "MKT-NMC-STR-002",
        "chemistry": "NMC",
        "capacity_kwh": 15.0,
        "soh": 72.0,
        "rul": 1200.0,
        "cycle_count": 1500,
        "max_temp": 58.0,
        "seller_asking_price": 2200.0
    })

    # Case 3: Bargain (LFP, Low cycles, Excellent health)
    run_market_test("Premium Bargain Assessment", {
        "battery_id": "MKT-LFP-PRM-003",
        "chemistry": "LFP",
        "capacity_kwh": 20.0,
        "soh": 94.0,
        "rul": 2800.0,
        "cycle_count": 350,
        "max_temp": 38.0,
        "seller_asking_price": 1200.0
    })
