"""
Utilitário de parsing financeiro — Calculadora Delegada.

Converte strings brutas de valores monetários brasileiros em float seguro.
Jamais estoura exceção — retorna None se não conseguir parsear.
"""

import re


def parse_currency(raw: str | int | float | None) -> float | None:
    """
    Recebe uma string suja como 'R$ 21,90!', 'deu 1.250,00', '45 reais'
    e retorna o float limpo (21.90, 1250.0, 45.0).
    
    Retorna None se não encontrar nenhum número válido.
    """
    if raw is None:
        return None
    
    # Se já for numérico, retorna direto
    if isinstance(raw, (int, float)):
        return float(raw)
    
    text = str(raw).strip()
    
    # Remove prefixos comuns
    text = text.replace("R$", "").replace("r$", "").replace("reais", "").replace("Reais", "").strip()
    
    # Remove caracteres não-numéricos exceto ponto, vírgula e sinal de menos
    text = re.sub(r'[^\d.,\-]', '', text)
    
    if not text:
        return None
    
    # Detectar formato brasileiro (1.250,90) vs americano (1,250.90)
    # Regra: se tem vírgula E ponto, o último separador é o decimal
    if ',' in text and '.' in text:
        last_comma = text.rfind(',')
        last_dot = text.rfind('.')
        if last_comma > last_dot:
            # Formato BR: 1.250,90 → remove pontos, troca vírgula
            text = text.replace('.', '').replace(',', '.')
        else:
            # Formato US: 1,250.90 → remove vírgulas
            text = text.replace(',', '')
    elif ',' in text:
        # Só vírgula: assume decimal brasileiro
        text = text.replace(',', '.')
    # Se só tem ponto, já está ok
    
    try:
        value = float(text)
        return round(value, 2)
    except ValueError:
        return None
