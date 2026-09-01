CREATE TABLE public.activity_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL,
  entity_table text NOT NULL,
  entity_id uuid,
  doc_number text,
  action text NOT NULL,
  actor_id uuid,
  actor_name text,
  actor_roles text[] NOT NULL DEFAULT '{}',
  is_super_admin_action boolean NOT NULL DEFAULT false,
  department text,
  status_before text,
  status_after text,
  changed_fields jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.activity_audit TO authenticated;
GRANT ALL ON public.activity_audit TO service_role;

ALTER TABLE public.activity_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit viewers can read activity audit"
ON public.activity_audit FOR SELECT TO authenticated
USING (public.has_function_permission(auth.uid(), 'activity_audit_view'));

CREATE INDEX idx_activity_audit_module_created ON public.activity_audit (module, created_at DESC);
CREATE INDEX idx_activity_audit_entity ON public.activity_audit (entity_table, entity_id);
CREATE INDEX idx_activity_audit_actor ON public.activity_audit (actor_id);
CREATE INDEX idx_activity_audit_doc ON public.activity_audit (doc_number);

CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_new jsonb;
  v_old jsonb;
  v_action text;
  v_changed jsonb;
  v_roles text[];
  v_name text;
  v_notes text;
  v_status_new text;
  v_status_old text;
  v_doc text;
  v_dept text;
  v_module text := TG_ARGV[0];
  v_mode text := COALESCE(TG_ARGV[1], 'full');
  v_entity uuid;
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
    actor_id, actor_name, actor_roles, is_super_admin_action,
    department, status_before, status_after, changed_fields, notes
  ) VALUES (
    v_module, TG_TABLE_NAME, v_entity, v_doc, v_action,
    v_actor, v_name, COALESCE(v_roles, '{}'),
    COALESCE('super_admin' = ANY(COALESCE(v_roles, '{}')), false),
    v_dept, v_status_old, v_status_new, v_changed, v_notes
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.log_activity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_activity() FROM anon, authenticated;

CREATE TRIGGER trg_audit_goods_issue_pending
AFTER INSERT OR UPDATE ON public.goods_issue_pending
FOR EACH ROW EXECUTE FUNCTION public.log_activity('goods_issue');

CREATE TRIGGER trg_audit_goods_issue_pending_items
AFTER UPDATE ON public.goods_issue_pending_items
FOR EACH ROW EXECUTE FUNCTION public.log_activity('goods_issue', 'status_only');

CREATE TRIGGER trg_audit_goods_receipt_pending
AFTER INSERT OR UPDATE ON public.goods_receipt_pending
FOR EACH ROW EXECUTE FUNCTION public.log_activity('goods_receipt', 'status_only');

CREATE TRIGGER trg_audit_swap_requests
AFTER INSERT OR UPDATE ON public.swap_requests
FOR EACH ROW EXECUTE FUNCTION public.log_activity('swap');

CREATE TRIGGER trg_audit_assessment_logs
AFTER INSERT OR UPDATE ON public.assessment_logs
FOR EACH ROW EXECUTE FUNCTION public.log_activity('assessment');

CREATE TRIGGER trg_audit_claim_records
AFTER INSERT OR UPDATE ON public.claim_records
FOR EACH ROW EXECUTE FUNCTION public.log_activity('claim');

CREATE TRIGGER trg_audit_equipment_loans
AFTER INSERT OR UPDATE ON public.equipment_loans
FOR EACH ROW EXECUTE FUNCTION public.log_activity('loan');

CREATE TRIGGER trg_audit_direct_shipments
AFTER INSERT OR UPDATE ON public.direct_shipments
FOR EACH ROW EXECUTE FUNCTION public.log_activity('direct_shipment');

CREATE TRIGGER trg_audit_purchase_requests
AFTER INSERT OR UPDATE ON public.purchase_requests
FOR EACH ROW EXECUTE FUNCTION public.log_activity('purchase_request');

CREATE TRIGGER trg_audit_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.log_activity('permission');

CREATE TRIGGER trg_audit_user_function_permissions
AFTER INSERT OR UPDATE OR DELETE ON public.user_function_permissions
FOR EACH ROW EXECUTE FUNCTION public.log_activity('permission');

CREATE TRIGGER trg_audit_user_departments
AFTER INSERT OR UPDATE OR DELETE ON public.user_departments
FOR EACH ROW EXECUTE FUNCTION public.log_activity('permission');

CREATE TRIGGER trg_audit_user_sections
AFTER INSERT OR UPDATE OR DELETE ON public.user_sections
FOR EACH ROW EXECUTE FUNCTION public.log_activity('permission');