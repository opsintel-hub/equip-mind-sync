-- Create companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID REFERENCES public.departments(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies
CREATE POLICY "All authenticated users can view companies"
  ON public.companies FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage companies"
  ON public.companies FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add company_id to equipment table
ALTER TABLE public.equipment
ADD COLUMN company_id UUID REFERENCES public.companies(id);

-- Add company_id to goods_receipt_pending
ALTER TABLE public.goods_receipt_pending
ADD COLUMN company_id UUID REFERENCES public.companies(id);

-- Add company_id to goods_issue_pending  
ALTER TABLE public.goods_issue_pending
ADD COLUMN company_id UUID REFERENCES public.companies(id);

-- Add company_id to stock_movements
ALTER TABLE public.stock_movements
ADD COLUMN company_id UUID REFERENCES public.companies(id);

-- Add company_id to goods_receipt
ALTER TABLE public.goods_receipt
ADD COLUMN company_id UUID REFERENCES public.companies(id);

-- Add company_id to goods_issue
ALTER TABLE public.goods_issue
ADD COLUMN company_id UUID REFERENCES public.companies(id);

-- Create trigger for updated_at
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_companies_department_id ON public.companies(department_id);
CREATE INDEX idx_equipment_company_id ON public.equipment(company_id);
CREATE INDEX idx_goods_receipt_pending_company_id ON public.goods_receipt_pending(company_id);
CREATE INDEX idx_goods_issue_pending_company_id ON public.goods_issue_pending(company_id);