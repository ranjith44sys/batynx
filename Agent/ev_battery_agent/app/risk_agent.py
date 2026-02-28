import os
import logging
import json
import re
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from app.models import llm

logger = logging.getLogger(__name__)

def safe_float(val):
    if isinstance(val, (int, float)): return float(val)
    if isinstance(val, str):
        match = re.search(r"[-+]?\d*\.\d+|\d+", val)
        if match: return float(match.group())
    return 0.0

class RiskAgent:
    def __init__(self):
        self.llm = llm

    def run(self, battery_id: str, telemetry: Dict[str, Any], reported_soh: Optional[float] = None) -> Dict[str, Any]:
        logger.info(f"Analyzing risk/fraud for battery {battery_id}")
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", (
                "You are a Battery Fraud & Risk detection AI. Output ONLY raw JSON:\n"
                "{{\n"
                "  \"battery_id\": \"string\",\n"
                "  \"is_fraud\": boolean,\n"
                "  \"risk_score\": number (0.0 to 1.0),\n"
                "  \"fraud_flags\": [\"string\"],\n"
                "  \"reasoning\": \"string\",\n"
                "  \"recommendation\": \"string\"\n"
                "}}\n"
                "Strictly NO preamble."
            )),
            ("user", "ID: {battery_id}, Telemetry: {telemetry_json}")
        ])
        
        chain = prompt | self.llm
        try:
            response = chain.invoke({
                "battery_id": battery_id,
                "telemetry_json": json.dumps(telemetry)
            })
            content = response.content.strip()
            if content.startswith("```"):
                content = re.sub(r"```(json)?\n?|\n?```", "", content)
            
            data = json.loads(content)
            data["risk_score"] = safe_float(data.get("risk_score", 0))
            data["is_fraud"] = str(data.get("is_fraud", "false")).lower() == "true"
            data["battery_id"] = battery_id
            return data
        except Exception as e:
            logger.error(f"Risk parsing failed: {e}")
            return {
                "battery_id": battery_id,
                "is_fraud": False,
                "risk_score": 0.0,
                "fraud_flags": [],
                "reasoning": "System stability fallback.",
                "recommendation": "Manual review"
            }

if __name__ == "__main__":
    agent = RiskAgent()
    print(agent.run("BATT-1", {"soh": 85}))
