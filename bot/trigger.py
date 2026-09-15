from dotenv import load_dotenv
load_dotenv()

import asyncio
from app.services.scheduler import resumo_matinal

asyncio.run(resumo_matinal())
print("Disparado com sucesso!")