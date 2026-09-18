CREATE TABLE public.stock_location_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid REFERENCES public.equipment(id) ON DELETE CASCADE,
  media_player_id uuid REFERENCES public.media_players(id) ON DELETE CASCADE,
  tool_id uuid REFERENCES public.tools(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id),
  warehouse_id uuid REFERENCES public.warehouses(id),
  quantity numeric NOT NULL DEFAULT 0,
  volume_cm3 numeric,
  reference_type text,
  reference_id uuid,
  reference_document text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sla_location ON public.stock_location_allocations(location_id);
CREATE INDEX idx_sla_equipment ON public.stock_location_allocations(equipment_id);
CREATE INDEX idx_sla_media_player ON public.stock_location_allocations(media_player_id);
CREATE INDEX idx_sla_tool ON public.stock_location_allocations(tool_id);
CREATE INDEX idx_sla_reference ON public.stock_location_allocations(reference_type, reference_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_location_allocations TO authenticated;
GRANT ALL ON public.stock_location_allocations TO service_role;

ALTER TABLE public.stock_location_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view stock_location_allocations"
ON public.stock_location_allocations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage stock_location_allocations"
ON public.stock_location_allocations FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'warehouse_staff')
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'warehouse_staff')
);

CREATE TRIGGER update_stock_location_allocations_updated_at
BEFORE UPDATE ON public.stock_location_allocations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();