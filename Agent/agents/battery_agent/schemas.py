from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum

class BatteryGrade(str, Enum):
    GRADE_A = "Grade A"  # High-capacity reuse (e.g., secondary EV use)
    GRADE_B = "Grade B"  # Medium-capacity reuse (e.g., stationary storage)
    GRADE_C = "Grade C"  # Low-capacity reuse (e.g., low-power backup)
    RECYCLE = "Recycle"  # End-of-life

class CycleData(BaseModel):
    V_avg: float
    V_min: float
    V_max: float
    I_avg: float
    T_avg: float
    T_min: float
    T_max: float

class BMSData(BaseModel):
    battery_id: str
    # A sequence of 20 cycles is required for the LSTM model
    cycles: List[CycleData] = Field(..., min_length=20, max_length=20, description="Last 20 cycles of performance data")
    voltage_anomaly: bool = Field(False, description="Flag for unusual voltage spikes/drops")
    current_temp: float = Field(..., description="Current temperature in Celsius")

class BatteryHealthReport(BaseModel):
    battery_id: str
    final_grade: BatteryGrade
    adjusted_rul: float
    is_hazardous: bool
    warnings: List[str]
    recommendation: str
