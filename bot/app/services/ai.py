"""
Serviço de IA (Google Gemini) — Processamento de linguagem natural.

Fluxo:
  1. Recebe mensagem livre do Telegram.
  2. Envia ao Gemini com System Prompt contextual (perfil + domínios).
  3. Gemini retorna JSON estruturado com intent + parâmetros.
  4. Dispatcher executa a ação correspondente no Supabase.
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
# Instanciação do Modelo
# ---------------------------------------------------------------------------
def _get_model():
    from datetime import datetime
    from app.logger import BRT
    agora = datetime.now(BRT)
    dias = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
    dia_semana = dias[agora.weekday()]
    
    dynamic_sys_prompt = f"Data atual: {agora.strftime('%Y-%m-%d %H:%M:%S')} ({dia_semana}).\n{SYSTEM_PROMPT}"
    
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    return genai.GenerativeModel(
        model_name="gemini-3.5-flash-lite",
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
# System Prompt — define a personalidade e as capacidades da Inara
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """
Você é a Inara, a "síndica" virtual e assistente inteligente da casa.
Sua personalidade é acolhedora, levemente irônica, muito eficiente e pragmática.
Você responde sempre de forma amigável, mas não gosta de enrolação.

### Regras Base:
- O fuso horário de referência é sempre BRT (America/Sao_Paulo).
- Você DEVE extrair as informações da mensagem do usuário e gerar um JSON estruturado de Intent.
- NUNCA retorne nada fora do JSON. Você é estritamente uma interface de conversão de Texto -> JSON.
- SE não houver comando claro, use o intent "chat" e no parâmetro "reply" coloque sua resposta conversacional.

### Comandos (Intents) Suportados:
| Intent | Params | Descrição |
|--------|--------|-----------|
| `task_create` | `title`, `description?`, `assignee_username?`, `due_date?` (YYYY-MM-DD) | Criar nova tarefa. Se o usuário falar "até o fim de semana" ou "amanhã", calcule a data exata. Se não especificar prazo, OBRIGATORIAMENTE aplique um peso semântico baseando-se na urgência (ex: louça = data de hoje, pintar parede = hoje + 7 dias). |
| `task_list` | `status?` (backlog/todo/in_progress/done) | Listar tarefas |
| `task_update` | `seq_id`, `status?`, `assignee_username?`, `due_date?` (YYYY-MM-DD) | Atualizar tarefa |
| `transaction_create` | `description`, `amount`, `type` (collective/individual), `category?`, `beneficiary_username?` | Registrar gasto |
| `transaction_list` | `limit?` | Listar transações recentes |
| `balance_check` | - | Ver rateio/saldo |
| `shopping_add` | `item_name`, `quantity?`, `category?` (obrigatório: [Mercado], [Farmácia], [Petshop], etc.), `estimated_price?` | Adicionar item. |
| `shopping_update`| `item_name`, `quantity?` | Atualizar a quantidade de um item que já está na lista. |
| `shopping_done` | `item_name` | Marcar item como comprado |
| `weather_check` | `city?` (default: Araguari), `timeframe?` (hoje ou amanhã) | Ver previsão do tempo |
| `chat` | `reply` | Quando não é um comando, apenas conversa casual |

### Lidar com Mídias (Fotos e Áudio) - RESILIÊNCIA MÁXIMA:
- **Áudio**: O usuário envia áudios caóticos com ruído conversacional (ex: "Oi Inara, ehh..."). **IGNORE o ruído e as saudações**. Vá direto ao ponto e extraia APENAS as intenções concretas. Seja estrito na formatação do JSON.
- **Fotos (Notas Fiscais)**: Se enviar foto, o pagador (`paid_by`) é SEMPRE o Remetente da mensagem. Se o usuário falar na legenda algo como "O chocolate é só meu", separe a nota: crie múltiplos `transaction_create` (um `type=individual` para o chocolate com `beneficiary_username` igual ao remetente, e outro `type=collective` para o resto).
- **Lista de Compras (Deduplicação)**: Se o usuário pedir para adicionar um item que JÁ CONSTA na "Lista de Compras Atual" informada no contexto, NÃO crie um novo. Use `shopping_update` somando as quantidades. Tagueie obrigatoriamente a `category` (ex: Mercado, Farmácia).

### Exemplos de Interpretação:
- "Comprei 3kg de frango por 45 reais" -> transaction_create (collective, alimentação)
- "Vai chover amanhã?" -> weather_check (timeframe=amanhã)
- [Imagem de cupom fiscal de R$ 120,50 no Carrefour] -> transaction_create (amount=120.50, description="Compra no Carrefour", type="collective")
"""


# ---------------------------------------------------------------------------
# Handler principal — chamado pelo webhook
# ---------------------------------------------------------------------------
async def _process_ai_message(
    text: str, 
    chat_id: int, 
    media_bytes: bytes | None = None, 
    media_mime: str | None = None
) -> str:
    """
    Processa uma mensagem livre usando o Gemini e executa a ação no Supabase.
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
            "❌ Seu Telegram não está vinculado a nenhum morador.\n"
            "Acesse o app Inara e vincule seu perfil primeiro."
        )

    # Contextualizar a mensagem para o Gemini
    from datetime import datetime
    from app.logger import BRT
    hoje_str = datetime.now(BRT).strftime("%Y-%m-%d")
    
    # Buscar lista de compras ativa para Deduplicação
    shop_res = sb.table("shopping_list").select("item_name, quantity").eq("status", "pending").execute()
    shop_items = [f"- {i['item_name']} (Qtd: {i['quantity'] or 1})" for i in shop_res.data] if shop_res.data else ["Nenhum"]
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
        
        # Lógica de Retry com Backoff (Anti-429 e Timeouts)
        MAX_RETRIES = 3
        raw = ""
        for attempt in range(MAX_RETRIES):
            try:
                import asyncio
                response = await model.generate_content_async(contents, request_options={"timeout": 15.0})
                raw = response.text.strip()
                break
            except Exception as e:
                err_str = str(e).lower()
                if "429" in err_str or "exhausted" in err_str or "too many requests" in err_str:
                    logger.warning(f"Gemini Rate Limit (429). Tentativa {attempt+1}/{MAX_RETRIES}. Aguardando...")
                    if attempt == MAX_RETRIES - 1:
                        return "🥵 Gente, o Google me botou de castigo (limite de uso)! Espera uns minutinhos e tenta de novo, por favor?"
                    await asyncio.sleep(5 * (attempt + 1))
                elif "timeout" in err_str or "connection" in err_str or "504" in err_str or "deadline" in err_str:
                    logger.warning(f"Timeout Gemini. Tentativa {attempt+1}/{MAX_RETRIES}.")
                    if attempt == MAX_RETRIES - 1:
                        return "🔌 Minha conexão com o cérebro (Google) falhou... Me dá 1 minutinho e repete?"
                    await asyncio.sleep(2)
                else:
                    logger.error(f"Erro no Gemini: {e}")
                    return "🤯 Deu um curto-circuito interno aqui ao pensar nisso. (Erro na IA)"
        
        # Logar uso da API Gemini
        try:
            tokens = 0
            if hasattr(response, "usage_metadata") and hasattr(response.usage_metadata, "total_token_count"):
                tokens = response.usage_metadata.total_token_count
            
            if tokens > 0:
                sb.table("api_usage_logs").insert({
                    "service_name": "gemini-3.5-flash-lite",
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
                
            # Executar a ação correspondente
            action_reply = await _execute_intent(intent, params, sender, sb)
            if action_reply:
                action_replies.append(action_reply)

        # Montar resposta final combinada
        combined_text = "\n".join(final_replies)
        if action_replies:
            combined_text += "\n\n" + "\n".join(action_replies)
            
        final_reply = combined_text or "✅ Feito!"
        
        # ── Salvar no Histórico de Chat (Fire and Forget) ──
        try:
            # Salva a mensagem do usuário (ou tag [Imagem] / [Áudio])
            user_msg = text if text else ("[Mídia]" if media_bytes else "")
            if user_msg:
                sb.table("chat_history").insert({"profile_id": sender["id"], "message": user_msg, "is_bot": False}).execute()
            # Salva a resposta do bot
            sb.table("chat_history").insert({"profile_id": sender["id"], "message": final_reply, "is_bot": True}).execute()
        except Exception as e:
            logger.warning("Falha ao salvar chat_history (Tabela não existe?): %s", e)

        return final_reply

    except json.JSONDecodeError as e:
        logger.error("Gemini retornou JSON inválido: %s - Raw: %s", e, raw)
        return "🤖 Desculpa, tive um problema ao processar. Tenta de novo?"

    except Exception as e:
        logger.exception("Erro no handler de IA: %s", e)
        return "⚠️ Algo deu errado. Tenta novamente em instantes."


# ---------------------------------------------------------------------------
# Dispatcher de intents
# ---------------------------------------------------------------------------
async def _execute_intent(
    intent: str, params: dict[str, Any], sender: dict, sb: Client
) -> str | None:
    """Executa a ação no Supabase baseado no intent e retorna info extra."""

    match intent:
        # ── TAREFAS ─────────────────────────────────────────────────
        case "task_create":
            assignee_id = None
            if params.get("assignee_username"):
                a = sb.table("profiles").select("id").ilike("username", params.get("assignee_username")).single().execute()
                if a.data:
                    assignee_id = a.data["id"]
            else:
                # Lógica Round-Robin Real Justa: avalia carga histórica + similaridade
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
                        
                        # Extrair palavras chaves do título novo (maior q 3 letras)
                        new_title_words = set(w.lower() for w in params["title"].split() if len(w) > 3)
                        
                        if t_res.data:
                            for t in t_res.data:
                                aid = t.get("assignee_id")
                                if aid in scores:
                                    # Carga geral: tarefa em aberto pesa mais (2), concluída pesa menos (1)
                                    if t.get("status") != "done":
                                        scores[aid] += 2
                                    else:
                                        scores[aid] += 1
                                        
                                    # Punição por repetição da MESMA tarefa (justiça no rodízio)
                                    if t.get("title"):
                                        old_title_words = set(w.lower() for w in t["title"].split() if len(w) > 3)
                                        if new_title_words & old_title_words:
                                            # Fez a mesma coisa recentemente? Punição altíssima (+5)
                                            scores[aid] += 5
                                            
                        if scores:
                            assignee_id = min(scores, key=scores.get)
                except Exception as e:
                    logger.error("Erro no Round-Robin Justo: %s", e)
                    import random
                    assignee_id = random.choice(rr_res.data)["id"] if rr_res and rr_res.data else None

            insert_data = {
                "title": params.get("title", "Nova Tarefa"),
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
                    
            resp_str = f"📋 Tarefa {code} criada!"
            if a_username:
                resp_str = f"📋 Tarefa {code} criada e atribuída a @{a_username}!"
            resp_str += f" (Prazo: {insert_data['due_date']})"
            
            return resp_str

        case "task_list":
            query = sb.table("tasks").select("seq_id, title, status, assignee_id, due_date").neq("status", "done")
            if params.get("status"):
                query = query.eq("status", params["status"])
            r = query.order("seq_id").execute()

            if not r.data:
                return "✨ Nenhuma tarefa pendente!"

            lines = []
            emoji_map = {"backlog": "❄️", "todo": "🎯", "in_progress": "⏳"}
            for t in r.data:
                code = f"#{str(t['seq_id']).zfill(4)}"
                e = emoji_map.get(t["status"], "•")
                prazo = f" 📅 {t['due_date']}" if t.get("due_date") else ""
                lines.append(f"🔹 `{code}` {t['title']}{prazo}")
            return "\n".join(lines)

        case "task_update":
            seq_id = params.get("seq_id")
            if not seq_id:
                return "⚠️ Preciso do número da tarefa (ex: #0003)."

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
                return f"✅ Tarefa #{str(seq_id).zfill(4)} atualizada!"
            return None

        # ── FINANÇAS ────────────────────────────────────────────────
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
            return f"💰 {tipo} • {amount_fmt}"

        case "transaction_list":
            limit = params.get("limit", 10)
            r = sb.table("transactions").select("description, amount, type, transaction_date").order("transaction_date", desc=True).limit(limit).execute()

            if not r.data:
                return "📭 Nenhuma transação registrada."

            lines = []
            for t in r.data:
                emoji = "🏠" if t["type"] == "collective" else "👤"
                lines.append(f"{emoji} {t['description']} — R$ {float(t['amount']):.2f}")
            return "\n".join(lines)

        case "balance_check":
            r = sb.table("balance_summary").select("*").execute()
            if not r.data:
                return "📊 Sem dados de rateio ainda."

            lines = ["📊 *Rateio atual:*\n"]
            for b in r.data:
                balance = float(b["balance"])
                sinal = "+" if balance >= 0 else ""
                lines.append(f"@{b['username']}: {sinal}R$ {balance:.2f}")
            return "\n".join(lines)

        # ── LISTA DE COMPRAS ────────────────────────────────────────
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
            return f"🛒 {params['quantity'] if params.get('quantity') else 1}x {params['item_name']} adicionado à lista ({insert_data['category']})!"
            
        case "shopping_update":
            update_data = {}
            if params.get("quantity"):
                update_data["quantity"] = params["quantity"]
                
            sb.table("shopping_list").update(update_data).eq("item_name", params["item_name"]).eq("status", "pending").execute()
            return f"🛒 Item {params['item_name']} atualizado (Nova qtd: {params.get('quantity', '?')})!"

        case "shopping_list":
            r = sb.table("shopping_list").select("item_name, quantity, category").eq("status", "pending").execute()
            if not r.data:
                return "✅ Lista vazia!"

            lines = []
            for item in r.data:
                cat = f" _({item['category']})_" if item.get("category") else ""
                lines.append(f"• {item['item_name']} — {item['quantity']}{cat}")
            return "\n".join(lines)

        case "shopping_done":
            item_name = params.get("item_name", "")
            r = sb.table("shopping_list").update({
                "status": "purchased",
                "purchased_by": sender["id"],
            }).ilike("item_name", f"%{item_name}%").eq("status", "pending").execute()

            if r.data:
                return f"✅ *{r.data[0]['item_name']}* marcado como comprado!"
            return f"⚠️ Não encontrei '{item_name}' na lista."

        # ── CLIMA ───────────────────────────────────────────────────
        case "weather_check":
            from app.services.weather import get_weather
            city = params.get("city", "São Paulo")
            timeframe = params.get("timeframe", "hoje")
            return await get_weather(city, timeframe)

        # ── CONVERSA ────────────────────────────────────────────────
        case "chat":
            return None  # Só retorna o reply do Gemini

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
            if chat_id:
                try:
                    from app.services.telegram import send_message
                    await send_message(chat_id, "🚨 Desculpe, ocorreu um erro fatal no sistema enquanto eu tentava processar sua mensagem. Tente novamente mais tarde!")
                except Exception as inner_e:
                    logger.error("Falha ao enviar mensagem de erro: %s", inner_e)
        finally:
            ai_queue.task_done()

async def handle_ai_message(text: str, chat_id: int, media_bytes: bytes | None = None, media_mime: str | None = None) -> str:
    """
    Função de entrada: envia Typing pro Telegram e enfileira.
    Para manter a retrocompatibilidade do código antigo, retorna string vazia ou feedback inicial.
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
    
    return ""  # O worker enviará a resposta diretamente.

