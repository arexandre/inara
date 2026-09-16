import os
import asyncio
import random
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import google.generativeai as genai
import holidays

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
            
            response = await model.generate_content_async(prompt, request_options={"timeout": 15.0})
            reply = response.text.strip()
            
            await broadcast_to_residents(reply)
            
    except Exception as e:
        logger.error("Erro no Ping de Ociosidade: %s", e)


async def check_local_holidays(date_obj):
    # Feriados Nacionais + Locais Araguari
    br_holidays = holidays.BR(years=date_obj.year)
    
    # Custom Araguari, MG
    br_holidays._add_holiday(f"{date_obj.year}-08-28", "Aniversário de Araguari")
    br_holidays._add_holiday(f"{date_obj.year}-08-06", "Senhor Bom Jesus da Cana Verde (Padroeiro)")
    
    date_str = date_obj.strftime('%Y-%m-%d')
    if date_str in br_holidays:
        return br_holidays.get(date_str)
    return None

async def resumo_matinal():
    try:
        logger.info("Executando Resumo Matinal com Calendário...")
        now = datetime.now(BRT)
        hoje_iso = now.strftime("%Y-%m-%d")
        
        sb = await get_supabase()
        
        # Auto-archive tasks feitas há mais de 3 dias
        import datetime as dt
        from app.logger import BRT
        tres_dias = (dt.datetime.now(BRT) - dt.timedelta(days=3)).strftime("%Y-%m-%d")
        await sb.table("tasks").update({"is_archived": True}).eq("status", "done").lte("completed_at", tres_dias).execute()
        
        clima = await get_weather("Araguari,BR", "hoje")
        
        # 1. Tarefas
        t_res = await sb.table("tasks").select("title, due_date, status, profiles!tasks_assignee_id_fkey(username)").neq("status", "done").execute()
        tarefas_text = "Nenhuma tarefa urgente."
        if t_res.data:
            urgentes = []
            for t in t_res.data:
                if t.get("due_date") and t["due_date"] <= hoje_iso:
                    dono = t["profiles"]["username"] if t.get("profiles") else "Sem dono"
                    urgentes.append(f"- {t['title']} ({dono})")
            if urgentes:
                tarefas_text = "Tarefas urgentes:\n" + "\n".join(urgentes)
                
        # 2. Eventos (da tabela events)
        e_res = await sb.table("events").select("title").eq("event_date", hoje_iso).execute()
        eventos_text = ""
        if e_res.data and len(e_res.data) > 0:
            eventos_text = "Hoje temos estes eventos agendados: " + ", ".join([e["title"] for e in e_res.data])

        # 3. Feriados (Python holidays)
        feriado_hoje = await check_local_holidays(now)
        feriado_text = f"ATENÇÃO: Hoje é feriado! ({feriado_hoje})" if feriado_hoje else ""
        
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
            f"Hoje é {now.strftime('%d/%m/%Y')}.\n"
            f"Escreva a mensagem de Bom Dia da Inara para os moradores da casa.\n"
            f"Adote este tom: {estilo}.\n"
            f"Clima: {clima}\n"
            f"Tarefas: {tarefas_text}\n"
            f"{'Eventos de hoje: ' + eventos_text if eventos_text else ''}\n"
            f"{feriado_text}\n"
            "Mantenha curto, elegante, cite os eventos ou feriados de forma fluida (não leia como uma lista engessada se possível)."
        )
        
        response = await model.generate_content_async(prompt, request_options={"timeout": 15.0})
        reply = response.text.strip()
        
        # Salva no diário
        await sb.table("daily_journal").insert({"content": reply}).execute()
        
        await broadcast_to_residents(reply)
        
    except Exception as e:
        logger.error("Erro no Resumo Matinal: %s", e)

def start_scheduler():
    scheduler.add_job(ping_de_ociosidade, 'interval', minutes=15, id='ping_ociosidade')
    scheduler.add_job(resumo_matinal, 'cron', hour=8, minute=30, id='bom_dia')
    scheduler.start()
    logger.info("Scheduler Iniciado: Ping e Resumo Matinal Ativos.")