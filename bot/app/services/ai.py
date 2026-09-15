"""
ServiÃƒÆ’Ã‚Â§o de IA (Google Gemini) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Processamento de linguagem natural.

Fluxo:
  1. Recebe mensagem livre do Telegram.
  2. Envia ao Gemini com System Prompt contextual (perfil + domÃƒÆ’Ã‚Â­nios).
  3. Gemini retorna JSON estruturado com intent + parÃƒÆ’Ã‚Â¢metros.
  4. Dispatcher executa a aÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o correspondente no Supabase.
  5. Retorna resposta formatada para o Telegram.
"""

import json
import logging
import os
from datetime import date
from typing import Any

import google.generativeai as genai
from supabase import create_client, Client

from app.logger import logger

# ---------------------------------------------------------------------------
# InstanciaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do Modelo
# ---------------------------------------------------------------------------
def _get_model():
    from datetime import datetime
    from app.logger import BRT
    agora = datetime.now(BRT)
    dias = ["Segunda", "TerÃƒÆ’Ã‚Â§a", "Quarta", "Quinta", "Sexta", "SÃƒÆ’Ã‚Â¡bado", "Domingo"]
    dia_semana = dias[agora.weekday()]
    
    dynamic_sys_prompt = f"Data atual: {agora.strftime('%Y-%m-%d %H:%M:%S')} ({dia_semana}).\n{SYSTEM_PROMPT}"
    
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    return genai.GenerativeModel(
        model_name="gemini-3.8-flash",
        system_instruction=dynamic_sys_prompt,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            temperature=0.3,
        ),
    )


def _get_supabase() -> Client:
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )


# ---------------------------------------------------------------------------
# System Prompt ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â define a personalidade e as capacidades da Inara
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """
VocÃƒÆ’Ã‚Âª ÃƒÆ’Ã‚Â© a Inara, uma assistente domÃƒÆ’Ã‚Â©stica inteligente e carinhosa que gerencia a casa de 3 moradores.

## Suas Capacidades (DomÃƒÆ’Ã‚Â­nios)

### 1. TAREFAS (tasks)
- Criar tarefas domÃƒÆ’Ã‚Â©sticas (lavar louÃƒÆ’Ã‚Â§a, limpar banheiro, etc.)
- Listar tarefas pendentes
- Marcar tarefas como concluÃƒÆ’Ã‚Â­das
- Atribuir tarefas a moradores

### 2. FINANÃƒÆ’Ã¢â‚¬Â¡AS (transactions)  
- Registrar gastos coletivos (conta de luz, mercado, etc.)
- Registrar gastos individuais (pix entre moradores)
- Consultar saldo/rateio entre moradores

### 3. LISTA DE COMPRAS (shopping_list)
- Adicionar itens ÃƒÆ’Ã‚Â  lista
- Remover itens
- Marcar itens como comprados

## Regras de Resposta

SEMPRE responda com um JSON vÃƒÆ’Ã‚Â¡lido no seguinte formato:

```json
{
  "intent": "nome_da_acao",
  "params": { ... },
  "reply": "Mensagem simpÃƒÆ’Ã‚Â¡tica para o usuÃƒÆ’Ã‚Â¡rio em portuguÃƒÆ’Ã‚Âªs"
}
```

### Intents disponÃƒÆ’Ã‚Â­veis:

| Intent | Params | DescriÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o |
|--------|--------|-----------|
| `task_create` | `title`, `description?`, `assignee_username?`, `due_date?` (YYYY-MM-DD) | Criar nova tarefa. Se o usuÃƒÆ’Ã‚Â¡rio falar "atÃƒÆ’Ã‚Â© o fim de semana" ou "amanhÃƒÆ’Ã‚Â£", calcule a data exata. Se nÃƒÆ’Ã‚Â£o especificar prazo, OBRIGATORIAMENTE aplique um peso semÃƒÆ’Ã‚Â¢ntico baseando-se na urgÃƒÆ’Ã‚Âªncia (ex: louÃƒÆ’Ã‚Â§a = data de hoje, pintar parede = hoje + 7 dias). |
| `task_list` | `status?` (backlog/todo/in_progress/done) | Listar tarefas |
| `task_update` | `seq_id`, `status?`, `assignee_username?`, `due_date?` (YYYY-MM-DD) | Atualizar tarefa |
| `transaction_create` | `description`, `amount`, `type` (collective/individual), `category?`, `beneficiary_username?` | Registrar gasto |
| `transaction_list` | `limit?` | Listar transaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes recentes |
| `balance_check` | ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â | Ver rateio/saldo |
| `shopping_add` | `item_name`, `quantity?`, `category?` (obrigatÃƒÆ’Ã‚Â³rio: [Mercado], [FarmÃƒÆ’Ã‚Â¡cia], [Petshop], etc.), `estimated_price?` | Adicionar item. |
| `shopping_update`| `seq_id`, `quantity?` | Atualizar a quantidade de um item que jÃƒÆ’Ã‚Â¡ estÃƒÆ’Ã‚Â¡ na lista. |
| `shopping_done` | `item_name` | Marcar item como comprado |
| `weather_check` | `city?` (default: Araguari), `timeframe?` (hoje ou amanhÃƒÆ’Ã‚Â£) | Ver previsÃƒÆ’Ã‚Â£o do tempo |
| `chat` | ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â | Quando nÃƒÆ’Ã‚Â£o ÃƒÆ’Ã‚Â© um comando, apenas conversa casual |

### Lidar com MÃƒÆ’Ã‚Â­dias (Fotos e ÃƒÆ’Ã‚Âudio) - RESILIÃƒÆ’Ã…Â NCIA MÃƒÆ’Ã‚ÂXIMA:
- **ÃƒÆ’Ã‚Âudio**: O usuÃƒÆ’Ã‚Â¡rio envia ÃƒÆ’Ã‚Â¡udios caÃƒÆ’Ã‚Â³ticos com ruÃƒÆ’Ã‚Â­do conversacional (ex: "Oi Inara, ehh..."). **IGNORE o ruÃƒÆ’Ã‚Â­do e as saudaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes**. VÃƒÆ’Ã‚Â¡ direto ao ponto e extraia APENAS as intenÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes concretas. Seja estrito na formaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do JSON.
- **Fotos (Notas Fiscais)**: Se enviar foto, o pagador (`paid_by`) ÃƒÆ’Ã‚Â© SEMPRE o Remetente da mensagem. Se o usuÃƒÆ’Ã‚Â¡rio falar na legenda algo como "O chocolate ÃƒÆ’Ã‚Â© sÃƒÆ’Ã‚Â³ meu", separe a nota: crie mÃƒÆ’Ã‚Âºltiplos `transaction_create` (um `type=individual` para o chocolate com `beneficiary_username` igual ao remetente, e outro `type=collective` para o resto).
- **Lista de Compras (DeduplicaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o)**: Se o usuÃƒÆ’Ã‚Â¡rio pedir para adicionar um item que JÃƒÆ’Ã‚Â CONSTA na "Lista de Compras Atual" informada no contexto, NÃƒÆ’Ã†â€™O crie um novo. Use `shopping_update` somando as quantidades. Tagueie obrigatoriamente a `category` (ex: Mercado, FarmÃƒÆ’Ã‚Â¡cia).

### Exemplos de InterpretaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:
- "Comprei 3kg de frango por 45 reais" ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ transaction_create (collective, alimentaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o)
- "Vai chover amanhÃƒÆ’Ã‚Â£?" ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ weather_check (timeframe=amanhÃƒÆ’Ã‚Â£)
- [Imagem de cupom fiscal de R$ 120,50 no Carrefour] ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ transaction_create (amount=120.50, description="Compra no Carrefour", type="collective")
- "Adiciona papel higiÃƒÆ’Ã‚Âªnico na lista" ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ shopping_add
- "Fiz um pix de 50 pro JoÃƒÆ’Ã‚Â£o" ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ transaction_create (individual, beneficiary=JoÃƒÆ’Ã‚Â£o)
- "Cria uma tarefa pra limpar o banheiro" ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ task_create
- "Marca a tarefa #0003 como feita" ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ task_update (seq_id=3, status=done)
- "Como tÃƒÆ’Ã‚Â¡ o saldo?" ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ balance_check
- "Bom dia, Inara!" ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ chat

Se nÃƒÆ’Ã‚Â£o entender a intenÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o, use intent "chat" e pergunte educadamente.
O campo "reply" DEVE ser uma mensagem em portuguÃƒÆ’Ã‚Âªs, simpÃƒÆ’Ã‚Â¡tica e breve.
"""


# ---------------------------------------------------------------------------
# Handler principal ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â chamado pelo webhook
# ---------------------------------------------------------------------------
async def handle_ai_message(
    text: str, 
    chat_id: int, 
    media_bytes: bytes | None = None, 
    media_mime: str | None = None
) -> str:
    """
    Processa uma mensagem livre usando o Gemini e executa a aÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o no Supabase.
    Retorna a mensagem formatada para enviar ao Telegram.
    """
    sb = _get_supabase()

    # Buscar perfil do remetente pelo telegram_id
    sender = None
    try:
        r = sb.table("profiles").select("id, username, full_name").eq("telegram_id", chat_id).single().execute()
        sender = r.data
    except Exception:
        pass

    if not sender:
        return (
            "ÃƒÂ¢Ã‚ÂÃ…â€™ Seu Telegram nÃƒÆ’Ã‚Â£o estÃƒÆ’Ã‚Â¡ vinculado a nenhum morador.\n"
            "Acesse o app Inara e vincule seu perfil primeiro."
        )

    # Contextualizar a mensagem para o Gemini
    from datetime import datetime
    from app.logger import BRT
    hoje_str = datetime.now(BRT).strftime("%Y-%m-%d")
    
    # Buscar lista de compras ativa para DeduplicaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
    shop_res = sb.table("shopping_list").select("seq_id, item_name, quantity").eq("status", "pending").execute()
    shop_items = [f"#{i['seq_id']} {i['item_name']} (Qtd: {i['quantity'] or 1})" for i in shop_res.data] if shop_res.data else ["Nenhum"]
    shop_context = "\nLista de Compras Atual:\n" + "\n".join(shop_items)
    
    context_text = f"[Data atual: {hoje_str}] [Remetente: @{sender['username']} (id: {sender['id']})]{shop_context}\n\nMensagem: {text}"
    
    contents = [context_text]
    if media_bytes and media_mime:
        contents.append({
            "mime_type": media_mime,
            "data": media_bytes
        })

    try:
        model = _get_model()
        
        # LÃ³gica de Retry com Backoff (Anti-429 e Timeouts)
        MAX_RETRIES = 3
        raw = ""
        for attempt in range(MAX_RETRIES):
            try:
                import asyncio
                response = await asyncio.to_thread(model.generate_content, contents)
                raw = response.text.strip()
                break
            except Exception as e:
                err_str = str(e).lower()
                if "429" in err_str or "exhausted" in err_str or "too many requests" in err_str:
                    logger.warning(f"Gemini Rate Limit (429). Tentativa {attempt+1}/{MAX_RETRIES}. Aguardando...")
                    if attempt == MAX_RETRIES - 1:
                        return "ðŸ¥µ Gente, o Google me botou de castigo (limite de uso)! Espera uns minutinhos e tenta de novo, por favor?"
                    await asyncio.sleep(5 * (attempt + 1))
                elif "timeout" in err_str or "connection" in err_str:
                    logger.warning(f"Timeout Gemini. Tentativa {attempt+1}/{MAX_RETRIES}.")
                    if attempt == MAX_RETRIES - 1:
                        return "ðŸ”Œ Minha conexÃ£o com o cÃ©rebro (Google) falhou... Me dÃ¡ 1 minutinho e repete?"
                    await asyncio.sleep(2)
                else:
                    logger.error(f"Erro no Gemini: {e}")
                    return "ðŸ¤¯ Deu um curto-circuito interno aqui ao pensar nisso. (Erro na IA)"
        
        # Logar uso da API Gemini
        try:
            tokens = 0
            if hasattr(response, "usage_metadata") and hasattr(response.usage_metadata, "total_token_count"):
                tokens = response.usage_metadata.total_token_count
            
            if tokens > 0:
                sb.table("api_usage_logs").insert({
                    "service_name": "gemini-3.8-flash",
                    "tokens_used": tokens
                }).execute()
        except Exception as e:
            logger.warning("Falha ao registrar log de API: %s", e)

        # Parse do JSON
        import re
        clean_raw = re.sub(r"^```(?:json)?\n?", "", raw.strip(), flags=re.IGNORECASE)
        clean_raw = re.sub(r"\n?```$", "", clean_raw.strip(), flags=re.IGNORECASE).strip()
        
        result = json.loads(clean_raw)
        
        actions = result if isinstance(result, list) else [result]
        
        final_replies = []
        action_replies = []
        
        for act in actions:
            intent = act.get("intent", "chat")
            params = act.get("params", {})
            reply = act.get("reply", "Entendido!")
            
            logger.info("Intent: %s | Params: %s | Sender: @%s", intent, params, sender["username"])
            
            # Adiciona o texto natural se houver (evita repetir "Anotado" pra cada item)
            if reply and reply not in final_replies:
                final_replies.append(reply)
                
            # Executar a aÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o correspondente
            action_reply = await _execute_intent(intent, params, sender, sb)
            if action_reply:
                action_replies.append(action_reply)

        # Montar resposta final combinada
        combined_text = "\n".join(final_replies)
        if action_replies:
            combined_text += "\n\n" + "\n".join(action_replies)
            
        final_reply = combined_text or "ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Feito!"
        
        # ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Salvar no HistÃƒÆ’Ã‚Â³rico de Chat (Fire and Forget) ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
        try:
            # Salva a mensagem do usuÃƒÆ’Ã‚Â¡rio (ou tag [Imagem] / [ÃƒÆ’Ã‚Âudio])
            user_msg = text if text else ("[MÃƒÆ’Ã‚Â­dia]" if media_bytes else "")
            if user_msg:
                sb.table("chat_history").insert({"profile_id": sender["id"], "message": user_msg, "is_bot": False}).execute()
            # Salva a resposta do bot
            sb.table("chat_history").insert({"profile_id": sender["id"], "message": final_reply, "is_bot": True}).execute()
        except Exception as e:
            logger.warning("Falha ao salvar chat_history (Tabela nÃƒÆ’Ã‚Â£o existe?): %s", e)

        return final_reply

    except json.JSONDecodeError as e:
        logger.error("Gemini retornou JSON invÃƒÆ’Ã‚Â¡lido: %s - Raw: %s", e, raw)
        return "ÃƒÂ°Ã…Â¸Ã‚Â¤Ã¢â‚¬â€œ Desculpa, tive um problema ao processar. Tenta de novo?"

    except Exception as e:
        logger.exception("Erro no handler de IA: %s", e)
        return "ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Algo deu errado. Tenta novamente em instantes."


# ---------------------------------------------------------------------------
# Dispatcher de intents
# ---------------------------------------------------------------------------
async def _execute_intent(
    intent: str, params: dict[str, Any], sender: dict, sb: Client
) -> str | None:
    """Executa a aÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o no Supabase baseado no intent e retorna info extra."""

    match intent:
        # ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ TAREFAS ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
        case "task_create":
            assignee_id = None
            if params.get("assignee_username"):
                a = sb.table("profiles").select("id").ilike("username", params.get("assignee_username")).single().execute()
                if a.data:
                    assignee_id = a.data["id"]
            else:
                # LÃƒÆ’Ã‚Â³gica Round-Robin Real Justa: avalia carga histÃƒÆ’Ã‚Â³rica + similaridade
                try:
                    rr_res = sb.table("profiles").select("id").execute()
                    if rr_res.data:
                        profiles = [p["id"] for p in rr_res.data]
                        
                        from datetime import datetime, timedelta
                        from app.logger import BRT
                        last_30d = (datetime.now(BRT) - timedelta(days=30)).isoformat()
                        
                        t_res = sb.table("tasks").select("assignee_id, title, status").gte("created_at", last_30d).execute()
                        
                        # Score: quanto MENOR, maior a chance de receber a tarefa.
                        scores = {p: 0 for p in profiles}
                        
                        # Extrair palavras chaves do tÃƒÆ’Ã‚Â­tulo novo (maior q 3 letras)
                        new_title_words = set(w.lower() for w in params["title"].split() if len(w) > 3)
                        
                        if t_res.data:
                            for t in t_res.data:
                                aid = t.get("assignee_id")
                                if aid in scores:
                                    # Carga geral: tarefa em aberto pesa mais (2), concluÃƒÆ’Ã‚Â­da pesa menos (1)
                                    if t.get("status") != "done":
                                        scores[aid] += 2
                                    else:
                                        scores[aid] += 1
                                        
                                    # PuniÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o por repetiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o da MESMA tarefa (justiÃƒÆ’Ã‚Â§a no rodÃƒÆ’Ã‚Â­zio)
                                    if t.get("title"):
                                        old_title_words = set(w.lower() for w in t["title"].split() if len(w) > 3)
                                        if new_title_words & old_title_words:
                                            # Fez a mesma coisa recentemente? PuniÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o altÃƒÆ’Ã‚Â­ssima (+5)
                                            scores[aid] += 5
                                            
                        if scores:
                            assignee_id = min(scores, key=scores.get)
                except Exception as e:
                    logger.error("Erro no Round-Robin Justo: %s", e)
                    import random
                    assignee_id = random.choice(rr_res.data)["id"] if rr_res and rr_res.data else None

            insert_data = {
                "title": params["title"],
                "description": params.get("description"),
                "assignee_id": assignee_id,
                "created_by": sender["id"],
                "status": "todo",
            }
            
            # Prazos
            if params.get("due_date"):
                insert_data["due_date"] = params["due_date"]
                
            r = sb.table("tasks").insert(insert_data).execute()

            task = r.data[0]
            code = f"#{str(task['seq_id']).zfill(4)}"
            
            # Buscar username do assignee selecionado (se Round Robin)
            a_username = params.get("assignee_username")
            if not a_username and assignee_id:
                try:
                    u_req = sb.table("profiles").select("username").eq("id", assignee_id).single().execute()
                    a_username = u_req.data["username"]
                except Exception:
                    pass
                    
            resp_str = f"ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬Â¹ Tarefa {code} criada!"
            if a_username:
                resp_str = f"ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬Â¹ Tarefa {code} criada e atribuÃƒÆ’Ã‚Â­da a @{a_username}!"
            resp_str += f" (Prazo: {insert_data['due_date']})"
            
            return resp_str

        case "task_list":
            query = sb.table("tasks").select("seq_id, title, status, assignee_id, due_date").neq("status", "done")
            if params.get("status"):
                query = query.eq("status", params["status"])
            r = query.order("seq_id").execute()

            if not r.data:
                return "ÃƒÂ°Ã…Â¸Ã…Â½Ã¢â‚¬Â° Nenhuma tarefa pendente!"

            lines = []
            emoji_map = {"backlog": "ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬Â¹", "todo": "ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã…â€™", "in_progress": "ÃƒÂ¢Ã…Â¡Ã‚Â¡"}
            for t in r.data:
                code = f"#{str(t['seq_id']).zfill(4)}"
                e = emoji_map.get(t["status"], "ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢")
                prazo = f" ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬Â¦ {t['due_date']}" if t.get("due_date") else ""
                lines.append(f"{e} `{code}` {t['title']}{prazo}")
            return "\n".join(lines)

        case "task_update":
            seq_id = params.get("seq_id")
            if not seq_id:
                return "ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Preciso do nÃƒÆ’Ã‚Âºmero da tarefa (ex: #0003)."

            update = {}
            if params.get("status"):
                update["status"] = params["status"]
            if params.get("due_date"):
                update["due_date"] = params["due_date"]
            if params.get("assignee_username"):
                a = sb.table("profiles").select("id").ilike("username", params["assignee_username"]).single().execute()
                if a.data:
                    update["assignee_id"] = a.data["id"]

            if update:
                sb.table("tasks").update(update).eq("seq_id", seq_id).execute()
                return f"ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Tarefa #{str(seq_id).zfill(4)} atualizada!"
            return None

        # ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ FINANÃƒÆ’Ã¢â‚¬Â¡AS ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
        case "transaction_create":
            beneficiary_id = None
            if params.get("beneficiary_username"):
                b = sb.table("profiles").select("id").ilike("username", params["beneficiary_username"]).single().execute()
                if b.data:
                    beneficiary_id = b.data["id"]

            tx_type = params.get("type", "collective")
            sb.table("transactions").insert({
                "description": params["description"],
                "amount": float(params["amount"]),
                "type": tx_type,
                "paid_by": sender["id"],
                "beneficiary_id": beneficiary_id,
                "category": params.get("category"),
                "transaction_date": str(date.today()),
            }).execute()

            amount_fmt = f"R$ {float(params['amount']):.2f}"
            tipo = "Coletivo" if tx_type == "collective" else "Individual"
            return f"ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã‚Â° {tipo} ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ {amount_fmt}"

        case "transaction_list":
            limit = params.get("limit", 10)
            r = sb.table("transactions").select("description, amount, type, transaction_date").order("transaction_date", desc=True).limit(limit).execute()

            if not r.data:
                return "ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â­ Nenhuma transaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o registrada."

            lines = []
            for t in r.data:
                emoji = "ÃƒÂ°Ã…Â¸Ã‚ÂÃ‚Â " if t["type"] == "collective" else "ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ‚Â¤"
                lines.append(f"{emoji} {t['description']} ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â R$ {float(t['amount']):.2f}")
            return "\n".join(lines)

        case "balance_check":
            r = sb.table("balance_summary").select("*").execute()
            if not r.data:
                return "ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã…Â  Sem dados de rateio ainda."

            lines = ["ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã…Â  *Rateio atual:*\n"]
            for b in r.data:
                balance = float(b["balance"])
                sinal = "+" if balance >= 0 else ""
                lines.append(f"@{b['username']}: {sinal}R$ {balance:.2f}")
            return "\n".join(lines)

        # ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ LISTA DE COMPRAS ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
        case "shopping_add":
            insert_data = {
                "item_name": params["item_name"],
                "quantity": params.get("quantity", 1),
                "category": params.get("category", "Geral"),
                "estimated_price": params.get("estimated_price"),
                "added_by": sender["id"],
                "status": "pending",
            }
            sb.table("shopping_list").insert(insert_data).execute()
            return f"ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂºÃ¢â‚¬â„¢ {params['quantity'] if params.get('quantity') else 1}x {params['item_name']} adicionado ÃƒÆ’Ã‚Â  lista ({insert_data['category']})!"
            
        case "shopping_update":
            seq_id = str(params["seq_id"]).replace("#", "")
            update_data = {}
            if params.get("quantity"):
                update_data["quantity"] = params["quantity"]
                
            sb.table("shopping_list").update(update_data).eq("seq_id", seq_id).execute()
            return f"ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂºÃ¢â‚¬â„¢ Item #{seq_id} atualizado (Nova qtd: {params.get('quantity', '?')})!"

        case "shopping_list":
            r = sb.table("shopping_list").select("item_name, quantity, category").eq("status", "pending").execute()
            if not r.data:
                return "ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Lista vazia!"

            lines = []
            for item in r.data:
                cat = f" _({item['category']})_" if item.get("category") else ""
                lines.append(f"ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ {item['item_name']} ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â {item['quantity']}{cat}")
            return "\n".join(lines)

        case "shopping_done":
            item_name = params.get("item_name", "")
            r = sb.table("shopping_list").update({
                "status": "purchased",
                "purchased_by": sender["id"],
            }).ilike("item_name", f"%{item_name}%").eq("status", "pending").execute()

            if r.data:
                return f"ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ *{r.data[0]['item_name']}* marcado como comprado!"
            return f"ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â NÃƒÆ’Ã‚Â£o encontrei '{item_name}' na lista."

        # ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ CLIMA ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
        case "weather_check":
            from app.services.weather import get_weather
            city = params.get("city", "SÃƒÆ’Ã‚Â£o Paulo")
            timeframe = params.get("timeframe", "hoje")
            return await get_weather(city, timeframe)

        # ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ CONVERSA ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
        case "chat":
            return None  # SÃƒÆ’Ã‚Â³ retorna o reply do Gemini

        case _:
            logger.warning("Intent desconhecida: %s", intent)
            return None
import asyncio
from google.api_core.exceptions import ResourceExhausted

ai_queue = asyncio.Queue()

async def start_ai_worker():
    logger.info("Worker de IA iniciado. Escutando fila de mensagens...")
    while True:
        try:
            task = await ai_queue.get()
            text = task.get("text")
            chat_id = task.get("chat_id")
            media_bytes = task.get("media_bytes")
            media_mime = task.get("media_mime")
            
            reply = await _process_ai_message(text, chat_id, media_bytes, media_mime)
            if reply:
                from app.services.telegram import send_message
                await send_message(chat_id, reply)
                
        except Exception as e:
            logger.error("Erro fatal no AI Worker: %s", e)
        finally:
            ai_queue.task_done()

async def handle_ai_message(text: str, chat_id: int, media_bytes: bytes | None = None, media_mime: str | None = None) -> str:
    """
    FunÃƒÂ§ÃƒÂ£o de entrada: envia Typing pro Telegram e enfileira.
    Para manter a retrocompatibilidade do cÃƒÂ³digo antigo, retorna string vazia ou feedback inicial.
    """
    from app.services.telegram import send_chat_action
    
    # Send appropriate action immediately
    action = "upload_photo" if media_bytes and "image" in str(media_mime) else "record_voice" if media_bytes else "typing"
    await send_chat_action(chat_id, action)
    
    await ai_queue.put({
        "text": text,
        "chat_id": chat_id,
        "media_bytes": media_bytes,
        "media_mime": media_mime
    })
    
    return ""  # O worker enviarÃƒÂ¡ a resposta diretamente.

