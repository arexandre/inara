-- Migration Lote 12

-- 1. Tarefas (Arquivamento)
ALTER TABLE tasks ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;

-- 2. Mural de Avisos
CREATE TABLE IF NOT EXISTS mural (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Jornal Diário (Histórico de Resumos Matinais)
CREATE TABLE IF NOT EXISTS daily_journal (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Ações Pendentes (Para o Inline Keyboard do Telegram)
CREATE TABLE IF NOT EXISTS pending_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id BIGINT NOT NULL,
  intent TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Comandos do Sistema (Para disparos manuais do Frontend)
CREATE TABLE IF NOT EXISTS system_commands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  command TEXT NOT NULL,
  executed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
