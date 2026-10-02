-- ==========================================================================
-- Migração Lote 33: Fix RLS for system_commands and pending_actions
-- ==========================================================================

-- Habilitar RLS explícito
ALTER TABLE public.system_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_actions ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas se existirem
DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins podem inserir system_commands" ON public.system_commands;
    DROP POLICY IF EXISTS "Service Role ignora RLS" ON public.system_commands;
    DROP POLICY IF EXISTS "Usuários autenticados podem inserir pending_actions" ON public.pending_actions;
EXCEPTION WHEN OTHERS THEN
    -- Ignore
END $$;

-- Policies para system_commands (apenas inserts via painel de admin, ou leitura pelo worker python bypass RLS)
CREATE POLICY "Admins podem inserir system_commands" 
    ON public.system_commands 
    FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

-- Policies para pending_actions (usuários podem enviar intents)
CREATE POLICY "Usuários autenticados podem inserir pending_actions" 
    ON public.pending_actions 
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- Permitir leitura livre para todos na pending_actions caso precisem ver o status
CREATE POLICY "Leitura livre pending_actions" 
    ON public.pending_actions 
    FOR SELECT 
    USING (auth.role() = 'authenticated');
