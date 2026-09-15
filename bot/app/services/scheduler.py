import os
import asyncio
from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import google.generativeai as genai

from app.logger import logger, BRT
from app.services.telegram import send_message
from app.services.weather import get_weather
from app.services.fast_track import get_supabase

scheduler = AsyncIOScheduler(timezone=BRT)

async def broadcast_to_residents(message: str):
    sb = await get_supabase()
    # Pega todos os moradores cadastrados
    r = await sb.table("profiles").select("telegram_id, id").execute()
    if r.data:
        for profile in r.data:
            if profile.get("telegram_id"):
                await send_message(profile["telegram_id"], message)
                # Opcional: salvar no chat_history como bot
                try:
                    await sb.table("chat_history").insert({
                        "profile_id": profile["id"],
                        "message": message,
                        "is_bot": True
                    }).execute()
                except Exception:
                    pass

async def ping_de_ociosidade():
    """Quebra-gelo: roda a cada 30 mins para testes (ou 3h prod)."""
    try:
        sb = await get_supabase()
        
        # Pega a última mensagem geral no histórico
        r = await sb.table("chat_history").select("created_at, is_bot").order("created_at", desc=True).limit(1).execute()
        
        if not r.data:
            return # Sem histórico
            
        last_msg = r.data[0]
        # Se a última mensagem já foi do bot (seja resposta ou ping anterior), não spamma.
        if last_msg["is_bot"]:
            return
            
        # Calcula diff
        last_time = datetime.fromisoformat(last_msg["created_at"])
        now = datetime.now(BRT)
        
        # Como o created_at do Supabase vem em UTC, precisamos garantir a conversão
        diff_minutes = (now.timestamp() - last_time.timestamp()) / 60
        
        # Threshold: 30 minutos
        if diff_minutes > 30:
            logger.info("Ociosidade detectada (>30m). Gerando Ping de Quebra-Gelo...")
            
            genai.configure(api_key=os.environ["GEMINI_API_KEY"])
            model = genai.GenerativeModel("gemini-3.8-flash")
            
            prompt = (
                f"Data atual: {now.strftime('%d/%m/%Y')}."
                "A casa está muito quieta. Gere uma mensagem curta (max 2 frases) de 'curiosidade do dia' "
                "ou um pensamento sarcástico/acolhedor de síndica virtual para puxar assunto com os moradores. "
                "Não faça perguntas que exijam comando, apenas um pensamento solto."
            )
            
            response = await asyncio.to_thread(model.generate_content, prompt)
            reply = response.text.strip()
            
            await broadcast_to_residents(reply)
            
    except Exception as e:
        logger.error("Erro no Ping de Ociosidade: %s", e)

async def resumo_matinal():
    """Bom dia da Síndica: roda às 08:30 da manhã."""
    try:
        logger.info("Executando Resumo Matinal...")
        now = datetime.now(BRT)
        
        # 1. Clima
        clima = await get_weather("Araguari, MG", "hoje")
        
        # 2. Tarefas
        sb = await get_supabase()
        hoje_iso = now.strftime("%Y-%m-%d")
        t_res = await sb.table("tasks").select("title, due_date, status, profiles(username)").neq("status", "done").execute()
        
        tarefas_text = "Nenhuma tarefa urgente."
        if t_res.data:
            urgentes = []
            for t in t_res.data:
                if t.get("due_date") and t["due_date"] <= hoje_iso:
                    dono = t["profiles"]["username"] if t.get("profiles") else "Sem dono"
                    urgentes.append(f"- {t['title']} ({dono})")
            if urgentes:
                tarefas_text = "Tarefas vencendo/vencidas:\n" + "\n".join(urgentes)
        
        # 3. LLM Formatter
        genai.configure(api_key=os.environ["GEMINI_API_KEY"])
        model = genai.GenerativeModel("gemini-3.8-flash")
        
        prompt = (
            f"Hoje é {now.strftime('%d/%m/%Y')}. Escreva um 'Bom dia' acolhedor e levemente irônico para os moradores.\n"
            f"Inclua este clima: {clima}\n"
            f"Inclua este alerta de tarefas: {tarefas_text}\n"
            "Seja sucinta e direta, parecendo uma assistente de casa inteligente."
        )
        
        response = await asyncio.to_thread(model.generate_content, prompt)
        reply = response.text.strip()
        
        await broadcast_to_residents(reply)
        
    except Exception as e:
        logger.error("Erro no Resumo Matinal: %s", e)

def start_scheduler():
    scheduler.add_job(ping_de_ociosidade, 'interval', minutes=30, id='ping_ociosidade')
    scheduler.add_job(resumo_matinal, 'cron', hour=8, minute=30, id='bom_dia')
    scheduler.start()
    logger.info("Scheduler Iniciado: Ping de Ociosidade e Resumo Matinal Ativos.")