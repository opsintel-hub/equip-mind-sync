
CREATE TABLE public.media_player_billboard_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_player_id UUID NOT NULL REFERENCES public.media_players(id) ON DELETE CASCADE,
  billboard_id UUID NOT NULL REFERENCES public.billboards(id) ON DELETE CASCADE,
  installation_date TEXT,
  uninstall_date TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD'),
  installed_by UUID,
  uninstalled_by UUID,
  installation_notes TEXT,
  uninstall_reason TEXT,
  return_to_stock BOOLEAN DEFAULT false,
  return_location_id UUID REFERENCES public.locations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.media_player_billboard_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view media player billboard history"
  ON public.media_player_billboard_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert media player billboard history"
  ON public.media_player_billboard_history FOR INSERT TO authenticated WITH CHECK (true);
