"""
Fast Track — Handlers locais de comandos Telegram.

Cada handler recebe:
  args     : texto após o comando (ex: "/pix João 50" → args = "João 50")
  chat_id  : ID do chat Telegram (para futuras consultas ao Supabase)

Retorna uma string de resposta formatada com Markdown do Telegram.
"""

import logging
import os

from supabase import AsyncClient, acreate_client

logger = logging.getLogger("inara.fast_track")

# ---------------------------------------------------------------------------
# Supabase client factory (usa service_role para acesso irrestrito via bot)
# ---------------------------------------------------------------------------
_supabase: AsyncClient | None = None


async def get_supabase() -> AsyncClient:
    global _supabase
    if _supabase is None:
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        _supabase = await acreate_client(url, key)
    return _supabase


# ---------------------------------------------------------------------------
# Dispatcher
# ---------------------------------------------------------------------------
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
    try:
        return await handler(args, chat_id)
    except Exception as exc:
        logger.exception("Erro no handler %s: %s", handler_name, exc)
        return "⚠️ Ocorreu um erro. Tente novamente em instantes."


# ---------------------------------------------------------------------------
# /start
# ---------------------------------------------------------------------------
async def _cmd_start(args: str, chat_id: int) -> str:
    return (
        "🏠 *Olá! Sou a Inara*, o ERP da sua casa.\n\n"
        "Estou aqui para ajudar com tarefas, finanças e lista de compras.\n\n"
        "Use /ajuda para ver tudo que posso fazer!"
    )


# ---------------------------------------------------------------------------
# /ajuda | /help
# ---------------------------------------------------------------------------
async def _cmd_ajuda(args: str, chat_id: int) -> str:
    return (
        "📋 *Comandos disponíveis:*\n\n"
        "🛒 /lista — Ver lista de compras pendente\n"
        "💸 /pix `[nome] [valor]` — Registrar um pagamento via Pix\n"
        "✅ /tarefas — Ver tarefas em aberto\n\n"
        "_Ou simplesmente me mande uma mensagem e eu entendo! 🤖_"
    )


# ---------------------------------------------------------------------------
# /lista — Lista de compras pendente
# ---------------------------------------------------------------------------
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


# ---------------------------------------------------------------------------
# /pix [beneficiário] [valor] — Registrar pagamento
# ---------------------------------------------------------------------------
async def _cmd_pix(args: str, chat_id: int) -> str:
    """
    Uso: /pix João 50.00
    Registra uma transação individual do tipo Pix.
    """
    parts = args.strip().split()
    if len(parts) < 2:
        return (
            "⚠️ Formato incorreto.\n"
            "Use: `/pix [nome] [valor]`\n"
            "Exemplo: `/pix João 50.00`"
        )

    beneficiary_name = parts[0]
    try:
        amount = float(parts[1].replace(",", "."))
    except ValueError:
        return "⚠️ Valor inválido. Use números, ex: `50.00` ou `50,00`."

    # Buscar o perfil do remetente pelo telegram_id
    sb = await get_supabase()
    sender_resp = await sb.table("profiles").select("id, username").eq("telegram_id", chat_id).single().execute()

    if not sender_resp.data:
        return (
            "❌ Seu Telegram não está vinculado a nenhum morador.\n"
            "Acesse o app Inara e vincule seu perfil primeiro."
        )

    sender = sender_resp.data

    # Buscar beneficiário pelo username (case-insensitive)
    beneficiary_resp = (
        await sb.table("profiles")
        .select("id, username")
        .ilike("username", beneficiary_name)
        .single()
        .execute()
    )

    beneficiary_id = beneficiary_resp.data["id"] if beneficiary_resp.data else None
    beneficiary_label = beneficiary_resp.data["username"] if beneficiary_resp.data else beneficiary_name

    # Inserir transação
    await sb.table("transactions").insert({
        "description": f"Pix para {beneficiary_label}",
        "amount": amount,
        "type": "individual",
        "paid_by": sender["id"],
        "beneficiary_id": beneficiary_id,
        "category": "pix",
    }).execute()

    return (
        f"✅ *Pix registrado!*\n"
        f"👤 De: @{sender['username']}\n"
        f"👥 Para: @{beneficiary_label}\n"
        f"💰 Valor: R$ {amount:.2f}"
    )


# ---------------------------------------------------------------------------
# /tarefas — Listar tarefas em aberto
# ---------------------------------------------------------------------------
async def _cmd_tarefas(args: str, chat_id: int) -> str:
    sb = await get_supabase()
    response = (
        await sb.table("tasks")
        .select("seq_id, title, status, assignee:profiles!tasks_assignee_id_fkey(username)")
        .neq("status", "done")
        .order("seq_id")
        .execute()
    )

    tasks = response.data
    if not tasks:
        return "🎉 Nenhuma tarefa pendente! Dia livre!"

    status_emoji = {
        "backlog": "📋",
        "todo": "📌",
        "in_progress": "⚡",
    }

    lines = ["✅ *Tarefas em aberto:*\n"]
    for task in tasks:
        code = f"#{str(task['seq_id']).zfill(4)}"
        emoji = status_emoji.get(task["status"], "•")
        assignee = task.get("assignee")
        owner = f" → @{assignee['username']}" if assignee else ""
        lines.append(f"{emoji} `{code}` {task['title']}{owner}")

    return "\n".join(lines)
