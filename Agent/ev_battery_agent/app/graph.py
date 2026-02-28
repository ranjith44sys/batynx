import asyncio
from typing import Dict, Any
from langgraph.graph import StateGraph, START, END
from state import BatteryTradeState
from transaction_facilitation_agent import TransactionFacilitationAgent
from logistics_and_supply_chain_agent import LogisticsAndSupplyChainAgent
from data_aggregation_and_continuous_learning_agent import DataAggregationAndContinuousLearningAgent
from langchain_core.messages import AIMessage

# Initialize Agents
tx_agent = TransactionFacilitationAgent()
logistics_agent = LogisticsAndSupplyChainAgent()
learning_agent = DataAggregationAndContinuousLearningAgent()

# --- Node Functions ---

async def transaction_node(state: BatteryTradeState) -> Dict[str, Any]:
    """Node for processing the financial transaction."""
    result = tx_agent.run(state["battery_id"], state["trade_details"])
    return {
        "transaction_result": result,
        "messages": [AIMessage(content=f"Transaction processed: {result['final_status']}")]
    }

async def logistics_node(state: BatteryTradeState) -> Dict[str, Any]:
    """Node for generating the logistics and e-way bill plan."""
    # Extract locations from trade_details or use defaults for Kerala pilot
    origin = state["trade_details"].get("origin", "Kozhikode, Kerala")
    destination = state["trade_details"].get("destination", "Thiruvananthapuram, Kerala")
    
    result = logistics_agent.run(origin, destination, state["battery_id"], state["trade_details"])
    return {
        "logistics_plan": result,
        "messages": [AIMessage(content=f"Logistics plan generated: {result['route_summary']}")]
    }

async def learning_node(state: BatteryTradeState) -> Dict[str, Any]:
    """Node for data aggregation and continuous learning analysis."""
    # Prepare full summary for the learning agent
    full_summary = {
        "battery_id": state["battery_id"],
        "trade_details": state["trade_details"],
        "transaction_result": state["transaction_result"],
        "logistics_plan": state["logistics_plan"]
    }
    
    result = learning_agent.run(full_summary)
    return {
        "learning_feedback": result,
        "messages": [AIMessage(content="Data aggregated and insights generated.")]
    }

# --- Build the Graph ---

workflow = StateGraph(BatteryTradeState)

# Add Nodes
workflow.add_node("transaction", transaction_node)
workflow.add_node("logistics", logistics_node)
workflow.add_node("learning", learning_node)

# Connect Nodes Linearly
workflow.add_edge(START, "transaction")
workflow.add_edge("transaction", "logistics")
workflow.add_edge("logistics", "learning")
workflow.add_edge("learning", END)

# Compile
app = workflow.compile()

if __name__ == "__main__":
    # Example usage / invocation
    initial_state = {
        "battery_id": "EV-KERALA-005",
        "trade_details": {
            "price_inr": 62000,
            "seller_vpa": "kerala-battery@upi",
            "buyer_vpa": "recycler-ernakulam@upi",
            "origin": "Kozhikode",
            "destination": "Ernakulam",
            "battery_spec": "72V 100Ah LFP"
        },
        "messages": []
    }
    
    async def run_test():
        print("Starting Kerala Pilot EV Battery Trade Workflow...")
        async for output in app.astream(initial_state):
            for key, value in output.items():
                print(f"\n--- Output from node '{key}' ---")
                print(value)
                
    asyncio.run(run_test())
