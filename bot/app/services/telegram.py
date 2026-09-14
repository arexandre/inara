"""
Serviço auxiliar para comunicação com a API do Telegram.
Encapsula o envio de mensagens com suporte a Markdown.
"""

import logging
import os

import httpx

logger = logging.getLogger("inara.telegram")

TELEGRAM_API_BASE = "https://api.telegram.org/bot{token}"


def _base_url() -> str:
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    if not token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN não configurado!")
    return TELEGRAM_API_BASE.format(token=token)


async def send_message(
    chat_id: int,
    text: str,
    parse_mode: str = "Markdown",
    disable_web_page_preview: bool = True,
) -> None:
    """Envia uma mensagem de texto para um chat do Telegram."""
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
