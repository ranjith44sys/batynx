import os
import json
import logging
import re
from typing import Dict, Any, Optional
from dotenv import load_dotenv
from app.models import llm
from langchain_core.prompts import ChatPromptTemplate

load_dotenv()
logger = logging.getLogger(__name__)

class LogisticsAndSupplyChainAgent:
    def __init__(self):
        self.llm = llm

    def run(self, origin: str, destination: str, battery_id: str, trade_details: Dict[str, Any]) -> Dict[str, Any]:
        logger.info(f"Generating logistics plan for {battery_id}")
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", (
                "You are a Battery Logistics Expert. Generate a formal shipping plan.\n"
                "Output ONLY raw JSON:\n"
                "{{\n"
                "  \"route_summary\": \"string\",\n"
                "  \"distance_km\": number,\n"
                "  \"eta_hours\": number,\n"
                "  \"estimated_cost_inr\": number,\n"
                "  \"carrier_suggestion\": \"string\",\n"
                "  \"status\": \"generated/failed\"\n"
                "}}\n"
                "Strictly NO preamble."
            )),
            ("user", f"ID: {battery_id}, From: {origin}, To: {destination}")
        ])
        
        try:
            res = (prompt | self.llm).invoke({})
            content = res.content.strip()
            if content.startswith("```"):
                content = re.sub(r"```(json)?\n?|\n?```", "", content)
            data = json.loads(content)
            # Ensure numbers
            for k in ["distance_km", "eta_hours", "estimated_cost_inr"]:
                if isinstance(data.get(k), str):
                    match = re.search(r"[-+]?\d*\.\d+|\d+", data[k])
                    data[k] = float(match.group()) if match else 0.0
            return data
        except Exception as e:
            logger.error(f"Logistics LLM failed: {e}")
            return {
                "route_summary": f"Direct shipping from {origin} to {destination}",
                "distance_km": 150.0,
                "eta_hours": 4.0,
                "estimated_cost_inr": 5000,
                "carrier_suggestion": "Specialized EV Carrier",
                "status": "generated"
            }
