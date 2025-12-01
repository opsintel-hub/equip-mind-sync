-- Update RLS policies for locations to allow warehouse staff
DROP POLICY IF EXISTS "Admins can manage locations" ON public.locations;

CREATE POLICY "Admins and staff can manage locations"
ON public.locations
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'warehouse_staff'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'warehouse_staff'::app_role)
);

-- Update RLS policies for storage_slots to allow warehouse staff
DROP POLICY IF EXISTS "Admins can manage storage slots" ON public.storage_slots;

CREATE POLICY "Admins and staff can manage storage slots"
ON public.storage_slots
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'warehouse_staff'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'warehouse_staff'::app_role)
);

-- Update RLS policies for sub_storage_slots to allow warehouse staff
DROP POLICY IF EXISTS "Admins can manage sub storage slots" ON public.sub_storage_slots;

CREATE POLICY "Admins and staff can manage sub storage slots"
ON public.sub_storage_slots
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'warehouse_staff'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'warehouse_staff'::app_role)
);