with open("app/routers/webhook.py", "r", encoding="utf-8") as f:
    text = f.read()
text = text.replace("if reply:`n        await send_message(chat_id, reply)", "if reply:\n        await send_message(chat_id, reply)")
with open("app/routers/webhook.py", "w", encoding="utf-8") as f:
    f.write(text)

with open("polling_dev.py", "r", encoding="utf-8") as f:
    text = f.read()
text = text.replace("if reply:`n                            await send_message(chat_id, reply)", "if reply:\n        await send_message(chat_id, reply)")
with open("polling_dev.py", "w", encoding="utf-8") as f:
    f.write(text)