import sys
import json
import random

def predict_longevity(data):
    """
    Predicts longevity constraints and secondary-life optimizations.
    """
    # Extract features
    soh = data.get('soh', 100)
    cycle_life = data.get('cycle_life_expectancy', 3000)
    avg_dod = data.get('avg_depth_of_discharge', 80)
    
    # Simple logic for longevity optimization
    # Rule of thumb: Higher SoC and higher DoD accelerate aging
    
    rec_max_soc = 90
    if soh < 80:
        rec_max_soc = 80
    elif soh < 90:
        rec_max_soc = 85
        
    optimal_charge_rate = 1.0 # default 1C
    if cycle_life > 4000:
        optimal_charge_rate = 1.2
    elif cycle_life < 2000:
        optimal_charge_rate = 0.5
        
    # Adjustment based on recent usage
    if avg_dod > 90:
        rec_max_soc -= 5
        
    service_interval = 12 # months
    if soh < 75:
        service_interval = 4
    elif soh < 85:
        service_interval = 6
        
    estimated_extension_years = round((soh / 100) * 2.5 + (1 - avg_dod/100) * 1.5, 1)
    
    result = {
        "recommended_max_soc": f"{rec_max_soc}%",
        "optimal_charge_rate": f"{optimal_charge_rate} C",
        "service_interval": f"{service_interval} Months",
        "estimated_life_extension": f"{estimated_extension_years} Years",
        "reasoning": [
            f"SOH of {soh}% indicates a transition to more conservative SoC limits.",
            f"Average DoD of {avg_dod}% suggest reducing peak charge levels to preserve electrode stability.",
            f"Manufacturer cycle life of {cycle_life} permits a maximum charge rate of {optimal_charge_rate}C."
        ]
    }
    
    return result

if __name__ == "__main__":
    try:
        input_data = json.loads(sys.argv[1])
        prediction = predict_longevity(input_data)
        print(json.dumps(prediction))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
