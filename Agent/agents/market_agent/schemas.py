from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum

class BatteryChemistry(str, Enum):
    LFP = "LFP"
    NMC = "NMC"

class MarketState(BaseModel):
    battery_id: str
    chemistry: BatteryChemistry
    capacity_kwh: float
    soh: float = Field(..., description="State of Health as a percentage (0-100)")
    rul: float = Field(..., description="Remaining Useful Life in cycles")
    cycle_count: int = Field(..., description="Total charge/discharge cycles completed")
    max_temp: float = Field(..., description="Maximum peak temperature recorded (°C)")
    seller_asking_price: float # Total price in USD
    
    # Scraped Metrics (populated by tools)
    current_demand_level: str = "Medium" # Low, Medium, High
    avg_market_price_per_kwh: float = 0.0

class MarketIntelligenceReport(BaseModel):
    battery_id: str
    estimated_soh: float 
    suggested_range_min: float
    suggested_range_max: float
    optimal_price: float
    market_verdict: str # Fair, Overpriced, Bargain
    reasoning: str
