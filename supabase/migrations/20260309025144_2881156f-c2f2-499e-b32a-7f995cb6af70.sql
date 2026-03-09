
-- Table to track individual serial numbers for equipment
CREATE TABLE public.equipment_serial_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  serial_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_stock',
  -- status values: in_stock, issued, installed, defective, returned, reserved
  receipt_document_no TEXT,
  issue_document_no TEXT,
  billboard_id UUID REFERENCES public.billboards(id),
  location_id UUID REFERENCES public.locations(id),
  notes TEXT,
  received_at TIMESTAMP WITH TIME ZONE,
  issued_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Index for fast search by serial number
CREATE INDEX idx_equipment_sn_serial ON public.equipment_serial_numbers(serial_number);
CREATE INDEX idx_equipment_sn_equipment_id ON public.equipment_serial_numbers(equipment_id);
CREATE INDEX idx_equipment_sn_status ON public.equipment_serial_numbers(status);

-- Enable RLS
ALTER TABLE public.equipment_serial_numbers ENABLE ROW LEVEL SECURITY;

-- RLS policies - authenticated users can read
CREATE POLICY "Authenticated users can view serial numbers"
  ON public.equipment_serial_numbers FOR SELECT TO authenticated USING (true);

-- Authenticated users can insert
CREATE POLICY "Authenticated users can insert serial numbers"
  ON public.equipment_serial_numbers FOR INSERT TO authenticated WITH CHECK (true);

-- Authenticated users can update
CREATE POLICY "Authenticated users can update serial numbers"
  ON public.equipment_serial_numbers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_equipment_serial_numbers_updated_at
  BEFORE UPDATE ON public.equipment_serial_numbers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
