-- ==========================================================================
-- Migração Lote 25: Auditoria UI/UX e Expansão Cognitiva
-- ==========================================================================

-- 1. Criação da Tabela do Mural
CREATE TABLE IF NOT EXISTS public.mural_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.mural_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mural_notes_select" ON public.mural_notes FOR SELECT USING (true);
CREATE POLICY "mural_notes_all" ON public.mural_notes FOR ALL USING (true) WITH CHECK (true);

-- 2. Modificações em Tasks (Prazos exatos e XP)
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS deadline_time TIME,
ADD COLUMN IF NOT EXISTS xp_reward INT DEFAULT 10;

-- 3. Modificações em Shopping List (Prazos de Compra)
ALTER TABLE public.shopping_list
ADD COLUMN IF NOT EXISTS deadline_date DATE;

-- 4. Modificações em Finanças (Comprovantes)
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- 5. Tabela de Shortcuts / Atalhos (Cognição Acelerada)
CREATE TABLE IF NOT EXISTS public.shortcuts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    command TEXT NOT NULL UNIQUE,
    response_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.shortcuts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shortcuts_select" ON public.shortcuts FOR SELECT USING (true);
CREATE POLICY "shortcuts_all" ON public.shortcuts FOR ALL USING (true) WITH CHECK (true);

-- Inserir alguns atalhos úteis por padrão
INSERT INTO public.shortcuts (command, response_text) VALUES 
('!pix', 'A chave PIX da casa é: celular 11999999999 (Inara Administradora).'),
('/pix', 'A chave PIX da casa é: celular 11999999999 (Inara Administradora).'),
('!wifi', 'Rede: Inara_5G | Senha: inararules')
ON CONFLICT (command) DO NOTHING;
