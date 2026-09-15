with open("bot/app/services/ai.py", "r", encoding="utf-8", errors="replace") as f:
    text = f.read()

import re
for line in text.split("\n"):
    if "" in line:
        print(line.strip())