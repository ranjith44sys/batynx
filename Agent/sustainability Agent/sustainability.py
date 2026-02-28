"""
EV Battery Sustainability & Impact Agent
==========================================
Improved version for low-credit environments.
Uses Google Gemini Flash via OpenRouter for cost efficiency.
Outputs logged to sustainability_agent_output.txt.
"""

import os
import json
import math
from typing import Optional
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

# ─────────────────────────────────────────────
# 1. DATA SOURCES
# ─────────────────────────────────────────────

EV_BATTERY_EMISSION_FACTORS = {
    "LFP": {"manufacturing_kg_co2_per_kwh": 60.0, "recycling_kg_co2_per_kwh": 10.0, "second_life_kg_co2_per_kwh": 3.5, "raw_material_kg_co2_per_kwh": 20.0, "end_of_life_landfill_per_kwh": 25.0},
    "NMC": {"manufacturing_kg_co2_per_kwh": 85.0, "recycling_kg_co2_per_kwh": 12.0, "second_life_kg_co2_per_kwh": 4.0, "raw_material_kg_co2_per_kwh": 30.0, "end_of_life_landfill_per_kwh": 30.0},
    "NCA": {"manufacturing_kg_co2_per_kwh": 90.0, "recycling_kg_co2_per_kwh": 13.0, "second_life_kg_co2_per_kwh": 4.5, "raw_material_kg_co2_per_kwh": 32.0, "end_of_life_landfill_per_kwh": 32.0},
    "LMFP": {"manufacturing_kg_co2_per_kwh": 55.0, "recycling_kg_co2_per_kwh": 9.0, "second_life_kg_co2_per_kwh": 3.0, "raw_material_kg_co2_per_kwh": 18.0, "end_of_life_landfill_per_kwh": 22.0},
    "LTO": {"manufacturing_kg_co2_per_kwh": 110.0, "recycling_kg_co2_per_kwh": 15.0, "second_life_kg_co2_per_kwh": 5.0, "raw_material_kg_co2_per_kwh": 38.0, "end_of_life_landfill_per_kwh": 35.0},
}

CRITICAL_MINERALS = {
    "lithium": {"co2_per_kg": 5.3, "recyclability_pct": 70},
    "cobalt": {"co2_per_kg": 8.1, "recyclability_pct": 90},
    "nickel": {"co2_per_kg": 6.5, "recyclability_pct": 85},
    "manganese": {"co2_per_kg": 1.8, "recyclability_pct": 75},
    "graphite": {"co2_per_kg": 3.2, "recyclability_pct": 65},
    "copper": {"co2_per_kg": 3.4, "recyclability_pct": 95},
    "aluminum": {"co2_per_kg": 11.5, "recyclability_pct": 98},
}

INDIA_EV_STATS = {
    "grid_emission_factor_kg_co2_per_kwh": 0.716,
    "carbon_credit_price_inr_per_tonne": 850,
    "carbon_credit_price_usd_per_tonne": 10.2,
    "ev_battery_capacity_avg_kwh": 40,
}

BATTERY_SOH_THRESHOLDS = {
    "excellent": (90, 100, "Prime EV use"),
    "good": (80, 90, "Good EV use"),
    "second_life": (60, 80, "Ideal for 2nd life storage"),
    "degraded": (40, 60, "Low-power applications"),
    "recycle": (0, 40, "End-of-life"),
}

SECOND_LIFE_APPLICATIONS = {
    "grid_storage": {"min_soh": 70, "co2_benefit_multiplier": 1.8, "revenue_inr_per_kwh": 3500},
    "solar_home_storage": {"min_soh": 65, "co2_benefit_multiplier": 1.6, "revenue_inr_per_kwh": 3000},
    "ev_charging_buffer": {"min_soh": 70, "co2_benefit_multiplier": 1.7, "revenue_inr_per_kwh": 3200},
    "telecom_backup": {"min_soh": 60, "co2_benefit_multiplier": 1.4, "revenue_inr_per_kwh": 2800},
    "industrial_ups": {"min_soh": 55, "co2_benefit_multiplier": 1.3, "revenue_inr_per_kwh": 2500},
    "rural_microgrids": {"min_soh": 65, "co2_benefit_multiplier": 2.0, "revenue_inr_per_kwh": 3800},
}

# ─────────────────────────────────────────────
# 2. TOOLS
# ─────────────────────────────────────────────

def calculate_ev_battery_co2_savings(battery_chemistry: str, capacity_kwh: float, scenario: str = "second_life_vs_recycle", quantity: int = 1):
    chem = battery_chemistry.upper()
    if chem not in EV_BATTERY_EMISSION_FACTORS: return {"error": "Invalid chemistry"}
    factors = EV_BATTERY_EMISSION_FACTORS[chem]
    total_kwh = capacity_kwh * quantity
    if scenario == "second_life_vs_recycle":
        b, i = factors["recycling_kg_co2_per_kwh"] * total_kwh, factors["second_life_kg_co2_per_kwh"] * total_kwh
    else:
        b, i = factors["end_of_life_landfill_per_kwh"] * total_kwh, factors["second_life_kg_co2_per_kwh"] * total_kwh
    saved_kg = b - i
    return {"battery": chem, "capacity": total_kwh, "co2_saved_kg": round(saved_kg, 2), "trees": round(saved_kg/21.77, 1)}

def ev_battery_lifecycle_assessment(battery_chemistry: str, capacity_kwh: float, usage_years: float = 8):
    chem = battery_chemistry.upper()
    f = EV_BATTERY_EMISSION_FACTORS.get(chem)
    if not f: return {"error": "Invalid chem"}
    raw = f["raw_material_kg_co2_per_kwh"] * capacity_kwh
    mfg = f["manufacturing_kg_co2_per_kwh"] * capacity_kwh
    use = capacity_kwh * 0.18 * 15000 * usage_years * 0.716 * 0.5 # Simplified
    total = raw + mfg + use
    return {"chem": chem, "total_kg_co2": round(total, 0), "mfg_impact": round(mfg, 0)}

def assess_battery_health_and_second_life(battery_chemistry: str, capacity_kwh: float, state_of_health_pct: float, age_years: float, total_cycles: int):
    soh = state_of_health_pct
    state = "recycle" if soh < 40 else ("second_life" if soh < 80 else "good")
    eff_cap = capacity_kwh * (soh/100)
    rev = eff_cap * 3000 if state == "second_life" else 0
    return {"health": state, "effective_cap": round(eff_cap,1), "est_revenue_inr": round(rev,0)}

def critical_mineral_recovery_analysis(battery_chemistry: str, capacity_kwh: float, quantity: int = 1):
    comp = {"NMC": {"li": 0.1, "ni": 0.35, "co": 0.12}, "LFP": {"li": 0.11, "fe": 0.5}}.get(battery_chemistry.upper(), {"li": 0.1})
    total_kwh = capacity_kwh * quantity
    out = {m: round(k*total_kwh*0.8, 2) for m, k in comp.items()}
    return {"recovered_minerals_kg": out, "total_value_inr": round(total_kwh * 500, 0)}

def get_india_ev_battery_market_context():
    return {"rules": "Battery Waste Management Rules 2022", "goal": "30% EV by 2030", "grid_factor": 0.716}

def suggest_ev_battery_certifications(stage: str, co2_savings_tonnes: float, battery_chemistry: str):
    return {"certs": ["BIS IS 17481", "AIS 156", "ISO 14001"], "verra_eligible": co2_savings_tonnes > 50}

def calculate_ev_battery_eco_premium(battery_chemistry: str, capacity_kwh: float, base_price_inr: float, soh_pct: float = 80):
    premium = base_price_inr * 0.1
    return {"final_price_inr": round(base_price_inr + premium, 0), "premium_inr": round(premium, 0)}

def get_verra_ev_battery_credits(co2_tonnes: float):
    return {"vcus": math.floor(co2_tonnes), "value_usd": round(co2_tonnes * 10, 2)}

# ─────────────────────────────────────────────
# 3. AGENT CONFIG
# ─────────────────────────────────────────────

TOOLS = [
    {"type": "function", "function": {"name": "calculate_ev_battery_co2_savings", "description": "CO2 savings for batteries.", "parameters": {"type": "object", "properties": {"battery_chemistry": {"type": "string"}, "capacity_kwh": {"type": "number"}, "scenario": {"type": "string"}}, "required": ["battery_chemistry", "capacity_kwh"]}}},
    {"type": "function", "function": {"name": "ev_battery_lifecycle_assessment", "description": "LCA for batteries.", "parameters": {"type": "object", "properties": {"battery_chemistry": {"type": "string"}, "capacity_kwh": {"type": "number"}}, "required": ["battery_chemistry", "capacity_kwh"]}}},
    {"type": "function", "function": {"name": "assess_battery_health_and_second_life", "description": "Battery health check.", "parameters": {"type": "object", "properties": {"battery_chemistry": {"type": "string"}, "capacity_kwh": {"type": "number"}, "state_of_health_pct": {"type": "number"}, "age_years": {"type": "number"}, "total_cycles": {"type": "integer"}}, "required": ["battery_chemistry", "capacity_kwh", "state_of_health_pct", "age_years", "total_cycles"]}}},
    {"type": "function", "function": {"name": "critical_mineral_recovery_analysis", "description": "Mineral recovery potential.", "parameters": {"type": "object", "properties": {"battery_chemistry": {"type": "string"}, "capacity_kwh": {"type": "number"}}, "required": ["battery_chemistry", "capacity_kwh"]}}},
    {"type": "function", "function": {"name": "get_india_ev_battery_market_context", "description": "India market info.", "parameters": {"type": "object", "properties": {}}}},
]

TOOL_FUNCTIONS = {
    "calculate_ev_battery_co2_savings": calculate_ev_battery_co2_savings,
    "ev_battery_lifecycle_assessment": ev_battery_lifecycle_assessment,
    "assess_battery_health_and_second_life": assess_battery_health_and_second_life,
    "critical_mineral_recovery_analysis": critical_mineral_recovery_analysis,
    "get_india_ev_battery_market_context": get_india_ev_battery_market_context,
}

def dispatch_tool(name: str, args: dict):
    f = TOOL_FUNCTIONS.get(name)
    if not f: return json.dumps({"error": "not found"})
    return json.dumps(f(**args))

SYSTEM_PROMPT = "You are an EV Battery Sustainability Agent. Use tools to provide CO2 and mineral data."

class EVBatterySustainabilityAgent:
    def __init__(self, api_key: str = "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"):
        self.client = OpenAI(api_key=api_key, base_url="https://openrouter.ai/api/v1")
        self.model = "google/gemini-2.0-flash-001"
        self.conversation = []
        with open("sustainability_agent_output.txt", "w") as f: f.write("LOG START\n\n")

    def chat(self, user_msg: str) -> str:
        self.conversation.append({"role": "user", "content": user_msg})
        self._log(f"U: {user_msg}")
        while True:
            resp = self.client.chat.completions.create(model=self.model, messages=[{"role": "system", "content": SYSTEM_PROMPT}] + self.conversation, tools=TOOLS, max_tokens=300)
            msg = resp.choices[0].message
            self.conversation.append(msg)
            if not msg.tool_calls:
                self._log(f"A: {msg.content}")
                return msg.content or ""
            for tc in msg.tool_calls:
                res = dispatch_tool(tc.function.name, json.loads(tc.function.arguments))
                self.conversation.append({"role": "tool", "tool_call_id": tc.id, "content": res})
                self._log(f"T: {tc.function.name} -> {res}")

    def _log(self, txt):
        with open("sustainability_agent_output.txt", "a") as f: f.write(txt + "\n\n")

def run_interactive():
    agent = EVBatterySustainabilityAgent()
    print("Agent Ready. Type 'quit' to exit.")
    while True:
        u = input("You: ").strip()
        if u.lower() in ("quit", "exit"): break
        if not u: continue
        print("\nAgent: ", end="")
        print(agent.chat(u) + "\n")

if __name__ == "__main__":
    run_interactive()