import os
import sys
import asyncio
from langchain_core.messages import HumanMessage

# Add the project root to sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "."))
sys.path.append(project_root)

from app.agent.graph import build_graph
from app.ingestion import ingest_sample_documents

async def test_logistics_refinement():
    print("--- Starting Logistics Refinement Verification ---")
    
    # Ingest docs
    print("Ingesting docs...")
    ingest_sample_documents()
    
    # Build graph
    print("Building graph...")
    graph = build_graph()
    
    # 1. Test Logistics Independent Question
    print("\n--- Test 1: Logistics Question (ETA) ---")
    q1 = "what is estimated time of arrival for batt-999 price 50000 battery from kochi to coimbatore"
    result1 = graph.invoke({"messages": [HumanMessage(content=q1)]})
    
    print(f"Detected Intent: {result1.get('intent')}")
    print(f"Conversational Answer: {result1.get('answer')}")
    
    # Check if JSON exists
    if os.path.exists("logistics_output.json"):
        print("✅ logistics_output.json created successfully.")
    else:
        print("❌ logistics_output.json NOT found.")

    # 2. Test Full Trade Flow
    print("\n--- Test 2: Full Trade Flow ---")
    q2 = "Trade battery BATT-XYZ for 60000 INR from Kochi to Thrissur"
    result2 = graph.invoke({"messages": [HumanMessage(content=q2)]})
    
    print(f"Detected Intent: {result2.get('intent')}")
    print(f"Transaction: {result2.get('transaction_result', {}).get('final_status')}")
    print(f"Learning feedback generated: {'learning_feedback' in result2}")

    print("\nVerification complete!")

if __name__ == "__main__":
    try:
        asyncio.run(test_logistics_refinement())
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
