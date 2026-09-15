"""
Fast Track — Handlers locais de comandos Telegram.
"""

import logging
import os

from supabase import AsyncClient, acreate_client

logger = logging.getLogger("inara.fast_track")

_supabase: AsyncClient | None = None

async def get_supabase() -> AsyncClient:
    global _supabase
    if _supabase is None:
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        _supabase = await acreate_client(url, key)
    return _supabase


async def get_sender(chat_id: int):
    sb = await get_supabase()
    try:
        r = await sb.table("profiles").select("id, username").eq("telegram_id", chat_id).single().execute()
        return r.data
    except Exception:
        return None


async def handle_fast_track(handler_name: str, args: str, chat_id: int) -> str:
    handlers = {
        "_cmd_start":   _cmd_start,
        "_cmd_lista":   _cmd_lista,
        "_cmd_pix":     _cmd_pix,
        "_cmd_tarefas": _cmd_tarefas,
        "_cmd_ajuda":   _cmd_ajuda,
    }
    handler = handlers.get(handler_name)
    if not handler:
        return "❓ Comando não reconhecido."
        
    # Verificar autorização (Zero-Trust) para comandos que não sejam ajuda ou start
    if handler_name not in ["_cmd_start", "_cmd_ajuda"]:
        sender = await get_sender(chat_id)
        if not sender:
            return "❌ Seu Telegram não está vinculado a nenhum morador.\nAcesse o app Inara e vincule seu perfil."

    try:
        if handler_name == "_cmd_start":
            return await _cmd_start(args, chat_id)
        return await handler(args, chat_id)
    except Exception as exc:
        logger.exception("Erro no handler %s: %s", handler_name, exc)
        return "⚠️ Ocorreu um erro. Tente novamente em instantes."


async def _cmd_start(args: str, chat_id: int) -> str:
    sender = await get_sender(chat_id)
    if not sender:
        return (
            "🏠 *Olá! Sou a Inara*, o ERP da sua casa.\n\n"
            "❌ Vi aqui que o seu Telegram não está vinculado a nenhum morador.\n"
            "Crie uma conta no app Inara e vincule este número para começar!"
        )
    return (
        f"🏠 *Olá, {sender['username']}! Sou a Inara*, o ERP da sua casa.\n\n"
        "Estou aqui para ajudar com tarefas, finanças e lista de compras.\n\n"
        "Use /ajuda para ver tudo que posso fazer!"
    )

async def _cmd_ajuda(args: str, chat_id: int) -> str:
    return (
        "📋 *Comandos disponíveis:*\n\n"
        "🛒 /lista — Ver lista de compras pendente\n"
        "💸 /pix `[nome] [valor]` — Registrar um pagamento via Pix\n"
        "✅ /tarefas — Ver tarefas em aberto\n\n"
        "_Ou simplesmente me mande uma mensagem e eu entendo! 🤖_"
    )

async def _cmd_lista(args: str, chat_id: int) -> str:
    sb = await get_supabase()
    response = await sb.table("shopping_list").select("item_name, quantity, category").eq("status", "pending").execute()
    items = response.data
    if not items:
        return "✅ A lista de compras está vazia! Boa notícia 🎉"
    lines = ["🛒 *Lista de compras:*\n"]
    for item in items:
        qty = item.get("quantity", "1")
        cat = f" _({item['category']})_" if item.get("category") else ""
        lines.append(f"• {item['item_name']} — {qty}{cat}")
    lines.append(f"\n_{len(items)} item(ns) pendente(s)_")
    return "\n".join(lines)

async def _cmd_pix(args: str, chat_id: int) -> str:
    parts = args.split()
    if len(parts) < 2:
        return "⚠️ Uso correto: `/pix [nome] [valor]`\nEx: `/pix joao 50`"
    
    beneficiary_label = parts[0]
    try:
        amount = float(parts[1].replace(",", "."))
    except ValueError:
        return "⚠️ O valor deve ser um número válido (ex: 50.50)."
        
    sender = await get_sender(chat_id)
    sb = await get_supabase()
    
    b_res = await sb.table("profiles").select("id, username").ilike("username", beneficiary_label).execute()
    b_id = b_res.data[0]["id"] if b_res.data else None

    await sb.table("transactions").insert({
        "description": f"Pix para {beneficiary_label}",
        "amount": amount,
        "type": "individual",
        "paid_by": sender["id"],
        "beneficiary_id": b_id,
        "category": "transferência"
    }).execute()
    return f"✅ *Pix registrado!*\n👤 De: @{sender['username']}\n👥 Para: @{beneficiary_label}\n💰 Valor: R$ {amount:.2f}"

async def _cmd_tarefas(args: str, chat_id: int) -> str:
    sb = await get_supabase()
    response = await sb.table("tasks").select("seq_id, title, status, profiles(username)").neq("status", "done").order("seq_id").execute()
    tasks = response.data
    if not tasks:
        return "🎉 Nenhuma tarefa pendente!"
    lines = ["📋 *Tarefas em aberto:*\n"]
    emoji_map = {"backlog": "📋", "todo": "📌", "in_progress": "⚡"}
    for t in tasks:
        code = f"#{str(t['seq_id']).zfill(4)}"
        e = emoji_map.get(t["status"], "•")
        assignee = f" (@{t['profiles']['username']})" if t.get("profiles") else ""
        lines.append(f"{e} `{code}` {t['title']}{assignee}")
    return "\n".join(lines)