import re

with open("app/services/ai.py", "r", encoding="utf-8") as f:
    text = f.read()

old_logic = """        case "task_update":
            seq_id = params.get("seq_id")
            if not seq_id:
                return "⚠️ Preciso do número da tarefa (ex: #0003)."

            update = {}"""

new_logic = """        case "task_update":
            seq_id = params.get("seq_id")
            if not seq_id:
                return "⚠️ Preciso do número da tarefa (ex: #0003)."
            
            if isinstance(seq_id, str):
                seq_id = seq_id.replace('#', '')
            try:
                seq_id = int(seq_id)
            except:
                pass

            update = {}"""

# Tricky unicode matching, let's use replace instead
text = text.replace('            if not seq_id:\n                return "\u26a0\ufe0f Preciso do n\u00famero da tarefa (ex: #0003)."\n\n            update = {}', 
                    '            if not seq_id:\n                return "\u26a0\ufe0f Preciso do n\u00famero da tarefa (ex: #0003)."\n            if isinstance(seq_id, str):\n                seq_id = seq_id.replace(\'#\', \'\')\n            try:\n                seq_id = int(seq_id)\n            except:\n                pass\n\n            update = {}')

with open("app/services/ai.py", "w", encoding="utf-8") as f:
    f.write(text)

print("task_update patched!")