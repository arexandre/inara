-- ==========================================================================
-- Migração Lote 32: Auditoria de Segurança e RLS
-- ==========================================================================

-- 1. Apertando a Segurança de mural_notes
-- Substituir as policies abertas por políticas restritas a usuários autenticados
DO $$
BEGIN
    DROP POLICY IF EXISTS "mural_notes_select" ON public.mural_notes;
    DROP POLICY IF EXISTS "mural_notes_all" ON public.mural_notes;
EXCEPTION WHEN OTHERS THEN
    -- Ignore
END $$;

CREATE POLICY "mural_notes_select" ON public.mural_notes 
    FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "mural_notes_insert" ON public.mural_notes 
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "mural_notes_update_delete" ON public.mural_notes 
    FOR ALL 
    USING (
        auth.role() = 'authenticated' AND 
        (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
    );


-- 2. Apertando a Segurança de shortcuts
-- Substituir as policies abertas por políticas restritas a usuários autenticados
DO $$
BEGIN
    DROP POLICY IF EXISTS "shortcuts_select" ON public.shortcuts;
    DROP POLICY IF EXISTS "shortcuts_all" ON public.shortcuts;
EXCEPTION WHEN OTHERS THEN
    -- Ignore
END $$;

CREATE POLICY "shortcuts_select" ON public.shortcuts 
    FOR SELECT 
    USING (auth.role() = 'authenticated');

-- Apenas admins podem criar/editar atalhos
CREATE POLICY "shortcuts_all_admin" ON public.shortcuts 
    FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ==========================================================================
-- Concluído: RLS devidamente auditado e blindado
-- ==========================================================================
