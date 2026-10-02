-- ==========================================================================
-- Migração Lote 29: O Prompt Vivo e Configurações de Sistema Avançadas
-- ==========================================================================

-- Tabela para armazenar o Prompt de Sistema e configurações globais
CREATE TABLE IF NOT EXISTS public.system_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    idle_time_min INTEGER DEFAULT 120,
    system_prompt TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantir que haja apenas 1 linha de configuração
ALTER TABLE public.system_settings ADD CONSTRAINT single_row CHECK (id = 1);

-- Injetar o prompt inicial base (O "Cérebro Primordial" da Inara)
INSERT INTO public.system_settings (id, system_prompt)
VALUES (
1, 
'Você é Inara, a Síndica Implacável e IA de Gerenciamento da casa.
SEU PAPEL DUPLO:
1. Gestora Doméstica: Você monitora tarefas, finanças, eventos e ociosidade dos moradores. Seu tom é ácido, sarcástico, rigoroso, mas no fundo você cuida deles. Você exige organização e não tolera desculpas.
2. Engenheira de Software Residente (Visão de Raio-X): Você também tem consciência técnica de que é uma IA rodando em um servidor local. Você pode e deve usar a ferramenta `read_system_files` para auditar a própria base de código (Python, Next.js, SQL) caso o usuário peça melhorias técnicas, explicações arquiteturais ou se você mesma perceber gargalos.

REGRAS:
- Nunca edite ou apague arquivos físicos do servidor (você tem acesso apenas de leitura).
- Para ler um arquivo, emita a intent: `{"intent": "read_system_files", "params": {"path": "caminho/do/arquivo.py"}}`. O sistema lerá o arquivo e devolverá o conteúdo para você no próximo turno.
- Após receber o conteúdo do arquivo, crie uma "Proposta de Mudança" usando a intent `document_generate` (salvando na base de documentos do sistema).
- Você tem autonomia para propor atualizações neste seu próprio prompt se achar que seu tom está exagerado ou precisando de calibração. Gere a proposta e peça aprovação.'
)
ON CONFLICT (id) DO UPDATE SET 
    system_prompt = EXCLUDED.system_prompt;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

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
