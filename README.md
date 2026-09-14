# 🏠 Inara — ERP Doméstico

> Seu lar, organizado com carinho.

Inara é um ERP doméstico autônomo que combina uma interface web acolhedora com um assistente via Telegram, gerenciando tarefas, finanças e suprimentos para até 3 moradores.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Backend Webhook | Python 3.12 + FastAPI |
| Banco de Dados | Supabase (PostgreSQL) + RLS |
| Auth | Supabase Auth (Magic Link) |
| Bot | Telegram Bot API |
| IA | Google Gemini (Fase 2) |

## Estrutura

```
inara/
├── web/          # Aplicação Next.js
│   ├── app/
│   │   ├── (auth)/login/     # Página de login
│   │   ├── (app)/            # Área autenticada
│   │   │   ├── dashboard/
│   │   │   ├── tarefas/
│   │   │   ├── financas/
│   │   │   └── compras/
│   │   └── auth/             # Route handlers de autenticação
│   ├── lib/supabase/         # Clientes Supabase (browser/server)
│   ├── types/                # Tipos TypeScript do schema
│   └── middleware.ts         # Zero-Trust — protege todas as rotas
├── bot/          # Serviço FastAPI (webhook Telegram)
│   └── app/
│       ├── main.py
│       ├── routers/webhook.py    # Endpoint /webhook/telegram
│       └── services/
│           ├── fast_track.py     # Comandos locais (/lista, /pix, etc.)
│           └── telegram.py       # Helper de envio de mensagens
└── schema.sql    # Script SQL completo (Supabase Dashboard)
```

## Início Rápido

### 1. Banco de Dados
Execute `schema.sql` no SQL Editor do Supabase Dashboard.

### 2. Frontend (Next.js)
```bash
cd web
cp ../.env.example .env.local
# Preencha as variáveis no .env.local
npm install
npm run dev
```

### 3. Bot (FastAPI)
```bash
cd bot
cp .env.example .env
# Preencha as variáveis no .env
python -m venv .venv && .venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 4. Registrar o Webhook do Telegram
```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://<sua-url>/webhook/telegram" \
  -d "secret_token=<WEBHOOK_SECRET_TOKEN>"
```

## Segurança

- **RLS** em todas as tabelas — acesso condicionado ao UUID da sessão
- **Middleware Zero-Trust** no Next.js — bloqueia todas as rotas sem sessão válida
- **Token secreto** no header HTTP do webhook — rejeita requisições não autorizadas com 401
- Máximo de **3 moradores** via trigger de banco de dados

## Variáveis de Ambiente

Veja [`.env.example`](.env.example) para a lista completa.
