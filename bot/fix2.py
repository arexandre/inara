with open("app/routers/webhook.py", "r", encoding="utf-8") as f:
    t = f.read()
t = t.replace("if reply:\n        await send_message(chat_id, reply)", "if reply:\n            await send_message(chat_id, reply)")
with open("app/routers/webhook.py", "w", encoding="utf-8") as f:
    f.write(t)