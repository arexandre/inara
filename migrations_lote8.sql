-- Migration Lote 8
-- 1. Adicionar Peso/Esforço nas tarefas
ALTER TABLE tasks ADD COLUMN weight INT DEFAULT 1;

-- 2. Tabela de Configurações do Sistema (pode ter 1 linha só)
CREATE TABLE IF NOT EXISTS system_settings (
  id INT PRIMARY KEY DEFAULT 1,
  idle_time_min INT DEFAULT 120,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir o registro padrão
INSERT INTO system_settings (id, idle_time_min) VALUES (1, 120)
ON CONFLICT (id) DO NOTHING;
