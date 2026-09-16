import re

with open("app/services/ai.py", "r", encoding="utf-8") as f:
    text = f.read()

# Fix surrogates issue by decoding them first
def desurrogate(s):
    return s.encode('utf-16', 'surrogatepass').decode('utf-16')

# 1. Update SYSTEM_PROMPT to enforce obedience and less sarcasm on actions
new_prompt_rules = """### Regras Base:
- O fuso hor\u00e1rio de refer\u00eancia \u00e9 sempre BRT (America/Sao_Paulo).
- Voc\u00ea DEVE extrair as informa\u00e7\u00f5es e gerar um JSON estruturado de Intent.
- NUNCA retorne nada fora do JSON. Voc\u00ea \u00e9 estritamente uma interface de convers\u00e3o de Texto -> JSON.
- SE n\u00e3o houver comando, use o intent "chat".
- OBEDI\u00caNCIA ABSOLUTA: Voc\u00ea NUNCA deve se recusar a registrar uma transa\u00e7\u00e3o, tarefa ou evento. Se o usu\u00e1rio mandar, fa\u00e7a.
- TOM (Termostato de Sarcasmo): Em a\u00e7\u00f5es de sistema (criar tarefa, registrar gastos), seja EXTREMAMENTE prestativa, direta e amena. Guarde o sarcasmo APENAS para conversas casuais ou quando tentarem te enganar.
"""
text = re.sub(r"### Regras Base:.*?### Comandos \(Intents\) Suportados:", new_prompt_rules + "\n### Comandos (Intents) Suportados:", text, flags=re.DOTALL)

new_intents = "| `transaction_list` | `limit?` | Listar transações recentes |\n| `poll_create` | `question`, `options` (array de strings) | Criar uma enquete no Telegram. Ex: 'Isso entra no rateio?' |\n| `mural_add` | `message` | Adicionar aviso no Mural da casa |"
text = re.sub(r"\| `transaction_list`.*?\|", new_intents, text)

text = text.replace("async def _process_ai_message(\n    text: str, \n    chat_id: int, \n    media_bytes: bytes | None = None, \n    media_mime: str | None = None\n) -> str:", "async def _process_ai_message(\n    text: str, \n    chat_id: int, \n    media_bytes: bytes | None = None, \n    media_mime: str | None = None\n) -> tuple[str | None, dict | None]:")

text = text.replace("return \"\"", "return \"\", None")
text = re.sub(r'return (f".*?"|".*?")', r'return \1, None', text)
text = re.sub(r'return ("\\n"\.join\(.*?\))', r'return \1, None', text)
text = re.sub(r'return None', r'return None, None', text)
text = text.replace('return None, None, None', 'return None, None') # fix over-replacement

text = text.replace('case "task_delete":', desurrogate("""case "poll_create":
            return None, {"type": "poll", "question": params.get("question", "Vota\u00e7\u00e3o"), "options": params.get("options", ["Sim", "N\u00e3o"])}
            
        case "mural_add":
            sb.table("mural").insert({"message": params["message"], "created_by": sender["id"]}).execute()
            return f"\ud83d\udccc Aviso fixado no Mural!", None

        case "task_delete":"""))

delete_logic_old = """        case "task_delete":
            seq_id = params.get("seq_id")
            if not seq_id:
                return "\u26a0\ufe0f Preciso do n\u00famero da tarefa (ex: #0003).", None
            if isinstance(seq_id, str):
                seq_id = seq_id.replace('#', '')
            try:
                seq_id = int(seq_id)
            except:
                pass
            sb.table("tasks").delete().eq("seq_id", int(seq_id)).execute()
            return f"\u2705 Tarefa #{str(seq_id).zfill(4)} apagada com sucesso!", None"""

delete_logic_new = desurrogate("""        case "task_delete":
            seq_id = params.get("seq_id")
            if not seq_id:
                return "\u26a0\ufe0f Preciso do n\u00famero da tarefa.", None
            if isinstance(seq_id, str):
                seq_id = seq_id.replace('#', '')
            
            payload = {"seq_id": int(seq_id)}
            res = sb.table("pending_actions").insert({
                "chat_id": chat_id, "intent": "task_delete", "payload": payload
            }).execute()
            action_id = res.data[0]["id"]
            
            kb = {
                "inline_keyboard": [
                    [{"text": "\u2705 Confirmar", "callback_data": f"confirm_{action_id}"},
                     {"text": "\u274c Cancelar", "callback_data": f"cancel_{action_id}"}]
                ]
            }
            return f"\u26a0\ufe0f Entendi que voc\u00ea deseja **APAGAR** a tarefa #{str(seq_id).zfill(4)}.\nConfirma esta a\u00e7\u00e3o?", kb""")

text = text.replace(delete_logic_old, delete_logic_new)

tx_logic_old = """        case "transaction_create":
            beneficiary_id = None
            if params.get("beneficiary_username"):
                b = sb.table("profiles").select("id").ilike("username", params["beneficiary_username"]).single().execute()
                if b.data:
                    beneficiary_id = b.data["id"]

            tx_type = params.get("type", "collective")
            
            raw_amt = str(params["amount"]).replace(',', '.')
            amt = float(raw_amt)
            
            sb.table("transactions").insert({
                "description": params["description"],
                "amount": amt,
                "type": tx_type,
                "paid_by": sender["id"],
                "beneficiary_id": beneficiary_id,
                "category": params.get("category"),
                "transaction_date": hoje_str,
            }).execute()

            amount_fmt = f"R$ {float(params['amount']):.2f}"
            tipo = "Coletivo" if tx_type == "collective" else "Individual"
            return f"\ud83d\udcb8 {tipo} \u27a1\ufe0f {amount_fmt}", None"""

tx_logic_new = desurrogate("""        case "transaction_create":
            beneficiary_id = None
            if params.get("beneficiary_username"):
                b = sb.table("profiles").select("id").ilike("username", params["beneficiary_username"]).single().execute()
                if b.data:
                    beneficiary_id = b.data["id"]

            tx_type = params.get("type", "collective")
            raw_amt = str(params["amount"]).replace(',', '.')
            amt = float(raw_amt)
            
            payload = {
                "description": params["description"],
                "amount": amt,
                "type": tx_type,
                "paid_by": sender["id"],
                "beneficiary_id": beneficiary_id,
                "category": params.get("category"),
                "transaction_date": hoje_str,
            }
            
            res = sb.table("pending_actions").insert({
                "chat_id": chat_id, "intent": "transaction_create", "payload": payload
            }).execute()
            action_id = res.data[0]["id"]
            
            kb = {
                "inline_keyboard": [
                    [{"text": "\u2705 Lançar", "callback_data": f"confirm_{action_id}"},
                     {"text": "\u274c Descartar", "callback_data": f"cancel_{action_id}"}]
                ]
            }
            amount_fmt = f"R$ {amt:.2f}"
            tipo = "Coletivo" if tx_type == "collective" else "Individual"
            return f"\ud83d\udcc4 Entendi que voc\u00ea deseja lan\u00e7ar uma despesa:\n\n**{params['description']}**\nValor: {amount_fmt} ({tipo})\n\nConfirma?", kb""")

text = text.replace(tx_logic_old, tx_logic_new)

worker_old = """            reply = await _process_ai_message(text, chat_id, media_bytes, media_mime)
            if reply:
                from app.services.telegram import send_message
                await send_message(chat_id, reply)"""

worker_new = """            reply, markup = await _process_ai_message(text, chat_id, media_bytes, media_mime)
            if markup and markup.get("type") == "poll":
                from app.services.telegram import send_poll
                await send_poll(chat_id, markup["question"], markup["options"])
            elif reply:
                from app.services.telegram import send_message
                await send_message(chat_id, reply, reply_markup=markup)"""

text = text.replace(worker_old, worker_new)

with open("app/services/ai.py", "w", encoding="utf-8") as f:
    f.write(text)

print("ai.py patched successfully!")