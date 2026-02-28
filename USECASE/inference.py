import sys
import json
import numpy as np
import joblib
import os
import tensorflow as tf

# Suppress tensorflow warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3' 

def get_band_info(soh_decimal):
    """Returns band name and recommendations based on SoH per user requirements."""
    if soh_decimal >= 0.70:
        return 'Band A', 'Home backup, Small solar storage, Off-grid residential loads'
    elif soh_decimal >= 0.55:
        return 'Band B', 'Backup power systems, Telecom auxiliary storage, Emergency or contingency power'
    elif soh_decimal >= 0.40:
        return 'Band C', 'Low-power DC systems, Small electronics backup, Educational or experimental setups'
    else:
        return 'Band D', 'Not suitable for second-life deployment, Requires controlled recycling'

def predict():
    try:
        # Load model and scaler from current (USECASE) directory
        script_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(script_dir, 'battery_lstm_model.keras')
        scaler_path = os.path.join(script_dir, 'scaler.pkl')

        if not os.path.exists(model_path) or not os.path.exists(scaler_path):
            return {"error": "Model or Scaler file missing in USECASE folder"}

        model = tf.keras.models.load_model(model_path)
        scaler = joblib.load(scaler_path)

        # Get features from command line arguments
        # Expected: V_avg, V_min, V_max, I_avg, T_avg, T_min, T_max
        if len(sys.argv) < 8:
            return {"error": "Insufficient features provided"}

        features = [float(sys.argv[i]) for i in range(1, 8)]
        
        # Scale features
        scaled_features = scaler.transform([features])
        
        # Prepare sequence (repeat 20 times to match SEQ_LENGTH)
        seq_length = 20
        sequence = np.repeat(scaled_features, seq_length, axis=0)
        sequence = np.expand_dims(sequence, axis=0)

        # Predict
        predictions = model.predict(sequence, verbose=0)
        
        # predictions[0] is RUL branch, predictions[1] is SoH branch
        rul = float(predictions[0][0][0])
        soh = float(predictions[1][0][0])
        
        # Get Use Case logic
        band, recommendation = get_band_info(soh)

        return {
            "success": True,
            "rul": round(max(0, rul), 2),
            "soh": round(min(1, max(0, soh)) * 100, 2), # Percentage
            "band": band,
            "recommendation": recommendation,
            "summary": f"Battery analysis complete. This asset is categorized as {band}. Predicted RUL is {int(rul)} cycles with {soh*100:.1f}% SoH.",
            "reasoning": f"Battery shows {band} suitability primarily due to its State of Health ({soh*100:.1f}%). Higher SoHs emphasize Backup Power stability, while mid-range SoHs are prioritized for Energy Storage."
        }

    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    result = predict()
    print(json.dumps(result))
