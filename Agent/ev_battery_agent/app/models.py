from langchain_groq import ChatGroq
import os
from dotenv import load_dotenv

load_dotenv()

# Primary Model (70B) - High reasoning
llm_70b = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
    max_retries=3,
    timeout=60,
    max_tokens=1024
)

# Secondary Model (8B) - Lower reasoning, higher rate limits
llm_8b = ChatGroq(
    model="llama-3.1-8b-instant",
    api_key=os.getenv("GROQ_API_KEY"),
    max_retries=10,
    timeout=30,
    max_tokens=800
)

# Default LLM exported to all agents
# We switch to 8B by default to avoid the 429 error during sequential multi-agent runs
llm = llm_8b