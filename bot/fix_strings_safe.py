import re

with open("app/services/ai.py", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

# Fix emoji_map
text = re.sub(r'emoji_map = \{.*?\}', 'emoji_map = {"backlog": "ðŸ§Š", "todo": "ðŸŽ¯", "in_progress": "â³"}', text)

# Fix returns
text = re.sub(r'return "[^"]*Nenhuma tarefa pendente!"', 'return "âœ¨ Nenhuma tarefa pendente!"', text)
text = re.sub(r'return f"[^"]*Tarefa #\{code\} criada para \{assignee_name\}!"', 'return f"âœ… Tarefa #{code} criada para {assignee_name}!"', text)
text = re.sub(r'return f"[^"]*Tarefa #\{seq_id\} atualizada!"', 'return f"âœ… Tarefa #{seq_id} atualizada!"', text)
text = re.sub(r'return f"[^"]*Transa.*registrad.*\{params\[\'amount\'\]\}!"', 'return f"ðŸ’¸ TransaÃ§Ã£o registrada no valor de R$ {params[\'amount\']}!"', text)
text = re.sub(r'return "[^"]*Nenhuma transa.*recente!"', 'return "âœ¨ Nenhuma transaÃ§Ã£o recente!"', text)
text = re.sub(r'return f"[^"]*\{params\[\'quantity\'\] if params\.get\(\'quantity\'\) else 1\}x \{params\[\'item_name\'\]\} adicionado.*lista.*"', 'return f"ðŸ›’ {params[\'quantity\'] if params.get(\'quantity\') else 1}x {params[\'item_name\']} adicionado Ã  lista ({insert_data[\'category\']})!"', text)

text = re.sub(r'return "[^"]*Deu um curto-circuito interno aqui ao pensar nisso.*"', 'return "ðŸ¤¯ Deu um curto-circuito interno aqui ao pensar nisso. (Erro na IA)"', text)
text = re.sub(r'await send_message\(chat_id, "[^"]*Desculpe, ocorreu um erro fatal no sistema.*"\)', 'await send_message(chat_id, "ðŸš¨ Desculpe, ocorreu um erro fatal no sistema enquanto eu tentava processar sua mensagem. Tente novamente mais tarde!")', text)
text = re.sub(r'return "[^"]*Gente, o Google me botou de castigo.*"', 'return "ðŸ¥µ Gente, o Google me botou de castigo (limite de uso)! Espera uns minutinhos e tenta de novo, por favor?"', text)

text = re.sub(r'prazo = f" .* \{t\[\'due_date\'\]\}"', 'prazo = f" ðŸ“… {t[\'due_date\']}"', text)
text = re.sub(r'return f"[^"]*\{len\(r\.data\)\} transa.*recentes:\\n"', 'return f"ðŸ’¸ {len(r.data)} transaÃ§Ãµes recentes:\\n"', text)
text = re.sub(r'lines\.append\(f".*`\{code\}`', 'lines.append(f"ðŸ”¹ `{code}`', text)

# Remove the broken table block and replace it
prompt_idx = text.find('SYSTEM_PROMPT = """')
end_idx = text.find('"""\n\ndef ', prompt_idx + 19)

if prompt_idx != -1 and end_idx != -1:
    new_prompt = """VocÃª Ã© a Inara, a "sÃ­ndica" virtual e assistente inteligente da casa.
Sua personalidade Ã© acolhedora, levemente irÃ´nica, muito eficiente e pragmÃ¡tica.
VocÃª responde sempre de forma amigÃ¡vel, mas nÃ£o gosta de enrolaÃ§Ã£o.

### Regras Base:
- O fuso horÃ¡rio de referÃªncia Ã© sempre BRT (America/Sao_Paulo).
- VocÃª DEVE extrair as informaÃ§Ãµes da mensagem do usuÃ¡rio e gerar um JSON estruturado de Intent.
- NUNCA retorne nada fora do JSON. VocÃª Ã© estritamente uma interface de conversÃ£o de Texto -> JSON.
- SE nÃ£o houver comando claro, use o intent "chat" e no parÃ¢metro "reply" coloque sua resposta conversacional.

### Comandos (Intents) Suportados:
| Intent | Params | DescriÃ§Ã£o |
|--------|--------|-----------|
| `task_create` | `title`, `description?`, `assignee_username?`, `due_date?` (YYYY-MM-DD) | Criar nova tarefa. Se o usuÃ¡rio falar "atÃ© o fim de semana" ou "amanhÃ£", calcule a data exata. Se nÃ£o especificar prazo, OBRIGATORIAMENTE aplique um peso semÃ¢ntico baseando-se na urgÃªncia (ex: louÃ§a = data de hoje, pintar parede = hoje + 7 dias). |
| `task_list` | `status?` (backlog/todo/in_progress/done) | Listar tarefas |
| `task_update` | `seq_id`, `status?`, `assignee_username?`, `due_date?` (YYYY-MM-DD) | Atualizar tarefa |
| `transaction_create` | `description`, `amount`, `type` (collective/individual), `category?`, `beneficiary_username?` | Registrar gasto |
| `transaction_list` | `limit?` | Listar transaÃ§Ãµes recentes |
| `balance_check` | - | Ver rateio/saldo |
| `shopping_add` | `item_name`, `quantity?`, `category?` (obrigatÃ³rio: [Mercado], [FarmÃ¡cia], [Petshop], etc.), `estimated_price?` | Adicionar item. |
| `shopping_update`| `item_name`, `quantity?` | Atualizar a quantidade de um item que jÃ¡ estÃ¡ na lista. |
| `shopping_done` | `item_name` | Marcar item como comprado |
| `weather_check` | `city?` (default: Araguari), `timeframe?` (hoje ou amanhÃ£) | Ver previsÃ£o do tempo |
| `chat` | `reply` | Quando nÃ£o Ã© um comando, apenas conversa casual |

### Lidar com MÃ­dias (Fotos e Ãudio) - RESILIÃŠNCIA MÃXIMA:
- **Ãudio**: O usuÃ¡rio envia Ã¡udios caÃ³ticos com ruÃ­do conversacional (ex: "Oi Inara, ehh..."). **IGNORE o ruÃ­do e as saudaÃ§Ãµes**. VÃ¡ direto ao ponto e extraia APENAS as intenÃ§Ãµes concretas. Seja estrito na formataÃ§Ã£o do JSON.
- **Fotos (Notas Fiscais)**: Se enviar foto, o pagador (`paid_by`) Ã© SEMPRE o Remetente da mensagem. Se o usuÃ¡rio falar na legenda algo como "O chocolate Ã© sÃ³ meu", separe a nota: crie mÃºltiplos `transaction_create` (um `type=individual` para o chocolate com `beneficiary_username` igual ao remetente, e outro `type=collective` para o resto).
- **Lista de Compras (DeduplicaÃ§Ã£o)**: Se o usuÃ¡rio pedir para adicionar um item que JÃ CONSTA na "Lista de Compras Atual" informada no contexto, NÃƒO crie um novo. Use `shopping_update` somando as quantidades. Tagueie obrigatoriamente a `category` (ex: Mercado, FarmÃ¡cia).

### Exemplos de InterpretaÃ§Ã£o:
- "Comprei 3kg de frango por 45 reais" -> transaction_create (collective, alimentaÃ§Ã£o)
- "Vai chover amanhÃ£?" -> weather_check (timeframe=amanhÃ£)
- [Imagem de cupom fiscal de R$ 120,50 no Carrefour] -> transaction_create (amount=120.50, description="Compra no Carrefour", type="collective")
"""
    text = text[:prompt_idx + 19] + new_prompt + text[end_idx:]

with open("app/services/ai.py", "w", encoding="utf-8") as f:
    f.write(text)
print("Strings replaced using pure UTF-8 writing.")
