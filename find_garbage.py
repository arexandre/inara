with open("bot/app/services/ai.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

with open("garbage.txt", "w", encoding="utf-8") as out:
    for i, line in enumerate(lines):
        if "ǟ" in line or "Ã" in line or "" in line:
            out.write(f"Line {i+1}: {line.strip()}\n")