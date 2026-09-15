import os
import httpx
from app.logger import logger

TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
API_BASE = f"https://api.telegram.org/bot{TOKEN}"

async def send_message(chat_id: int, text: str, parse_mode: str = "Markdown") -> None:
    if not TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN no configurado. Mensagem no enviada.")
        return

    url = f"{API_BASE}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
    except Exception as e:
        logger.error("Erro ao enviar mensagem pro Telegram: %s", e)

async def send_chat_action(chat_id: int, action: str = "typing") -> None:
    if not TOKEN:
        return
    url = f"{API_BASE}/sendChatAction"
    payload = {
        "chat_id": chat_id,
        "action": action
    }
    try:
        async with httpx.AsyncClient() as client:
            await client.post(url, json=payload)
    except Exception as e:
        logger.error("Erro ao enviar chat action: %s", e)

async def download_file(file_id: str) -> bytes | None:
    if not TOKEN:
        return None
        
    try:
        async with httpx.AsyncClient() as client:
            file_info_url = f"{API_BASE}/getFile?file_id={file_id}"
            info_resp = await client.get(file_info_url, timeout=10.0)
            info_resp.raise_for_status()
            
            file_path = info_resp.json().get("result", {}).get("file_path")
            if not file_path:
                return None
                
            download_url = f"https://api.telegram.org/file/bot{TOKEN}/{file_path}"
            dl_resp = await client.get(download_url, timeout=30.0)
            dl_resp.raise_for_status()
            
            return dl_resp.content
    except Exception as e:
        logger.error("Erro ao baixar arquivo do Telegram: %s", e)
        raise e