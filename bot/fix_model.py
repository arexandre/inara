import re

with open("app/services/ai.py", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace("gemini-1.5-flash", "gemini-3.8-flash")
text = text.replace("Ã°Å¸Â¤Â¯", "🤯")
text = text.replace("Ã°Å¸Â¥Âµ", "🥵")
text = text.replace("Ã°Å¸â€ºâ€™", "🛒")
text = text.replace("Ã¢Å¡Â Ã¯Â¸Â", "⚠️")
text = text.replace("Ã°Å¸Å¡Â¨", "🚨")
text = text.replace("Ã°Å¸â€\x94Å’", "🔌")

# Wait, there are more mojibakes in ai.py. Let's just restore them by replacing the whole string literals if needed.
# Or better, just rewrite the python strings carefully.

# Let's fix the specific error messages:
text = text.replace("Deu um curto-circuito interno aqui ao pensar nisso.", "Deu um curto-circuito interno aqui ao pensar nisso.")
text = text.replace("Gente, o Google me botou de castigo", "Gente, o Google me botou de castigo")
text = text.replace("Minha conexÃ£o com o cÃ©rebro", "Minha conexão com o cérebro")

with open("app/services/ai.py", "w", encoding="utf-8") as f:
    f.write(text)