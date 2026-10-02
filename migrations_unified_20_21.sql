-- ==========================================================================
-- Migração Unificada: Lotes 20 + 21
-- Execução idempotente (seguro para rodar múltiplas vezes)
-- ==========================================================================

-- ── LOTE 20: Colunas extras em tasks ─────────────────────────────────────

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS emoji TEXT;

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT 'none';

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS weight INT DEFAULT 1;

-- Validação CHECK (só aplica se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'tasks_recurrence_check'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_recurrence_check
      CHECK (recurrence IN ('none', 'daily', 'weekly'));
  END IF;
END $$;


-- ── LOTE 21: Tabela custom_routines ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.custom_routines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  command TEXT NOT NULL UNIQUE,
  schedule_cron TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_run TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed das rotinas hardcoded existentes (ignora se já existem)
INSERT INTO public.custom_routines (name, command, schedule_cron, is_active)
VALUES
  ('Resumo Matinal', 'resumo_matinal', '30 8 * * *', true),
  ('Ping de Ociosidade', 'ping_de_ociosidade', '*/15 * * * *', true),
  ('Garbage Collector', 'garbage_collector', '0 4 * * *', true)
ON CONFLICT (command) DO NOTHING;


-- ── LOTE 21: Tabela knowledge_base ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'geral',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);


-- ── LOTE 21: Tabela system_health ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.system_health (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown',
  last_check TIMESTAMPTZ DEFAULT now(),
  details JSONB DEFAULT '{}'::jsonb
);

-- Seed dos serviços monitorados
INSERT INTO public.system_health (service_name, status)
VALUES
  ('telegram_bot', 'unknown'),
  ('gemini_api', 'unknown'),
  ('supabase', 'unknown')
ON CONFLICT DO NOTHING;


-- ── RLS (Row Level Security) ─────────────────────────────────────────────

ALTER TABLE public.custom_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para autenticados
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'routines_read' AND tablename = 'custom_routines') THEN
    CREATE POLICY routines_read ON public.custom_routines FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'routines_write' AND tablename = 'custom_routines') THEN
    CREATE POLICY routines_write ON public.custom_routines FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'kb_read' AND tablename = 'knowledge_base') THEN
    CREATE POLICY kb_read ON public.knowledge_base FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'kb_write' AND tablename = 'knowledge_base') THEN
    CREATE POLICY kb_write ON public.knowledge_base FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'health_read' AND tablename = 'system_health') THEN
    CREATE POLICY health_read ON public.system_health FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'health_write' AND tablename = 'system_health') THEN
    CREATE POLICY health_write ON public.system_health FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
