import subprocess

# Get the pristine file
content = subprocess.check_output(["git", "show", "f8bd743:bot/app/services/ai.py"]).decode("utf-8")

# Apply Fix 1: Rename handle_ai_message to _process_ai_message
content = content.replace("async def handle_ai_message(\n    text: str, \n    chat_id: int, ", "async def _process_ai_message(\n    text: str, \n    chat_id: int, ")

# Apply Fix 2: Remove seq_id from shopping list context builder
content = content.replace('shop_res = sb.table("shopping_list").select("seq_id, item_name, quantity").eq("status", "pending").execute()', 'shop_res = sb.table("shopping_list").select("item_name, quantity").eq("status", "pending").execute()')
content = content.replace('shop_items = [f"#{i[\'seq_id\']} {i[\'item_name\']} (Qtd: {i[\'quantity\'] or 1})" for i in shop_res.data] if shop_res.data else ["Nenhum"]', 'shop_items = [f"- {i[\'item_name\']} (Qtd: {i[\'quantity\'] or 1})" for i in shop_res.data] if shop_res.data else ["Nenhum"]')

# Apply Fix 3: Remove seq_id from shopping_update logic
import re
old_shopping_update = r'case "shopping_update":\n\s+seq_id = str\(params\["seq_id"\]\)\.replace\("#", ""\)\n\s+update_data = \{\}\n\s+if params\.get\("quantity"\):\n\s+update_data\["quantity"\] = params\["quantity"\]\n\s+\n\s+sb\.table\("shopping_list"\)\.update\(update_data\)\.eq\("seq_id", seq_id\)\.execute\(\)\n\s+return f"🛒 Item #\{seq_id\} atualizado \(Nova qtd: \{params\.get\(\'quantity\', \'\?\'\)\}\)!"'
new_shopping_update = """case "shopping_update":
            update_data = {}
            if params.get("quantity"):
                update_data["quantity"] = params["quantity"]
                
            sb.table("shopping_list").update(update_data).eq("item_name", params["item_name"]).eq("status", "pending").execute()
            return f"🛒 Item {params['item_name']} atualizado (Nova qtd: {params.get('quantity', '?')})!\""""
content = re.sub(old_shopping_update, new_shopping_update, content)
content = content.replace("`shopping_update`| `seq_id`, `quantity?` |", "`shopping_update`| `item_name`, `quantity?` |")

# Apply Fix 4: Set the right model and timeout
content = content.replace('response = await asyncio.to_thread(model.generate_content, contents)', 'response = await model.generate_content_async(contents, request_options={"timeout": 15.0})')
content = content.replace('model_name="gemini-3.8-flash",', 'model_name="gemini-3.8-flash",')

# Apply Fix 5: Ensure the worker has the safety net
old_except = """        except Exception as e:
            logger.error("Erro fatal no AI Worker: %s", e)
        finally:"""
new_except = """        except Exception as e:
            logger.error("Erro fatal no AI Worker: %s", e)
            if chat_id:
                try:
                    from app.services.telegram import send_message
                    await send_message(chat_id, "🚨 Desculpe, ocorreu um erro fatal no sistema enquanto eu tentava processar sua mensagem. Tente novamente mais tarde!")
                except Exception as inner_e:
                    logger.error("Falha ao enviar mensagem de erro: %s", inner_e)
        finally:"""
content = content.replace(old_except, new_except)

with open("bot/app/services/ai.py", "w", encoding="utf-8") as f:
    f.write(content)
print("File regenerated cleanly.")