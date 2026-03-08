
-- Create direct_shipments table (header)
CREATE TABLE public.direct_shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_no TEXT NOT NULL DEFAULT ('DS-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(floor(random() * 9999 + 1)::text, 4, '0')),
  supplier_id UUID REFERENCES public.suppliers(id),
  supplier_name TEXT,
  department TEXT,
  company_id UUID REFERENCES public.companies(id),
  section_id UUID REFERENCES public.sections(id),
  destination_description TEXT,
  po_number TEXT,
  shipping_date DATE,
  expected_arrival_date DATE,
  delivery_person_name TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending_confirmation',
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create direct_shipment_items table (items)
CREATE TABLE public.direct_shipment_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  direct_shipment_id UUID NOT NULL REFERENCES public.direct_shipments(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES public.equipment(id),
  equipment_code TEXT,
  equipment_name TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'ชิ้น',
  serial_number TEXT,
  lot_number TEXT,
  unit_price NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.direct_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_shipment_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for direct_shipments
CREATE POLICY "All authenticated users can view direct_shipments"
  ON public.direct_shipments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Staff and admins can manage direct_shipments"
  ON public.direct_shipments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'warehouse_staff') OR has_role(auth.uid(), 'receiver'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'warehouse_staff') OR has_role(auth.uid(), 'receiver'));

-- RLS policies for direct_shipment_items
CREATE POLICY "All authenticated users can view direct_shipment_items"
  ON public.direct_shipment_items FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Staff and admins can manage direct_shipment_items"
  ON public.direct_shipment_items FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'warehouse_staff') OR has_role(auth.uid(), 'receiver'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'warehouse_staff') OR has_role(auth.uid(), 'receiver'));

-- Add updated_at trigger
CREATE TRIGGER update_direct_shipments_updated_at
  BEFORE UPDATE ON public.direct_shipments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
