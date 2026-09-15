import re

with open("app/services/ai.py", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace('"transaction_date": str(date.today()),', '"transaction_date": hoje_str,')

with open("app/services/ai.py", "w", encoding="utf-8") as f:
    f.write(text)

print("transaction_date patched!")