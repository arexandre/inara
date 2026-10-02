-- ==========================================================================
-- Migração Lote 27: WebPush e Calendar
-- ==========================================================================

-- Tabela para armazenar as inscrições de WebPush Notification
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

-- Usuários podem gerenciar (ver/inserir/deletar) suas próprias inscrições
CREATE POLICY "Users manage own push subs" 
    ON public.push_subscriptions 
    FOR ALL 
    USING (profile_id = auth.uid()) 
    WITH CHECK (profile_id = auth.uid());

-- Permitir leitura global (opcional) pelo server role (Service Role já tem bypass de RLS)
