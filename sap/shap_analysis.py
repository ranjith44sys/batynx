#!/usr/bin/env python3
"""
Battery Credit Model SHAP Explainability Script
Save this as: shap_analysis.py
Run after training your model and having X_train, X_test, X available.
"""

import numpy as np
import pandas as pd
import shap
import joblib
import matplotlib.pyplot as plt
import seaborn as sns

# ================= CONFIG =================
MODEL_PATH = "battery_credit_model_lightGBM.pkl"
# =========================================

def main():
    global model_for_shap

    # Try to load model if not already in memory
    try:
        model_for_shap = joblib.load(MODEL_PATH)
        print(f"[INFO] Loaded model from {MODEL_PATH}")
    except Exception as e:
        print("[ERROR] Could not load model. Ensure the file exists.")
        print(e)
        return

    # NOTE: You MUST load X_train, X_test, X before running this script
    try:
        from data_loader import X_train, X_test, X  # Example placeholder import
    except Exception:
        print("[WARNING] X_train, X_test, X not found.")
        print("Please import or define X_train, X_test, and X before running SHAP.")
        return

    # -------- 1. Global Feature Importance --------
    print("[INFO] Plotting Global Feature Importance...")
    feature_importances = pd.Series(
        model_for_shap.feature_importances_,
        index=X.columns
    ).sort_values(ascending=False)

    plt.figure(figsize=(10, 6))
    sns.barplot(
        x=feature_importances,
        y=feature_importances.index,
        hue=feature_importances.index,
        palette='viridis',
        legend=False
    )
    plt.title("Global Feature Importance (LightGBM)")
    plt.tight_layout()
    plt.show()

    # -------- 2. SHAP Summary Plot --------
    print("[INFO] Generating SHAP Summary Plot...")
    explainer = shap.TreeExplainer(model_for_shap)
    shap_values = explainer.shap_values(X_test)
    shap.summary_plot(shap_values, X_test, feature_names=X.columns)

    # -------- 3. Local Explanation for Sample Battery --------
    sample_data = pd.DataFrame([{
        'avg_operating_temp': 34.0,
        'max_temp': 48.0,
        'overtemp_count': 6.0,
        'overtemp_duration_log': np.log1p(450),
        'temp_variance': 10.5,
        'fast_charge_ratio': 0.55,
        'deep_discharge_ratio': 0.25,
        'capacity_fade_rate': 0.004
    }])

    # Predict credit score
    score = model_for_shap.predict(sample_data)[0]
    print("\n--- Prediction Result ---")
    print(f"Predicted Credit Score: {score:.2f} / 100")

    # SHAP Local Explanation
    explainer_obj = shap.Explainer(model_for_shap, X_train)
    shap_explanation = explainer_obj(sample_data)

    print("\n--- Local Explanation (Waterfall Plot) ---")
    plt.figure(figsize=(10, 6))
    shap.plots.waterfall(shap_explanation[0])
    plt.show()

    # -------- Textual Explanation --------
    base_value = shap_explanation.base_values[0]
    print("\n--- Textual Explanation ---")
    print(f"Starting Base Score (Average): {base_value:.2f}")
    print(f"Final Predicted Score: {score:.2f}")

    features = sample_data.columns
    impacts = shap_explanation.values[0]
    feature_impacts = sorted(zip(features, impacts), key=lambda x: abs(x[1]), reverse=True)

    print("\nBreakdown of feature impacts on the score:")
    for feat, impact in feature_impacts:
        if abs(impact) < 0.01:
            continue
        direction = "INCREASED" if impact > 0 else "DECREASED"
        val = sample_data[feat].values[0]
        print(f"- {feat} (Value: {val:.4f}) {direction} the score by {abs(impact):.2f} points")


if __name__ == "__main__":
    main()
