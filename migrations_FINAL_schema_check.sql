-- ==========================================================================
-- Migração FINAL: Verificação Completa de Esquema
-- Script 100% idempotente — seguro para rodar múltiplas vezes.
-- Cobre TODAS as tabelas referenciadas pelo código (Next.js + Python Bot).
-- ==========================================================================

-- =====================
-- 1. TABELAS CORE (se faltarem do setup original)
-- =====================

-- profiles: Deve já existir. Garantir colunas adicionais.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_admin') THEN
        ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'personal_context') THEN
        ALTER TABLE public.profiles ADD COLUMN personal_context TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'theme_preference') THEN
        ALTER TABLE public.profiles ADD COLUMN theme_preference TEXT NOT NULL DEFAULT 'light';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'telegram_id') THEN
        ALTER TABLE public.profiles ADD COLUMN telegram_id BIGINT;
    END IF;
END $$;

-- tasks: Garantir colunas extras
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'seq_id') THEN
        ALTER TABLE public.tasks ADD COLUMN seq_id SERIAL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'weight') THEN
        ALTER TABLE public.tasks ADD COLUMN weight INTEGER NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'is_archived') THEN
        ALTER TABLE public.tasks ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'completed_at') THEN
        ALTER TABLE public.tasks ADD COLUMN completed_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'recurrence') THEN
        ALTER TABLE public.tasks ADD COLUMN recurrence TEXT DEFAULT 'none';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'emoji') THEN
        ALTER TABLE public.tasks ADD COLUMN emoji TEXT DEFAULT '📌';
    END IF;
END $$;

-- transactions: Garantir colunas extras
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'status') THEN
        ALTER TABLE public.transactions ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settled'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'beneficiary_id') THEN
        ALTER TABLE public.transactions ADD COLUMN beneficiary_id UUID REFERENCES public.profiles(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'receipt_url') THEN
        ALTER TABLE public.transactions ADD COLUMN receipt_url TEXT;
    END IF;
END $$;

-- =====================
-- 2. TABELAS AUXILIARES
-- =====================

CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME,
    type TEXT DEFAULT 'event',
    is_all_day BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mural_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    profile_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    topic TEXT,
    category TEXT,
    source_type TEXT DEFAULT 'manual',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    idle_time_min INTEGER NOT NULL DEFAULT 120,
    house_address TEXT,
    house_rules TEXT,
    system_prompt TEXT NOT NULL DEFAULT 'Você é Inara.',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'single_row'
    ) THEN 
        ALTER TABLE public.system_settings ADD CONSTRAINT single_row CHECK (id = 1);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.system_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    command TEXT NOT NULL,
    executed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pending_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intent TEXT NOT NULL,
    payload JSONB,
    chat_id BIGINT DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.custom_routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    command TEXT NOT NULL,
    schedule_cron TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shortcuts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    command TEXT NOT NULL UNIQUE,
    response_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    auth TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error', 'critical')),
    source TEXT NOT NULL,
    message TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'offline',
    last_check TIMESTAMPTZ NOT NULL DEFAULT now(),
    details JSONB
);

CREATE TABLE IF NOT EXISTS public.chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_bot BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_journal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    topic TEXT,
    source_type TEXT DEFAULT 'auto',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- api_usage_logs (referenciado pelo frontend mas pode não existir ainda)
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    cost_estimate NUMERIC(10,6) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- 3. VIEW: balance_summary
-- =====================
DROP VIEW IF EXISTS public.balance_summary;
CREATE OR REPLACE VIEW public.balance_summary
WITH (security_invoker = on) AS
WITH collective_total AS (
  SELECT COALESCE(SUM(amount), 0) AS total
  FROM public.transactions
  WHERE type = 'collective' AND status = 'pending'
),
collective_paid AS (
  SELECT paid_by, SUM(amount) AS total_paid
  FROM public.transactions
  WHERE type = 'collective' AND status = 'pending'
  GROUP BY paid_by
),
individual_paid_for_others AS (
  SELECT paid_by, SUM(amount) AS total
  FROM public.transactions
  WHERE type = 'individual' AND beneficiary_id IS NOT NULL AND beneficiary_id != paid_by AND status = 'pending'
  GROUP BY paid_by
),
individual_borrowed AS (
  SELECT beneficiary_id, SUM(amount) AS total
  FROM public.transactions
  WHERE type = 'individual' AND beneficiary_id IS NOT NULL AND beneficiary_id != paid_by AND status = 'pending'
  GROUP BY beneficiary_id
)
SELECT
  p.id,
  p.username,
  COALESCE(cp.total_paid, 0) AS total_paid,
  (ct.total / NULLIF((SELECT COUNT(*) FROM public.profiles), 0)) AS fair_share,
  (
    COALESCE(cp.total_paid, 0)
    - (ct.total / NULLIF((SELECT COUNT(*) FROM public.profiles), 0))
    + COALESCE(ipo.total, 0)
    - COALESCE(ib.total, 0)
  ) AS balance
FROM public.profiles p
CROSS JOIN collective_total ct
LEFT JOIN collective_paid cp ON cp.paid_by = p.id
LEFT JOIN individual_paid_for_others ipo ON ipo.paid_by = p.id
LEFT JOIN individual_borrowed ib ON ib.beneficiary_id = p.id;

-- =====================
-- 4. ROW LEVEL SECURITY
-- =====================

-- Habilitar RLS em todas as tabelas relevantes
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mural_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shortcuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Drop todas as policies existentes para recriar limpo (idempotente)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'events', 'mural_notes', 'notifications', 'knowledge_base',
            'system_settings', 'system_commands', 'pending_actions',
            'custom_routines', 'shortcuts', 'push_subscriptions',
            'system_logs', 'system_health', 'chat_history', 'daily_journal',
            'api_usage_logs'
        )
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- == events ==
CREATE POLICY "auth_events_all" ON public.events FOR ALL USING (auth.role() = 'authenticated');

-- == mural_notes ==
CREATE POLICY "auth_mural_select" ON public.mural_notes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_mural_insert" ON public.mural_notes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_mural_update" ON public.mural_notes FOR UPDATE USING (auth.role() = 'authenticated' AND (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));
CREATE POLICY "auth_mural_delete" ON public.mural_notes FOR DELETE USING (auth.role() = 'authenticated' AND (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));

-- == notifications ==
CREATE POLICY "auth_notifications_all" ON public.notifications FOR ALL USING (auth.role() = 'authenticated');

-- == knowledge_base ==
CREATE POLICY "auth_kb_select" ON public.knowledge_base FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin_kb_write" ON public.knowledge_base FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- == system_settings ==
CREATE POLICY "settings_read" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "admin_settings_write" ON public.system_settings FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- == system_commands (inserts apenas admin via frontend, bot usa service_role) ==
CREATE POLICY "admin_commands_insert" ON public.system_commands FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

-- == pending_actions (qualquer autenticado pode inserir) ==
CREATE POLICY "auth_actions_insert" ON public.pending_actions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_actions_select" ON public.pending_actions FOR SELECT USING (auth.role() = 'authenticated');

-- == custom_routines ==
CREATE POLICY "auth_routines_select" ON public.custom_routines FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin_routines_write" ON public.custom_routines FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- == shortcuts ==
CREATE POLICY "auth_shortcuts_select" ON public.shortcuts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin_shortcuts_write" ON public.shortcuts FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- == push_subscriptions ==
CREATE POLICY "user_push_subs" ON public.push_subscriptions FOR ALL USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

-- == system_logs (admin read-only) ==
CREATE POLICY "admin_logs_read" ON public.system_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

-- == system_health (admin read-only) ==
CREATE POLICY "admin_health_read" ON public.system_health FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

-- == chat_history ==
CREATE POLICY "user_chat_history" ON public.chat_history FOR ALL USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

-- == daily_journal (admin only) ==
CREATE POLICY "admin_journal_all" ON public.daily_journal FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- == api_usage_logs (admin only) ==
CREATE POLICY "admin_api_logs" ON public.api_usage_logs FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- =====================
-- 5. STORAGE (Comprovantes)
-- =====================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- =====================
-- 6. SEED: Inserir system_settings se vazio
-- =====================
INSERT INTO public.system_settings (id, idle_time_min, system_prompt)
VALUES (1, 120, 'Você é Inara, a Síndica Implacável e IA de Gerenciamento da casa.')
ON CONFLICT (id) DO NOTHING;

-- ==========================================================================
-- FIM: Esquema verificado e blindado. Todas as tabelas existem com RLS.
-- ==========================================================================
