
-- 1) Create zones table
CREATE TABLE public.zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (warehouse_id, code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.zones TO authenticated;
GRANT ALL ON public.zones TO service_role;

ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view zones"
  ON public.zones FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage zones"
  ON public.zones FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_zones_updated_at
  BEFORE UPDATE ON public.zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Add zone_id on locations
ALTER TABLE public.locations
  ADD COLUMN zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL;

CREATE INDEX idx_locations_zone_id ON public.locations(zone_id);

-- 3) Drop legacy slot FK columns from goods_receipt_pending
ALTER TABLE public.goods_receipt_pending
  DROP COLUMN IF EXISTS received_storage_slot_id,
  DROP COLUMN IF EXISTS received_sub_storage_slot_id;

-- 4) Drop legacy tables
DROP TABLE IF EXISTS public.sub_storage_slots CASCADE;
DROP TABLE IF EXISTS public.storage_slots CASCADE;
