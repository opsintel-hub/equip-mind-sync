
-- Add created_by tracking to goods_issue_pending
ALTER TABLE public.goods_issue_pending
  ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();

-- 1) advertisements: staff-only SELECT
DROP POLICY IF EXISTS "Auth can view advertisements" ON public.advertisements;
CREATE POLICY "Staff can view advertisements"
  ON public.advertisements FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'warehouse_staff'::app_role)
    OR public.has_role(auth.uid(), 'receiver'::app_role)
    OR public.has_role(auth.uid(), 'requester'::app_role)
  );

-- 2) billboards: drop broad anon SELECT policies; provide SECURITY DEFINER RPCs
DROP POLICY IF EXISTS "Public can view billboards for QR profile" ON public.billboards;
DROP POLICY IF EXISTS "anon_read_billboards_for_ad_issue" ON public.billboards;

CREATE OR REPLACE FUNCTION public.public_get_billboard(_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', b.id,
    'equipment_id', b.equipment_id,
    'old_code', b.old_code,
    'location_name', b.location_name,
    'description', b.description,
    'status', b.status,
    'department', b.department,
    'bkk_upc', b.bkk_upc,
    'media_type', b.media_type,
    'media_class', b.media_class,
    'size', b.size,
    'region', b.region,
    'district', b.district,
    'territory', b.territory,
    'notes', b.notes,
    'updated_at', b.updated_at
  )
  FROM public.billboards b
  WHERE b.id = _id;
$$;

CREATE OR REPLACE FUNCTION public.public_get_billboards_min(_ids uuid[])
RETURNS TABLE(id uuid, equipment_id text, old_code text, location_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id, b.equipment_id, b.old_code, b.location_name
  FROM public.billboards b
  WHERE b.id = ANY(_ids);
$$;

GRANT EXECUTE ON FUNCTION public.public_get_billboard(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_get_billboards_min(uuid[]) TO anon, authenticated;

-- 3) companies: drop overlapping anon SELECT policies
DROP POLICY IF EXISTS "Allow anon read companies for public view" ON public.companies;
DROP POLICY IF EXISTS "Public can view companies for QR profile" ON public.companies;

-- 4) goods_issue_pending_items: requester can only insert into their own pending request
DROP POLICY IF EXISTS "Staff and admins can create goods_issue_pending_items" ON public.goods_issue_pending_items;
CREATE POLICY "Staff and admins can create goods_issue_pending_items"
  ON public.goods_issue_pending_items FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'warehouse_staff'::app_role)
    OR (
      public.has_role(auth.uid(), 'requester'::app_role)
      AND EXISTS (
        SELECT 1 FROM public.goods_issue_pending p
        WHERE p.id = goods_issue_pending_items.pending_id
          AND p.created_by = auth.uid()
      )
    )
  );

-- 5) storage.objects: staff-only INSERT for equipment-images, ad-files, media-player-documents
DROP POLICY IF EXISTS "Authenticated users can upload equipment images" ON storage.objects;
CREATE POLICY "Staff can upload equipment images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'equipment-images'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.has_role(auth.uid(), 'warehouse_staff'::app_role)
      OR public.has_role(auth.uid(), 'receiver'::app_role)
    )
  );

DROP POLICY IF EXISTS "Authenticated users can upload ad files" ON storage.objects;
CREATE POLICY "Staff can upload ad files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ad-files'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.has_role(auth.uid(), 'warehouse_staff'::app_role)
      OR public.has_role(auth.uid(), 'receiver'::app_role)
    )
  );

DROP POLICY IF EXISTS "Auth Upload Docs" ON storage.objects;
CREATE POLICY "Staff can upload media player documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'media-player-documents'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.has_role(auth.uid(), 'warehouse_staff'::app_role)
      OR public.has_role(auth.uid(), 'receiver'::app_role)
    )
  );

-- 6) ad_target_billboards, ad_versions, swap_requests, swap_executions: staff-only SELECT
DROP POLICY IF EXISTS "Staff can view ad_target_billboards" ON public.ad_target_billboards;
CREATE POLICY "Staff can view ad_target_billboards"
  ON public.ad_target_billboards FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'warehouse_staff'::app_role)
    OR public.has_role(auth.uid(), 'receiver'::app_role)
    OR public.has_role(auth.uid(), 'requester'::app_role)
  );

DROP POLICY IF EXISTS "Auth can view ad_versions" ON public.ad_versions;
CREATE POLICY "Staff can view ad_versions"
  ON public.ad_versions FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'warehouse_staff'::app_role)
    OR public.has_role(auth.uid(), 'receiver'::app_role)
    OR public.has_role(auth.uid(), 'requester'::app_role)
  );

DROP POLICY IF EXISTS "Authenticated users can view swap_requests" ON public.swap_requests;
CREATE POLICY "Staff can view swap_requests"
  ON public.swap_requests FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'warehouse_staff'::app_role)
    OR public.has_role(auth.uid(), 'receiver'::app_role)
  );

DROP POLICY IF EXISTS "Authenticated users can view swap_executions" ON public.swap_executions;
CREATE POLICY "Staff can view swap_executions"
  ON public.swap_executions FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'warehouse_staff'::app_role)
    OR public.has_role(auth.uid(), 'receiver'::app_role)
  );
