import re

with open("app/services/ai.py", "r", encoding="utf-8") as f:
    text = f.read()

old_logic = """            tx_type = params.get("type", "collective")
            sb.table("transactions").insert({
                "description": params["description"],
                "amount": float(params["amount"]),"""

new_logic = """            tx_type = params.get("type", "collective")
            
            raw_amt = str(params["amount"]).replace(',', '.')
            amt = float(raw_amt)
            
            sb.table("transactions").insert({
                "description": params["description"],
                "amount": amt,"""

text = text.replace(old_logic, new_logic)

with open("app/services/ai.py", "w", encoding="utf-8") as f:
    f.write(text)

print("transaction_create amount patched!")