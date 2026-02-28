import logging
from typing import Optional, List, Dict
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from app.models import llm

logger = logging.getLogger(__name__)

class SearchDecision(BaseModel):
    tool: str = Field(description="Decision: 'search' to look up data, or 'none' if answer is known or no data needed.")
    reason: str = Field(description="Brief reason for the decision.")

class FinalAnswer(BaseModel):
    answer: str = Field(description="The final response to the user's question.")
    confidence: float = Field(description="Confidence level in the answer (0.0 to 1.0).")
    source_count: int = Field(description="Number of sources used to generate the answer.")

class BatterySearchAgent:
    def __init__(self):
        # We wrap the existing Groq LLM with structured output
        self.planner_llm = llm.with_structured_output(SearchDecision)
        self.answer_llm = llm.with_structured_output(FinalAnswer)

    def decide_search(self, question: str, history: List = None) -> SearchDecision:
        logger.info(f"Deciding search for: {question}")
        prompt = ChatPromptTemplate.from_template(
            "You are a battery expert assistant. Given the question, decide if you need to search the local storage for more details.\n"
            "Question: {question}\n"
            "History: {history}\n\n"
            "Return structured decision."
        )
        chain = prompt | self.planner_llm
        return chain.invoke({"question": question, "history": history or []})

    def generate_answer(self, question: str, retrieved_data: List[Dict], history: List = None) -> FinalAnswer:
        logger.info(f"Generating answer for: {question}")
        data_context = "\n".join([f"- {d['content']}" for d in retrieved_data]) if retrieved_data else "No data retrieved."
        
        prompt = ChatPromptTemplate.from_template(
            "Use thefollowing retrieved data to answer the user's question about EV batteries.\n"
            "If the information is not in the data, honestly say it's not available.\n\n"
            "Data:\n{data}\n\n"
            "History:\n{history}\n\n"
            "Question: {question}\n"
        )
        chain = prompt | self.answer_llm
        return chain.invoke({
            "question": question, 
            "data": data_context, 
            "history": history or []
        })
