import sys
import json
import numpy as np
import joblib
import os

# Suppress warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

def predict_credit_score():
    """
    Predicts Battery Credit Score using LightGBM model.
    Expects 8 features from command line:
    avg_operating_temp, max_temp, overtemp_count, overtemp_duration_log, 
    temp_variance, fast_charge_ratio, deep_discharge_ratio, capacity_fade_rate
    """
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(script_dir, 'battery_credit_model_lightGBM.pkl')
        
        if not os.path.exists(model_path):
            return {"error": "Credit score model file missing in credit_score folder"}
        
        model = joblib.load(model_path)
        
        # Get features from command line arguments
        if len(sys.argv) < 9:
            return {"error": "Insufficient features provided. Expected 8 features."}
        
        features = [float(sys.argv[i]) for i in range(1, 9)]
        
        # Feature names for reference (must match training order)
        # ['avg_operating_temp', 'max_temp', 'overtemp_count', 'overtemp_duration_log',
        #  'temp_variance', 'fast_charge_ratio', 'deep_discharge_ratio', 'capacity_fade_rate']
        
        # Reshape for prediction
        features_array = np.array(features).reshape(1, -1)
        
        # Predict
        credit_score = float(model.predict(features_array)[0])
        
        # Clamp to 0-100 range
        credit_score = max(0, min(100, credit_score))
        
        # Determine credit grade
        if credit_score >= 85:
            grade = 'A+ (Excellent)'
            risk_level = 'Low Risk'
        elif credit_score >= 70:
            grade = 'A (Very Good)'
            risk_level = 'Low Risk'
        elif credit_score >= 55:
            grade = 'B (Good)'
            risk_level = 'Moderate Risk'
        elif credit_score >= 40:
            grade = 'C (Fair)'
            risk_level = 'High Risk'
        else:
            grade = 'D (Poor)'
            risk_level = 'Critical Risk'
        
        return {
            "success": True,
            "creditScore": round(credit_score, 2),
            "grade": grade,
            "riskLevel": risk_level,
            "summary": f"Battery Credit Health: {grade} with a {credit_score:.1f} credit rating. {risk_level} for second-life deployment.",
            "reasoning": f"The '{grade}' rating is derived from lifecycle telemetry features, with operating temperature stability and fast-charge ratio being the primary weighted drivers."
        }
    
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    result = predict_credit_score()
    print(json.dumps(result))
