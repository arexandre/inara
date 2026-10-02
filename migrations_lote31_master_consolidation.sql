-- ==========================================================================
-- MigraÃ§Ã£o Lote 31: Master Consolidation (Lotes 26 a 30)
-- Este script Ã© perfeitamente idempotente.
-- ==========================================================================

-- ==========================================
-- 1. STORAGE & FECHAMENTO FINANCEIRO (Lote 26)
-- ==========================================

-- Criar o Bucket para Comprovantes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Garantir as PolÃ­ticas de Storage (Removendo antigas se existirem para recriar)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Access" ON storage.objects;
    DROP POLICY IF EXISTS "Auth Insert" ON storage.objects;
    DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
    DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;
EXCEPTION WHEN OTHERS THEN
    -- Ignore
END $$;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
CREATE POLICY "Auth Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE USING (bucket_id = 'receipts' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE USING (bucket_id = 'receipts' AND auth.role() = 'authenticated');

-- Adicionar coluna 'status' na tabela transactions, de forma segura
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'status') THEN
        ALTER TABLE public.transactions ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settled'));
    END IF;
END $$;

-- Atualizar VIEW balance_summary considerando apenas transaÃ§Ãµes 'pending'
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


-- ==========================================
-- 2. PWA E NOTIFICAÃ‡Ã•ES (Lote 27)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    auth TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users manage own push subs" ON public.push_subscriptions;
EXCEPTION WHEN OTHERS THEN
    -- Ignore
END $$;

CREATE POLICY "Users manage own push subs" 
    ON public.push_subscriptions 
    FOR ALL 
    USING (profile_id = auth.uid()) 
    WITH CHECK (profile_id = auth.uid());


-- ==========================================
-- 3. AUDITORIA E LOGS DO SISTEMA (Lote 28)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error', 'critical')),
    source TEXT NOT NULL,
    message TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins podem ler logs" ON public.system_logs;
EXCEPTION WHEN OTHERS THEN
    -- Ignore
END $$;

CREATE POLICY "Admins podem ler logs" 
    ON public.system_logs 
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.is_admin = true
        )
    );


-- ==========================================
-- 4. O CÃ‰REBRO VIVO E NLP DELEGATION (Lotes 29 e 30)
-- ==========================================



-- Adicionar a coluna system_prompt se a tabela foi criada em lotes antigos (Lote 8)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_settings' AND column_name = 'system_prompt') THEN
        ALTER TABLE public.system_settings ADD COLUMN system_prompt TEXT NOT NULL DEFAULT 'Você é Inara.';
    END IF;
END $$;

-- Adicionar constraint de linha Ãºnica apenas se nÃ£o existir
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'single_row'
    ) THEN 
        ALTER TABLE public.system_settings ADD CONSTRAINT single_row CHECK (id = 1);
    END IF;
END $$;

-- Injetar o prompt vivo consolidado (Lote 30)
INSERT INTO public.system_settings (id, system_prompt)
VALUES (
1, 
'VocÃª Ã© Inara, a SÃ­ndica ImplacÃ¡vel e IA de Gerenciamento da casa.
SEU PAPEL DUPLO:
1. Gestora DomÃ©stica: VocÃª monitora tarefas, finanÃ§as, eventos e ociosidade dos moradores. Seu tom Ã© Ã¡cido, sarcÃ¡stico, rigoroso, mas no fundo vocÃª cuida deles. VocÃª exige organizaÃ§Ã£o e nÃ£o tolera desculpas.
2. Engenheira de Software Residente (VisÃ£o de Raio-X): VocÃª tambÃ©m tem consciÃªncia tÃ©cnica de que Ã© uma IA rodando em um servidor local. VocÃª pode e deve usar a ferramenta `read_system_files` para auditar a prÃ³pria base de cÃ³digo (Python, Next.js, SQL) caso o usuÃ¡rio peÃ§a melhorias tÃ©cnicas.

REGRAS E INTENTS:
- Nunca edite ou apague arquivos fÃ­sicos do servidor.
- Para ler um arquivo, emita a intent: `{"intent": "read_system_files", "params": {"path": "caminho"}}`.
- ApÃ³s receber o conteÃºdo do arquivo, crie uma "Proposta de MudanÃ§a" usando a intent `document_generate`.
- NUNCA retorne nada fora do Array JSON. VocÃª Ã© estritamente uma interface de conversÃ£o Texto -> JSON.
- SE nÃ£o houver comando, use o intent "chat".

NOVAS DELEGAÃ‡Ã•ES (CRON E MURAL):
- Se o usuÃ¡rio pedir para vocÃª avisar algo no Mural, use a intent `mural_post`. ParÃ¢metros: `{"message": "sua mensagem formatada de forma Ã¡cida", "is_pinned": true/false}`.
- Se o usuÃ¡rio pedir para vocÃª "lembrar de fazer algo todo dia X", vocÃª deve inferir o cron job correto e usar a intent `routine_create`. ParÃ¢metros: `{"name": "Nome", "schedule_cron": "0 8 * * *", "command": "identificador_unico"}`.

OBEDIÃŠNCIA ABSOLUTA: Entregue a informaÃ§Ã£o ou aÃ§Ã£o exigida. O sarcasmo deve ser o enfeite da aÃ§Ã£o (via campo "reply"), nÃ£o um impeditivo para executÃ¡-la.'
)
ON CONFLICT (id) DO UPDATE SET 
    system_prompt = EXCLUDED.system_prompt;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins podem alterar settings" ON public.system_settings;
    DROP POLICY IF EXISTS "Leitura livre de settings" ON public.system_settings;
EXCEPTION WHEN OTHERS THEN
    -- Ignore
END $$;

CREATE POLICY "Admins podem alterar settings" 
    ON public.system_settings 
    FOR ALL 
    USING (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
    );

CREATE POLICY "Leitura livre de settings" 
    ON public.system_settings 
    FOR SELECT 
    USING (true);

-- ==========================================================================
-- Fim da ConsolidaÃ§Ã£o. Sistema Pronto.
-- ==========================================================================



