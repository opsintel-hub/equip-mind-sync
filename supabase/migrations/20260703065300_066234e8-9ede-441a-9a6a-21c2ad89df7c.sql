
CREATE TABLE public.claim_progress_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_record_id UUID NOT NULL REFERENCES public.claim_records(id) ON DELETE CASCADE,
  note TEXT,
  cost_amount NUMERIC DEFAULT 0,
  logged_by UUID REFERENCES auth.users(id),
  logged_by_name TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_claim_progress_logs_claim ON public.claim_progress_logs(claim_record_id, logged_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claim_progress_logs TO authenticated;
GRANT ALL ON public.claim_progress_logs TO service_role;
ALTER TABLE public.claim_progress_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read progress logs" ON public.claim_progress_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert progress logs" ON public.claim_progress_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "admin manage progress logs" ON public.claim_progress_logs FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.media_player_serial_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_player_id UUID NOT NULL REFERENCES public.media_players(id) ON DELETE CASCADE,
  old_serial TEXT,
  new_serial TEXT,
  reason TEXT,
  claim_record_id UUID REFERENCES public.claim_records(id) ON DELETE SET NULL,
  claim_document_no TEXT,
  new_warranty_expiry_date DATE,
  new_po_number TEXT,
  new_invoice_number TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_by_name TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mp_serial_history_mp ON public.media_player_serial_history(media_player_id, changed_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_player_serial_history TO authenticated;
GRANT ALL ON public.media_player_serial_history TO service_role;
ALTER TABLE public.media_player_serial_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read serial history" ON public.media_player_serial_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert serial history" ON public.media_player_serial_history FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "admin manage serial history" ON public.media_player_serial_history FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
