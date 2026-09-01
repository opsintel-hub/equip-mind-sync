-- ============================================================
-- 1) Add columns for 2-tier approval + finance + expired handling
-- ============================================================
ALTER TABLE public.defective_returns
  ADD COLUMN IF NOT EXISTS proposed_method text,
  ADD COLUMN IF NOT EXISTS proposed_by uuid,
  ADD COLUMN IF NOT EXISTS proposed_at timestamptz,
  ADD COLUMN IF NOT EXISTS l1_approved_by uuid,
  ADD COLUMN IF NOT EXISTS l1_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS l1_notes text,
  ADD COLUMN IF NOT EXISTS l2_approved_by uuid,
  ADD COLUMN IF NOT EXISTS l2_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS l2_notes text,
  ADD COLUMN IF NOT EXISTS finance_ack_by uuid,
  ADD COLUMN IF NOT EXISTS finance_ack_at timestamptz,
  ADD COLUMN IF NOT EXISTS finance_ack_notes text,
  ADD COLUMN IF NOT EXISTS disposal_rejected_by uuid,
  ADD COLUMN IF NOT EXISTS disposal_rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS disposal_rejected_reason text,
  ADD COLUMN IF NOT EXISTS unit_price_snapshot numeric(18,2),
  ADD COLUMN IF NOT EXISTS total_value numeric(18,2),
  ADD COLUMN IF NOT EXISTS expiry_date date,
  ADD COLUMN IF NOT EXISTS is_expired boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS still_usable boolean;

-- ============================================================
-- 2) Backfill existing dispose_status into new 2-tier model
-- ============================================================
UPDATE public.defective_returns
  SET dispose_status = 'pending_l1'
  WHERE dispose_status = 'pending_disposal_review';

-- rows already approved/completed stay as-is (treated as fully approved historically)

-- ============================================================
-- 3) Trigger: enforce L1 != L2 and no level-skipping
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_defective_disposal_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- L2 cannot be approved before L1
  IF NEW.l2_approved_by IS NOT NULL AND NEW.l1_approved_by IS NULL THEN
    RAISE EXCEPTION 'ไม่สามารถอนุมัติชั้น 2 ก่อนชั้น 1';
  END IF;

  -- L1 and L2 must not be the same person
  IF NEW.l1_approved_by IS NOT NULL AND NEW.l2_approved_by IS NOT NULL
     AND NEW.l1_approved_by = NEW.l2_approved_by THEN
    RAISE EXCEPTION 'ผู้อนุมัติชั้น 1 และชั้น 2 ต้องไม่ใช่บุคคลเดียวกัน';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_defective_disposal_approval ON public.defective_returns;
CREATE TRIGGER trg_defective_disposal_approval
  BEFORE INSERT OR UPDATE OF l1_approved_by, l2_approved_by ON public.defective_returns
  FOR EACH ROW EXECUTE FUNCTION public.validate_defective_disposal_approval();

GRANT EXECUTE ON FUNCTION public.validate_defective_disposal_approval() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_defective_disposal_approval() TO service_role;

-- ============================================================
-- 4) Recompute total_value snapshot helper
-- ============================================================
CREATE OR REPLACE FUNCTION public.compute_defective_total_value()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.unit_price_snapshot IS NOT NULL AND NEW.quantity IS NOT NULL THEN
    NEW.total_value := NEW.unit_price_snapshot * NEW.quantity;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_defective_total_value ON public.defective_returns;
CREATE TRIGGER trg_defective_total_value
  BEFORE INSERT OR UPDATE OF unit_price_snapshot, quantity ON public.defective_returns
  FOR EACH ROW EXECUTE FUNCTION public.compute_defective_total_value();

GRANT EXECUTE ON FUNCTION public.compute_defective_total_value() TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_defective_total_value() TO service_role;

-- ============================================================
-- 5) Update RLS policies so finance role can read across departments
-- ============================================================
-- Drop existing select policy and recreate to allow finance cross-dept reads.
-- (Assume existing policies follow the standard naming convention.)
DROP POLICY IF EXISTS "defective_returns_select" ON public.defective_returns;
DROP POLICY IF EXISTS "defective_returns_select_scoped" ON public.defective_returns;

CREATE POLICY "defective_returns_select"
  ON public.defective_returns
  FOR SELECT
  TO authenticated
  USING (
    public.has_function_permission(auth.uid(), 'disposal_finance')
    OR created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- ============================================================
-- 6) Insert new function permission seeds + migrate existing manager_approval users
-- ============================================================
INSERT INTO public.user_function_permissions (user_id, function_name, can_access)
SELECT ufp.user_id, 'disposal_approve_l1', true
FROM public.user_function_permissions ufp
WHERE ufp.function_name = 'manager_approval'
  AND ufp.can_access = true
  AND NOT EXISTS (
    SELECT 1 FROM public.user_function_permissions x
    WHERE x.user_id = ufp.user_id AND x.function_name = 'disposal_approve_l1'
  );

-- ============================================================
-- 7) Add accounting preset to permission_templates (if column structure allows)
-- ============================================================
INSERT INTO public.permission_templates
  (template_key, label, description, icon, suggested_roles, suggested_functions,
   default_dept_can_view, default_dept_can_create, default_dept_can_edit, default_dept_can_delete,
   display_order, is_quick_preset, is_active)
SELECT
  'accounting',
  'ฝ่ายบัญชี',
  'ดูและรับทราบมูลค่าตัดจำหน่ายของเสีย ทุกฝ่าย อย่างเดียว',
  'calculator',
  ARRAY['manager']::public.app_role[],
  ARRAY['disposal_finance', 'disposal_report', 'reports']::text[],
  true, false, false, false,
  90, false, true
WHERE NOT EXISTS (SELECT 1 FROM public.permission_templates WHERE template_key = 'accounting');