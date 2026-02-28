import os
import json
import logging
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
from app.models import llm
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Structured Output Schema ---
class LearningOutput(BaseModel):
    stored: bool = Field(description="Whether the data was stored in vector DB")
    vector_id: Optional[str] = Field(description="ID of the stored vector")
    insights: List[str] = Field(description="Key insights from current and past trades")
    improvement_suggestions: List[str] = Field(description="Actionable suggestions for future trades")
    trade_stats_summary: Dict[str, Any] = Field(description="Statistical summary of the trade")
    similar_past_trades: List[Dict[str, Any]] = Field(description="Details of similar historical trades")
    error: Optional[str] = Field(description="Error message if any")

from app.models import llm

# --- Agent Definition ---
class DataAggregationAndContinuousLearningAgent:
    def __init__(self):
        # Standardized to global model config
        self.llm = llm.with_structured_output(LearningOutput)

    def run(self, full_trade_summary: Dict[str, Any]) -> Dict[str, Any]:
        battery_id = full_trade_summary.get("battery_id", "unknown")
        logger.info(f"Aggregating data and learning for battery: {battery_id}")
        
        try:
            # Generate insights using the LLM
            prompt = ChatPromptTemplate.from_template(
                "Analyze this trade summary for battery {battery_id}: {details}. "
                "Provide insights and improvement suggestions."
            )
            
            chain = prompt | self.llm
            result = chain.invoke({
                "battery_id": battery_id,
                "details": json.dumps(full_trade_summary)
            })
            
            output = result.dict()
            output["stored"] = False  # Vector storage mocked
            output["vector_id"] = "mock_vid"
            output["similar_past_trades"] = []
            
            return output

        except Exception as e:
            logger.error(f"Learning agent failed: {str(e)}")
            return {
                "stored": False,
                "insights": ["Analysis simulated due to environment limitations."],
                "improvement_suggestions": ["Ensure API keys are configured for full features."],
                "error": str(e)
            }

if __name__ == "__main__":
    agent = DataAggregationAndContinuousLearningAgent()
    print(agent.run({"battery_id": "TEST-123"}))
