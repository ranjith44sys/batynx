"""
FastAPI Server to expose the LangGraph multi-agent ecosystem as a REST API.
This is the bridge between the Next.js frontend and the Python AI agents.
"""
import os
import sys
import json
import logging
import traceback
from datetime import datetime
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

# Fix path for module imports
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_core.messages import HumanMessage, AIMessage

from app.agent.graph import build_graph

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="EV Battery AI Agent API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Build graph once at startup
graph = build_graph()

# In-memory session state (per-conversation)
sessions = {}

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"

class ChatResponse(BaseModel):
    answer: str
    intent: Optional[str] = None
    battery_id: Optional[str] = None
    agents_used: List[str] = []
    health_report: Optional[dict] = None
    risk_report: Optional[dict] = None
    sustainability_report: Optional[dict] = None
    market_report: Optional[dict] = None

@app.get("/health")
def health():
    return {"status": "ok", "service": "ev-battery-ai-agents"}

@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    sid = req.session_id or "default"
    
    # Get or create session state
    if sid not in sessions:
        sessions[sid] = {
            "messages": [],
            "awaiting_confirmation": False,
            "battery_id": None,
            "recommendations": [],
            "health_report": {},
            "risk_report": {},
            "sustainability_report": {},
            "market_report": {},
            "trade_details": {}
        }
    
    state = sessions[sid]
    
    # Add user message
    user_msg = HumanMessage(content=req.message)
    state["messages"].append(user_msg)
    state["question"] = req.message
    
    try:
        logger.info(f"[AGENT-API] Invoking graph for: {req.message[:80]}...")
        result = graph.invoke(state)
        
        # Update session state
        state.update(result)
        
        answer = result.get("answer", "Analysis complete.")
        
        # Persist AI response in message history
        ai_msg = AIMessage(content=answer)
        state["messages"].append(ai_msg)
        
        # Determine which agents were used based on what reports are populated
        agents_used = []
        if result.get("intent"):
            agents_used.append("Planner Agent")
        if result.get("recommendations"):
            agents_used.append("Recommendation Agent")
        if result.get("health_report") and result["health_report"] != {}:
            agents_used.append("Battery Health Agent")
        if result.get("risk_report") and result["risk_report"] != {}:
            agents_used.append("Risk & Fraud Agent")
        if result.get("sustainability_report") and result["sustainability_report"] != {}:
            agents_used.append("Sustainability Agent")
        if result.get("market_report") and result["market_report"] != {}:
            agents_used.append("Market Intelligence Agent")
        if result.get("transaction_result"):
            agents_used.append("Transaction Agent")
        if result.get("logistics_plan"):
            agents_used.append("Logistics Agent")
        agents_used.append("Consolidation Agent")

        return ChatResponse(
            answer=answer,
            intent=result.get("intent"),
            battery_id=result.get("battery_id"),
            agents_used=agents_used,
            health_report=result.get("health_report") if isinstance(result.get("health_report"), dict) else None,
            risk_report=result.get("risk_report") if isinstance(result.get("risk_report"), dict) else None,
            sustainability_report=result.get("sustainability_report") if isinstance(result.get("sustainability_report"), dict) else None,
            market_report=result.get("market_report") if isinstance(result.get("market_report"), dict) else None,
        )
    except Exception as e:
        logger.error(f"[AGENT-API] Error: {traceback.format_exc()}")
        return ChatResponse(
            answer=f"An error occurred while processing your request: {str(e)}",
            agents_used=["Error Handler"]
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
