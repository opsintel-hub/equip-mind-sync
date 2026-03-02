
-- Add item_condition to equipment table
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS item_condition text NOT NULL DEFAULT 'normal';

-- Add item_condition to media_players table
ALTER TABLE public.media_players ADD COLUMN IF NOT EXISTS item_condition text NOT NULL DEFAULT 'normal';

-- Add item_condition to stock_movements table
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS item_condition text;

-- Add item_condition to billboard_equipment table
ALTER TABLE public.billboard_equipment ADD COLUMN IF NOT EXISTS item_condition text NOT NULL DEFAULT 'normal';

-- Add item_condition to goods_issue_pending table
ALTER TABLE public.goods_issue_pending ADD COLUMN IF NOT EXISTS item_condition text;

-- Create defective_returns table
CREATE TABLE public.defective_returns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_no text NOT NULL DEFAULT ('DR-' || to_char(now(), 'YYYYMMDD') || '-' || lpad((floor(random() * 9999 + 1))::text, 4, '0')),
  equipment_id uuid REFERENCES public.equipment(id),
  media_player_id uuid REFERENCES public.media_players(id),
  is_media_player boolean NOT NULL DEFAULT false,
  quantity integer NOT NULL DEFAULT 1,
  billboard_id uuid REFERENCES public.billboards(id),
  item_condition text NOT NULL DEFAULT 'defective',
  reason text,
  status text NOT NULL DEFAULT 'pending_warehouse_entry',
  source_type text NOT NULL DEFAULT 'warehouse',
  received_at timestamp with time zone,
  received_by uuid,
  receive_location_id uuid REFERENCES public.locations(id),
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.defective_returns ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "All authenticated users can view defective_returns"
  ON public.defective_returns FOR SELECT
  USING (true);

CREATE POLICY "Staff and admins can manage defective_returns"
  ON public.defective_returns FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse_staff'::app_role) OR has_role(auth.uid(), 'receiver'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse_staff'::app_role) OR has_role(auth.uid(), 'receiver'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_defective_returns_updated_at
  BEFORE UPDATE ON public.defective_returns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add defective receipt purpose types to receipt_purposes if not exists
INSERT INTO public.receipt_purposes (name, description, purpose_type, requires_location)
VALUES 
  ('นำเข้าของเสีย/ชำรุด', 'นำสินค้าที่เสียหรือชำรุดเข้าคลัง', 'defective', true),
  ('นำเข้ารอตรวจสอบ', 'นำสินค้าที่รอตรวจสอบสภาพเข้าคลัง', 'inspection', true)
ON CONFLICT DO NOTHING;
