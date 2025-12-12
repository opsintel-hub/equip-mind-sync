-- Create table for tracking equipment uninstall history from billboards
CREATE TABLE public.billboard_equipment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  billboard_id UUID NOT NULL,
  equipment_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  installation_date DATE,
  uninstall_date DATE NOT NULL DEFAULT CURRENT_DATE,
  installed_by UUID,
  uninstalled_by UUID,
  installation_notes TEXT,
  uninstall_reason TEXT,
  return_to_stock BOOLEAN DEFAULT false,
  return_location_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.billboard_equipment_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "All authenticated users can view equipment history" 
ON public.billboard_equipment_history 
FOR SELECT 
USING (true);

CREATE POLICY "Staff and admins can manage equipment history" 
ON public.billboard_equipment_history 
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse_staff'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_billboard_equipment_history_billboard_id ON public.billboard_equipment_history(billboard_id);
CREATE INDEX idx_billboard_equipment_history_equipment_id ON public.billboard_equipment_history(equipment_id);