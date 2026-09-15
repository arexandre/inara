import re

with open("app/services/ai.py", "r", encoding="utf-8") as f:
    text = f.read()

new_task_create = "| `task_create` | `title`, `description?`, `assignee_username?`, `due_date?` (YYYY-MM-DD), `weight?` (int 1-5) | Criar nova tarefa. Se o usu\\u00e1rio falar \"at\\u00e9 o fim de semana\" ou \"amanh\\u00e3\", calcule a data. Se n\\u00e3o especificar prazo, OBRIGATORIAMENTE aplique um peso sem\\u00e2ntico para a data. OBRIGAT\\u00d3RIO: Atribua um `weight` (Peso/Esfor\\u00e7o) de 1 (muito f\\u00e1cil) a 5 (muito dif\\u00edcil/chato) baseando-se no trabalho f\\u00edsico (ex: lavar banheiro = 4, descer lixo = 1). |"

text = re.sub(r'\| `task_create` \|.*?\|.*?\|', new_task_create.encode('utf-8').decode('unicode_escape'), text)

# Update insert_data
old_insert = """
            insert_data = {
                "title": params.get("title", "Nova Tarefa"),
                "description": params.get("description"),
                "assignee_id": assignee_id,
                "created_by": sender["id"],
                "status": "backlog"
            }
"""

new_insert = """
            insert_data = {
                "title": params.get("title", "Nova Tarefa"),
                "description": params.get("description"),
                "assignee_id": assignee_id,
                "created_by": sender["id"],
                "status": "backlog",
                "weight": params.get("weight", 1)
            }
"""

text = text.replace(old_insert.strip(), new_insert.strip())

with open("app/services/ai.py", "w", encoding="utf-8") as f:
    f.write(text)
print("Prompt and Insert updated with Weight!")