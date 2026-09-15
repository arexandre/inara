with open("ai_clean.py", "r", encoding="utf-8") as f:
    for line in f.readlines():
        if "ação" in line:
            print(line.strip())