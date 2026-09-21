
ALTER TABLE public.activity_audit
  ADD COLUMN IF NOT EXISTS actor_email text,
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text;

CREATE INDEX IF NOT EXISTS idx_activity_audit_created_at ON public.activity_audit (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_audit_department ON public.activity_audit (department);

CREATE OR REPLACE FUNCTION public.log_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_new jsonb;
  v_old jsonb;
  v_action text;
  v_changed jsonb;
  v_roles text[];
  v_name text;
  v_email text;
  v_notes text;
  v_status_new text;
  v_status_old text;
  v_doc text;
  v_dept text;
  v_module text := TG_ARGV[0];
  v_mode text := COALESCE(TG_ARGV[1], 'full');
  v_entity uuid;
  v_headers jsonb;
  v_ip text;
  v_ua text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_new := to_jsonb(OLD);
    v_action := 'deleted';
  ELSE
    v_new := to_jsonb(NEW);
    IF TG_OP = 'UPDATE' THEN
      v_old := to_jsonb(OLD);
    END IF;
  END IF;

  v_status_new := v_new->>'status';
  v_status_old := v_old->>'status';
  v_dept := v_new->>'department';
  v_doc := COALESCE(
    v_new->>'document_no',
    v_new->>'pr_number',
    v_new->>'loan_number',
    v_new->>'request_number'
  );
  BEGIN
    v_entity := (v_new->>'id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_entity := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF v_status_new IS DISTINCT FROM v_status_old THEN
      v_action := CASE v_status_new
        WHEN 'approved' THEN 'approved'
        WHEN 'rejected' THEN 'rejected'
        WHEN 'cancelled' THEN 'cancelled'
        WHEN 'completed' THEN 'completed'
        WHEN 'issued' THEN 'issued'
        WHEN 'returned' THEN 'returned'
        WHEN 'received' THEN 'received'
        ELSE 'status_changed'
      END;
    ELSE
      v_action := 'updated';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT jsonb_object_agg(e.key, jsonb_build_object('from', v_old->e.key, 'to', v_new->e.key))
      INTO v_changed
      FROM jsonb_each(v_new) e
     WHERE (v_old->e.key) IS DISTINCT FROM (v_new->e.key)
       AND e.key NOT IN ('updated_at');
    IF v_changed IS NULL THEN
      RETURN NEW;
    END IF;
    IF v_mode = 'status_only' AND v_status_new IS NOT DISTINCT FROM v_status_old THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT array_agg(role::text) INTO v_roles FROM public.user_roles WHERE user_id = v_actor;
  SELECT COALESCE(NULLIF(display_name, ''), full_name) INTO v_name FROM public.profiles WHERE id = v_actor;
  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = v_actor;

  BEGIN
    v_headers := current_setting('request.headers', true)::jsonb;
  EXCEPTION WHEN OTHERS THEN
    v_headers := NULL;
  END;
  v_ip := COALESCE(
    split_part(v_headers->>'x-forwarded-for', ',', 1),
    v_headers->>'cf-connecting-ip',
    v_headers->>'x-real-ip'
  );
  v_ua := v_headers->>'user-agent';

  IF v_module = 'permission' THEN
    SELECT COALESCE(NULLIF(p.display_name, ''), p.full_name)
      INTO v_doc
      FROM public.profiles p
     WHERE p.id = (v_new->>'user_id')::uuid;
    v_notes := concat_ws(' | ',
      NULLIF(v_new->>'role', ''),
      NULLIF(v_new->>'function_name', ''),
      NULLIF(v_new->>'department', ''),
      NULLIF(v_new->>'section_id', '')
    );
    v_dept := v_new->>'department';
  END IF;

  INSERT INTO public.activity_audit (
    module, entity_table, entity_id, doc_number, action,
    actor_id, actor_name, actor_email, actor_roles, is_super_admin_action,
    department, status_before, status_after, changed_fields, notes,
    ip_address, user_agent
  ) VALUES (
    v_module, TG_TABLE_NAME, v_entity, v_doc, v_action,
    v_actor, v_name, v_email, COALESCE(v_roles, '{}'),
    COALESCE('super_admin' = ANY(COALESCE(v_roles, '{}')), false),
    v_dept, v_status_old, v_status_new, v_changed, v_notes,
    NULLIF(v_ip, ''), NULLIF(v_ua, '')
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

-- Strict read-only, department-scoped access
DROP POLICY IF EXISTS "Audit viewers can read activity audit" ON public.activity_audit;

CREATE POLICY "Audit viewers read scoped activity audit"
ON public.activity_audit
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR (
    public.has_function_permission(auth.uid(), 'activity_audit_view')
    AND (
      department IS NULL
      OR EXISTS (
        SELECT 1 FROM public.user_departments ud
        WHERE ud.user_id = auth.uid()
          AND ud.department = activity_audit.department
      )
    )
  )
);

REVOKE INSERT, UPDATE, DELETE ON public.activity_audit FROM authenticated, anon;
GRANT SELECT ON public.activity_audit TO authenticated;
GRANT ALL ON public.activity_audit TO service_role;

-- 120-day retention auto purge
CREATE OR REPLACE FUNCTION public.purge_old_activity_audit()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_deleted integer;
BEGIN
  DELETE FROM public.activity_audit WHERE created_at < now() - interval '120 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_old_activity_audit() FROM public, anon, authenticated;

SELECT cron.unschedule('purge-activity-audit-120d')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-activity-audit-120d');

SELECT cron.schedule('purge-activity-audit-120d', '0 3 * * *', $$SELECT public.purge_old_activity_audit();$$);
