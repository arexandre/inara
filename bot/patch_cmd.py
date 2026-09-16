import re

with open("polling_dev.py", "r", encoding="utf-8") as f:
    text = f.read()

# Add poll_commands worker
sys_commands = """
async def check_system_commands():
    logger.info("Worker de System Commands iniciado.")
    from app.services.fast_track import get_supabase
    sb = await get_supabase()
    while True:
        try:
            res = await sb.table("system_commands").select("*").eq("executed", False).execute()
            if res.data:
                for cmd in res.data:
                    await sb.table("system_commands").update({"executed": True}).eq("id", cmd["id"]).execute()
                    
                    if cmd["command"] == "force_bom_dia":
                        from app.services.scheduler import resumo_matinal
                        await resumo_matinal()
                    elif cmd["command"] == "force_ping":
                        from app.services.scheduler import ping_de_ociosidade
                        await ping_de_ociosidade()
        except Exception as e:
            logger.error("Erro no worker de comandos: %s", e)
        await asyncio.sleep(5)
"""

text = text.replace('async def poll_updates() -> None:', sys_commands + '\nasync def poll_updates() -> None:')
text = text.replace('asyncio.create_task(start_ai_worker())', 'asyncio.create_task(start_ai_worker())\n    asyncio.create_task(check_system_commands())')

with open("polling_dev.py", "w", encoding="utf-8") as f:
    f.write(text)

print("polling_dev.py commands worker added!")