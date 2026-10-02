import os
import sys
import asyncio
from dotenv import load_dotenv

# Carregar variáveis de ambiente (tanto do root quanto do bot)
load_dotenv(".env")
load_dotenv("bot/.env")

# Adicionar bot ao PYTHONPATH para conseguir importar app.services.ai
sys.path.append(os.path.join(os.path.dirname(__file__), "bot"))

from app.services.ai import _process_ai_message, _get_supabase_async

async def main():
    print("=== Inara CLI Tester ===")
    
    sb = await _get_supabase_async()
    
    # Pegar o primeiro usuário para usar o telegram_id dele
    res = await sb.table("profiles").select("telegram_id, username").limit(1).execute()
    if not res.data or not res.data[0].get("telegram_id"):
        print("Erro: Nenhum perfil com telegram_id encontrado no banco de dados.")
        print("Crie um perfil e vincule um telegram_id para poder testar.")
        return
        
    user = res.data[0]
    chat_id = user["telegram_id"]
    username = user["username"]
    
    print(f"Logado como: @{username} (chat_id: {chat_id})\n")
    print("Digite 'sair' ou 'exit' para encerrar.")
    print("-" * 30)

    while True:
        try:
            text = input(f"@{username}: ")
            if text.lower() in ['sair', 'exit', 'quit']:
                break
            if not text.strip():
                continue
                
            print("Inara está digitando...")
            responses = await _process_ai_message(text, chat_id)
            
            for reply, markup in responses:
                print(f"\nInara: {reply}")
                if markup:
                    print(f"[Markup/Botões]: {markup}")
            print("-" * 30)
            
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"\n[ERRO]: {e}")

if __name__ == "__main__":
    asyncio.run(main())
