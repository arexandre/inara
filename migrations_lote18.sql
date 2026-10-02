-- Migration Lote 18: Estruturação da Lista de Compras

ALTER TABLE public.shopping_list 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Geral',
ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'Normal' CHECK (urgency IN ('Alta', 'Normal', 'Baixa'));
