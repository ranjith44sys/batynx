import os
from dotenv import load_dotenv

# Load main .env
load_dotenv()
# Load .env.supabase specifically if it exists
load_dotenv(".env.supabase")

from supabase import create_client, Client

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")

if url and key:
    supabase: Client = create_client(url, key)
else:
    supabase = None
