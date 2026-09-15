import re

with open("app/services/ai.py", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Update SYSTEM_PROMPT to add task_delete
old_task_update = "\| `task_update` \| `seq_id`, `status\?`, `assignee_username\?`, `due_date\?` \(YYYY-MM-DD\) \| Atualizar tarefa \|"
new_task_update = "| `task_update` | `seq_id`, `status?`, `assignee_username?`, `due_date?` (YYYY-MM-DD) | Atualizar tarefa |\n| `task_delete` | `seq_id` | Deletar/Apagar tarefa |"

text = re.sub(old_task_update, new_task_update.encode('utf-8').decode('unicode_escape'), text)

# 2. Add history fetch inside _process_ai_message
old_context = """
    # Buscar lista de compras ativa para Deduplicaǜo
    shop_res = sb.table("shopping_list").select("item_name, quantity").eq("status", "pending").execute()
    shop_items = [f"- {i['item_name']} (Qtd: {i['quantity'] or 1})" for i in shop_res.data] if shop_res.data else ["Nenhum"]
    shop_context = "\\nLista de Compras Atual:\\n" + "\\n".join(shop_items)
    
    context_text = f"[Data atual: {hoje_str}] [Remetente: @{sender['username']} (id: {sender['id']})]{shop_context}\\n\\nMensagem: {text}"
"""

new_context = """
    # Buscar hist\u00f3rico recente de conversa (para mem\u00f3ria contextual)
    chat_hist = ""
    try:
        hist_res = sb.table("chat_history").select("message, is_bot").eq("profile_id", sender["id"]).order("created_at", desc=True).limit(6).execute()
        if hist_res.data:
            hist_lines = []
            for h in reversed(hist_res.data):
                speaker = "Inara" if h["is_bot"] else sender["username"]
                hist_lines.append(f"{speaker}: {h['message']}")
            chat_hist = "\\nHist\u00f3rico Recente:\\n" + "\\n".join(hist_lines)
    except Exception:
        pass

    # Buscar lista de compras ativa para Deduplica\u00e7\u00e3o
    shop_res = sb.table("shopping_list").select("item_name, quantity").eq("status", "pending").execute()
    shop_items = [f"- {i['item_name']} (Qtd: {i['quantity'] or 1})" for i in shop_res.data] if shop_res.data else ["Nenhum"]
    shop_context = "\\nLista de Compras Atual:\\n" + "\\n".join(shop_items)
    
    context_text = f"[Data atual: {hoje_str}] [Remetente: @{sender['username']} (id: {sender['id']})]{shop_context}{chat_hist}\\n\\nMensagem atual do usu\u00e1rio: {text}"
"""
# Use generic replace for context block since regex is tricky with unicode chars
# Let's locate the area.
import_datetime = "from datetime import datetime"
start_idx = text.find("    # Buscar lista de compras ativa")
end_idx = text.find("    contents = [context_text]")

if start_idx != -1 and end_idx != -1:
    text = text[:start_idx] + new_context.strip() + "\n\n" + text[end_idx:]

# 3. Add task_delete case logic
old_case = 'case "task_update":'
new_case = """case "task_delete":
            seq_id = params.get("seq_id")
            if not seq_id:
                return "⚠️ Preciso do n\u00famero da tarefa (ex: 0010)."
            # Lidar com IDs como #0010 ou strings
            if isinstance(seq_id, str):
                seq_id = seq_id.replace('#', '')
            sb.table("tasks").delete().eq("seq_id", int(seq_id)).execute()
            return f"\u2705 Tarefa #{str(seq_id).zfill(4)} apagada com sucesso!"

        case "task_update":"""
text = text.replace(old_case, new_case)

with open("app/services/ai.py", "w", encoding="utf-8") as f:
    f.write(text)

print("Patched ai.py successfully!")