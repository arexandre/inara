import re

with open("bot/app/services/weather.py", "r", encoding="utf-8") as f:
    text = f.read()

# Fix the city format and mojibake in weather.py
text = text.replace('Araguari, MG', 'Araguari,BR')
text = text.replace('S\\u01dco Paulo', 'Sao Paulo')
text = text.replace('Sǜo Paulo', 'Sao Paulo')
text = text.replace('Amanhǜ', 'Amanhã')
text = text.replace('amanhǜ', 'amanhã')
text = text.replace('previsǜo', 'previsão')
text = text.replace('disponvel', 'disponível')
text = text.replace('YOϋ?', '🌤️')
text = text.replace('s?', '⚠️')
text = text.replace('C', '°C')
text = text.replace('?', '—')
text = text.replace('MǸdia', 'Média')
text = text.replace('Mn', 'Mín')
text = text.replace('Mǭx', 'Máx')
text = text.replace('YO?', '🌧️')
text = text.replace('precipitaǜo', 'precipitação')
text = text.replace('servio', 'serviço')
text = text.replace('Servio', 'Serviço')
text = text.replace('Nǜo', 'Não')

with open("bot/app/services/weather.py", "w", encoding="utf-8") as f:
    f.write(text)
print("Weather fixed!")
