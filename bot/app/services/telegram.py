"""
Serviço auxiliar para comunicação com a API do Telegram.
Encapsula o envio de mensagens e download de mídia.
"""

import logging
import os
import httpx

from app.logger import logger

def _token() -> str:
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    if not token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN não configurado!")
    return token

def _base_url() -> str:
    return f"https://api.telegram.org/bot{_token()}"

async def send_message(
    chat_id: int,
    text: str,
    parse_mode: str = "Markdown",
    disable_web_page_preview: bool = True,
) -> None:
    url = f"{_base_url()}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode,
        "disable_web_page_preview": disable_web_page_preview,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(url, json=payload)
        if not response.is_success:
            logger.error(
                "Falha ao enviar mensagem para chat_id=%s: %s — %s",
                chat_id,
                response.status_code,
                response.text,
            )

async def download_file(file_id: str) -> bytes | None:
    """Obtém o file_path via getFile e faz o download do binário."""
    url = f"{_base_url()}/getFile"
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(url, json={"file_id": file_id})
        if not r.is_success:
            logger.error("Erro ao obter info do arquivo %s: %s", file_id, r.text)
            return None
            
        data = r.json()
        if not data.get("ok"):
            return None
            
        file_path = data["result"]["file_path"]
        download_url = f"https://api.telegram.org/file/bot{_token()}/{file_path}"
        
        r_dl = await client.get(download_url)
        if r_dl.is_success:
            return r_dl.content
        return None
