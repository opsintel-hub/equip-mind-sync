-- Drop existing billboards table and recreate with new schema matching Excel data
DROP TABLE IF EXISTS public.billboard_equipment;
DROP TABLE IF EXISTS public.billboards;

-- Create billboards table with new schema
CREATE TABLE public.billboards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id TEXT NOT NULL UNIQUE, -- EquipmentID from Excel (e.g., A05005-CNX-DPL01)
  description TEXT, -- Description
  department TEXT, -- Department (e.g., Airport Media)
  media_class TEXT, -- MediaClass
  media_segment TEXT, -- MediaSegment
  region TEXT, -- Region
  district TEXT, -- District
  territory TEXT, -- Territory
  media_type TEXT, -- MediaType
  location_name TEXT, -- Location
  old_code TEXT, -- OldCode
  extra_1 TEXT, -- Extra_1
  extra_2 TEXT, -- Extra_2
  extra_3 TEXT, -- Extra_3
  target_monitoring TEXT, -- TargetMonitoring
  bkk_upc TEXT, -- BKKUPC
  route_monitoring TEXT, -- RouteMonitoring
  route_install_demolish TEXT, -- RouteInstallAndDemolish
  route_report_photo TEXT, -- RouteReportPhoto
  route_pm TEXT, -- RoutePM
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.billboards ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "All authenticated users can view billboards" 
ON public.billboards 
FOR SELECT 
USING (true);

CREATE POLICY "Staff and admins can manage billboards" 
ON public.billboards 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse_staff'::app_role));

-- Create updated_at trigger
CREATE TRIGGER update_billboards_updated_at
BEFORE UPDATE ON public.billboards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Recreate billboard_equipment table
CREATE TABLE public.billboard_equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  billboard_id UUID NOT NULL REFERENCES public.billboards(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  installation_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.billboard_equipment ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "All authenticated users can view billboard equipment" 
ON public.billboard_equipment 
FOR SELECT 
USING (true);

CREATE POLICY "Staff and admins can manage billboard equipment" 
ON public.billboard_equipment 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse_staff'::app_role));