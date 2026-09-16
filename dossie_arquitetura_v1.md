# Dossiê da Arquitetura Inara v1.0

## 1. Mapa do Banco de Dados (Supabase)
O banco de dados relacional foi construído sob o Postgres do Supabase, estruturado para centralizar o ERP da casa inteligente. As principais tabelas e relacionamentos são:

* **`profiles` (Moradores):** A espinha dorsal. Controla o Auth (via `id` referenciando `auth.users`), armazena o `telegram_id` para autorização (Zero-Trust), `is_admin`, preferências de tema e saldo de gamificação (`xp_total`).
* **`tasks` (Tarefas):** Tabela Kanban. Conecta-se a `profiles` através de duas chaves estrangeiras: `assignee_id` (quem vai executar) e `created_by` (quem criou). Possui a nova flag `is_archived` para limpeza visual.
* **`transactions` (Caixa):** Livro financeiro. Vinculado a `profiles` via `paid_by` e `beneficiary_id` (opcional, para gastos individuais). É a base de cálculo da View `balance_summary` que faz o rateio matemático da casa.
* **`events` & `mural` (Agendas e Recados):** Ambas vinculadas ao autor. `events` compõe a malha do `/calendario` junto com as tarefas, enquanto `mural` atua como os post-its digitais na Home.
* **`shopping_list`:** Gestão de inventário, separando itens entre `pending` e `purchased`.
* **`daily_journal` & `system_commands`:** Tabelas de orquestração interna. O jornal armazena textos diários para o feed de notícias, e a de comandos atua como uma "fila de RPC" (Remote Procedure Call), permitindo que o Next.js dê ordens ao Python sem requisições HTTP diretas.
* **`pending_actions`:** Guarda o estado transitório de interações do Telegram (payload JSON) até que o usuário clique no botão de confirmar ou cancelar.

## 2. Fluxo de Resiliência e Telegram (Backend Python)
O backend não responde de forma síncrona e crua, o que o torna resiliente a apagões e picos de uso.

**Ciclo de Vida de uma Ação Crítica (Ex: Foto de Nota Fiscal):**
1. O usuário envia a foto no Telegram.
2. O webhook/polling intercepta, baixa o `media_bytes` em memória e empurra a missão para a fila assíncrona `ai_queue = asyncio.Queue()`. O usuário recebe instantaneamente o aviso de "Typing...".
3. O worker infinito (`start_ai_worker`) puxa a mensagem da fila.
4. **Resiliência Anti-429:** O wrapper de requisição ao Google Gemini possui um mecanismo de *Retry Backoff*. Se o Google disparar o erro `ResourceExhausted` (Limites de Quota/429), o bot dorme (`asyncio.sleep`) e retenta até 3 vezes antes de avisar amigavelmente que o "Google a colocou de castigo".
5. O LLM extrai a intenção (`transaction_create`) e monta os parâmetros (valor, descrição).
6. **Freio de Confirmação:** O Python congela a operação, salva o JSON em `pending_actions` gerando um UUID, e retorna um *Inline Keyboard*. O worker da fila encerra ali.
7. Quando o usuário clica em `[✅ Confirmar]`, o Telegram dispara um evento `callback_query`, a Inara busca o payload congelado no banco e finalmente injeta na tabela `transactions`.

## 3. Anatomia do Cérebro (Engenharia de Prompt)
A Inara opera como um autômato de conversão "Texto Natural -> JSON". O `SYSTEM_PROMPT` a obriga a responder sempre em estrutura de dicionário contendo `{ intent, reply, params }`.

* **Separação de Intents:** Possuímos dezenas de rotas mentais mapeadas, desde `task_create`, `transaction_list` e `shopping_add`, até as novas `poll_create` e `mural_add`.
* **Obediência Absoluta e Termostato de Sarcasmo:** O prompt atual possui duas travas rígidas de persona. A regra de obediência proíbe que ela atue como um "membro humano" que recusa trabalho, forçando-a a acatar ordens de registro. O termostato bifurca o tom: em comandos de utilidade (intents com `params`), a resposta embutida no `reply` deve ser cordial, amena e técnica. O sarcasmo ácido ("Diva", resmungos) foi confinado estritamente ao intent neutro `chat` (quando não há ações de CRUD identificadas).

## 4. Comunicação Frontend x Backend (Next.js)
A arquitetura do painel não utiliza APIs REST tradicionais (`fetch('/api')`) para operações de banco, cortando um intermediário desnecessário.

* **Server Actions:** O Next.js (`actions.ts`) roda código Node.js seguro no lado do servidor. Quando você altera uma configuração no painel ou aprova algo, o React dispara uma chamada RPC nativa que injeta dados no Supabase diretamente usando a chave `Service Role` ou os Cookies de sessão (Auth RLS).
* **Supabase Realtime:** Através do componente React `<RealtimeListener />` posicionado no layout global, o site abre um socket (Websocket) com o banco de dados. Sempre que o bot Python (ou outra pessoa pelo celular) faz um *INSERT*, *UPDATE* ou *DELETE* nas tabelas, o banco notifica a página web, que executa o `router.refresh()` instantaneamente, reidratando a Lista de Compras ou o Mural sem que o usuário precise dar F5.

---

## ⚠️ Dívida Técnica & Riscos Arquiteturais Identificados (Erros Ocultos)
Como Arquiteto Sênior, varri a estrutura sob a ótica de um cenário de Produção Real 24/7. Encontrei 3 gargalos críticos que precisam de refatoração no próximo ciclo:

**1. Vazamento de Cadastro Público (Segurança Crítica)**
Apesar de termos ocultado o link de registro no frontend e implementado a página `/admin/usuarios` conforme solicitado, o motor do Supabase Auth por padrão **permite signups abertos**. Se um usuário mal-intencionado descobrir a URL da sua API pública ou a rota de `/auth`, ele pode forçar um cadastro (POST via Postman) e ganhar acesso ao painel web, burlando a nossa governança.
* *Solução Exigida:* É obrigatório entrar no Dashboard do Supabase (Authentication > Providers > Email) e desativar a opção `Enable Signups`, travando as inserções exclusivamente na camada do Admin (`invite_user_by_email` na Service Role).

**2. Crescimento Infinito de Ações Órfãs (Desperdício de Banco)**
No Lote 12, criamos a tabela `pending_actions` para armazenar os payloads dos teclados do Telegram. Se o usuário ignorar a notificação e nunca clicar nem em Confirmar nem em Cancelar, o registro vai apodrecer eternamente com `status = 'pending'`.
* *Solução Exigida:* Precisamos adicionar um Garbage Collector no arquivo `scheduler.py` (Resumo Matinal) que rode um `DELETE` em ações pendentes criadas há mais de 24 horas, ou criar uma política de TTL (Time-To-Live) no Postgres (via pg_cron).

**3. Falha de Concorrência no Agendamento Assíncrono (Python)**
O script de polling/comandos roda funções longas no meio do fluxo assíncrono. No arquivo `polling_dev.py`, o worker `check_system_commands` importa a função `resumo_matinal()` e dá `await` diretamente. O problema é que a função `resumo_matinal` chama disparos em broadcast pesados e formatações longas do LLM. Enquanto o botão forçar esse resumo, o loop de polling pode travar levemente a agilidade do bot no Telegram, pois eles compartilham o mesmo Thread Loop do `asyncio`.
* *Solução Exigida:* Funções de cron job e rotinas pesadas invocadas manualmente deveriam ser despachadas para *Task Groups* ou threads paralelas (`asyncio.create_task(resumo_matinal())`) para não segurarem a leitura imediata dos comandos.
