from typing import TypedDict
from langgraph.graph import StateGraph, END
from .schemas import BMSData
from .logic import rule_based_analyst_node

class AgentState(TypedDict):
    """
    State for the Rule-Based Battery Health Assessment.
    """
    input_data: BMSData
    final_report_md: str

# Define the graph
builder = StateGraph(AgentState)

# Node for rule-based analysis
builder.add_node("analyst", rule_based_analyst_node)

builder.set_entry_point("analyst")
builder.add_edge("analyst", END)

# Compile the graph
battery_health_graph = builder.compile()
