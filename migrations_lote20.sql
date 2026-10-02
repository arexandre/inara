-- Lote 20: Tarefas Recorrentes, Pesos e Emojis Semânticos

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS emoji TEXT,
ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT 'none' CHECK (recurrence IN ('none', 'daily', 'weekly')),
ADD COLUMN IF NOT EXISTS weight INT DEFAULT 1;
