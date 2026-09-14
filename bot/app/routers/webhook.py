"""
Router: /webhook/telegram

Fluxo de segurança (Zero-Trust):
  1. Header X-Telegram-Bot-Api-Secret-Token verificado ANTES de ler o body.
  2. Comandos conhecidos são despachados localmente via FAST_TRACK_COMMANDS.
  3. Mensagens livres são passadas ao serviço de IA.
"""

import logging
import os
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request, status

from app.services.fast_track import handle_fast_track
from app.services.telegram import send_message

logger = logging.getLogger("inara.webhook")

router = APIRouter(prefix="/webhook", tags=["webhook"])

# ---------------------------------------------------------------------------
# Fast Track — Comandos interceptados localmente (sem acionar LLM)
# ---------------------------------------------------------------------------
FAST_TRACK_COMMANDS = {
    "/start":    "_cmd_start",
    "/lista":    "_cmd_lista",
    "/pix":      "_cmd_pix",
    "/tarefas":  "_cmd_tarefas",
    "/ajuda":    "_cmd_ajuda",
    "/help":     "_cmd_ajuda",
}


def _get_secret() -> str:
    secret = os.getenv("WEBHOOK_SECRET_TOKEN", "")
    if not secret:
        raise RuntimeError("WEBHOOK_SECRET_TOKEN não configurado!")
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

    Segurança:
    - O Telegram envia o header `X-Telegram-Bot-Api-Secret-Token` com o valor
      configurado ao registrar o webhook (`setWebhook`). Qualquer requisição
      sem o token correto é rejeitada com 401 antes de processar o payload.
    """

    # ── 1. Verificação do token secreto ──────────────────────────────────────
    expected_secret = _get_secret()
    if x_telegram_bot_api_secret_token != expected_secret:
        logger.warning(
            "Tentativa de acesso não autorizado ao webhook. "
            "Token recebido: %s",
            x_telegram_bot_api_secret_token,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de segurança inválido.",
        )

    # ── 2. Parse do payload ───────────────────────────────────────────────────
    try:
        update: dict[str, Any] = await request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload inválido.",
        )

    logger.debug("Update recebido: %s", update.get("update_id"))

    # ── 3. Extrair mensagem ───────────────────────────────────────────────────
    message = update.get("message") or update.get("edited_message")
    if not message:
        # Outros tipos de update (callback_query, etc.) — ignorar por ora
        return {"status": "ignored"}

    chat_id: int = message["chat"]["id"]
    text: str = message.get("text", "").strip()

    if not text:
        return {"status": "ignored"}

    # ── 4. Fast Track — detecção de comando ──────────────────────────────────
    # Suporta comandos com @botname: /lista@InaraBot → /lista
    base_command = text.split("@")[0].split()[0].lower()

    if base_command in FAST_TRACK_COMMANDS:
        logger.info("Fast Track: %s (chat_id=%s)", base_command, chat_id)
        handler_name = FAST_TRACK_COMMANDS[base_command]
        args = text[len(base_command):].strip()
        reply = await handle_fast_track(handler_name, args, chat_id)
        await send_message(chat_id, reply)
        return {"status": "fast_track", "command": base_command}

    # ── 5. Fallback → LLM (Gemini) — placeholder para Fase 2 ─────────────────
    logger.info("LLM route: chat_id=%s, text=%r", chat_id, text[:60])
    # TODO: from app.services.ai import handle_ai_message; await handle_ai_message(...)
    await send_message(
        chat_id,
        "🤖 Entendido! Minha IA está sendo preparada. Enquanto isso, use /ajuda para ver os comandos disponíveis.",
    )
    return {"status": "llm_queued"}
