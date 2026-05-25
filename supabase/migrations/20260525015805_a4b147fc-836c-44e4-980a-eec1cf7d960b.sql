
-- 1. Tool PM tasks & images: restrict to authenticated
DROP POLICY IF EXISTS "All authenticated users can manage tool_pm_tasks" ON public.tool_pm_tasks;
DROP POLICY IF EXISTS "All authenticated users can view tool_pm_tasks" ON public.tool_pm_tasks;
CREATE POLICY "Authenticated users can manage tool_pm_tasks"
  ON public.tool_pm_tasks FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "All authenticated users can manage tool_pm_task_images" ON public.tool_pm_task_images;
DROP POLICY IF EXISTS "All authenticated users can view tool_pm_task_images" ON public.tool_pm_task_images;
CREATE POLICY "Authenticated users can manage tool_pm_task_images"
  ON public.tool_pm_task_images FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Ad issue requests: drop unsafe anon policies, replace with token-validated SECURITY DEFINER RPCs
DROP POLICY IF EXISTS "anon_confirm_ad_issue" ON public.ad_issue_requests;
DROP POLICY IF EXISTS "anon_read_ad_issue_by_token" ON public.ad_issue_requests;
DROP POLICY IF EXISTS "anon_read_advertisements_for_contractor" ON public.advertisements;

CREATE OR REPLACE FUNCTION public.public_get_ad_issue_request(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF _token IS NULL THEN RETURN NULL; END IF;
  SELECT to_jsonb(r) || jsonb_build_object(
    'advertisement', (
      SELECT to_jsonb(a) || jsonb_build_object(
        'ad_versions', COALESCE((SELECT jsonb_agg(to_jsonb(v)) FROM public.ad_versions v WHERE v.advertisement_id = a.id), '[]'::jsonb),
        'ad_media_type', (SELECT to_jsonb(m) FROM public.ad_media_types m WHERE m.id = a.ad_media_type_id),
        'ad_size', (SELECT to_jsonb(s) FROM public.ad_sizes s WHERE s.id = a.ad_size_id)
      )
      FROM public.advertisements a WHERE a.id = r.advertisement_id
    ),
    'target_billboard', (SELECT to_jsonb(b) FROM public.billboards b WHERE b.id = r.target_billboard_id)
  )
  INTO result
  FROM public.ad_issue_requests r
  WHERE r.confirmation_token = _token
  LIMIT 1;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.public_get_ad_issue_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_get_ad_issue_request(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_confirm_ad_issue_request(_token uuid, _receiver_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ad_id uuid;
BEGIN
  IF _token IS NULL OR coalesce(btrim(_receiver_name),'') = '' THEN
    RAISE EXCEPTION 'invalid_arguments';
  END IF;
  UPDATE public.ad_issue_requests
     SET status = 'completed',
         confirmed_at = now(),
         confirmed_by_name = btrim(_receiver_name),
         received_at = now(),
         updated_at = now()
   WHERE confirmation_token = _token
   RETURNING advertisement_id INTO v_ad_id;
  IF v_ad_id IS NULL THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  UPDATE public.advertisements
     SET status = 'installed', updated_at = now()
   WHERE id = v_ad_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.public_confirm_ad_issue_request(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_confirm_ad_issue_request(uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_report_ad_issue(_token uuid, _reporter_name text, _report_type text, _report_description text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _token IS NULL OR coalesce(btrim(_reporter_name),'') = '' OR coalesce(btrim(_report_type),'') = '' THEN
    RAISE EXCEPTION 'invalid_arguments';
  END IF;
  UPDATE public.ad_issue_requests
     SET issue_report_type = btrim(_report_type),
         issue_report_description = NULLIF(btrim(coalesce(_report_description,'')), ''),
         confirmed_by_name = btrim(_reporter_name),
         confirmed_at = now(),
         updated_at = now()
   WHERE confirmation_token = _token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.public_report_ad_issue(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_report_ad_issue(uuid, text, text, text) TO anon, authenticated;

-- 3. Suppliers: keep public anon read only for name/code; revoke sensitive columns from anon
REVOKE SELECT ON public.suppliers FROM anon;
GRANT SELECT (id, code, name, is_active, created_at, updated_at) ON public.suppliers TO anon;
