import re

with open("bot/app/services/ai.py", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

# Fix emoji_map
text = re.sub(r'emoji_map = \{.*?\}', 'emoji_map = {"backlog": "🧊", "todo": "🎯", "in_progress": "⏳"}', text)

# Fix returns
text = re.sub(r'return "[^"]*Nenhuma tarefa pendente!"', 'return "✨ Nenhuma tarefa pendente!"', text)
text = re.sub(r'return f"[^"]*Tarefa #\{code\} criada para \{assignee_name\}!"', 'return f"✅ Tarefa #{code} criada para {assignee_name}!"', text)
text = re.sub(r'return f"[^"]*Tarefa #\{seq_id\} atualizada!"', 'return f"✅ Tarefa #{seq_id} atualizada!"', text)
text = re.sub(r'return f"[^"]*Transa.*registrad.*\{params\[\'amount\'\]\}!"', 'return f"💸 Transação registrada no valor de R$ {params[\'amount\']}!"', text)
text = re.sub(r'return "[^"]*Nenhuma transa.*recente!"', 'return "✨ Nenhuma transação recente!"', text)
text = re.sub(r'return f"[^"]*\{params\[\'quantity\'\] if params\.get\(\'quantity\'\) else 1\}x \{params\[\'item_name\'\]\} adicionado.*lista.*"', 'return f"🛒 {params[\'quantity\'] if params.get(\'quantity\') else 1}x {params[\'item_name\']} adicionado à lista ({insert_data[\'category\']})!"', text)

text = re.sub(r'return "[^"]*Deu um curto-circuito interno aqui ao pensar nisso.*"', 'return "🤯 Deu um curto-circuito interno aqui ao pensar nisso. (Erro na IA)"', text)
text = re.sub(r'await send_message\(chat_id, "[^"]*Desculpe, ocorreu um erro fatal no sistema.*"\)', 'await send_message(chat_id, "🚨 Desculpe, ocorreu um erro fatal no sistema enquanto eu tentava processar sua mensagem. Tente novamente mais tarde!")', text)
text = re.sub(r'return "[^"]*Gente, o Google me botou de castigo.*"', 'return "🥵 Gente, o Google me botou de castigo (limite de uso)! Espera uns minutinhos e tenta de novo, por favor?"', text)

text = re.sub(r'prazo = f" .* \{t\[\'due_date\'\]\}"', 'prazo = f" 📅 {t[\'due_date\']}"', text)
text = re.sub(r'return f"[^"]*\{len\(r\.data\)\} transa.*recentes:\\n"', 'return f"💸 {len(r.data)} transações recentes:\\n"', text)
text = re.sub(r'lines\.append\(f".*`\{code\}`', 'lines.append(f"🔹 `{code}`', text)

# For SYSTEM_PROMPT, it's too broken. Let's just redefine it and replace the entire string.
prompt_idx = text.find('SYSTEM_PROMPT = """')
end_idx = text.find('"""\n\ndef ', prompt_idx + 19)

if prompt_idx != -1 and end_idx != -1:
    new_prompt = """Você é a Inara, a "síndica" virtual e assistente inteligente da casa.
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
    text = text[:prompt_idx + 19] + new_prompt + text[end_idx:]

with open("bot/app/services/ai.py", "w", encoding="utf-8") as f:
    f.write(text)
print("Strings replaced.")