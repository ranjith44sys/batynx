import logging
import json
import os
import time
from datetime import datetime
from typing import Dict, Any, List, Optional
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from app.storage import LocalStorage
from app.state import UnifiedState
from app.agent.search_agent import BatterySearchAgent
from app.planner import UnifiedPlanner
from app.models import llm

# Agents
from app.transaction_facilitation_agent import TransactionFacilitationAgent
from app.logistics_and_supply_chain_agent import LogisticsAndSupplyChainAgent
from app.data_aggregation_and_continuous_learning_agent import DataAggregationAndContinuousLearningAgent
from app.battery_health_agent import BatteryHealthAgent
from app.market_intelligence_agent import MarketIntelligenceAgent
from app.risk_agent import RiskAgent
from app.sustainability_agent import SustainabilityAgent

from app.battery_recommendation_agent import BatteryRecommendationAgent

logger = logging.getLogger(__name__)
storage = LocalStorage()
planner = UnifiedPlanner()

# Global Agent Instances
tx_agent = TransactionFacilitationAgent()
logistics_agent = LogisticsAndSupplyChainAgent()
health_agent = BatteryHealthAgent()
market_agent = MarketIntelligenceAgent()
risk_agent = RiskAgent()
sustainability_agent = SustainabilityAgent()
recommendation_agent = BatteryRecommendationAgent()

def to_dict(obj):
    if isinstance(obj, dict): return obj
    if hasattr(obj, "model_dump"): return obj.model_dump()
    if hasattr(obj, "dict"): return obj.dict()
    return vars(obj) if hasattr(obj, "__dict__") else str(obj)

# --- Nodes ---

def planner_node(state: UnifiedState):
    logger.info("Entering planner node")
    last_msg = state["messages"][-1]
    user_msg = last_msg.content if hasattr(last_msg, "content") else str(last_msg)
    
    result = planner.analyze_input(user_msg, state["messages"][:-1])
    bid = result.battery_id or state.get("battery_id")
    
    # Fast-fail validation: Only if an ID is provided AND we aren't in a recommendation search
    # Recommendation search doesn't care if the user's "id" (if any) is invalid yet
    invalid_id = False
    if bid and result.intent not in ["recommendation"]:
        from app.supabase_client import supabase
        if supabase:
            try:
                # Check both tables for existence
                res = supabase.table("battery_recycle").select("battery_id").eq("battery_id", bid).execute()
                res2 = supabase.table("batteries").select("battery_id").eq("battery_id", bid).execute()
                if not res.data and not res2.data:
                    logger.warning(f"Battery ID {bid} not found in Supabase.")
                    invalid_id = True
            except Exception as e:
                logger.error(f"Validation fetch error: {e}")
                # Fail-secure: If the database is unreachable, safely reject the transaction
                invalid_id = True

    return {
        "intent": "invalid_id" if invalid_id else result.intent,
        "battery_id": bid,
        "trade_details": result.trade_details or state.get("trade_details"),
        "question": f"Error: The battery ID '{bid}' does not exist in our active inventory. Please choose a valid battery." if invalid_id else user_msg
    }

def invalid_node(state: UnifiedState):
    logger.warning("Routing to invalid node due to missing battery ID.")
    msg = state.get("question", "Error: Battery not found.")
    return {
        "answer": msg,
        "messages": [AIMessage(content=msg)]
    }

def recommendation_node(state: UnifiedState):
    # Use the new AI Recommendation Agent
    recs = recommendation_agent.run(state.get("question", ""))
    bid = state.get("battery_id") or (recs[0].get("battery_id") if recs else None)
    
    # If the user's intent was to examine/buy a specific ID but they bypassed the planner validation somehow
    if state.get("intent") == "invalid_id":
        return {"recommendations": []}

    return {"recommendations": recs, "battery_id": bid}

def health_node(state: UnifiedState):
    time.sleep(3) # Increased RPM Throttling
    bid = state.get("battery_id") or "Unknown"
    telemetry = next((r for r in state.get("recommendations", []) if r.get("battery_id") == bid), None)
    return {"health_report": to_dict(health_agent.run(bid, telemetry))}

def risk_node(state: UnifiedState):
    time.sleep(3) # Increased RPM Throttling
    bid = state.get("battery_id") or "Unknown"
    h = state.get("health_report", {})
    tel = {"soh": h.get("soh_percentage", 85), "v_max": 4.2, "t_max": 35}
    return {"risk_report": to_dict(risk_agent.run(bid, tel))}

def sustainability_node(state: UnifiedState):
    time.sleep(3) # Increased RPM Throttling
    bid = state.get("battery_id") or "Unknown"
    h = state.get("health_report", {})
    specs = {"soh": h.get("soh_percentage", 80), "chemistry": "LFP", "capacity_kwh": 40}
    return {"sustainability_report": to_dict(sustainability_agent.run(bid, specs))}

def market_node(state: UnifiedState):
    time.sleep(3) # Increased RPM Throttling
    bid = state.get("battery_id") or "Unknown"
    h = state.get("health_report", {})
    specs = {"soh": h.get("soh_percentage", 80), "capacity_kwh": 40}
    return {"market_report": to_dict(market_agent.calculate_price(bid, specs))}

def consolidation_node(state: UnifiedState):
    logger.info("Entering consolidation node")
    q = state.get("question", "")
    
    # Check if transaction result exists
    tx_res = state.get("transaction_result")
    log_res = state.get("logistics_plan")

    prompt = ChatPromptTemplate.from_template(
        "You are the Lead Battery Orchestrator. Provide a technical and concise response.\n"
        "User Query: {query}\n"
        "Data: {context}\n\n"
        "FORMATTING RULES:\n"
        "1. If a transaction happened, present it as a 'FORMAL INVOICE' with reference IDs and status.\n"
        "2. Present expert findings (Health, Risk, Sustainability, Market) in a structured list.\n"
        "3. Keep the output clean and professional. Avoid conversational filler."
    )
    
    context_data = {
        "recommendations": state.get("recommendations", []),
        "health": state.get("health_report"),
        "risk": state.get("risk_report"),
        "sustainability": state.get("sustainability_report"),
        "market": state.get("market_report"),
        "transaction": tx_res,
        "logistics": log_res
    }
    
    # Prompt for confirmation if buying intent detected but no transaction yet
    is_buying = any(w in q.lower() for w in ["buy", "order", "purchase", "transact", "purches"])
    if is_buying and not tx_res:
        prompt_text = "\n\nCRITICAL: Explicitly ask if the user confirms the purchase."
    else:
        prompt_text = ""

    chain = prompt | llm
    res = chain.invoke({"query": q, "context": json.dumps(context_data) + prompt_text})
    
    return {
        "answer": res.content,
        "messages": [AIMessage(content=res.content)],
        "awaiting_confirmation": is_buying and not tx_res
    }

def confirmation_node(state: UnifiedState):
    last_msg = state["messages"][-1]
    txt = (last_msg.content if hasattr(last_msg, "content") else str(last_msg)).lower()
    confirmed = any(w in txt for w in ["yes", "confirm", "proceed", "buy", "place"])
    return {"order_confirmed": confirmed, "awaiting_confirmation": False}

def transaction_node(state: UnifiedState):
    time.sleep(3) # RPM Throttling
    logger.info("Executing transaction...")
    bid = state.get("battery_id") or "Unknown"
    details = state.get("trade_details", {})
    res = to_dict(tx_agent.run(bid, details))
    return {"transaction_result": res}

def logistics_node(state: UnifiedState):
    time.sleep(3) # RPM Throttling
    logger.info("Generating logistics & storing history...")
    bid = state.get("battery_id") or "Unknown"
    details = state.get("trade_details", {})
    logistics = to_dict(logistics_agent.run("Kochi", "Munnar", bid, details))
    
    # --- STORAGE LOGIC ---
    full_record = {
        "timestamp": datetime.now().isoformat(),
        "battery_id": bid,
        "intent": state.get("intent"),
        "reports": {
            "health": state.get("health_report"),
            "risk": state.get("risk_report"),
            "sustainability": state.get("sustainability_report"),
            "market": state.get("market_report")
        },
        "transaction": state.get("transaction_result"),
        "logistics": logistics
    }
    
    from app.supabase_client import supabase
    if supabase:
        try:
            # We insert the full record. The Supabase table "transaction_history" must exist 
            # and preferably have a 'record_data' JSONB column or matching schema.
            # Easiest way to bypass strict schema for unstructured agent logs is JSONB.
            res = supabase.table("transaction_history").insert({"battery_id": bid, "record_data": full_record}).execute()
            logger.info(f"Transaction history saved to Supabase")
        except Exception as e:
            logger.error(f"Supabase storage failed: {e}")
    else:
        history_file = "app/central_data/transaction_history.json"
        os.makedirs("app/central_data", exist_ok=True)
        try:
            history = []
            if os.path.exists(history_file):
                with open(history_file, "r") as f: history = json.load(f)
            history.append(full_record)
            with open(history_file, "w") as f: json.dump(history, f, indent=4)
            logger.info(f"Transaction history saved to {history_file}")
        except Exception as e:
            logger.error(f"Storage failed: {e}")

    return {"logistics_plan": logistics}