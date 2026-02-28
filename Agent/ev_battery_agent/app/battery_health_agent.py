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

class HealthReport(BaseModel):
    battery_id: str
    final_grade: str
    soh_percentage: float
    rul_cycles: float
    hazardous: bool
    reasoning: str
    report_md: str

class BatteryHealthAgent:
    def __init__(self):
        self.llm = llm

    def run(self, battery_id: str, telemetry: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        logger.info(f"Analyzing health for battery {battery_id}")
        
        data = telemetry or {}
        
        # If no explicit telemetry, fetch the latest snapshot from Supabase
        if not data.get("current_soh_percent") and supabase:
            try:
                # Get the most recent telemetry snapshot
                res = supabase.table("telemetry_snapshots")\
                    .select("*")\
                    .eq("battery_id", battery_id)\
                    .order("snapshot_timestamp", desc=True)\
                    .limit(1)\
                    .execute()
                
                if res.data:
                    snap = res.data[0]
                    data["simulated_soh"] = snap.get("current_soh_percent", 85.0)
                    data["current_temp"] = snap.get("avg_temperature_c", 25.0)
                    data["simulated_rul"] = 2000 - snap.get("mileage_km", 0) // 100 # Rough estimate
            except Exception as e:
                logger.error(f"Supabase telemetry fetch failed: {e}")
                
        # Final fallback if still empty
        if not data:
            data = {"simulated_soh": 85.0, "simulated_rul": 1800, "current_temp": 25.0}
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", (
                "You are an expert Battery Health Assessment AI. Output ONLY raw JSON:\n"
                "{{\n"
                "  \"battery_id\": \"string\",\n"
                "  \"final_grade\": \"A/B/C/Recycle\",\n"
                "  \"soh_percentage\": number,\n"
                "  \"rul_cycles\": number,\n"
                "  \"hazardous\": boolean,\n"
                "  \"reasoning\": \"string\",\n"
                "  \"report_md\": \"string summary\"\n"
                "}}\n"
                "Strictly NO preamble."
            )),
            ("user", "ID: {battery_id}, Specs: {specs_json}")
        ])
        
        chain = prompt | self.llm
        try:
            response = chain.invoke({
                "battery_id": battery_id,
                "specs_json": json.dumps(data)
            })
            content = response.content.strip()
            if content.startswith("```"):
                content = re.sub(r"```(json)?\n?|\n?```", "", content)
            
            data_out = json.loads(content)
            data_out["soh_percentage"] = safe_float(data_out.get("soh_percentage", 0))
            data_out["rul_cycles"] = safe_float(data_out.get("rul_cycles", 0))
            data_out["hazardous"] = str(data_out.get("hazardous", "false")).lower() == "true"
            data_out["battery_id"] = battery_id
            return data_out
        except Exception as e:
            logger.error(f"Health parsing failed: {e}")
            return {
                "battery_id": battery_id,
                "final_grade": "Unknown",
                "soh_percentage": 0.0,
                "rul_cycles": 0,
                "hazardous": False,
                "reasoning": "Fallback due to processing error.",
                "report_md": "Health data processing mismatch."
            }
