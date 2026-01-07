-- Create issue_purposes table for dropdown options
CREATE TABLE public.issue_purposes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  requires_billboard BOOLEAN NOT NULL DEFAULT false,
  requires_return BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.issue_purposes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "All authenticated users can view issue purposes"
ON public.issue_purposes FOR SELECT USING (true);

CREATE POLICY "Admins can manage issue purposes"
ON public.issue_purposes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default purposes
INSERT INTO public.issue_purposes (name, description, requires_billboard, requires_return) VALUES
('ซ่อมป้ายโฆษณา', 'เบิกอะไหล่เพื่อซ่อมแซมป้ายโฆษณา', true, false),
('เคลมผู้จัดจำหน่าย', 'เบิกอะไหล่เพื่อนำไปเคลมกับผู้จัดจำหน่าย', false, true),
('ใช้งานทั่วไป', 'เบิกเพื่อใช้งานทั่วไป', false, false),
('สูญหาย/เสียหาย', 'ตัดออกจากระบบเนื่องจากสูญหายหรือเสียหาย', false, false);

-- Add purpose_id and completion tracking to goods_issue_pending
ALTER TABLE public.goods_issue_pending
ADD COLUMN purpose_id UUID REFERENCES public.issue_purposes(id),
ADD COLUMN billboard_id UUID,
ADD COLUMN is_complete BOOLEAN DEFAULT false,
ADD COLUMN return_quantity INTEGER,
ADD COLUMN returned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN returned_by UUID;

-- Create trigger for updated_at
CREATE TRIGGER update_issue_purposes_updated_at
BEFORE UPDATE ON public.issue_purposes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();