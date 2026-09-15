import os
import asyncio
import random
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
    r = await sb.table("profiles").select("telegram_id, id").execute()
    if r.data:
        for profile in r.data:
            if profile.get("telegram_id"):
                await send_message(profile["telegram_id"], message)
                try:
                    await sb.table("chat_history").insert({
                        "profile_id": profile["id"],
                        "message": message,
                        "is_bot": True
                    }).execute()
                except Exception:
                    pass

async def ping_de_ociosidade():
    try:
        sb = await get_supabase()
        
        # Buscar config de tempo
        idle_time_min = 120
        try:
            cfg = await sb.table("system_settings").select("idle_time_min").eq("id", 1).single().execute()
            if cfg.data and "idle_time_min" in cfg.data:
                idle_time_min = cfg.data["idle_time_min"]
        except Exception:
            pass

        r = await sb.table("chat_history").select("created_at, is_bot").order("created_at", desc=True).limit(1).execute()
        
        if not r.data:
            return
            
        last_msg = r.data[0]
        if last_msg["is_bot"]:
            return
            
        last_time = datetime.fromisoformat(last_msg["created_at"])
        now = datetime.now(BRT)
        
        diff_minutes = (now.timestamp() - last_time.timestamp()) / 60
        
        if diff_minutes > idle_time_min:
            logger.info(f"Ociosidade detectada (>{idle_time_min}m). Gerando Ping...")
            
            genai.configure(api_key=os.environ["GEMINI_API_KEY"])
            model = genai.GenerativeModel("gemini-3.5-flash-lite")
            
            estilos = [
                "uma curiosidade r\u00e1pida e in\u00fatil sobre casa ou tecnologia",
                "um coment\u00e1rio levemente sarc\u00e1stico sobre algu\u00e9m ter esquecido de lavar lou\u00e7a (brincadeira)",
                "um elogio exagerado ao \u00faltimo morador que falou",
                "um fato aleat\u00f3rio sobre o universo",
                "apenas um 'T\u00f4 aqui viu?' de forma acolhedora"
            ]
            estilo = random.choice(estilos)
            
            prompt = (
                f"Data atual: {now.strftime('%d/%m/%Y %H:%M')}.\n"
                f"A casa est\u00e1 quieta demais. Escreva uma mensagem curta (max 2 frases) para o grupo no estilo: {estilo}. "
                "Seja a Inara (acolhedora, eficiente, mas meio ir\u00f4nica). N\u00e3o exija comandos."
            )
            
            # Executando gerador async com timeout
            response = await model.generate_content_async(prompt, request_options={"timeout": 15.0})
            reply = response.text.strip()
            
            await broadcast_to_residents(reply)
            
    except Exception as e:
        logger.error("Erro no Ping de Ociosidade: %s", e)

async def resumo_matinal():
    try:
        logger.info("Executando Resumo Matinal...")
        now = datetime.now(BRT)
        
        clima = await get_weather("Araguari,BR", "hoje")
        
        sb = await get_supabase()
        hoje_iso = now.strftime("%Y-%m-%d")
        t_res = await sb.table("tasks").select("title, due_date, status, profiles!tasks_assignee_id_fkey(username)").neq("status", "done").execute()
        
        tarefas_text = "Nenhuma tarefa urgente."
        if t_res.data:
            urgentes = []
            for t in t_res.data:
                if t.get("due_date") and t["due_date"] <= hoje_iso:
                    dono = t["profiles"]["username"] if t.get("profiles") else "Sem dono"
                    urgentes.append(f"- {t['title']} ({dono})")
            if urgentes:
                tarefas_text = "Tarefas vencendo/vencidas:\n" + "\n".join(urgentes)
        
        genai.configure(api_key=os.environ["GEMINI_API_KEY"])
        model = genai.GenerativeModel("gemini-3.5-flash-lite")
        
        estilos = [
            "Um bom dia formal e po\u00e9tico",
            "Um bom dia sarc\u00e1stico e de 'acorda pra cuspir'",
            "Um bom dia hiperativo e otimista",
            "Um bom dia zen e tranquilo"
        ]
        estilo = random.choice(estilos)
        
        prompt = (
            f"Hoje \u00e9 {now.strftime('%d/%m/%Y')}. Escreva a mensagem de Bom Dia matinal da Inara para os moradores da casa.\n"
            f"Adote este tom: {estilo}.\n"
            f"Clima: {clima}\n"
            f"Alertas: {tarefas_text}\n"
            "Mantenha curto, elegante, sem parecer que est\u00e1 lendo uma tabela."
        )
        
        response = await model.generate_content_async(prompt, request_options={"timeout": 15.0})
        reply = response.text.strip()
        
        await broadcast_to_residents(reply)
        
    except Exception as e:
        logger.error("Erro no Resumo Matinal: %s", e)

def start_scheduler():
    # Roda de 15 em 15 minutos para testar a ociosidade com mais resolucao
    scheduler.add_job(ping_de_ociosidade, 'interval', minutes=15, id='ping_ociosidade')
    scheduler.add_job(resumo_matinal, 'cron', hour=8, minute=30, id='bom_dia')
    scheduler.start()
    logger.info("Scheduler Iniciado: Ping de Ociosidade e Resumo Matinal Ativos.")