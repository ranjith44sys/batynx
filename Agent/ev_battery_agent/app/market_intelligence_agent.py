import os
import logging
import json
import re
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from app.models import llm
from app.supabase_client import supabase

logger = logging.getLogger(__name__)

def safe_float(val):
    if isinstance(val, (int, float)): return float(val)
    if isinstance(val, str):
        match = re.search(r"[-+]?\d*\.\d+|\d+", val)
        if match: return float(match.group())
    return 0.0

class MarketReport(BaseModel):
    battery_id: str
    suggested_range_min: float
    suggested_range_max: float
    optimal_price: float
    market_verdict: str
    reasoning: str
    demand_index: str

class MarketIntelligenceAgent:
    def __init__(self):
        self.llm = llm

    def _load_market_context(self, battery_id: str) -> Dict[str, Any]:
        """Fetch battery details from Supabase batteries table context."""
        if supabase:
            try:
                res = supabase.table("batteries").select("*").eq("battery_id", battery_id).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.error(f"Supabase market context fetch failed: {e}")
        return {}

    def calculate_price(self, battery_id: str, technical_specs: Dict[str, Any], seller_price: float = 0.0) -> Dict[str, Any]:
        logger.info(f"Analyzing market value for battery {battery_id}")
        context = self._load_market_context(battery_id)
        
        # Inject context into specs if missing
        if "chemistry" not in technical_specs and context.get("battery_chemistry"):
            technical_specs["chemistry"] = context.get("battery_chemistry")
        if "capacity_kwh" not in technical_specs and context.get("capacity_kwh"):
            technical_specs["capacity_kwh"] = context.get("capacity_kwh")
            
        demand = "Medium" # Default if not explicitly stored in basic schema
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", (
                "You are an expert Battery Market Analyst. Output ONLY raw JSON:\n"
                "{{\n"
                "  \"battery_id\": \"string\",\n"
                "  \"suggested_range_min\": number,\n"
                "  \"suggested_range_max\": number,\n"
                "  \"optimal_price\": number,\n"
                "  \"market_verdict\": \"Buyer's/Seller's/Balanced\",\n"
                "  \"reasoning\": \"string\",\n"
                "  \"demand_index\": \"High/Medium/Low\"\n"
                "}}\n"
                "Strictly NO preamble."
            )),
            ("user", "ID: {battery_id}, Demand: {demand}, Specs: {specs_json}")
        ])
        
        chain = prompt | self.llm
        try:
            response = chain.invoke({
                "battery_id": battery_id,
                "demand": demand,
                "specs_json": json.dumps(technical_specs)
            })
            content = response.content.strip()
            if content.startswith("```"):
                content = re.sub(r"```(json)?\n?|\n?```", "", content)
            
            data = json.loads(content)
            data["optimal_price"] = safe_float(data.get("optimal_price", 0))
            data["suggested_range_min"] = safe_float(data.get("suggested_range_min", 0))
            data["suggested_range_max"] = safe_float(data.get("suggested_range_max", 0))
            data["battery_id"] = battery_id
            return data
        except Exception as e:
            logger.error(f"Market parsing failed: {e}")
            return {
                "battery_id": battery_id,
                "suggested_range_min": 0.0,
                "suggested_range_max": 0.0,
                "optimal_price": 0.0,
                "market_verdict": "Unknown",
                "reasoning": "Fallback market analysis.",
                "demand_index": demand
            }
