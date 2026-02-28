import os
import joblib
import numpy as np
import pandas as pd
from typing import Annotated, TypedDict, Optional, List
import operator
import json

# Setup environment for TensorFlow to avoid some warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

# --- 1. Import ML dependencies ---
from tensorflow.keras.models import load_model

# --- 2. Import LangGraph and Pydantic AI dependencies ---
from langgraph.graph import StateGraph, END
from pydantic import BaseModel, Field

# We use pydantic_ai Agent
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIModel
from pydantic_ai.settings import ModelSettings

# ==============================================================================
# Model Loading & ML Prediction Utilities
# ==============================================================================
MODEL_PATH = 'battery_lstm_model.keras'
SCALER_PATH = 'scaler.pkl'

try:
    lstm_model = load_model(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    print("ML Model and Scaler loaded successfully.")
except Exception as e:
    print(f"Warning: Could not load ML model or scaler ({e}). Make sure 'battery_rul_soh_prediction.py' has been run.")
    lstm_model = None
    scaler = None

def get_ml_predictions(v_avg, v_min, v_max, i_avg, t_avg, t_min, t_max):
    """Predicts SOH and RUL using the trained LSTM model."""
    if not lstm_model or not scaler:
        return {"error": "Model not loaded"}
    
    features = ['V_avg', 'V_min', 'V_max', 'I_avg', 'T_avg', 'T_min', 'T_max']
    input_df = pd.DataFrame([{
        'V_avg': v_avg, 'V_min': v_min, 'V_max': v_max,
        'I_avg': i_avg, 'T_avg': t_avg, 'T_min': t_min, 'T_max': t_max
    }])
    
    norm_features = scaler.transform(input_df)
    SEQUENCE_LENGTH = 20
    input_sequence = np.repeat(norm_features, SEQUENCE_LENGTH, axis=0) # Shape (20, 7)
    input_sequence = input_sequence.reshape(1, SEQUENCE_LENGTH, len(features))
    
    predictions = lstm_model.predict(input_sequence, verbose=0)
    pred_rul = float(predictions[0][0][0])
    pred_soh = float(predictions[1][0][0])
    
    return {
        "rul_cycles": max(0.0, pred_rul),
        "soh_percentage": max(0.0, min(1.0, pred_soh)) * 100
    }

# ==============================================================================
# Definition of State and Pydantic Models
# ==============================================================================

class BatteryData(BaseModel):
    v_avg: float = Field(description="Average Voltage")
    v_min: float = Field(description="Minimum Voltage")
    v_max: float = Field(description="Maximum Voltage")
    i_avg: float = Field(description="Average Current")
    t_avg: float = Field(description="Average Temperature")
    t_min: float = Field(description="Minimum Temperature")
    t_max: float = Field(description="Maximum Temperature")
    reported_soh_percent: Optional[float] = Field(None, description="The SOH percentage claimed by the user")

class AgentState(TypedDict):
    """State to pass through the LangGraph."""
    user_query: str
    extracted_data: Optional[dict]
    predicted_rul: Optional[float]
    predicted_soh: Optional[float]
    fraud_flags: Annotated[list, operator.add]
    fraud_score: Optional[float]
    final_report: Optional[str]

# ==============================================================================
# Pydantic AI Agents setup
# ==============================================================================

# Support for OpenRouter if detection is sk-or-
api_key = os.getenv('OPENAI_API_KEY')
if api_key and api_key.startswith('sk-or-'):
    os.environ['OPENAI_BASE_URL'] = 'https://openrouter.ai/api/v1'
    print("Detected OpenRouter API Key. Setting OPENAI_BASE_URL.")

model_name = 'openai:gpt-4o'
common_settings = ModelSettings(max_tokens=1000)

# 1. Extractor Agent
extractor_agent = Agent(
    model_name,
    output_type=BatteryData,
    model_settings=common_settings,
    system_prompt="""You are an expert data extractor. Extract the battery metrics based on the user's text. 
    If some parameters are missing, infer reasonable default battery metrics (e.g. V=3.5, I=-1.0, T=25.0).
    Pay attention to any user claims about State of Health (SOH)."""
)

# 2. Fraud Analyst Agent
class FraudResult(BaseModel):
    is_fraud: bool
    confidence: float
    reasoning: str
    flags: List[str]

fraud_agent = Agent(
    model_name,
    output_type=FraudResult,
    model_settings=common_settings,
    system_prompt="""You are a Fraud Detection AI for Battery Warranty Claims.
    You will receive user-reported parameters, and the actual predicted State of Health (SOH) and RUL.
    Detect inconsistencies indicating fraud:
    - User claiming a destroyed battery (low SOH) but the ML model indicates healthy SOH (> 80%).
    - Battery operated out of standard bounds (T_max > 60C, V_max > 4.5V) which indicates intentional abuse, voiding warranty.
    Return a detailed fraud analysis."""
)

# 3. Reporter Agent
reporter_agent = Agent(
    model_name,
    model_settings=common_settings,
    system_prompt="""You are a customer-facing Battery Reliability & Warranty assistant. 
    Write a clear, professional summary of the battery's predicted Remaining Useful Life (RUL) and State of Health (SOH). 
    If fraud is suspected, gracefully inform the user that their warranty claim is under manual review due to anomalies parameters out of bounds."""
)

# ==============================================================================
# LangGraph Node Definitions
# ==============================================================================

def node_extract_data(state: AgentState) -> AgentState:
    print("-> Extracting battery data from query...")
    try:
        result = extractor_agent.run_sync(state["user_query"])
        # In pydantic-ai 1.x, the result data is in .output
        data = result.output
        if hasattr(data, 'model_dump'):
            return {"extracted_data": data.model_dump()}
        return {"extracted_data": data if isinstance(data, dict) else {}}
    except Exception as e:
        print(f"Extraction failed: {e}")
        fallback = BatteryData(v_avg=3.5, v_min=2.5, v_max=4.2, i_avg=-1.0, 
                               t_avg=35.0, t_min=25.0, t_max=45.0, reported_soh_percent=None)
        return {"extracted_data": fallback.model_dump()}


def node_predict_ml(state: AgentState) -> AgentState:
    print("-> Predicting RUL and SOH using LSTM model...")
    data = state["extracted_data"]
    if not data:
        return state
        
    predictions = get_ml_predictions(
        data['v_avg'], data['v_min'], data['v_max'], 
        data['i_avg'], data['t_avg'], data['t_min'], data['t_max']
    )
    
    if "error" not in predictions:
        return {
            "predicted_rul": predictions["rul_cycles"],
            "predicted_soh": predictions["soh_percentage"]
        }
    return {}


def node_detect_fraud(state: AgentState) -> AgentState:
    print("-> Analyzing for potential fraud...")
    prompt = (f"User Claimed Data: {json.dumps(state['extracted_data'])}\n"
              f"ML Predicted SOH (%): {state.get('predicted_soh')}\n"
              f"ML Predicted RUL (cycles): {state.get('predicted_rul')}")
    
    try:
        result = fraud_agent.run_sync(prompt)
        fraud_result: FraudResult = result.output
        return {
            "fraud_flags": fraud_result.flags,
            "fraud_score": fraud_result.confidence if fraud_result.is_fraud else 0.0
        }
    except Exception as e:
        print(f"Fraud detection failed: {e}")
        return {"fraud_flags": ["Could not run AI fraud check."], "fraud_score": 0.0}


def node_generate_report(state: AgentState) -> AgentState:
    print("-> Generating final customer report...")
    prompt = (f"Extracted parameters: {state['extracted_data']}\n"
              f"Predicted SOH: {state.get('predicted_soh')}%\n"
              f"Predicted RUL: {state.get('predicted_rul')} cycles\n"
              f"Fraud Score: {state.get('fraud_score')}\n"
              f"Fraud Flags: {state.get('fraud_flags')}")
    
    try:
        result = reporter_agent.run_sync(prompt)
        return {"final_report": result.output}
    except Exception as e:
        print(f"Reporting failed: {e}")
        return {"final_report": "System Error: Unable to generate text report. See logs."}

# ==============================================================================
# LangGraph Workflow Setup
# ==============================================================================

def build_graph():
    workflow = StateGraph(AgentState)
    
    workflow.add_node("extract", node_extract_data)
    workflow.add_node("predict", node_predict_ml)
    workflow.add_node("fraud", node_detect_fraud)
    workflow.add_node("report", node_generate_report)
    
    workflow.set_entry_point("extract")
    workflow.add_edge("extract", "predict")
    workflow.add_edge("predict", "fraud")
    workflow.add_edge("fraud", "report")
    workflow.add_edge("report", END)
    
    return workflow.compile()

# ==============================================================================
# Execution Entry Point
# ==============================================================================

if __name__ == "__main__":
    print("=========================================================")
    print("Battery Validation & Fraud Detection Agent initialized.")
    print("=========================================================")
    
    app = build_graph()
    
    sample_malicious_query = (
        "My battery is completely dead, SOH must be around 10%. "
        "The voltages are normal V_avg is 3.5, V_min is 2.5, V_max is 4.2. "
        "I_avg is -1.5. Temp is around T_avg=30, T_min=20, T_max=70. "
        "Give me a replacement!"
    )
    
    print(f"\nProcessing Query: '{sample_malicious_query}'\n")
    
    initial_state = {
        "user_query": sample_malicious_query,
        "extracted_data": None,
        "predicted_rul": None,
        "predicted_soh": None,
        "fraud_flags": [],
        "fraud_score": 0.0,
        "final_report": ""
    }
    
    try:
        final_state = app.invoke(initial_state)
        
        print("\n================ FINAL REPORT ================\n")
        print(final_state["final_report"])
        print("\n================ DIAGNOSTICS ================")
        print(f"Extracted SOH Claim: {final_state['extracted_data'].get('reported_soh_percent')}%")
        print(f"Predicted SOH: {final_state['predicted_soh']:.2f}%")
        print(f"Predicted RUL: {final_state['predicted_rul']:.2f} cycles")
        print(f"Fraud Score: {final_state['fraud_score']}")
        print(f"Fraud Flags: {final_state['fraud_flags']}")
        
    except Exception as e:
        print(f"\nWorkflow execution failed: {e}")