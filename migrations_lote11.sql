-- Migration Lote 11
-- 1. Criação da tabela events
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME WITHOUT TIME ZONE,
  is_all_day BOOLEAN DEFAULT FALSE,
  type TEXT DEFAULT 'event' CHECK (type IN ('event', 'holiday')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar políticas básicas (opcional se RLs não estiver estrito)
