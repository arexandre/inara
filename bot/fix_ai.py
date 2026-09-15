with open("app/services/ai.py", "r", encoding="utf-8") as f:
    lines = f.readlines()
with open("app/services/ai.py", "w", encoding="utf-8") as f:
    for line in lines:
        if line.strip() == "model = _get_model()":
            line = "        model = _get_model()\n"
        f.write(line)