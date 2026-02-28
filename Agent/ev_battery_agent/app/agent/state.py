from typing import Annotated, TypedDict, List, Dict, Any, Optional
from langchain_core.messages import AnyMessage
from langgraph.graph.message import add_messages

class UnifiedState(TypedDict):
    """
    Unified State for EV Battery Search and Trading.
    """
    messages: Annotated[List[AnyMessage], add_messages]
    
    # Task context
    intent: Optional[str]  # 'search' or 'trade'
    
    # Search fields
    question: Optional[str]
    retrieved_data: Optional[List[Dict]]
    answer: Optional[str]
    confidence: Optional[float]
    
    # Trade fields
    battery_id: Optional[str]
    trade_details: Optional[Dict[str, Any]]
    transaction_result: Optional[Dict[str, Any]]
    logistics_plan: Optional[Dict[str, Any]]
    learning_feedback: Optional[Dict[str, Any]]