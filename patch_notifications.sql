-- Patch: Tabela notifications (Lote 19 - não foi aplicada anteriormente)

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notif_read' AND tablename = 'notifications') THEN
    CREATE POLICY notif_read ON public.notifications FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notif_write' AND tablename = 'notifications') THEN
    CREATE POLICY notif_write ON public.notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Habilitar Realtime para o NotificationBell funcionar
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
