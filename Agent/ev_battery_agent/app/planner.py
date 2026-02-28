import logging
import re
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from app.models import llm

logger = logging.getLogger(__name__)

class UserIntent(BaseModel):
    intent: str = Field(description="Intent: 'search' for info, 'trade' for workflow, 'logistics' for shipping, 'transaction' for payment, 'learning' for insights, 'health' for battery analysis, 'pricing' for market value, 'recommendation' for matching batteries to use cases.")
    battery_id: Optional[str] = Field(description="Extracted battery ID if mentioned.")
    trade_details: Optional[Dict[str, Any]] = Field(description="Extracted trade details.")
    reasoning: str = Field(description="Brief explanation of why this intent was chosen.")

class UnifiedPlanner:
    def __init__(self):
        self.llm = llm.with_structured_output(UserIntent)

    def analyze_input(self, question: str, history: List = None) -> UserIntent:
        logger.info(f"Analyzing intent for: {question}")
        prompt = ChatPromptTemplate.from_template(
            "You are an Second lifeEV Battery Orchestrator and selling agent.\n"
            "Decide if the user wants:\n"
            "1. SEARCH: General battery info.\n"
            "2. TRADE: Full business workflow (Tx -> Logistics -> Learning).\n"
            "3. LOGISTICS: Specific ETA/shipping questions.\n"
            "4. TRANSACTION: Specific payment/ledger/invoice questions.\n"
            "5. LEARNING: Specific insights/performance/historical stats questions.\n"
            "6. HEALTH: Health assessment, SoH, RUL, safety analysis.\n"
            "7. PRICING: Market pricing, fair range, value intelligence.\n"
            "8. RECOMMENDATION: Suggest specific batteries based on user requirements or use cases.\n\n"
            "CLASSIFICATION RULES:\n"
            "- If user mentions BUY, ORDER, PURCHASE, TRANSACTION, or typos like PURCHES/PURCHASED: Use 'transaction'.\n"
            "- If user asks about SoH, RUL, grading, or safety: Use 'health'.\n"
            "- If user asks about market value, fair price, or valuation: Use 'pricing'.\n"
            "- If user asks for SUGGESTIONS, RECOMMENDATIONS, or says 'I NEED A BATTERY FOR...': Use 'recommendation'.\n"
            "- For raw data lookup with no assessment: Use 'search'.\n\n"
            "Current Input: {question}\n"
        )
        chain = prompt | self.llm
        result = chain.invoke({"question": question})
        
        # Aggressive Regex Fallback: If LLM missed the ID, find it via regex
        # But only if it looks like a real ID: BAT- followed by something, not just the word "battery" in a sentence
        if not result.battery_id and result.intent not in ["recommendation"]:
            # Pattern for: BAT-XXXX, Battery-XXXX, BatteryXXXX
            match = re.search(r'(?i)\b(bat-([a-z0-9\-]{2,})|battery\s*-\s*([a-z0-9\-]{2,})|battery\s+([a-z0-9\-]{2,}))\b', question)
            if match:
                # Extract the ID part
                found = match.group(0).upper()
                if "-" in found:
                    extracted = found.split("-")[-1].strip()
                elif " " in found:
                    extracted = found.split(" ")[-1].strip()
                else:
                    extracted = found.replace("BATTERY", "").strip()
                
                if extracted and len(extracted) >= 2:
                    result.battery_id = f"BAT-{extracted}"
                    logger.info(f"Regex extracted missing battery_id: {result.battery_id}")
                
        return result
