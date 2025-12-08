-- Create table for pending goods receipt (before warehouse staff receives)
CREATE TABLE public.goods_receipt_pending (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_no TEXT NOT NULL,
  equipment_code TEXT,
  equipment_name TEXT,
  equipment_id UUID REFERENCES public.equipment(id),
  quantity INTEGER NOT NULL,
  unit TEXT NOT NULL DEFAULT 'ชิ้น',
  supplier_id UUID REFERENCES public.suppliers(id),
  supplier_name TEXT,
  lot_number TEXT,
  expiry_date DATE,
  delivery_person_name TEXT NOT NULL,
  delivery_person_phone TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  received_by UUID,
  received_at TIMESTAMP WITH TIME ZONE,
  received_location_id UUID REFERENCES public.locations(id),
  received_storage_slot_id UUID REFERENCES public.storage_slots(id),
  received_sub_storage_slot_id UUID REFERENCES public.sub_storage_slots(id)
);

-- Enable RLS
ALTER TABLE public.goods_receipt_pending ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for delivery person without login)
CREATE POLICY "Anyone can create pending receipts"
ON public.goods_receipt_pending
FOR INSERT
WITH CHECK (true);

-- Allow anyone to view pending receipts
CREATE POLICY "Anyone can view pending receipts"
ON public.goods_receipt_pending
FOR SELECT
USING (true);

-- Only staff and admins can update
CREATE POLICY "Staff and admins can update pending receipts"
ON public.goods_receipt_pending
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse_staff'::app_role));

-- Only admins can delete
CREATE POLICY "Admins can delete pending receipts"
ON public.goods_receipt_pending
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_goods_receipt_pending_updated_at
BEFORE UPDATE ON public.goods_receipt_pending
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create sequence for document number
CREATE SEQUENCE IF NOT EXISTS goods_receipt_pending_seq START 1;