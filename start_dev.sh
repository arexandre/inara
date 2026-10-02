#!/bin/bash

echo "Iniciando o Inara (Web + Bot)..."

# Inicia o Next.js em background permitindo acesso na rede local
cd web
npm run dev -- -H 0.0.0.0 &
NEXT_PID=$!
cd ..

# Aguarda
sleep 3

# Inicia o bot
cd bot
source .venv/bin/activate
python polling_dev.py

# Se o bot cair, fecha o frontend
kill $NEXT_PID
