from typing import TypedDict
from langgraph.graph import StateGraph, END
from .schemas import MarketState, MarketIntelligenceReport
from .tools import scrape_market_data
from .logic import market_analyst_node

class MarketAgentState(TypedDict):
    input: dict # {battery_id, chemistry, capacity_kwh, condition, seller_asking_price}
    market_state: dict # Populated by scraper
    final_report: MarketIntelligenceReport

def scraper_node(state: MarketAgentState) -> dict:
    """
    Gathers real-time market signals via the web scraping tool.
    """
    input_data = state["input"]
    scraped_data = scrape_market_data(input_data["chemistry"])
    
    # Merge input with scraped results
    market_state = {
        **input_data,
        **scraped_data
    }
    
    return {"market_state": market_state}

# Build the Graph
builder = StateGraph(MarketAgentState)

builder.add_node("scraper", scraper_node)
builder.add_node("analyst", market_analyst_node)

builder.set_entry_point("scraper")
builder.add_edge("scraper", "analyst")
builder.add_edge("analyst", END)

market_graph = builder.compile()
