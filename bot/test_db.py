import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
sb = create_client(url, key)

try:
    res = sb.table("api_usage_logs").select("id").limit(1).execute()
    print("api_usage_logs EXISTS!")
except Exception as e:
    print(f"api_usage_logs ERROR: {e}")

try:
    res = sb.table("chat_history").select("id").limit(1).execute()
    print("chat_history EXISTS!")
except Exception as e:
    print(f"chat_history ERROR: {e}")