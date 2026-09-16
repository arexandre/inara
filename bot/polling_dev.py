"""
Inara Bot — Modo Polling (desenvolvimento local).

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

# Adicionar o diretório raiz ao path
sys.path.insert(0, os.path.dirname(__file__))

load_dotenv()

from app.logger import logger
from app.services.fast_track import handle_fast_track
from app.services.telegram import send_message
from app.services.scheduler import start_scheduler
from app.services.ai import start_ai_worker

TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
API_BASE = f"https://api.telegram.org/bot{TOKEN}"

# Set de referências fortes para tasks assíncronas (evita GC silencioso)
_background_tasks: set[asyncio.Task] = set()

def _fire_and_forget(coro):
    """Cria uma task assíncrona e guarda a referência para evitar destruição pelo GC."""
    task = asyncio.create_task(coro)
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)

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
    
    # Suporte a mídia (voz / imagem)
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
        await handle_ai_message(text, chat_id, media_bytes, media_mime)
    except Exception as exc:
        logger.exception("Erro no handler de IA: %s", exc)
        await send_message(chat_id, "Ocorreu um erro ao processar sua mensagem. Tente novamente.")


async def answer_callback(callback_query_id: str) -> None:
    """Responde ao callback para tirar o spinner do botão no Telegram."""
    try:
        async with httpx.AsyncClient() as client:
            await client.post(f"{API_BASE}/answerCallbackQuery", json={
                "callback_query_id": callback_query_id
            })
    except Exception:
        pass

async def process_callback_query(callback_query: dict) -> None:
    chat_id = callback_query["message"]["chat"]["id"]
    data = callback_query["data"]
    
    # Responder ao callback imediatamente (tira o spinner)
    await answer_callback(callback_query["id"])
    
    if "_" not in data:
        return
    action_type, action_id = data.split("_", 1)
    
    from app.services.fast_track import get_supabase
    sb = await get_supabase()
    
    res = await sb.table("pending_actions").select("*").eq("id", action_id).execute()
    if not res.data:
        await send_message(chat_id, "Essa ação já expirou ou foi processada.")
        return
        
    action = res.data[0]
    if action["status"] != "pending":
        await send_message(chat_id, f"Esta ação já foi resolvida (status: {action['status']}).")
        return
        
    if action_type == "cancel":
        await sb.table("pending_actions").update({"status": "rejected"}).eq("id", action_id).execute()
        await send_message(chat_id, "❌ Ação cancelada.")
        return
        
    if action_type == "confirm":
        intent = action["intent"]
        payload = action["payload"]
        if intent == "task_delete":
            seq_ids = payload.get("seq_ids")
            if seq_ids:
                await sb.table("tasks").delete().in_("seq_id", seq_ids).execute()
            else:
                await sb.table("tasks").delete().eq("seq_id", int(payload["seq_id"])).execute()
            await send_message(chat_id, "🗑️ Tarefa(s) apagada(s) com sucesso!")
        elif intent == "transaction_create":
            await sb.table("transactions").insert(payload).execute()
            await send_message(chat_id, "✅ Despesa lançada no livro-caixa!")
            
        await sb.table("pending_actions").update({"status": "approved"}).eq("id", action_id).execute()


async def check_system_commands():
    """Worker que verifica comandos manuais do frontend (fire-and-forget)."""
    logger.info("Worker de System Commands iniciado.")
    from app.services.fast_track import get_supabase
    while True:
        try:
            sb = await get_supabase()
            res = await sb.table("system_commands").select("*").eq("executed", False).execute()
            if res.data:
                for cmd in res.data:
                    await sb.table("system_commands").update({"executed": True}).eq("id", cmd["id"]).execute()
                    
                    # FIRE-AND-FORGET: não bloqueia o event loop
                    if cmd["command"] == "force_bom_dia":
                        from app.services.scheduler import resumo_matinal
                        _fire_and_forget(resumo_matinal())
                    elif cmd["command"] == "force_ping":
                        from app.services.scheduler import ping_de_ociosidade
                        _fire_and_forget(ping_de_ociosidade())
        except Exception as e:
            logger.error("Erro no worker de comandos: %s", e)
        await asyncio.sleep(5)

async def poll_updates() -> None:
    """Loop principal de long-polling."""
    start_scheduler()
    _fire_and_forget(start_ai_worker())
    _fire_and_forget(check_system_commands())
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