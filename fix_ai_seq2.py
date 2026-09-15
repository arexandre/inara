with open("bot/app/services/ai.py", "r", encoding="utf-8") as f:
    text = f.read()

old_block = """        case "shopping_update":
            seq_id = str(params["seq_id"]).replace("#", "")
            update_data = {}
            if params.get("quantity"):
                update_data["quantity"] = params["quantity"]
                
            sb.table("shopping_list").update(update_data).eq("seq_id", seq_id).execute()
            return f"🛒 Item #{seq_id} atualizado (Nova qtd: {params.get('quantity', '?')})!\""""

new_block = """        case "shopping_update":
            update_data = {}
            if params.get("quantity"):
                update_data["quantity"] = params["quantity"]
                
            sb.table("shopping_list").update(update_data).eq("item_name", params["item_name"]).eq("status", "pending").execute()
            return f"🛒 Item {params['item_name']} atualizado (Nova qtd: {params.get('quantity', '?')})!\""""

text = text.replace(old_block, new_block)
with open("bot/app/services/ai.py", "w", encoding="utf-8") as f:
    f.write(text)