CREATE TABLE public.defective_disposal_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  defective_return_id uuid NOT NULL REFERENCES public.defective_returns(id) ON DELETE CASCADE,
  actor_id uuid,
  action text NOT NULL,
  from_status text,
  to_status text,
  disposal_method text,
  notes text,
  is_super_admin_action boolean NOT NULL DEFAULT false,
  is_self_approval boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dda_return ON public.defective_disposal_audit(defective_return_id);
CREATE INDEX idx_dda_created ON public.defective_disposal_audit(created_at DESC);

GRANT SELECT ON public.defective_disposal_audit TO authenticated;
GRANT ALL ON public.defective_disposal_audit TO service_role;

ALTER TABLE public.defective_disposal_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Disposal audit readable by approvers and auditors"
ON public.defective_disposal_audit
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_function_permission(auth.uid(), 'disposal_audit_view')
  OR public.has_function_permission(auth.uid(), 'disposal_approve_l1')
  OR public.has_function_permission(auth.uid(), 'disposal_approve_l2')
  OR public.has_function_permission(auth.uid(), 'disposal_finance')
  OR public.has_function_permission(auth.uid(), 'disposal_report')
);

CREATE OR REPLACE FUNCTION public.log_defective_disposal_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_action text;
  v_notes text;
  v_self boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_notes := NEW.disposal_notes;
  ELSE
    IF NEW.dispose_status IS DISTINCT FROM OLD.dispose_status THEN
      v_action := CASE NEW.dispose_status
        WHEN 'l1_approved' THEN 'l1_approved'
        WHEN 'approved' THEN 'l2_approved'
        WHEN 'rejected' THEN 'rejected'
        WHEN 'completed' THEN 'completed'
        WHEN 'disposed' THEN 'completed'
        ELSE 'status_changed'
      END;
      v_notes := COALESCE(NEW.l2_notes, NEW.l1_notes, NEW.disposal_rejected_reason, NEW.disposal_notes);
    ELSIF NEW.finance_ack_by IS DISTINCT FROM OLD.finance_ack_by AND NEW.finance_ack_by IS NOT NULL THEN
      v_action := 'finance_ack';
      v_notes := NEW.finance_ack_notes;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  IF v_actor IS NOT NULL THEN
    v_self := (
      (NEW.l1_approved_by IS NOT NULL AND NEW.l2_approved_by IS NOT NULL AND NEW.l1_approved_by = NEW.l2_approved_by)
      OR (NEW.l1_approved_by IS NOT NULL AND NEW.finance_ack_by IS NOT NULL AND NEW.l1_approved_by = NEW.finance_ack_by)
      OR (NEW.l2_approved_by IS NOT NULL AND NEW.finance_ack_by IS NOT NULL AND NEW.l2_approved_by = NEW.finance_ack_by)
    );
  END IF;

  INSERT INTO public.defective_disposal_audit (
    defective_return_id, actor_id, action, from_status, to_status,
    disposal_method, notes, is_super_admin_action, is_self_approval
  ) VALUES (
    NEW.id,
    v_actor,
    v_action,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.dispose_status ELSE NULL END,
    NEW.dispose_status,
    NEW.disposal_method,
    v_notes,
    COALESCE(v_actor IS NOT NULL AND public.has_role(v_actor, 'super_admin'), false),
    v_self
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_defective_disposal_change
AFTER INSERT OR UPDATE ON public.defective_returns
FOR EACH ROW EXECUTE FUNCTION public.log_defective_disposal_change();