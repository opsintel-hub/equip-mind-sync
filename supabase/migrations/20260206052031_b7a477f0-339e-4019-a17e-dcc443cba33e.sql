-- สร้างตาราง junction สำหรับผูกวัตถุประสงค์กับหมวดหมู่
CREATE TABLE public.issue_purpose_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_purpose_id UUID NOT NULL REFERENCES public.issue_purposes(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(issue_purpose_id, category_id)
);

-- เพิ่มคอลัมน์ allow_all_categories ในตาราง issue_purposes
ALTER TABLE public.issue_purposes 
ADD COLUMN allow_all_categories BOOLEAN NOT NULL DEFAULT false;

-- Enable RLS
ALTER TABLE public.issue_purpose_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for issue_purpose_categories
CREATE POLICY "All authenticated users can view issue_purpose_categories" 
ON public.issue_purpose_categories 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Staff and admins can manage issue_purpose_categories" 
ON public.issue_purpose_categories 
FOR ALL 
TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse_staff'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse_staff'::app_role));