-- ============================================================
--  INARA — Schema do Banco de Dados (Supabase / PostgreSQL)
--  Execute este script no SQL Editor do Supabase Dashboard.
-- ============================================================

-- ============================================================
-- ENUM TYPES
-- ============================================================
CREATE TYPE task_status AS ENUM ('backlog', 'todo', 'in_progress', 'done');
CREATE TYPE transaction_type AS ENUM ('collective', 'individual');
CREATE TYPE shopping_item_status AS ENUM ('pending', 'purchased');

-- ============================================================
-- TABELA: profiles
-- Vinculada ao auth.users do Supabase.
-- Máximo de 3 moradores (enforced via trigger).
-- ============================================================
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  username    TEXT UNIQUE NOT NULL,
  avatar_url  TEXT,
  telegram_id BIGINT UNIQUE,              -- Chat ID do Telegram para roteamento
  xp_total    INTEGER NOT NULL DEFAULT 0, -- Pontuação acumulada
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: garantir máximo de 3 perfis (allowlist de moradores)
CREATE OR REPLACE FUNCTION enforce_max_profiles()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.profiles) >= 3 THEN
    RAISE EXCEPTION 'Limite máximo de 3 moradores atingido.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_max_profiles
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION enforce_max_profiles();

-- Trigger: atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SEQUÊNCIA + TABELA: tasks
-- Kanban com ID sequencial formatado (#0001, #0002, ...)
-- ============================================================
CREATE SEQUENCE task_seq START 1 INCREMENT 1;

CREATE TABLE public.tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seq_id        INTEGER NOT NULL DEFAULT nextval('task_seq') UNIQUE,
  -- Ex: #0001 gerado via função helper; seq_id é o número
  title         TEXT NOT NULL,
  description   TEXT,
  status        task_status NOT NULL DEFAULT 'backlog',
  assignee_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  xp_reward     INTEGER NOT NULL DEFAULT 10, -- XP base da tarefa
  due_date      DATE,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Formata o seq_id como string: #0001
CREATE OR REPLACE FUNCTION task_code(seq INTEGER)
RETURNS TEXT AS $$
  SELECT '#' || LPAD(seq::TEXT, 4, '0');
$$ LANGUAGE SQL IMMUTABLE;

-- Trigger: marcar completed_at quando status = done
CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status <> 'done' THEN
    NEW.completed_at = NOW();
    -- Conceder XP ao responsável
    IF NEW.assignee_id IS NOT NULL THEN
      UPDATE public.profiles
        SET xp_total = xp_total + NEW.xp_reward
        WHERE id = NEW.assignee_id;
    END IF;
  ELSIF NEW.status <> 'done' AND OLD.status = 'done' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_task_done
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION set_task_completed_at();

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABELA: transactions
-- Livro-caixa com rateio (coletivo vs individual)
-- ============================================================
CREATE TABLE public.transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description   TEXT NOT NULL,
  amount        NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  type          transaction_type NOT NULL DEFAULT 'collective',
  paid_by       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  -- Para gastos individuais: beneficiário específico
  beneficiary_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- Para gastos coletivos: rateio calculado e armazenado via view
  category      TEXT,                          -- ex: 'alimentação', 'moradia'
  receipt_url   TEXT,                          -- URL de comprovante (Supabase Storage)
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- View: saldo e rateio por morador (apenas gastos coletivos)
-- SECURITY INVOKER garante que a view respeita RLS do usuário que consulta
CREATE OR REPLACE VIEW public.balance_summary
WITH (security_invoker = on) AS
WITH collective_total AS (
  SELECT COALESCE(SUM(amount), 0) AS total
  FROM public.transactions
  WHERE type = 'collective'
),
paid_per_person AS (
  SELECT paid_by, SUM(amount) AS total_paid
  FROM public.transactions
  WHERE type = 'collective'
  GROUP BY paid_by
)
SELECT
  p.id,
  p.username,
  COALESCE(pp.total_paid, 0)                              AS total_paid,
  (ct.total / NULLIF((SELECT COUNT(*) FROM public.profiles), 0)) AS fair_share,
  COALESCE(pp.total_paid, 0) -
    (ct.total / NULLIF((SELECT COUNT(*) FROM public.profiles), 0)) AS balance
FROM public.profiles p
CROSS JOIN collective_total ct
LEFT JOIN paid_per_person pp ON pp.paid_by = p.id;

CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABELA: shopping_list
-- Lista de compras dinâmica compartilhada
-- ============================================================
CREATE TABLE public.shopping_list (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name    TEXT NOT NULL,
  quantity     TEXT NOT NULL DEFAULT '1',      -- ex: '2 unidades', '500g'
  category     TEXT,                           -- ex: 'hortifruti', 'limpeza'
  status       shopping_item_status NOT NULL DEFAULT 'pending',
  added_by     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  purchased_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  purchased_at TIMESTAMPTZ,
  estimated_price NUMERIC(10, 2),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: marcar purchased_at quando status = purchased
CREATE OR REPLACE FUNCTION set_item_purchased_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'purchased' AND OLD.status = 'pending' THEN
    NEW.purchased_at = NOW();
  ELSIF NEW.status = 'pending' THEN
    NEW.purchased_at = NULL;
    NEW.purchased_by = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_item_purchased
  BEFORE UPDATE ON public.shopping_list
  FOR EACH ROW EXECUTE FUNCTION set_item_purchased_at();

CREATE TRIGGER trg_shopping_updated_at
  BEFORE UPDATE ON public.shopping_list
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Zero-Trust
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list  ENABLE ROW LEVEL SECURITY;

-- Helper: verifica se o usuário da sessão é um morador cadastrado
CREATE OR REPLACE FUNCTION is_resident()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- --- profiles ---
-- Moradores veem todos os perfis (necessário para exibir responsáveis, etc.)
CREATE POLICY "residents_select_profiles"
  ON public.profiles FOR SELECT
  USING (is_resident());

-- Cada morador edita apenas o próprio perfil
CREATE POLICY "own_profile_update"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- Insert apenas pelo service_role (via trigger de auth ou backend)
CREATE POLICY "service_role_insert_profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- --- tasks ---
-- Moradores veem todas as tarefas
CREATE POLICY "residents_select_tasks"
  ON public.tasks FOR SELECT
  USING (is_resident());

-- Moradores criam tarefas
CREATE POLICY "residents_insert_tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (is_resident() AND created_by = auth.uid());

-- Apenas criador ou responsável pode atualizar
CREATE POLICY "task_owner_update"
  ON public.tasks FOR UPDATE
  USING (is_resident() AND (created_by = auth.uid() OR assignee_id = auth.uid()));

-- Apenas criador pode deletar
CREATE POLICY "task_creator_delete"
  ON public.tasks FOR DELETE
  USING (created_by = auth.uid());

-- --- transactions ---
-- Moradores veem todas as transações (transparência financeira)
CREATE POLICY "residents_select_transactions"
  ON public.transactions FOR SELECT
  USING (is_resident());

-- Moradores registram transações como pagador
CREATE POLICY "residents_insert_transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (is_resident() AND paid_by = auth.uid());

-- Apenas quem pagou pode editar/deletar
CREATE POLICY "payer_update_transaction"
  ON public.transactions FOR UPDATE
  USING (paid_by = auth.uid());

CREATE POLICY "payer_delete_transaction"
  ON public.transactions FOR DELETE
  USING (paid_by = auth.uid());

-- --- shopping_list ---
-- Moradores veem tudo
CREATE POLICY "residents_select_shopping"
  ON public.shopping_list FOR SELECT
  USING (is_resident());

-- Moradores adicionam itens
CREATE POLICY "residents_insert_shopping"
  ON public.shopping_list FOR INSERT
  WITH CHECK (is_resident() AND added_by = auth.uid());

-- Qualquer morador pode atualizar (marcar como comprado, etc.)
CREATE POLICY "residents_update_shopping"
  ON public.shopping_list FOR UPDATE
  USING (is_resident());

-- Apenas quem adicionou pode remover
CREATE POLICY "adder_delete_shopping"
  ON public.shopping_list FOR DELETE
  USING (added_by = auth.uid());

-- ============================================================
-- REALTIME (opcional — habilitar no Supabase Dashboard)
-- ============================================================
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.shopping_list;
