-- ==========================================================================
-- Migração Lote 28: Painel de Memória e System Logs (Auditoria)
-- ==========================================================================

-- Tabela para armazenar logs do sistema e erros críticos
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error', 'critical')),
    source TEXT NOT NULL,
    message TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Policies de segurança para os logs (apenas leitura para admins)
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ler logs" 
    ON public.system_logs 
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.is_admin = true
        )
    );

-- Obs: Escrita de logs será feita apenas via Service Role (Admin Client / Python Backend) bypassing RLS.
