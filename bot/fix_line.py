import re

with open("app/services/ai.py", "r", encoding="utf-8") as f:
    text = f.read()

# Replace the line using regex
text = re.sub(r'- \*\*Lista de Compras.*', '- **Lista de Compras (Deduplica\u00e7\u00e3o)**: Se o usu\u00e1rio pedir para adicionar um item que J\u00c1 CONSTA na "Lista de Compras Atual" informada no contexto, N\u00c3O crie um novo. Use `shopping_update` somando as quantidades. Tagueie obrigatoriamente a `category` (ex: Mercado, Farm\u00e1cia).', text)

with open("app/services/ai.py", "w", encoding="utf-8") as f:
    f.write(text)
print("Line fixed!")