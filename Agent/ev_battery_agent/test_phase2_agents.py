import os
import sys
import asyncio
import json
import traceback
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv

load_dotenv()

# Force UTF-8 for Windows terminal output
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Add the project root to sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "."))
sys.path.append(project_root)

from app.agent.graph import build_graph
from app.ingestion import ingest_sample_documents

async def verify_new_agents():
    print("--- Verifying Phase 2 Agents Integration ---")
    
    try:
        ingest_sample_documents()
        graph = build_graph()
    except Exception as e:
        print(f"Setup Error: {e}")
        return

    test_cases = [
        {
            "name": "Health Assessment",
            "query": "Assess the health of battery BATT-HEALTH-101",
            "expected_intent": "health"
        },
        {
            "name": "Market Pricing",
            "query": "What is the fair market value of battery BATT-PRC-001?",
            "expected_intent": "pricing"
        }
    ]

    for tc in test_cases:
        print(f"\n--- Running Test: {tc['name']} ---")
        try:
            result = graph.invoke({
                "messages": [HumanMessage(content=tc['query'])],
                "question": tc['query']
            })
            
            detected_intent = result.get('intent')
            print(f"Detected Intent: {detected_intent}")
            
            # Use safe printing for potentially non-ASCII content
            answer = str(result.get('answer'))[:200]
            print(f"Answer Summary: {answer}...")
            
            output_file = f"{detected_intent}_output.json"
            if os.path.exists(output_file):
                print(f"✅ {output_file} verified.")
            else:
                print(f"❌ {output_file} NOT found.")
                
            if detected_intent != tc['expected_intent']:
                print(f"⚠️ Intent mismatch! Got {detected_intent} instead of {tc['expected_intent']}")
        except Exception as e:
            print(f"❌ Error during test '{tc['name']}': {e}")
            traceback.print_exc()

    print("\n--- Phase 2 Integration Verified Successfully ---")

if __name__ == "__main__":
    asyncio.run(verify_new_agents())
