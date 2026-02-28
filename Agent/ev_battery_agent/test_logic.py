import sys
import os
import json
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from app.agent.graph import build_graph
from langchain_core.messages import HumanMessage

import logging
logging.basicConfig(level=logging.INFO)
graph = build_graph()
state = {
    "messages": [HumanMessage(content="I need a battery for a solar project.")],
    "question": "I need a battery for a solar project.",
    "awaiting_confirmation": False
}

try:
    print("Invoking graph...")
    result = graph.invoke(state)
    print("\n" + "="*50)
    print("FINAL TEST RESULTS")
    print("="*50)
    print(f"Intent: {result.get('intent')}")
    print(f"Battery ID (Selected): {result.get('battery_id')}")
    print(f"Number of Recommendations: {len(result.get('recommendations', []))}")
    print("-" * 50)
    print("ORCHESTRATOR ANSWER:")
    print(result.get("answer"))
    print("="*50)
except Exception as e:
    import traceback
    print(f"Error: {e}")
    print(traceback.format_exc())
