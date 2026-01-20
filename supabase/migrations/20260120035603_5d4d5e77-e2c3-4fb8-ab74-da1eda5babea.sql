-- Create contractors table (similar to suppliers with additional fields)
CREATE TABLE public.contractors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  entity_type VARCHAR(50) NOT NULL DEFAULT 'corporate', -- 'corporate' or 'individual'
  tax_id VARCHAR(20), -- เลขประจำตัวผู้เสียภาษี / เลขบัตรประชาชน
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to view contractors"
  ON public.contractors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert contractors"
  ON public.contractors FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update contractors"
  ON public.contractors FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete contractors"
  ON public.contractors FOR DELETE
  TO authenticated
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_contractors_updated_at
  BEFORE UPDATE ON public.contractors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();