with open("bot/app/services/ai.py", "r", encoding="utf-8") as f:
    text = f.read()

# 1. System Prompt
text = text.replace("`shopping_update`| `seq_id`, `quantity?`", "`shopping_update`| `item_name`, `quantity?`")

# 2. Context builder
text = text.replace("shop_res = sb.table(\"shopping_list\").select(\"seq_id, item_name, quantity\").eq(\"status\", \"pending\").execute()", "shop_res = sb.table(\"shopping_list\").select(\"item_name, quantity\").eq(\"status\", \"pending\").execute()")
text = text.replace("shop_items = [f\"#{i['seq_id']} {i['item_name']} (Qtd: {i['quantity'] or 1})\" for i in shop_res.data]", "shop_items = [f\"- {i['item_name']} (Qtd: {i['quantity'] or 1})\" for i in shop_res.data]")

# 3. Intent Logic (we'll replace the block using regex)
import re
pattern = r'case "shopping_update":\s+seq_id = str\(params\["seq_id"\]\)\.replace\("#", ""\)\s+update_data = \{\}\s+if params\.get\("quantity"\):\s+update_data\["quantity"\] = params\["quantity"\]\s+sb\.table\("shopping_list"\)\.update\(update_data\)\.eq\("seq_id", seq_id\)\.execute\(\)\s+return f"🛒 Item #\{seq_id\} atualizado \(Nova qtd: \{params\.get\(''quantity'', ''\?''\)\}\)!"'
replacement = """case "shopping_update":
            update_data = {}
            if params.get("quantity"):
                update_data["quantity"] = params["quantity"]
            sb.table("shopping_list").update(update_data).eq("item_name", params["item_name"]).eq("status", "pending").execute()
            return f"🛒 Item {params['item_name']} atualizado (Nova qtd: {params.get('quantity', '?')})!\""""
text = re.sub(pattern, replacement, text)

with open("bot/app/services/ai.py", "w", encoding="utf-8") as f:
    f.write(text)