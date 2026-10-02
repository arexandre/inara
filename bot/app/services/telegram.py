import json
import os
import httpx
from app.logger import logger

TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')
API_BASE = f'https://api.telegram.org/bot{TOKEN}'

class InlineKeyboardButton:
    def __init__(self, text: str, callback_data: str):
        self.text = text
        self.callback_data = callback_data
    def to_dict(self):
        return {'text': self.text, 'callback_data': self.callback_data}

class InlineKeyboardMarkup:
    def __init__(self, inline_keyboard):
        self.inline_keyboard = inline_keyboard
    def to_dict(self):
        return {'inline_keyboard': [[btn.to_dict() if hasattr(btn, 'to_dict') else btn for btn in row] for row in self.inline_keyboard]}

async def send_message(chat_id: int, text: str, parse_mode: str = 'Markdown', reply_markup = None) -> None:
    if not TOKEN:
        logger.warning('TELEGRAM_BOT_TOKEN nao configurado.')
        return
    url = f'{API_BASE}/sendMessage'
    payload = {'chat_id': chat_id, 'text': text, 'parse_mode': parse_mode}
    if reply_markup:
        if hasattr(reply_markup, 'to_dict'):
            payload['reply_markup'] = reply_markup.to_dict()
        else:
            payload['reply_markup'] = reply_markup
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
    except Exception as e:
        logger.error('Erro ao enviar mensagem pro Telegram: %s', e)

async def send_poll(chat_id: int, question: str, options: list, is_anonymous: bool = False) -> None:
    if not TOKEN:
        return
    url = f'{API_BASE}/sendPoll'
    payload = {'chat_id': chat_id, 'question': question, 'options': options, 'is_anonymous': is_anonymous}
    try:
        async with httpx.AsyncClient() as client:
            await client.post(url, json=payload)
    except Exception as e:
        logger.error('Erro ao enviar poll: %s', e)

async def send_chat_action(chat_id: int, action: str = 'typing') -> None:
    if not TOKEN:
        return
    url = f'{API_BASE}/sendChatAction'
    payload = {'chat_id': chat_id, 'action': action}
    try:
        async with httpx.AsyncClient() as client:
            await client.post(url, json=payload)
    except Exception as e:
        pass

async def download_file(file_id: str) -> bytes | None:
    if not TOKEN: return None
    try:
        async with httpx.AsyncClient() as client:
            info_resp = await client.get(f'{API_BASE}/getFile?file_id={file_id}', timeout=10.0)
            info_resp.raise_for_status()
            file_path = info_resp.json().get('result', {}).get('file_path')
            if not file_path: return None
            dl_resp = await client.get(f'https://api.telegram.org/file/bot{TOKEN}/{file_path}', timeout=30.0)
            dl_resp.raise_for_status()
            return dl_resp.content
    except Exception as e:
        logger.error('Erro ao baixar arquivo: %s', e)
        raise e

