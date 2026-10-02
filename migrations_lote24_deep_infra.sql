-- ==========================================================================
-- Migração Lote 24: Infraestrutura Profunda (RAG e Locks)
-- ==========================================================================

-- 1. Habilitar a extensão pgvector para embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Adicionar coluna de embedding na knowledge_base
ALTER TABLE public.knowledge_base 
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- 3. Criar índice para busca vetorial rápida (opcional, mas recomendado)
-- CREATE INDEX ON public.knowledge_base USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 4. Função RPC para busca de similaridade (True RAG)
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    knowledge_base.id,
    knowledge_base.title,
    knowledge_base.content,
    1 - (knowledge_base.embedding <=> query_embedding) AS similarity
  FROM knowledge_base
  WHERE 1 - (knowledge_base.embedding <=> query_embedding) > match_threshold
  ORDER BY knowledge_base.embedding <=> query_embedding
  LIMIT match_count;
$$;


-- ==========================================================================
-- 5. Função RPC atômica para criar tarefa com Round-Robin seguro (Locks)
-- ==========================================================================
CREATE OR REPLACE FUNCTION create_task_with_round_robin(
  p_title text,
  p_description text,
  p_emoji text,
  p_recurrence text,
  p_weight int,
  p_created_by uuid,
  p_due_date date DEFAULT NULL,
  p_due_time text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_assignee_id uuid;
  v_task_id uuid;
  v_seq_id int;
  v_res jsonb;
BEGIN
  -- 1. Bloqueia as linhas de profiles afetadas para evitar concorrência (Race Condition Shielding)
  -- FOR UPDATE no SELECT de perfis garante que transações concorrentes aguardem.
  
  WITH candidate_profiles AS (
    SELECT id FROM public.profiles FOR UPDATE
  ),
  -- 2. Calcula a carga dos últimos 7 dias para cada morador
  recent_tasks AS (
    SELECT assignee_id, status, weight, title 
    FROM public.tasks 
    WHERE created_at >= NOW() - INTERVAL '7 days'
      AND assignee_id IS NOT NULL
  ),
  scores AS (
    SELECT 
      c.id AS profile_id,
      COALESCE(SUM(
        CASE 
          WHEN rt.status != 'done' THEN COALESCE(rt.weight, 1) * 2
          ELSE COALESCE(rt.weight, 1)
        END
      ), 0) + 
      -- Punição por tarefas com nomes parecidos já poderia ser feita, 
      -- mas em SQL simplificamos para quem fez a exata mesma tarefa recentemente
      COALESCE(SUM(
        CASE 
          WHEN rt.title ILIKE '%' || p_title || '%' THEN 10
          ELSE 0
        END
      ), 0) AS load_score
    FROM candidate_profiles c
    LEFT JOIN recent_tasks rt ON rt.assignee_id = c.id
    GROUP BY c.id
  )
  -- Seleciona o perfil com menor pontuação
  SELECT profile_id INTO v_assignee_id
  FROM scores
  ORDER BY load_score ASC, profile_id ASC
  LIMIT 1;

  -- 3. Se não encontrar um assignee válido (ex: sem profiles), insere nulo.
  -- 4. Insere a tarefa (a própria tabela tasks lidará com o seq_id via default nextval)
  INSERT INTO public.tasks (
    title, description, emoji, recurrence, weight, assignee_id, created_by, status, due_date, due_time
  ) VALUES (
    p_title, p_description, p_emoji, p_recurrence, p_weight, v_assignee_id, p_created_by, 'todo', p_due_date, p_due_time::time
  ) RETURNING id, seq_id INTO v_task_id, v_seq_id;

  -- Retorna os dados necessários para o bot
  SELECT json_build_object(
    'id', v_task_id,
    'seq_id', v_seq_id,
    'assignee_id', v_assignee_id,
    'assignee_username', (SELECT username FROM public.profiles WHERE id = v_assignee_id)
  ) INTO v_res;

  RETURN v_res;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
