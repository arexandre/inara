with open("app/services/ai.py", "r", encoding="utf-8") as f:
    text = f.read()
text = text.replace("        try:\n        model = _get_model()", "    try:\n        model = _get_model()")
with open("app/services/ai.py", "w", encoding="utf-8") as f:
    f.write(text)