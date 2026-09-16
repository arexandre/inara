import re

with open("app/services/scheduler.py", "r", encoding="utf-8") as f:
    text = f.read()

# Auto archive logic in resumo_matinal
old_resumo_start = """async def resumo_matinal():
    try:
        logger.info("Executando Resumo Matinal com Calendário...")
        now = datetime.now(BRT)
        hoje_iso = now.strftime("%Y-%m-%d")
        
        clima = await get_weather("Araguari,BR", "hoje")
        sb = await get_supabase()"""

new_resumo_start = """async def resumo_matinal():
    try:
        logger.info("Executando Resumo Matinal com Calendário...")
        now = datetime.now(BRT)
        hoje_iso = now.strftime("%Y-%m-%d")
        
        sb = await get_supabase()
        
        # Auto-archive tasks feitas h\u00e1 mais de 3 dias
        import datetime as dt
        from app.logger import BRT
        tres_dias = (dt.datetime.now(BRT) - dt.timedelta(days=3)).strftime("%Y-%m-%d")
        await sb.table("tasks").update({"is_archived": True}).eq("status", "done").lte("completed_at", tres_dias).execute()
        
        clima = await get_weather("Araguari,BR", "hoje")"""

text = text.replace(old_resumo_start, new_resumo_start)

old_reply = """        reply = response.text.strip()
        
        await broadcast_to_residents(reply)"""

new_reply = """        reply = response.text.strip()
        
        # Salva no di\u00e1rio
        await sb.table("daily_journal").insert({"content": reply}).execute()
        
        await broadcast_to_residents(reply)"""
text = text.replace(old_reply, new_reply)

with open("app/services/scheduler.py", "w", encoding="utf-8") as f:
    f.write(text)

print("scheduler.py patched!")