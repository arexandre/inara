"""
Router: /webhook/telegram

Fluxo de seguranÃƒÂ§a (Zero-Trust):
  1. Header X-Telegram-Bot-Api-Secret-Token verificado ANTES de ler o body.
  2. Comandos conhecidos sÃƒÂ£o despachados localmente via FAST_TRACK_COMMANDS.
  3. Mensagens livres sÃƒÂ£o passadas ao serviÃƒÂ§o de IA.
"""

import logging
import os
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request, status

from app.services.fast_track import handle_fast_track
from app.services.telegram import send_message
from app.logger import logger

router = APIRouter(prefix="/webhook", tags=["webhook"])

# ---------------------------------------------------------------------------
# Fast Track Ã¢â‚¬â€ Comandos interceptados localmente (sem acionar LLM)
# ---------------------------------------------------------------------------
FAST_TRACK_COMMANDS = {
    "/start":    "_cmd_start",
    "/lista":    "_cmd_lista",
    "/pix":      "_cmd_pix",
    "/tarefas":  "_cmd_tarefas",
    "/mercado":  "_cmd_mercado",
    "/ajuda":    "_cmd_ajuda",
    "/help":     "_cmd_ajuda",
}


def _get_secret() -> str:
    secret = os.getenv("WEBHOOK_SECRET_TOKEN", "")
    if not secret:
        raise RuntimeError("WEBHOOK_SECRET_TOKEN nÃƒÂ£o configurado!")
    return secret


# ---------------------------------------------------------------------------
# Endpoint principal
# ---------------------------------------------------------------------------
@router.post(
    "/telegram",
    status_code=status.HTTP_200_OK,
    summary="Recebe updates do Telegram",
)
async def telegram_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
) -> dict[str, str]:
    """
    Ponto de entrada para todos os updates enviados pelo Telegram.

    SeguranÃƒÂ§a:
    - O Telegram envia o header `X-Telegram-Bot-Api-Secret-Token` com o valor
      configurado ao registrar o webhook (`setWebhook`). Qualquer requisiÃƒÂ§ÃƒÂ£o
      sem o token correto ÃƒÂ© rejeitada com 401 antes de processar o payload.
    """

    # Ã¢â€â‚¬Ã¢â€â‚¬ 1. VerificaÃƒÂ§ÃƒÂ£o do token secreto Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    expected_secret = _get_secret()
    if x_telegram_bot_api_secret_token != expected_secret:
        logger.warning(
            "Tentativa de acesso nÃƒÂ£o autorizado ao webhook. "
            "Token recebido: %s",
            x_telegram_bot_api_secret_token,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de seguranÃƒÂ§a invÃƒÂ¡lido.",
        )

    # Ã¢â€â‚¬Ã¢â€â‚¬ 2. Parse do payload Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    try:
        update: dict[str, Any] = await request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload invÃƒÂ¡lido.",
        )

    logger.debug("Update recebido: %s", update.get("update_id"))

    # Ã¢â€â‚¬Ã¢â€â‚¬ 3. Extrair mensagem e MÃƒÂ­dia Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    message = update.get("message") or update.get("edited_message")
    if not message:
        return {"status": "ignored"}

    chat_id: int = message["chat"]["id"]
    text: str = message.get("text", "").strip()
    
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
        return {"status": "ignored"}

    # Ã¢â€â‚¬Ã¢â€â‚¬ 4. Fast Track Ã¢â‚¬â€ detecÃƒÂ§ÃƒÂ£o de comando Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    base_command = text.split("@")[0].split()[0].lower()

    if base_command in FAST_TRACK_COMMANDS:
        logger.info("Fast Track: %s (chat_id=%s)", base_command, chat_id)
        handler_name = FAST_TRACK_COMMANDS[base_command]
        args = text[len(base_command):].strip()
        reply = await handle_fast_track(handler_name, args, chat_id)
        if reply:
            await send_message(chat_id, reply)
        return {"status": "fast_track", "command": base_command}

    # Ã¢â€â‚¬Ã¢â€â‚¬ 5. LLM (Gemini) Ã¢â‚¬â€ processamento de linguagem natural Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    logger.info("LLM route: chat_id=%s, text=%r, media=%s", chat_id, text[:60], media_mime)
    try:
        from app.services.ai import handle_ai_message
        reply = await handle_ai_message(text, chat_id, media_bytes, media_mime)
    except Exception as exc:
        logger.exception("Erro no handler de IA: %s", exc)
        reply = "Ã¢Å¡Â Ã¯Â¸Â Ocorreu um erro ao processar sua mensagem. Tente novamente."
    if reply:
            await send_message(chat_id, reply)
    return {"status": "llm_processed"}
