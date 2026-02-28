import asyncio
import os
from dotenv import load_dotenv

def test_supabase():
    load_dotenv()
    from app.supabase_client import supabase
    if not supabase:
        print("Supabase client failed to initialize.")
        return
        
    print("Testing Supabase connection...")
    try:
        res = supabase.table("battery_recycle").select("*, batteries(*)").limit(1).execute()
        print(f"Connection Successful! Fetched {len(res.data)} records from battery_recycle.")
        for r in res.data:
            print(f" - ID: {r.get('battery_id')}, State: {r.get('lifecycle_state')}")
            b = r.get("batteries", {})
            if b:
                print(f"   - Capacity: {b.get('capacity_kwh')} kWh, Chemistry: {b.get('battery_chemistry')}")
    except Exception as e:
        print(f"Supabase connection failed: {e}")

if __name__ == "__main__":
    test_supabase()
