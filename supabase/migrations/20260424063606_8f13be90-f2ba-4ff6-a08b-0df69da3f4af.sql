
-- 1. external_db_connections
CREATE TABLE public.external_db_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Billboard MS SQL',
  db_type TEXT NOT NULL DEFAULT 'mssql',
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 1433,
  database_name TEXT NOT NULL,
  table_name TEXT NOT NULL DEFAULT 'Asset',
  username TEXT NOT NULL,
  password_secret_name TEXT NOT NULL DEFAULT 'MSSQL_BILLBOARD_PASSWORD',
  auto_sync_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_sync_days INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  auto_sync_time TEXT DEFAULT '04:00',
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_status TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.external_db_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage external db connections"
ON public.external_db_connections
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_external_db_connections_updated_at
BEFORE UPDATE ON public.external_db_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. billboard_sync_logs
CREATE TABLE public.billboard_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID REFERENCES public.external_db_connections(id) ON DELETE CASCADE,
  triggered_by UUID,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'running',
  rows_fetched INTEGER NOT NULL DEFAULT 0,
  rows_inserted INTEGER NOT NULL DEFAULT 0,
  rows_updated INTEGER NOT NULL DEFAULT 0,
  rows_skipped INTEGER NOT NULL DEFAULT 0,
  rows_failed INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  details JSONB,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.billboard_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins view sync logs"
ON public.billboard_sync_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins insert sync logs"
ON public.billboard_sync_logs
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins update sync logs"
ON public.billboard_sync_logs
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

CREATE INDEX idx_billboard_sync_logs_connection ON public.billboard_sync_logs(connection_id, started_at DESC);

-- 3. billboard_field_mapping
CREATE TABLE public.billboard_field_mapping (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID REFERENCES public.external_db_connections(id) ON DELETE CASCADE,
  source_column TEXT NOT NULL,
  target_field TEXT NOT NULL,
  sync_behavior TEXT NOT NULL DEFAULT 'overwrite',
  is_match_key BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (connection_id, target_field)
);

ALTER TABLE public.billboard_field_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage field mapping"
ON public.billboard_field_mapping
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_billboard_field_mapping_updated_at
BEFORE UPDATE ON public.billboard_field_mapping
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
