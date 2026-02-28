import os
import logging
import json
import re
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from app.models import llm

logger = logging.getLogger(__name__)

# Helper to fix AI hallucinations (turning "80" into 80.0)
def safe_float(val):
    if isinstance(val, (int, float)): return float(val)
    if isinstance(val, str):
        # Extract first number found
        match = re.search(r"[-+]?\d*\.\d+|\d+", val)
        if match: return float(match.group())
    return 0.0

class SustainabilityAgent:
    def __init__(self):
        self.llm = llm

    def run(self, battery_id: str, specs: Dict[str, Any]) -> Dict[str, Any]:
        logger.info(f"Analyzing sustainability for battery {battery_id}")
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", (
                "You are an EV Battery Sustainability Expert. Evaluate environmental impact.\n"
                "Output ONLY raw JSON in this format:\n"
                "{{\n"
                "  \"battery_id\": \"string\",\n"
                "  \"co2_saved_kg\": number,\n"
                "  \"recyclability_pct\": number,\n"
                "  \"environmental_impact_score\": \"Low/Medium/High\",\n"
                "  \"second_life_suitability\": \"High/Moderate/Low\",\n"
                "  \"recommendations\": [\"string\"]\n"
                "}}\n"
                "Strictly NO markdown, NO code blocks, NO preamble."
            )),
            ("user", "Battery ID: {battery_id}, Specs: {specs_json}")
        ])
        
        chain = prompt | self.llm
        try:
            response = chain.invoke({
                "battery_id": battery_id,
                "specs_json": json.dumps(specs)
            })
            content = response.content.strip()
            # Clean possible markdown wrap
            if content.startswith("```"):
                content = re.sub(r"```(json)?\n?|\n?```", "", content)
            
            data = json.loads(content)
            # Strict type coercion
            data["co2_saved_kg"] = safe_float(data.get("co2_saved_kg", 0))
            data["recyclability_pct"] = safe_float(data.get("recyclability_pct", 0))
            data["battery_id"] = battery_id
            return data
        except Exception as e:
            logger.error(f"Sustainability parsing failed: {e}")
            return {
                "battery_id": battery_id,
                "co2_saved_kg": 0.0,
                "recyclability_pct": 0.0,
                "environmental_impact_score": "Unknown",
                "second_life_suitability": "Unknown",
                "recommendations": ["Fixing system stability... Manual review requested."]
            }

if __name__ == "__main__":
    agent = SustainabilityAgent()
    print(agent.run("BATT-1", {"soh": 85}))
