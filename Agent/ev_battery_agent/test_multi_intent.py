import os
import sys
import asyncio
import json
import traceback
from langchain_core.messages import HumanMessage

# Add the project root to sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "."))
sys.path.append(project_root)

from app.agent.graph import build_graph
from app.ingestion import ingest_sample_documents

async def test_full_conversational_suite():
    print("--- Starting Multi-Agent Conversational Suite Verification ---")
    
    try:
        ingest_sample_documents()
        graph = build_graph()
    except Exception as e:
        print(f"Setup Error: {e}")
        traceback.print_exc()
        return

    test_cases = [
        {
            "name": "Logistics Inquiry",
            "query": "What is the ETA for battery BATT-101 from Kochi to Coimbatore?",
            "expected_intent": "logistics",
            "json_file": "logistics_output.json"
        },
        {
            "name": "Transaction Inquiry",
            "query": "Show me the payment ledger for battery BATT-001 priced at 50000 INR",
            "expected_intent": "transaction",
            "json_file": "transaction_output.json"
        }
    ]

    for tc in test_cases:
        print(f"\n--- Running Test: {tc['name']} ---")
        try:
            # Clear JSON if exists
            if os.path.exists(tc['json_file']):
                os.remove(tc['json_file'])
                
            input_state = {
                "messages": [HumanMessage(content=tc['query'])],
                "question": tc['query']
            }
            
            print(f"Invoking graph with query: {tc['query']}")
            result = graph.invoke(input_state)
            
            if result is None:
                print("❌ Graph returned None!")
                continue

            detected_intent = result.get('intent')
            print(f"Detected Intent: {detected_intent}")
            print(f"Conversational Answer: {result.get('answer')}")
            
            if os.path.exists(tc['json_file']):
                print(f"✅ {tc['json_file']} created successfully.")
            else:
                print(f"❌ {tc['json_file']} NOT found.")
                
        except Exception as e:
            print(f"❌ Error during test '{tc['name']}': {e}")
            traceback.print_exc()

    print("\n--- Verification Run Finished ---")

if __name__ == "__main__":
    asyncio.run(test_full_conversational_suite())
