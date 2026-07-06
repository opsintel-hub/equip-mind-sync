
-- Restrict equipment_pm_history INSERT to staff/admin roles
DROP POLICY IF EXISTS "Users can create equipment_pm_history" ON public.equipment_pm_history;
CREATE POLICY "Staff and admins can create equipment_pm_history"
ON public.equipment_pm_history
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'warehouse_staff')
  OR public.has_role(auth.uid(), 'manager')
);

-- Restrict goods_issue_pending INSERT to appropriate roles
DROP POLICY IF EXISTS "Authenticated users can create issue requests" ON public.goods_issue_pending;
CREATE POLICY "Requesters and staff can create issue requests"
ON public.goods_issue_pending
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'warehouse_staff')
  OR public.has_role(auth.uid(), 'manager')
  OR public.has_role(auth.uid(), 'requester')
);

-- Restrict media_player_images write operations to staff/admin (align with equipment_images)
DROP POLICY IF EXISTS "Authenticated users can insert media player images" ON public.media_player_images;
DROP POLICY IF EXISTS "Authenticated users can update media player images" ON public.media_player_images;
DROP POLICY IF EXISTS "Authenticated users can delete media player images" ON public.media_player_images;

CREATE POLICY "Staff and admins can insert media player images"
ON public.media_player_images
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'warehouse_staff')
);

CREATE POLICY "Staff and admins can update media player images"
ON public.media_player_images
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'warehouse_staff')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'warehouse_staff')
);

CREATE POLICY "Staff and admins can delete media player images"
ON public.media_player_images
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'warehouse_staff')
);
