import logging
import json
import re
from typing import Dict, Any, List, Optional
from langchain_core.prompts import ChatPromptTemplate
from app.models import llm
from app.supabase_client import supabase

logger = logging.getLogger(__name__)

class BatteryRecommendationAgent:
    def __init__(self):
        self.llm = llm

    def run(self, user_query: str) -> List[Dict[str, Any]]:
        logger.info(f"[REC-AGENT] Finding recommendations for: {user_query}")
        
        if not supabase:
            logger.error("[REC-AGENT] Supabase client missing")
            return []

        try:
            # 1. Fetch available second-life batteries
            # We filter for is_sold = false and battery_status != 'Recycled'
            # Note: marketplace_listings or batteries table could be used.
            # Based on previous context, listSecondLifeBatteries filters for is_sold=false.
            res = supabase.table("batteries")\
                .select("*")\
                .eq("is_sold", False)\
                .eq("battery_status", "SecondLife")\
                .execute()
            
            candidates = res.data or []
            if not candidates:
                logger.warning("[REC-AGENT] No available batteries found in database.")
                return []

            # 2. Use LLM to match requirements
            prompt = ChatPromptTemplate.from_messages([
                ("system", (
                    "You are the Second-Life Battery Matchmaker. Your goal is to suggest the best 3 batteries from the candidate list for the user's use case.\n\n"
                    "CANDIDATE BATTERIES:\n"
                    "{candidates_json}\n\n"
                    "DECISION LOGIC:\n"
                    "- For SOLAR/STORAGE: Prefer high capacity (kWh) and LFP chemistry.\n"
                    "- For MINI-EV/DIY: Prefer high voltage (V) and compact size.\n"
                    "- For LOW COST: Suggest older units with slightly lower SoH if available.\n\n"
                    "Output ONLY a raw JSON list of the top 3 recommended batteries:\n"
                    "[{{\"battery_id\": \"ID\", \"reason\": \"Why this matches\", \"use_case_fit\": \"High/Medium\"}}]\n"
                    "Strictly NO preamble."
                )),
                ("user", "User Requirement: {query}")
            ])
            
            chain = prompt | self.llm
            response = chain.invoke({
                "candidates_json": json.dumps(candidates[:15]), # Limit to avoid token overflow
                "query": user_query
            })
            
            content = response.content.strip()
            logger.info(f"[REC-AGENT] Raw LLM Response: {content}")

            if not content:
                logger.warning("[REC-AGENT] Empty response from LLM")
                return []

            # More robust JSON extraction
            json_match = re.search(r'\[\s*\{.*\}\s*\]', content, re.DOTALL)
            if json_match:
                content = json_match.group(0)
            elif content.startswith("```"):
                content = re.sub(r"```(json)?\n?|\n?```", "", content).strip()
            
            try:
                recommendations = json.loads(content)
            except json.JSONDecodeError as je:
                logger.error(f"[REC-AGENT] JSON decode error: {je} | Content: {content}")
                return []
            
            # Enrich with basic specs from the candidates
            enriched = []
            for rec in recommendations:
                if not isinstance(rec, dict): continue
                bid = rec.get("battery_id")
                if not bid: continue
                
                match = next((c for c in candidates if c["battery_id"] == bid), None)
                if match:
                    rec.update({
                        "chemistry": match.get("battery_chemistry"),
                        "capacity_kwh": match.get("capacity_kwh"),
                        "manufacturer": match.get("manufacturer")
                    })
                enriched.append(rec)
                
            return enriched

        except Exception as e:
            logger.error(f"[REC-AGENT] Logic failed: {e}")
            return []
