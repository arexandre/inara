import re, json
cases = [
    '```json\n[{"intent": "chat", "reply": "oi"}]\n```',
    '```JSON\n{"intent": "chat", "reply": "oi"}\n```',
    '  ```\n{"intent": "chat", "reply": "oi"}\n```  ',
    '{"intent": "chat", "reply": "oi"}'
]

for raw in cases:
    clean_raw = re.sub(r"^```(?:json)?\n?", "", raw.strip(), flags=re.IGNORECASE)
    clean_raw = re.sub(r"\n?```$", "", clean_raw.strip(), flags=re.IGNORECASE).strip()
    try:
        j = json.loads(clean_raw)
        print(f"SUCCESS: {j}")
    except Exception as e:
        print(f"FAILED on '{raw}': {e}")