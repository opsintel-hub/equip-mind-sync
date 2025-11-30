-- Add storage_area column to locations table
ALTER TABLE public.locations
ADD COLUMN storage_area TEXT;

-- Create storage_slots table
CREATE TABLE public.storage_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create sub_storage_slots table
CREATE TABLE public.sub_storage_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  storage_slot_id UUID NOT NULL REFERENCES public.storage_slots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS on storage_slots
ALTER TABLE public.storage_slots ENABLE ROW LEVEL SECURITY;

-- Create policies for storage_slots
CREATE POLICY "All authenticated users can view storage slots"
ON public.storage_slots FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage storage slots"
ON public.storage_slots FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable RLS on sub_storage_slots
ALTER TABLE public.sub_storage_slots ENABLE ROW LEVEL SECURITY;

-- Create policies for sub_storage_slots
CREATE POLICY "All authenticated users can view sub storage slots"
ON public.sub_storage_slots FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage sub storage slots"
ON public.sub_storage_slots FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at triggers
CREATE TRIGGER update_storage_slots_updated_at
BEFORE UPDATE ON public.storage_slots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sub_storage_slots_updated_at
BEFORE UPDATE ON public.sub_storage_slots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();