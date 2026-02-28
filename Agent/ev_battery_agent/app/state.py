from typing import TypedDict, List, Dict, Any, Optional
from langchain_core.messages import BaseMessage

class UnifiedState(TypedDict):
    # Core state
    messages: List[BaseMessage]
    question: str
    intent: str
    battery_id: Optional[str]
    
    # Tool/Agent decisions
    tool_decision: Optional[str]
    retrieved_data: List[Dict[str, Any]]
    
    # Recommendation
    recommendations: List[Dict[str, Any]]
    
    # Trade Workflow details
    trade_details: Dict[str, Any]
    transaction_result: Dict[str, Any]
    logistics_plan: Dict[str, Any]
    learning_feedback: Dict[str, Any]
    
    # HITL Confirmation
    awaiting_confirmation: bool
    order_confirmed: Optional[bool]
    
    # Phase 2 Reports
    health_report: Dict[str, Any]
    market_report: Dict[str, Any]
    
    # New Phase 3 Reports
    risk_report: Dict[str, Any]
    sustainability_report: Dict[str, Any]
    consolidation_output: str
    
    # Final response
    answer: str
    confidence: float
