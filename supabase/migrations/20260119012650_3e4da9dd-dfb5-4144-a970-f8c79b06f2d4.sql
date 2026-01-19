-- Create table for equipment code prefixes
CREATE TABLE public.equipment_code_prefixes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prefix VARCHAR(7) NOT NULL UNIQUE,
  description TEXT,
  next_number INT NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.equipment_code_prefixes ENABLE ROW LEVEL SECURITY;

-- Create policies for read access
CREATE POLICY "Allow authenticated users to read equipment code prefixes"
ON public.equipment_code_prefixes
FOR SELECT
TO authenticated
USING (true);

-- Create policies for insert
CREATE POLICY "Allow authenticated users to insert equipment code prefixes"
ON public.equipment_code_prefixes
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create policies for update
CREATE POLICY "Allow authenticated users to update equipment code prefixes"
ON public.equipment_code_prefixes
FOR UPDATE
TO authenticated
USING (true);

-- Create policies for delete
CREATE POLICY "Allow authenticated users to delete equipment code prefixes"
ON public.equipment_code_prefixes
FOR DELETE
TO authenticated
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_equipment_code_prefixes_updated_at
BEFORE UPDATE ON public.equipment_code_prefixes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate next equipment code
CREATE OR REPLACE FUNCTION public.get_next_equipment_code(p_prefix VARCHAR)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_number INT;
  v_code TEXT;
BEGIN
  -- Get and increment the next number
  UPDATE public.equipment_code_prefixes
  SET next_number = next_number + 1
  WHERE prefix = p_prefix
  RETURNING next_number - 1 INTO v_next_number;
  
  IF v_next_number IS NULL THEN
    RAISE EXCEPTION 'Prefix not found: %', p_prefix;
  END IF;
  
  -- Generate the code with 4-digit running number
  v_code := p_prefix || ' ' || LPAD(v_next_number::TEXT, 4, '0');
  
  RETURN v_code;
END;
$$;