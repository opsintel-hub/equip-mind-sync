-- Create purchase_requests table for auto-generated PR when stock is low
CREATE TABLE public.purchase_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pr_number TEXT NOT NULL,
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
  equipment_code TEXT NOT NULL,
  equipment_name TEXT NOT NULL,
  current_stock INTEGER NOT NULL,
  min_stock_level INTEGER NOT NULL,
  suggested_quantity INTEGER NOT NULL,
  unit TEXT NOT NULL DEFAULT 'ชิ้น',
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_by UUID,
  rejected_at TIMESTAMP WITH TIME ZONE,
  reject_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sequence for PR number
CREATE SEQUENCE IF NOT EXISTS purchase_request_number_seq START 1;

-- Create function to generate PR number
CREATE OR REPLACE FUNCTION public.generate_pr_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_number TEXT;
BEGIN
  new_number := 'PR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('purchase_request_number_seq')::TEXT, 4, '0');
  RETURN new_number;
END;
$$;

-- Add trigger for auto PR number
CREATE OR REPLACE FUNCTION public.set_pr_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.pr_number IS NULL OR NEW.pr_number = '' THEN
    NEW.pr_number := generate_pr_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_purchase_request_number
BEFORE INSERT ON public.purchase_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_pr_number();

-- Add updated_at trigger
CREATE TRIGGER update_purchase_requests_updated_at
BEFORE UPDATE ON public.purchase_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "All authenticated users can view purchase requests"
ON public.purchase_requests
FOR SELECT
USING (true);

CREATE POLICY "Admins and staff can manage purchase requests"
ON public.purchase_requests
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'warehouse_staff'));

-- Add columns to goods_issue_pending for partial issue tracking
ALTER TABLE public.goods_issue_pending
ADD COLUMN IF NOT EXISTS remaining_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS partial_issue_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_partial_issue_at TIMESTAMP WITH TIME ZONE;

-- Create function to auto-generate PR when stock is low after goods issue
CREATE OR REPLACE FUNCTION public.check_and_create_pr()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  eq_record RECORD;
  existing_pr_count INTEGER;
  suggested_qty INTEGER;
BEGIN
  -- Get equipment details
  SELECT id, code, name, quantity_in_stock, min_stock_level, unit
  INTO eq_record
  FROM public.equipment
  WHERE id = NEW.equipment_id;
  
  -- Check if stock is below minimum
  IF eq_record.quantity_in_stock IS NOT NULL 
     AND eq_record.min_stock_level IS NOT NULL 
     AND eq_record.quantity_in_stock <= eq_record.min_stock_level THEN
    
    -- Check if there's already a pending PR for this equipment
    SELECT COUNT(*) INTO existing_pr_count
    FROM public.purchase_requests
    WHERE equipment_id = eq_record.id AND status = 'pending';
    
    -- Only create PR if no pending PR exists
    IF existing_pr_count = 0 THEN
      -- Calculate suggested quantity (2x min stock level - current stock)
      suggested_qty := (eq_record.min_stock_level * 2) - eq_record.quantity_in_stock;
      IF suggested_qty < eq_record.min_stock_level THEN
        suggested_qty := eq_record.min_stock_level;
      END IF;
      
      INSERT INTO public.purchase_requests (
        pr_number,
        equipment_id,
        equipment_code,
        equipment_name,
        current_stock,
        min_stock_level,
        suggested_quantity,
        unit,
        reason,
        status
      ) VALUES (
        generate_pr_number(),
        eq_record.id,
        eq_record.code,
        eq_record.name,
        eq_record.quantity_in_stock,
        eq_record.min_stock_level,
        suggested_qty,
        COALESCE(eq_record.unit, 'ชิ้น'),
        'สต็อกต่ำกว่าจุดสั่งซื้อ (Auto-generated)',
        'pending'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on goods_issue to check stock after issue
CREATE TRIGGER check_stock_after_issue
AFTER INSERT ON public.goods_issue
FOR EACH ROW
EXECUTE FUNCTION public.check_and_create_pr();