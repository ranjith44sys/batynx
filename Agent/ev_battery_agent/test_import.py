import sys
import os
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

print("Attempting to import build_graph...")
from app.agent.graph import build_graph
print("Successfully imported build_graph.")

print("Attempting to build graph...")
g = build_graph()
print("Successfully built graph.")
