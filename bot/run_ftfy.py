import ftfy

with open("app/services/ai.py", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()
    
fixed_text = ftfy.fix_text(text)
print("Was it fixed?", "Ã" not in fixed_text and "ǟ" not in fixed_text)

with open("app/services/ai.py", "w", encoding="utf-8") as f:
    f.write(fixed_text)