with open("bot/app/services/ai.py", "r", encoding="utf-8") as f:
    text = f.read()
    
for line in text.split("\n"):
    if "generate_content" in line:
        print("FOUND:", line.strip())