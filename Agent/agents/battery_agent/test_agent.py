import sys
import os

# Add the current directory to sys.path to allow importing from the package
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from battery_agent.schemas import BMSData
from battery_agent.graph import battery_health_graph

def generate_cycle_sequence(count=20):
    """
    Generates a sequence of cycle data for ML input.
    Matches features: ['V_avg', 'V_min', 'V_max', 'I_avg', 'T_avg', 'T_min', 'T_max']
    """
    return [
        {
            "V_avg": 3.7 + (i * 0.001), 
            "V_min": 3.2, 
            "V_max": 4.2,
            "I_avg": 2.5, 
            "T_avg": 30.0 + (i * 0.1), 
            "T_min": 25.0, 
            "T_max": 35.0
        } for i in range(count)
    ]

def run_test(name, data_dict):
    print(f"\n--- Running ML-Integrated Test: {name} ---")
    
    # Ensure a 20-cycle sequence is present for the LSTM model
    if "cycles" not in data_dict:
        data_dict["cycles"] = generate_cycle_sequence(20)
        
    try:
        data = BMSData(**data_dict)
        initial_state = {"input_data": data}
        
        # Invoke the graph
        result = battery_health_graph.invoke(initial_state)
        print(result["final_report_md"])
        
    except Exception as e:
        print(f"❌ Critical Error in Test execution: {e}")
        # import traceback
        # traceback.print_exc()

if __name__ == "__main__":
    # Test with High Temperature Scenario
    print("Initializing Battery Health Assessment Agent...")
    
    run_test("High Temperature Stress", {
        "battery_id": "BT-HT-101",
        "current_temp": 35.0,
        "voltage_anomaly": False
    })
    
    # Test with Standard Scenario
    run_test("Standard Health State", {
        "battery_id": "BT-STD-102",
        "current_temp": 28.0,
        "voltage_anomaly": False
    })

    # Test with Hazardous Scenario
    run_test("Hazardous State (Thermal Breach)", {
        "battery_id": "BT-HAZ-103",
        "current_temp": 65.0,
        "voltage_anomaly": False
    })
