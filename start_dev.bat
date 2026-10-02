@echo off
echo Iniciando o Inara (Web + Bot)...

:: Inicia o Next.js em background (nova janela) permitindo acesso na rede local
start cmd /k "cd web && npm run dev -- -H 0.0.0.0"

:: Aguarda uns segundos pro frontend respirar
timeout /t 3 /nobreak >nul

:: Inicia o Bot no terminal atual
cd bot
call .venv\Scripts\activate
python polling_dev.py
