-- ==========================================================================
-- Migração Lote 26: Storage, Fechamento Financeiro e Status
-- ==========================================================================

-- 1. Storage: Criar o Bucket para Comprovantes (receipts)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Policies para o bucket receipts (Permitir acesso público para leitura)
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');

-- Permitir inserts para usuários autenticados
CREATE POLICY "Auth Insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'receipts' AND auth.role() = 'authenticated'
);

-- Permitir updates/deletes pelo próprio criador (opcional, manteremos simples)
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'receipts' AND auth.role() = 'authenticated'
);

CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'receipts' AND auth.role() = 'authenticated'
);


-- 2. Fechamento Financeiro Automático
-- Adicionar coluna 'status' na tabela transactions
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' 
CHECK (status IN ('pending', 'settled'));

-- Para alterar a VIEW balance_summary, precisamos dar DROP nela primeiro
DROP VIEW IF EXISTS public.balance_summary;

-- Recriar a VIEW considerando apenas transações 'pending'
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
