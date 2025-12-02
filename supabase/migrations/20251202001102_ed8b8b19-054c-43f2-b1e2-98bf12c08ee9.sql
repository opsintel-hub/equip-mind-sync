-- Create equipment_transfers table for tracking equipment movements
CREATE TABLE public.equipment_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  from_location_id UUID REFERENCES public.locations(id),
  to_location_id UUID NOT NULL REFERENCES public.locations(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.equipment_transfers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "All authenticated users can view transfers"
ON public.equipment_transfers
FOR SELECT
USING (true);

CREATE POLICY "Staff and admins can create transfers"
ON public.equipment_transfers
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse_staff'::app_role));

-- Create index for better query performance
CREATE INDEX idx_equipment_transfers_equipment_id ON public.equipment_transfers(equipment_id);
CREATE INDEX idx_equipment_transfers_transfer_date ON public.equipment_transfers(transfer_date DESC);