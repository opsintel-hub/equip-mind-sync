-- Create stock_movements table to track all stock changes
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  equipment_code TEXT NOT NULL,
  equipment_name TEXT NOT NULL,
  movement_type TEXT NOT NULL, -- 'receive', 'issue', 'transfer_in', 'transfer_out', 'return_from_billboard', 'install_to_billboard'
  quantity INTEGER NOT NULL,
  stock_before INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,
  reference_type TEXT, -- 'goods_receipt', 'goods_issue', 'equipment_transfer', 'billboard_equipment'
  reference_id UUID,
  reference_document TEXT,
  location_id UUID REFERENCES public.locations(id),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "All authenticated users can view stock movements"
ON public.stock_movements
FOR SELECT
USING (true);

CREATE POLICY "Staff and admins can create stock movements"
ON public.stock_movements
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse_staff'::app_role) OR has_role(auth.uid(), 'receiver'::app_role));

-- Create index for faster queries
CREATE INDEX idx_stock_movements_equipment_id ON public.stock_movements(equipment_id);
CREATE INDEX idx_stock_movements_created_at ON public.stock_movements(created_at DESC);
CREATE INDEX idx_stock_movements_movement_type ON public.stock_movements(movement_type);