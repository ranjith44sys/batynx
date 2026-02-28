import os
import json
import logging
from typing import List, Dict, Optional
from app.supabase_client import supabase

logger = logging.getLogger(__name__)
STOPWORDS = {"what", "is", "the", "a", "an", "of", "for", "with", "recommend", "show", "me", "?"}

class LocalStorage:
    def __init__(self):
        pass

    def recommend_batteries(self, requirements: str) -> List[Dict]:
        """
        Recommend batteries by querying the `battery_recycle` and `batteries` tables.
        """
        if not supabase:
            logger.error("Supabase client not initialized. Cannot fetch batteries.")
            return []

        try:
            # Fetch batteries that are in the recycle/second-life pipeline
            # We join with the 'batteries' table to get capacity, chemistry, etc.
            response = supabase.table("battery_recycle").select(
                "*, batteries(*)"
            ).execute()
            
            items = response.data
            if not items: return []
            
            # If no specific requirements, just return the first 3
            if not requirements or requirements.strip().lower() == "i need batteries" or requirements.strip().lower() == "show me batteries":
                return self._format_results(items[:3])

            # Simple relevance scoring
            req_lower = requirements.lower()
            query_words = [word for word in req_lower.split() if word not in STOPWORDS]
            
            matches = []
            for item in items:
                score = 0
                item_str = json.dumps(item).lower()
                for word in query_words:
                    if word in item_str:
                        score += 1
                
                if score > 0:
                    item["match_score"] = score
                    matches.append(item)
            
            matches.sort(key=lambda x: x.get("match_score", 0), reverse=True)
            return self._format_results(matches[:3])
            
        except Exception as e:
            logger.error(f"Supabase fetch error: {e}")
            return []
            
    def _format_results(self, raw_items: List[Dict]) -> List[Dict]:
        """Flatten the joined Supabase data for the agents."""
        formatted = []
        for item in raw_items:
            batt_info = item.get("batteries", {})
            formatted.append({
                "battery_id": item.get("battery_id"),
                "lifecycle_state": item.get("lifecycle_state"),
                "decommissioning_reason": item.get("decommissioning_reason"),
                "capacity_kwh": batt_info.get("capacity_kwh"),
                "chemistry": batt_info.get("battery_chemistry"),
                "manufacturing_date": batt_info.get("manufacturing_date")
            })
        return formatted
