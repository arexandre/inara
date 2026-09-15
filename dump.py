with open("bot/app/services/ai.py", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

import re
matches = re.findall(r'return "([^"]+)"', text)
for i, m in enumerate(matches):
    print(f"Match {i}: {m}")

matches2 = re.findall(r'emoji_map = \{([^\}]+)\}', text)
for i, m in enumerate(matches2):
    print(f"Emoji {i}: {m}")