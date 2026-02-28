from langgraph.graph import StateGraph, END
from app.state import UnifiedState
from app.agent.nodes import (
    planner_node,
    recommendation_node,
    health_node,
    risk_node,
    sustainability_node,
    market_node,
    consolidation_node,
    confirmation_node,
    transaction_node,
    logistics_node,
    invalid_node
)

def route_intent(state: UnifiedState):
    """
    Routes based on intent. 
    """
    if state.get("awaiting_confirmation"):
        return "handle_confirmation"

    intent = state.get("intent", "search").lower()
    
    if intent == "invalid_id":
        return "handle_invalid"
        
    # All battery-related intents go through the expert chain first
    if intent in ["search", "health", "pricing", "trade", "transaction", "recommendation"]:
        return "sequential_start"
        
    return END

def should_transact(state: UnifiedState):
    # Prevent circular loops if transaction is already complete
    if state.get("transaction_result"):
        return END

    # If the user explicitly requested a transaction in the planner, OR confirmed it
    intent = state.get("intent", "").lower()
    if state.get("order_confirmed") or intent == "transaction":
        return "transact"
    return END

def build_graph():
    workflow = StateGraph(UnifiedState)

    workflow.add_node("planner", planner_node)
    workflow.add_node("recommendation", recommendation_node)
    workflow.add_node("health", health_node)
    workflow.add_node("risk", risk_node)
    workflow.add_node("sustainability", sustainability_node)
    workflow.add_node("market", market_node)
    workflow.add_node("consolidation", consolidation_node)
    workflow.add_node("confirmation", confirmation_node)
    workflow.add_node("transaction", transaction_node)
    workflow.add_node("logistics", logistics_node)
    workflow.add_node("invalid", invalid_node)

    workflow.set_entry_point("planner")

    workflow.add_conditional_edges(
        "planner",
        route_intent,
        {
            "sequential_start": "recommendation",
            "handle_confirmation": "confirmation",
            "handle_invalid": "invalid",
            END: END
        }
    )

    workflow.add_edge("invalid", END)

    # Experts First Sequential Pipeline
    workflow.add_edge("recommendation", "health")
    workflow.add_edge("health", "risk")
    workflow.add_edge("risk", "sustainability")
    workflow.add_edge("sustainability", "market")
    workflow.add_edge("market", "consolidation")
    
    # After consolidation, we decide if we go to transaction
    workflow.add_conditional_edges(
        "consolidation",
        should_transact,
        {
            "transact": "transaction",
            END: END
        }
    )

    # Note: If not automatic transaction, it might go through confirmation node next turn
    workflow.add_conditional_edges(
        "confirmation",
        should_transact,
        {
            "transact": "transaction",
            END: END
        }
    )
    
    workflow.add_edge("transaction", "logistics")
    workflow.add_edge("logistics", "consolidation") # Show final receipt
    workflow.add_edge("consolidation", END)

    return workflow.compile()