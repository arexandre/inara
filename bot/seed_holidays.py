import os
import asyncio
import holidays
from dotenv import load_dotenv
load_dotenv()

from datetime import datetime, date
from app.services.fast_track import get_supabase
from app.logger import BRT

async def populate_holidays():
    sb = await get_supabase()
    year = datetime.now(BRT).year
    
    # Check if holidays for this year are already populated
    try:
        res = await sb.table("events").select("id").eq("type", "holiday").gte("event_date", f"{year}-01-01").limit(1).execute()
        if res.data:
            print(f"Holidays for {year} already populated.")
            return
    except Exception as e:
        print("Erro ao checar tabela events:", e)
        return
        
    br_holidays = holidays.BR(years=year)
    br_holidays[date(year, 8, 28)] = "Aniversário de Araguari"
    br_holidays[date(year, 8, 6)] = "Senhor Bom Jesus (Padroeiro)"
    
    inserts = []
    for date_obj, name in br_holidays.items():
        inserts.append({
            "title": name,
            "event_date": date_obj.strftime("%Y-%m-%d"),
            "is_all_day": True,
            "type": "holiday"
        })
        
    if inserts:
        await sb.table("events").insert(inserts).execute()
        print(f"Inserted {len(inserts)} holidays for year {year} into DB!")

if __name__ == "__main__":
    asyncio.run(populate_holidays())