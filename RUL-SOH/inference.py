import sys
import json
import numpy as np
import joblib
import os
import tensorflow as tf

# Suppress tensorflow warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3' 

def predict():
    try:
        # Load model and scaler
        script_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(script_dir, 'battery_lstm_model.keras')
        scaler_path = os.path.join(script_dir, 'scaler.pkl')

        if not os.path.exists(model_path) or not os.path.exists(scaler_path):
            return {"error": "Model or Scaler file missing"}

        model = tf.keras.models.load_model(model_path)
        scaler = joblib.load(scaler_path)

        # Get features from command line arguments
        # Features: V_avg, V_min, V_max, I_avg, T_avg, T_min, T_max
        if len(sys.argv) < 8:
            return {"error": "Insufficient features provided"}

        features = [float(sys.argv[i]) for i in range(1, 8)]
        
        # Scale features
        # Note: Scaler expects 2D array (n_samples, n_features)
        scaled_features = scaler.transform([features])
        
        # Prepare sequence (repeat 20 times to match SEQ_LENGTH)
        # Sequence shape should be (1, 20, 7)
        seq_length = 20
        sequence = np.repeat(scaled_features, seq_length, axis=0)
        sequence = np.expand_dims(sequence, axis=0)

        # Predict
        predictions = model.predict(sequence, verbose=0)
        
        # predictions[0] is RUL branch, predictions[1] is SoH branch
        rul = float(predictions[0][0][0])
        soh = float(predictions[1][0][0])

        return {
            "success": True,
            "rul": round(max(0, rul), 2),
            "soh": round(min(1, max(0, soh)) * 100, 2), # Percentage
            "summary": f"Battery analysis complete. Predicted Remaining Useful Life is {int(rul)} cycles with a State of Health of {soh*100:.1f}%."
        }

    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    result = predict()
    print(json.dumps(result))
