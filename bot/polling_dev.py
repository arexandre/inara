"""
Inara Bot ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Modo Polling (desenvolvimento local).

Em vez de receber webhooks, este script busca updates via getUpdates.
Use apenas para desenvolvimento. Em producao, use o webhook via FastAPI.

Uso: python polling_dev.py
"""

import asyncio
import json
import logging
import os
import sys

import httpx
from dotenv import load_dotenv

# Adicionar o diretÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³rio raiz ao path
sys.path.insert(0, os.path.dirname(__file__))

load_dotenv()

from app.logger import logger
from app.services.fast_track import handle_fast_track
from app.services.telegram import send_message
from app.services.scheduler import start_scheduler
from app.services.ai import start_ai_worker
import asyncio

TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
API_BASE = f"https://api.telegram.org/bot{TOKEN}"

FAST_TRACK_COMMANDS = {
    "/start":    "_cmd_start",
    "/lista":    "_cmd_lista",
    "/pix":      "_cmd_pix",
    "/tarefas":  "_cmd_tarefas",
    "/mercado":  "_cmd_mercado",
    "/ajuda":    "_cmd_ajuda",
    "/help":     "_cmd_ajuda",
}


async def process_message(message: dict) -> None:
    """Processa uma mensagem recebida via polling."""
    chat_id = message["chat"]["id"]
    text = message.get("text", "").strip()
    
    # Suporte a mÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­dia (voz / imagem)
    media_bytes = None
    media_mime = None
    
    if "voice" in message:
        from app.services.telegram import download_file
        file_id = message["voice"]["file_id"]
        media_mime = message["voice"].get("mime_type", "audio/ogg")
        media_bytes = await download_file(file_id)
        if not text:
            text = "[Mensagem de Voz]"
            
    elif "photo" in message:
        from app.services.telegram import download_file
        # photos ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â© uma lista (vÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡rios tamanhos), pega o maior
        file_id = message["photo"][-1]["file_id"]
        media_mime = "image/jpeg"
        media_bytes = await download_file(file_id)
        text = message.get("caption", "").strip() or "[Imagem enviada]"

    if not text and not media_bytes:
        return

    # Fast Track
    base_command = text.split("@")[0].split()[0].lower()
    if base_command in FAST_TRACK_COMMANDS:
        logger.info("Fast Track: %s (chat_id=%s)", base_command, chat_id)
        handler_name = FAST_TRACK_COMMANDS[base_command]
        args = text[len(base_command):].strip()
        reply = await handle_fast_track(handler_name, args, chat_id)
        if reply:
                            await send_message(chat_id, reply)
        return

    # LLM (Gemini)
    logger.info("LLM route: chat_id=%s, text=%r, media=%s", chat_id, text[:60], media_mime)
    try:
        from app.services.ai import handle_ai_message
        reply = await handle_ai_message(text, chat_id, media_bytes, media_mime)
    except Exception as exc:
        logger.exception("Erro no handler de IA: %s", exc)
        reply = "Ocorreu um erro ao processar sua mensagem. Tente novamente."
    if reply:
                            await send_message(chat_id, reply)



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
        await send_message(chat_id, "Essa ação já expirou ou foi processada.")
        return
        
    action = res.data[0]
    if action["status"] != "pending":
        from app.services.telegram import send_message
        await send_message(chat_id, f"Esta ação já foi resolvida (status: {action['status']}).")
        return
        
    if action_type == "cancel":
        await sb.table("pending_actions").update({"status": "rejected"}).eq("id", action_id).execute()
        from app.services.telegram import send_message
        await send_message(chat_id, "❌ Ação cancelada.")
        return
        
    if action_type == "confirm":
        # Executar!
        intent = action["intent"]
        payload = action["payload"]
        if intent == "task_delete":
            await sb.table("tasks").delete().eq("seq_id", int(payload["seq_id"])).execute()
            from app.services.telegram import send_message
            await send_message(chat_id, f"✅ Tarefa apagada com sucesso!")
        elif intent == "transaction_create":
            await sb.table("transactions").insert(payload).execute()
            from app.services.telegram import send_message
            await send_message(chat_id, f"✅ Despesa lançada no livro-caixa!")
            
        await sb.table("pending_actions").update({"status": "approved"}).eq("id", action_id).execute()


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

async def poll_updates() -> None:
    """Loop principal de long-polling."""
    start_scheduler()
    asyncio.create_task(start_ai_worker())
    asyncio.create_task(check_system_commands())
    offset = 0
    logger.info("Inara Bot iniciado em modo polling! Aguardando mensagens...")
    logger.info("Envie /start para @home_inara_bot no Telegram")

    async with httpx.AsyncClient(timeout=60) as client:
        while True:
            try:
                r = await client.get(
                    f"{API_BASE}/getUpdates",
                    params={"offset": offset, "timeout": 30},
                )
                data = r.json()

                if not data.get("ok"):
                    logger.error("Telegram API error: %s", data)
                    await asyncio.sleep(5)
                    continue

                for update in data.get("result", []):
                    offset = update["update_id"] + 1
                    if "callback_query" in update:
                        try:
                            await process_callback_query(update["callback_query"])
                        except Exception:
                            logger.exception("Erro ao processar callback")
                    
                    message = update.get("message") or update.get("edited_message")
                    if message:
                        try:
                            await process_message(message)
                        except Exception:
                            logger.exception("Erro ao processar mensagem")

            except httpx.TimeoutException:
                continue
            except Exception:
                logger.exception("Erro no polling loop")
                await asyncio.sleep(5)


if __name__ == "__main__":
    # Remover webhook existente (polling e webhook sao mutuamente exclusivos)
    httpx.get(f"{API_BASE}/deleteWebhook")
    asyncio.run(poll_updates())