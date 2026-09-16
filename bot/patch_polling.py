import re

with open("polling_dev.py", "r", encoding="utf-8") as f:
    text = f.read()

callback_logic = """
async def process_callback_query(callback_query: dict) -> None:
    chat_id = callback_query["message"]["chat"]["id"]
    data = callback_query["data"]
    message_id = callback_query["message"]["message_id"]
    
    # Ex: confirm_uuid, cancel_uuid
    if "_" not in data: return
    action_type, action_id = data.split("_", 1)
    
    from app.services.fast_track import get_supabase
    sb = await get_supabase()
    
    res = await sb.table("pending_actions").select("*").eq("id", action_id).execute()
    if not res.data:
        from app.services.telegram import send_message
        await send_message(chat_id, "Essa a\u00e7\u00e3o j\u00e1 expirou ou foi processada.")
        return
        
    action = res.data[0]
    if action["status"] != "pending":
        from app.services.telegram import send_message
        await send_message(chat_id, f"Esta a\u00e7\u00e3o j\u00e1 foi resolvida (status: {action['status']}).")
        return
        
    if action_type == "cancel":
        await sb.table("pending_actions").update({"status": "rejected"}).eq("id", action_id).execute()
        from app.services.telegram import send_message
        await send_message(chat_id, "\u274c A\u00e7\u00e3o cancelada.")
        return
        
    if action_type == "confirm":
        # Executar!
        intent = action["intent"]
        payload = action["payload"]
        if intent == "task_delete":
            await sb.table("tasks").delete().eq("seq_id", int(payload["seq_id"])).execute()
            from app.services.telegram import send_message
            await send_message(chat_id, f"\u2705 Tarefa apagada com sucesso!")
        elif intent == "transaction_create":
            await sb.table("transactions").insert(payload).execute()
            from app.services.telegram import send_message
            await send_message(chat_id, f"\u2705 Despesa lan\u00e7ada no livro-caixa!")
            
        await sb.table("pending_actions").update({"status": "approved"}).eq("id", action_id).execute()
"""

# Insert it before poll_updates
text = text.replace('async def poll_updates() -> None:', callback_logic + '\nasync def poll_updates() -> None:')

# In poll_updates, add support for callback_query
old_loop = """                    message = update.get("message") or update.get("edited_message")
                    if message:
                        try:
                            await process_message(message)
                        except Exception:
                            logger.exception("Erro ao processar mensagem")"""

new_loop = """                    if "callback_query" in update:
                        try:
                            await process_callback_query(update["callback_query"])
                        except Exception:
                            logger.exception("Erro ao processar callback")
                    
                    message = update.get("message") or update.get("edited_message")
                    if message:
                        try:
                            await process_message(message)
                        except Exception:
                            logger.exception("Erro ao processar mensagem")"""

text = text.replace(old_loop, new_loop)

with open("polling_dev.py", "w", encoding="utf-8") as f:
    f.write(text)

print("polling_dev.py patched!")