-- Create brands table
CREATE TABLE public.brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for brands
CREATE POLICY "Brands are viewable by authenticated users" 
ON public.brands 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Brands can be created by authenticated users" 
ON public.brands 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Brands can be updated by authenticated users" 
ON public.brands 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Brands can be deleted by authenticated users" 
ON public.brands 
FOR DELETE 
TO authenticated
USING (true);

-- Add brand column to equipment table
ALTER TABLE public.equipment ADD COLUMN brand TEXT;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_brands_updated_at
BEFORE UPDATE ON public.brands
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();