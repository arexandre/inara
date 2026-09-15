"""
Inara Bot â€” ServiÃ§o de Webhook (FastAPI)

ResponsÃ¡vel por:
  - Receber updates do Telegram via /webhook/telegram
  - Verificar o token secreto de seguranÃ§a
  - Rotear comandos conhecidos (Fast Track) sem acionar o LLM
  - Delegar mensagens livres ao handler de IA (Gemini)
"""

import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import webhook

load_dotenv()

from app.logger import logger
from app.services.scheduler import start_scheduler
from app.services.ai import start_ai_worker
import asyncio


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Inara Bot iniciado ðŸš€")
    start_scheduler()
    asyncio.create_task(start_ai_worker())
    yield
    logger.info("Inara Bot encerrado.")


app = FastAPI(
    title="Inara Bot",
    description="Webhook de integraÃ§Ã£o Telegram â†” Inara ERP",
    version="0.1.0",
    lifespan=lifespan,
    # Desabilita docs em produÃ§Ã£o â€” remova para desenvolvimento
    # docs_url=None,
    # redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Ajuste para domÃ­nios especÃ­ficos em produÃ§Ã£o
    allow_methods=["POST"],
    allow_headers=["*"],
)

app.include_router(webhook.router)


@app.get("/health", tags=["infra"])
async def health_check():
    """Endpoint de health check para monitoramento."""
    return {"status": "ok", "service": "inara-bot"}
