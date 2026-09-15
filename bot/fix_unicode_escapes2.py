import re

with open("app/services/ai.py", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

# Emojis via unicode escapes evaluated by python compiler
text = re.sub(r'emoji_map = \{.*?\}', 'emoji_map = {"backlog": "\u2744\ufe0f", "todo": "\U0001f3af", "in_progress": "\u23f3"}', text)

text = re.sub(r'return "[^"]*Nenhuma tarefa pendente!"', 'return "\u2728 Nenhuma tarefa pendente!"', text)
text = re.sub(r'return f"[^"]*Tarefa #\{code\} criada para \{assignee_name\}!"', 'return f"\u2705 Tarefa #{code} criada para {assignee_name}!"', text)
text = re.sub(r'return f"[^"]*Tarefa #\{seq_id\} atualizada!"', 'return f"\u2705 Tarefa #{seq_id} atualizada!"', text)
text = re.sub(r'return f"[^"]*Transa.*registrad.*\{params\[\'amount\'\]\}!"', 'return f"\U0001f4b8 Transa\u00e7\u00e3o registrada no valor de R$ {params[\'amount\']}!"', text)
text = re.sub(r'return "[^"]*Nenhuma transa.*recente!"', 'return "\u2728 Nenhuma transa\u00e7\u00e3o recente!"', text)
text = re.sub(r'return f"[^"]*\{params\[\'quantity\'\] if params\.get\(\'quantity\'\) else 1\}x \{params\[\'item_name\'\]\} adicionado.*lista.*"', 'return f"\U0001f6d2 {params[\'quantity\'] if params.get(\'quantity\') else 1}x {params[\'item_name\']} adicionado \u00e0 lista ({insert_data[\'category\']})!"', text)

text = re.sub(r'return "[^"]*Deu um curto-circuito interno aqui ao pensar nisso.*"', 'return "\U0001f92f Deu um curto-circuito interno aqui ao pensar nisso. (Erro na IA)"', text)
text = re.sub(r'await send_message\(chat_id, "[^"]*Desculpe, ocorreu um erro fatal no sistema.*"\)', 'await send_message(chat_id, "\U0001f6a8 Desculpe, ocorreu um erro fatal no sistema enquanto eu tentava processar sua mensagem. Tente novamente mais tarde!")', text)
text = re.sub(r'return "[^"]*Gente, o Google me botou de castigo.*"', 'return "\U0001f975 Gente, o Google me botou de castigo (limite de uso)! Espera uns minutinhos e tenta de novo, por favor?"', text)

text = re.sub(r'prazo = f" .* \{t\[\'due_date\'\]\}"', 'prazo = f" \U0001f4c5 {t[\'due_date\']}"', text)
text = re.sub(r'return f"[^"]*\{len\(r\.data\)\} transa.*recentes:\\n"', 'return f"\U0001f4b8 {len(r.data)} transa\u00e7\u00f5es recentes:\\n"', text)
text = re.sub(r'lines\.append\(f".*`\{code\}`', 'lines.append(f"\U0001f539 `{code}`', text)

with open("app/services/ai.py", "w", encoding="utf-8") as f:
    f.write(text)
print("ASCII-escaped python script successfully ran!")