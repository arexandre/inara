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

logger = logging.getLogger("inara.ai")

# ---------------------------------------------------------------------------
# Configuração do Gemini
# ---------------------------------------------------------------------------
_model = None


def _get_model():
    global _model
    if _model is None:
        genai.configure(api_key=os.environ["GEMINI_API_KEY"])
        _model = genai.GenerativeModel(
            model_name="gemini-3.6-flash",
            system_instruction=SYSTEM_PROMPT,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.3,
            ),
        )
    return _model


def _get_supabase() -> Client:
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )


# ---------------------------------------------------------------------------
# System Prompt — define a personalidade e as capacidades da Inara
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """
Você é a Inara, uma assistente doméstica inteligente e carinhosa que gerencia a casa de 3 moradores.

## Suas Capacidades (Domínios)

### 1. TAREFAS (tasks)
- Criar tarefas domésticas (lavar louça, limpar banheiro, etc.)
- Listar tarefas pendentes
- Marcar tarefas como concluídas
- Atribuir tarefas a moradores

### 2. FINANÇAS (transactions)  
- Registrar gastos coletivos (conta de luz, mercado, etc.)
- Registrar gastos individuais (pix entre moradores)
- Consultar saldo/rateio entre moradores

### 3. LISTA DE COMPRAS (shopping_list)
- Adicionar itens à lista
- Remover itens
- Marcar itens como comprados

## Regras de Resposta

SEMPRE responda com um JSON válido no seguinte formato:

```json
{
  "intent": "nome_da_acao",
  "params": { ... },
  "reply": "Mensagem simpática para o usuário em português"
}
```

### Intents disponíveis:

| Intent | Params | Descrição |
|--------|--------|-----------|
| `task_create` | `title`, `description?`, `assignee_username?`, `due_date?` (YYYY-MM-DD) | Criar nova tarefa. Se o usuário não especificar o prazo, estime a data baseando-se no peso/urgência da atividade (ex: louça=hoje, pintar parede=15 dias). |
| `task_list` | `status?` (backlog/todo/in_progress/done) | Listar tarefas |
| `task_update` | `seq_id`, `status?`, `assignee_username?`, `due_date?` (YYYY-MM-DD) | Atualizar tarefa |
| `transaction_create` | `description`, `amount`, `type` (collective/individual), `category?`, `beneficiary_username?` | Registrar gasto |
| `transaction_list` | `limit?` | Listar transações recentes |
| `balance_check` | — | Ver rateio/saldo |
| `shopping_add` | `item_name`, `quantity?`, `category?`, `estimated_price?` | Adicionar item à lista |
| `shopping_list` | — | Ver lista de compras |
| `shopping_done` | `item_name` | Marcar item como comprado |
| `weather_check` | `city?` (default: Araguari), `timeframe?` (hoje ou amanhã) | Ver previsão do tempo |
| `chat` | — | Quando não é um comando, apenas conversa casual |

### Lidar com Mídias (Fotos e Áudio):
- **Áudio**: O usuário enviará áudios curtos. O conteúdo transcrito está na sua entrada. Processe normalmente extraindo as intenções (criar tarefa, registrar despesa, etc.).
- **Fotos (Notas Fiscais)**: Se o usuário enviar uma foto de nota fiscal de mercado ou padaria, extraia o **valor total** e registre como `transaction_create` (type = collective, category = alimentação). Se houver itens descritos que importam, mencione no campo `reply`.

### Exemplos de Interpretação:
- "Comprei 3kg de frango por 45 reais" → transaction_create (collective, alimentação)
- "Vai chover amanhã?" → weather_check (timeframe=amanhã)
- [Imagem de cupom fiscal de R$ 120,50 no Carrefour] → transaction_create (amount=120.50, description="Compra no Carrefour", type="collective")
- "Adiciona papel higiênico na lista" → shopping_add
- "Fiz um pix de 50 pro João" → transaction_create (individual, beneficiary=João)
- "Cria uma tarefa pra limpar o banheiro" → task_create
- "Marca a tarefa #0003 como feita" → task_update (seq_id=3, status=done)
- "Como tá o saldo?" → balance_check
- "Bom dia, Inara!" → chat

Se não entender a intenção, use intent "chat" e pergunte educadamente.
O campo "reply" DEVE ser uma mensagem em português, simpática e breve.
"""


# ---------------------------------------------------------------------------
# Handler principal — chamado pelo webhook
# ---------------------------------------------------------------------------
async def handle_ai_message(
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
    hoje_str = datetime.now().strftime("%Y-%m-%d")
    context_text = f"[Data atual: {hoje_str}] [Remetente: @{sender['username']} (id: {sender['id']})] {text}"
    
    contents = [context_text]
    if media_bytes and media_mime:
        contents.append({
            "mime_type": media_mime,
            "data": media_bytes
        })

    try:
        model = _get_model()
        response = model.generate_content(contents)
        raw = response.text.strip()

        # Parse do JSON
        result = json.loads(raw)
        
        # Pode ser um único dicionário ou uma lista de ações
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
            
        return combined_text or "✅ Feito!"

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
                # Lógica Round-Robin simples (pega o morador com menos tarefas em aberto)
                rr_res = sb.table("profiles").select("id").execute()
                if rr_res.data:
                    # Em produção ideal faremos um JOIN count, aqui pegamos aleatório ou primeiro para MVP
                    import random
                    assignee_id = random.choice(rr_res.data)["id"]

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
                return "🎉 Nenhuma tarefa pendente!"

            lines = []
            emoji_map = {"backlog": "📋", "todo": "📌", "in_progress": "⚡"}
            for t in r.data:
                code = f"#{str(t['seq_id']).zfill(4)}"
                e = emoji_map.get(t["status"], "•")
                prazo = f" 📅 {t['due_date']}" if t.get("due_date") else ""
                lines.append(f"{e} `{code}` {t['title']}{prazo}")
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
            sb.table("shopping_list").insert({
                "item_name": params["item_name"],
                "quantity": params.get("quantity", "1"),
                "category": params.get("category"),
                "estimated_price": params.get("estimated_price"),
                "added_by": sender["id"],
            }).execute()
            return f"🛒 *{params['item_name']}* adicionado à lista!"

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