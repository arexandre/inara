-- Migration Lote 10
-- 1. Tabela profiles: Adicionar flags de governança e contexto
ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN theme_preference VARCHAR DEFAULT 'system';
ALTER TABLE profiles ADD COLUMN personal_context TEXT;

-- 2. Tabela system_settings: Adicionar contexto residencial
ALTER TABLE system_settings ADD COLUMN house_address TEXT;
ALTER TABLE system_settings ADD COLUMN house_rules TEXT;

-- (Opcional) Transformar o primeiro usuário criado em admin automaticamente:
UPDATE profiles SET is_admin = TRUE WHERE id = (
  SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1
);
