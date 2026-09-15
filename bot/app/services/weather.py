"""
Serviço de Clima usando OpenWeatherMap.
"""
import os
import httpx
from datetime import datetime, timedelta

async def get_weather(city: str, timeframe: str) -> str:
    api_key = os.environ.get("OPENWEATHER_API_KEY")
    if not api_key:
        return "⚠️ API do clima não configurada."
    
    # Registra uso de API (Fire and Forget)
    try:
        from supabase import create_client
        sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
        sb.table("api_usage_logs").insert({"service_name": "openweathermap", "tokens_used": 1}).execute()
    except Exception as e:
        import logging
        logging.getLogger("inara.weather").warning(f"Falha ao logar uso de API Clima: {e}")

    if not city or "Araguari" in city:
        city = "Araguari,BR"
        
    # Padronizar timeframe
    timeframe = timeframe.lower().strip()
    
    url = f"https://api.openweathermap.org/data/2.5/forecast?q={city}&appid={api_key}&units=metric&lang=pt_br"
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                # Tenta buscar o clima atual se o forecast falhar por algum motivo
                url_curr = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={api_key}&units=metric&lang=pt_br"
                resp_curr = await client.get(url_curr)
                if resp_curr.status_code == 200:
                    c_data = resp_curr.json()
                    desc = c_data["weather"][0]["description"]
                    temp = c_data["main"]["temp"]
                    return f"🌤️ Clima atual em {city}: {desc.capitalize()} com {temp:.1f}°C."
                return f"⚠️ Não consegui checar o clima para {city} no momento."
            
            data = resp.json()
            
            target_date = datetime.now()
            if timeframe in ["amanha", "amanhã"]:
                target_date += timedelta(days=1)
                
            target_date_str = target_date.strftime("%Y-%m-%d")
            
            # Filtra as previsões que caem na data alvo
            forecasts = [item for item in data["list"] if item["dt_txt"].startswith(target_date_str)]
            
            if not forecasts:
                return f"⚠️ Sem previsão disponível para essa data em {city}."
                
            # Pega a previsão do meio do dia (ou a primeira disponível)
            idx = len(forecasts) // 2
            f = forecasts[idx]
            
            desc = f["weather"][0]["description"]
            temp = f["main"]["temp"]
            temp_min = min(item["main"]["temp_min"] for item in forecasts)
            temp_max = max(item["main"]["temp_max"] for item in forecasts)
            pop = f.get("pop", 0) * 100  # probabilidade de precipitação (0 a 1)
            
            chuva_msg = f" 🌧️ (Chance de chuva: {pop:.0f}%)" if pop > 15 else ""
            dia_str = "Amanhã" if timeframe in ["amanha", "amanhã"] else "Hoje"
            
            return f"🌤️ *{dia_str} em {city}*:\n{desc.capitalize()} — Média de {temp:.1f}°C (Mín: {temp_min:.1f}°C / Máx: {temp_max:.1f}°C){chuva_msg}"

    except Exception as e:
        import logging
        logging.getLogger("inara.weather").error(f"Erro ao buscar clima: {e}")
        return "⚠️ Erro ao tentar acessar o serviço de clima."