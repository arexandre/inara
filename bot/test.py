with open("app/services/ai.py", "r", encoding="utf-8") as f:
    text = f.read()

for line in text.split("\n"):
    if "emoji_map =" in line:
        print(line.strip())