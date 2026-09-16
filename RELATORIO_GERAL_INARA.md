# 🌟 Relatório Geral de Desenvolvimento: Projeto Inara

**Data de Geração:** 16 de Setembro de 2026
**Status do Sistema:** Estável (Vercel Deploy 100% Funcional / Bot Telegram Operacional)

---

## 1. Visão Geral do Sistema e Arquitetura

O **Projeto Inara** evoluiu para um ecossistema completo de gestão residencial (Smart Home Assistant / Síndica Virtual), operando em duas frentes perfeitamente sincronizadas:

*   **Front-end (Painel Web):** Desenvolvido em **Next.js 14+ (App Router)** com TailwindCSS. Hospedado e em produção na Vercel. Serve como o painel de controle administrativo, visualização rica (calendários, kanbans) e auditoria.
*   **Back-end (Bot Telegram):** Escrito em **Python** utilizando `asyncio`. Atua como a interface conversacional principal. Interpreta mensagens de texto, áudio e imagem usando a inteligência artificial do **Google Gemini (3.5 Flash Lite)** para inferência estruturada de intenções (*intents*).
*   **Banco de Dados & Autenticação:** **Supabase (PostgreSQL)**. Mantém o estado global sincronizado em tempo real entre o Telegram e o Web App.

---

## 2. Histórico de Evolução (Últimas Atualizações)

Nos últimos ciclos de desenvolvimento (Lotes 12 ao 14 e Refinamentos), o projeto passou por uma metamorfose de estabilidade, usabilidade e segurança. Aqui está o que foi consolidado:

### 🧩 Lote 12: Interatividade e Inteligência
*   **Botões de Confirmação (Telegram):** Ações críticas (como deletar tarefas ou registrar gastos financeiros) pararam de ser executadas imediatamente de forma cega. A Inara agora coloca a ação na tabela `pending_actions` e envia um teclado inline (`[✅ Confirmar] / [❌ Cancelar]`).
*   **Termostato de Sarcasmo:** A Inara foi instruída (via *System Prompt*) a separar os momentos de trabalho dos de lazer. Respostas a comandos de sistema são ágeis e diretas. Respostas casuais (intent `chat`) recebem carga máxima de ironia e acidez.
*   **Ações em Lote (Front-end):** A tela de tarefas ganhou o componente `<TasksBoard>`, permitindo selecionar várias tarefas e executar ações de "Concluir", "Arquivar" ou "Apagar" de uma só vez.

### 🛠️ Lote 13: Pagamento de Dívida Técnica (O "Freio de Arrumação")
*   **Bloqueio de Registro (Auth Lock):** Como o Supabase proíbe a desativação nativa de sign-ups na camada gratuita, contornamos isso criando um *Admin Client* no Next.js (bypassando RLS com a `SERVICE_ROLE_KEY`). Apenas usuários com `is_admin = true` podem convidar novos moradores.
*   **Garbage Collector:** Rotina implementada no `scheduler.py` que roda silenciosamente de madrugada (04:00 BRT). Ela limpa ações pendentes esquecidas (mais de 24h) e comandos de sistema antigos (mais de 48h), evitando inchaço no banco de dados.
*   **Desbloqueio do Event Loop (Python):** Funções pesadas como o *Resumo Matinal* e *Ping de Ociosidade* estavam congelando o bot. Foi implementado o padrão assíncrono `_fire_and_forget` com referências fortes (`set`) para impedir que o Garbage Collector do Python matasse as tarefas, permitindo concorrência real.

### 🚑 Lote 14 & UI Polish: Caça aos Bugs
*   **Fim do "Soluço" (`"", null` e `Entendido!`):** O bot estava vazando lixo de memória nas respostas por conta de uma tupla que caía no loop do Telegram. Isso foi completamente isolado. A Inara agora só responde quando realmente precisa.
*   **Nomes Genéricos em Tarefas:** LLM foi punido no Prompt e agora é rigidamente forçado a criar um `title` descritivo curto, em vez do antigo padrão cego "Nova Tarefa".
*   **Reformulação do Calendário:** O `<CalendarClient>` foi reescrito. Agora conta com visualização Mensal e Semanal, grid CSS expansivo que toma 100% da altura da tela e, mais importante, **um Modal Detalhado** que abre ao clicar em um dia específico para exibir os detalhes dos compromissos.
*   **Crash da Vercel Resolvido:** O painel web de Tarefas apresentava um `ReferenceError` ("TaskCard is not defined") impedindo o acesso. O vestígio de código antigo foi erradicado.

---

## 3. Catálogo de Funcionalidades Consolidadas (O que ela faz?)

### 🤖 Via Telegram (A interface passiva)
1.  **Criação de Tarefas (`task_create`):** Adiciona tarefas ao Kanban Web.
2.  **Lista de Compras (`shopping_add`, `update`, `done`):** Deduz se um item já está na lista e soma as quantidades, além de categorizar (Mercado, Farmácia, etc).
3.  **Gestão Financeira (`transaction_create`):** Processa valores e divide entre Coletivo e Individual.
4.  **Agendamento de Eventos (`event_create`):** Alimenta o Calendário.
5.  **Processamento de Voz e Recibos (Fotos):** Consegue extrair intenções de áudios caóticos e extrai informações financeiras das fotos de notas fiscais.
6.  **Memória Contextual:** Lembra as últimas 6 interações no Telegram.

### 💻 Via Web App (O painel ativo)
1.  **Dashboard:** Visão rápida de métricas (Qtd. Tarefas, Itens para Comprar) e exibição do "Jornal da Casa" diário.
2.  **Tarefas (Kanban):** Colunas de status com Drag & Drop (implícito) e gerenciamento em massa.
3.  **Calendário:** Fusão visual entre Tarefas com prazo (`due_date`), Eventos e Feriados.
4.  **Mural:** "Post-its" virtuais deixados pelos moradores (ou pela Inara).
5.  **Governança (Admin):** Tela restrita para convite de moradores via API root e exibição de Telegram IDs.
6.  **Chat Embutido:** Converse com a Inara direto pelo navegador (histórico mantido).

---

## 4. Estrutura do Banco de Dados (Supabase)

A infraestrutura relacional atual contempla as seguintes entidades fundamentais:

*   **`profiles`**: Moradores cadastrados. Controla os IDs do Telegram, permissões de admin e preferências de tema.
*   **`tasks`**: Registros de atividades da casa (peso, responsável, data de entrega, controle lógico de arquivo).
*   **`transactions`**: O livro-caixa. Marca quem pagou, quem se beneficiou e categoriza se o gasto foi para a casa (Coletivo) ou capricho pessoal (Individual).
*   **`events`**: Compromissos com data e hora.
*   **`shopping_list`**: Controle de mantimentos, pendentes e comprados.
*   **`pending_actions`**: "Sala de Espera" de ações sensíveis aguardando o OK no botão do Telegram.
*   **`system_commands`**: Mensagens assíncronas do Frontend -> Backend (ex: Admin força um Resumo Matinal via clique no Web App, o Python lê essa tabela e executa).
*   **`daily_journal` / `mural` / `api_usage_logs`**: Tabelas de relatório e acompanhamento sistêmico e convivência.

---

## 5. Conclusão e Status Atual

O código atual encontra-se **altamente estável**. As interligações entre Frontend e Backend foram refatoradas para evitar chamadas obstrutivas, o tratamento de fuso-horário (America/Sao_Paulo) foi padronizado em ambos os lados, e as vulnerabilidades de registro aberto no Supabase e Vazamento de Retornos da IA foram fechadas.

O projeto está pronto para a escalabilidade residencial ou para a adição de novas verticais complexas (como automações IoT de verdade) se for da vontade dos administradores.
