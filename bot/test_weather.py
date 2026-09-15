import httpx
import asyncio

async def test():
    api_key = "00b4c5e3291ea0160453fcb7c7904182"
    url = f"https://api.openweathermap.org/data/2.5/forecast?q=Araguari,BR&appid={api_key}&units=metric&lang=pt_br"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url)
        print("Status Code:", resp.status_code)
        print("Body:", resp.text[:200])

asyncio.run(test())