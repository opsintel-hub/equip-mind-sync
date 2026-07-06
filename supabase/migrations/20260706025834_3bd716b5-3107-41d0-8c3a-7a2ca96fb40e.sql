ALTER TABLE public.billboards
  ADD COLUMN IF NOT EXISTS sync_source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_billboards_sync_source ON public.billboards(sync_source);