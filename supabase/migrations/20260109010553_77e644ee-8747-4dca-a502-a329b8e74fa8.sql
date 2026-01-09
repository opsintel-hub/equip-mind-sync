-- Create equipment loans table for cross-company borrowing
CREATE TABLE public.equipment_loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID REFERENCES public.equipment(id),
  from_company_id UUID NOT NULL REFERENCES public.companies(id),
  to_company_id UUID NOT NULL REFERENCES public.companies(id),
  quantity INTEGER NOT NULL,
  loan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  return_date DATE,
  returned_quantity INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  requester_name TEXT NOT NULL,
  requester_phone TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  returned_by UUID,
  notes TEXT,
  return_notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_different_companies CHECK (from_company_id != to_company_id),
  CONSTRAINT check_quantity_positive CHECK (quantity > 0),
  CONSTRAINT check_returned_quantity CHECK (returned_quantity >= 0 AND returned_quantity <= quantity)
);

-- Enable RLS
ALTER TABLE public.equipment_loans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "All authenticated users can view loans"
  ON public.equipment_loans FOR SELECT
  USING (true);

CREATE POLICY "Staff and admins can create loans"
  ON public.equipment_loans FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse_staff'::app_role));

CREATE POLICY "Staff and admins can update loans"
  ON public.equipment_loans FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse_staff'::app_role));

CREATE POLICY "Only admins can delete loans"
  ON public.equipment_loans FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_equipment_loans_updated_at
  BEFORE UPDATE ON public.equipment_loans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();