import re

with open("app/services/ai.py", "r", encoding="utf-8") as f:
    text = f.read()

old_task = "\| `task_create` \| .*?\| .*? \|"
new_event = """| `task_create` | `title`, `description?`, `assignee_username?`, `due_date?` (YYYY-MM-DD), `weight?` (int 1-5) | Criar tarefa. Exige esforço (faxina, lixo). |
| `event_create` | `title`, `event_date` (YYYY-MM-DD), `event_time?` (HH:MM), `is_all_day?` | Criar Evento/Compromisso. Ex: "sábado tem churrasco", "aniversário da vovó", "médico às 14h". |"""

text = re.sub(old_task, new_event.encode("utf-8").decode("unicode_escape"), text)

old_case = 'case "task_create":'
new_case = """case "event_create":
            insert_data = {
                "title": params.get("title", "Novo Evento"),
                "event_date": params.get("event_date"),
                "event_time": params.get("event_time"),
                "is_all_day": params.get("is_all_day", False),
                "type": "event",
                "created_by": sender["id"]
            }
            if not insert_data["event_date"]:
                from datetime import datetime
                from app.logger import BRT
                insert_data["event_date"] = datetime.now(BRT).strftime("%Y-%m-%d")
                
            sb.table("events").insert(insert_data).execute()
            return f"🎈 Evento '{insert_data['title']}' adicionado para {insert_data['event_date']}!"
            
        case "task_create":"""

text = text.replace(old_case.strip(), new_case.strip())

with open("app/services/ai.py", "w", encoding="utf-8") as f:
    f.write(text)
print("Updated ai.py with event_create!")