import os
import sys
import asyncio
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv

load_dotenv()

# Force UTF-8 for Windows terminal output
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Ensure the app imports work
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))

from app.agent.graph import build_graph

async def verify_sequential_flow():
    print("--- Verifying Sequential Multi-Agent Flow ---")
    graph = build_graph()
    
    query = "Recommend a battery for a microgrid that is safe and sustainable."
    print(f"Query: {query}")
    
    try:
        result = graph.invoke({
            "messages": [HumanMessage(content=query)],
            "question": query
        })
        
        print("\n[Consolidated Output Summary]:")
        ans = result.get("answer", "No answer generated.")
        print(ans[:500] + "...")
        
        # Check if all reports are populated
        reports = {
            "Recommendations": "recommendations",
            "Health": "health_report",
            "Risk": "risk_report",
            "Sustainability": "sustainability_report",
            "Market": "market_report"
        }
        
        print("\n[State Validation]:")
        for name, key in reports.items():
            val = result.get(key)
            status = "✅ Found" if val else "❌ Missing"
            print(f" - {name}: {status}")
            
    except Exception as e:
        print(f"❌ Verification Failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(verify_sequential_flow())
