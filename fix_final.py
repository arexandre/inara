with open("bot/app/services/ai.py", "r", encoding="utf-8") as f:
    text = f.read()

# Let's fix the seq_id by locating the exact block.
block_start = '        case "shopping_update":\n            seq_id = str(params["seq_id"]).replace("#", "")'
block_end = '!"\n'
start_idx = text.find('case "shopping_update":')

if start_idx != -1:
    end_idx = text.find('!"', start_idx) + 2
    old_block = text[start_idx:end_idx]
    new_block = """case "shopping_update":
            update_data = {}
            if params.get("quantity"):
                update_data["quantity"] = params["quantity"]
                
            sb.table("shopping_list").update(update_data).eq("item_name", params["item_name"]).eq("status", "pending").execute()
            return f"🛒 Item {params['item_name']} atualizado (Nova qtd: {params.get('quantity', '?')})!\""""
    text = text.replace(old_block, new_block)

# And fix any mojibake globally just in case (the previous script rebuilt from clean f8bd743 so mojibake shouldn't be there, EXCEPT maybe in powershell's git show)
# Wait, `git show` without specifying encoding might have corrupted it again!
# Yes, because `content = subprocess.check_output(...).decode("utf-8")` is clean, but maybe PowerShell corrupted the script itself when saving `rebuild_ai.py`?
# In powershell: `[System.IO.File]::WriteAllText("rebuild_ai.py", $pyFix)` defaults to UTF-8 without BOM in powershell 6+, but in Windows PowerShell 5.1 it might be local ANSI.

with open("bot/app/services/ai.py", "w", encoding="utf-8") as f:
    f.write(text)

print("Fixed shopping_update")