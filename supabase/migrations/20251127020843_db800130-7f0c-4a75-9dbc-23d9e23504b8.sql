-- Create low_stock_alerts table
CREATE TABLE public.low_stock_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  equipment_name TEXT NOT NULL,
  equipment_code TEXT NOT NULL,
  current_stock INTEGER NOT NULL,
  min_stock_level INTEGER NOT NULL,
  alert_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.low_stock_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view alerts for departments they have permission to view
CREATE POLICY "Users can view alerts for their departments"
ON public.low_stock_alerts
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_department_permission(auth.uid(), department, 'view')
);

-- Policy: Staff and admins can resolve alerts
CREATE POLICY "Staff and admins can update alerts"
ON public.low_stock_alerts
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'warehouse_staff'::app_role)
);

-- Create index for better performance
CREATE INDEX idx_low_stock_alerts_equipment ON public.low_stock_alerts(equipment_id);
CREATE INDEX idx_low_stock_alerts_department ON public.low_stock_alerts(department);
CREATE INDEX idx_low_stock_alerts_resolved ON public.low_stock_alerts(is_resolved);