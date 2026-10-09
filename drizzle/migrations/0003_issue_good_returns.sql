CREATE TABLE public.issue_good_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pending_id uuid NOT NULL,
  pending_item_id uuid NOT NULL,
  document_no text,
  equipment_id uuid,
  media_player_id uuid,
  is_media_player boolean NOT NULL DEFAULT false,
  equipment_code text,
  equipment_name text,
  serial_number text,
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit text,
  department text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  submitted_by uuid,
  submitted_by_name text,
  received_by uuid,
  received_at timestamptz,
  warehouse_id uuid,
  location_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.issue_good_returns TO authenticated;
GRANT ALL ON public.issue_good_returns TO service_role;
ALTER TABLE public.issue_good_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "igr select" ON public.issue_good_returns FOR SELECT TO authenticated USING (true);
CREATE POLICY "igr insert own" ON public.issue_good_returns FOR INSERT TO authenticated WITH CHECK (submitted_by = auth.uid());
CREATE POLICY "igr warehouse update" ON public.issue_good_returns FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'warehouse_staff') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
WITH CHECK (public.has_role(auth.uid(),'warehouse_staff') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_igr_updated BEFORE UPDATE ON public.issue_good_returns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER PUBLICATION supabase_realtime ADD TABLE public.issue_good_returns;