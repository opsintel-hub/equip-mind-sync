
-- 1) Add is_quick_preset flag
ALTER TABLE public.permission_templates
  ADD COLUMN IF NOT EXISTS is_quick_preset boolean NOT NULL DEFAULT true;

-- 2) Remove admin bypass from department permission check (super_admin only)
CREATE OR REPLACE FUNCTION public.has_department_permission(_user_id uuid, _department text, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    CASE
      WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin') THEN true
      ELSE
        CASE _permission
          WHEN 'view' THEN COALESCE((SELECT can_view FROM public.user_departments WHERE user_id = _user_id AND department = _department), false)
          WHEN 'create' THEN COALESCE((SELECT can_create FROM public.user_departments WHERE user_id = _user_id AND department = _department), false)
          WHEN 'edit' THEN COALESCE((SELECT can_edit FROM public.user_departments WHERE user_id = _user_id AND department = _department), false)
          WHEN 'delete' THEN COALESCE((SELECT can_delete FROM public.user_departments WHERE user_id = _user_id AND department = _department), false)
          ELSE false
        END
    END;
$function$;

-- 3) Guard: prevent removing the last super_admin
CREATE OR REPLACE FUNCTION public.prevent_removing_last_super_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_remaining int;
BEGIN
  IF TG_OP = 'DELETE' AND OLD.role = 'super_admin' THEN
    SELECT count(*) INTO v_remaining
    FROM public.user_roles
    WHERE role = 'super_admin' AND user_id <> OLD.user_id;
    IF v_remaining = 0 THEN
      RAISE EXCEPTION 'ไม่สามารถลบ Super Admin คนสุดท้ายในระบบได้';
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_last_super_admin ON public.user_roles;
CREATE TRIGGER trg_prevent_last_super_admin
BEFORE DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.prevent_removing_last_super_admin();

-- 4) Reset presets: deactivate old ones (keep rows for history) and upsert the new 6 presets
UPDATE public.permission_templates SET is_active = false, is_quick_preset = false;

-- Super Admin
INSERT INTO public.permission_templates (
  template_key, label, description, icon,
  suggested_roles, suggested_functions,
  default_dept_can_view, default_dept_can_create, default_dept_can_edit, default_dept_can_delete,
  display_order, is_active, is_quick_preset
) VALUES (
  'super_admin',
  'ผู้ดูแลระบบสูงสุด',
  'สิทธิ์เต็มระบบ จัดการทุกเมนู ทุกฝ่าย รวมตั้งค่าระบบและข้อมูลหลัก',
  'ShieldCheck',
  ARRAY['super_admin']::app_role[],
  ARRAY[
    'delivery_entry','goods_receipt','issue_request','goods_issue','master_data','reports',
    'billboards','pm_schedule','equipment_pm','transfer','ad_entry','ad_issue_request','ad_warehouse',
    'admin','delivery_confirm','manager_approval','direct_shipping_request','direct_shipping_approval',
    'direct_shipping_procurement','swap_request_create','swap_request_manage','assessment_create',
    'assessment_view','claim_create','claim_view'
  ],
  true, true, true, true,
  1, true, true
)
ON CONFLICT (template_key) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description, icon = EXCLUDED.icon,
  suggested_roles = EXCLUDED.suggested_roles, suggested_functions = EXCLUDED.suggested_functions,
  default_dept_can_view = EXCLUDED.default_dept_can_view,
  default_dept_can_create = EXCLUDED.default_dept_can_create,
  default_dept_can_edit = EXCLUDED.default_dept_can_edit,
  default_dept_can_delete = EXCLUDED.default_dept_can_delete,
  display_order = EXCLUDED.display_order,
  is_active = true, is_quick_preset = true;

-- Admin (scoped to selected departments, VIEW + CREATE only)
INSERT INTO public.permission_templates (
  template_key, label, description, icon,
  suggested_roles, suggested_functions,
  default_dept_can_view, default_dept_can_create, default_dept_can_edit, default_dept_can_delete,
  display_order, is_active, is_quick_preset
) VALUES (
  'admin',
  'ผู้ดูแลระบบ (Admin)',
  'ดูแลงานปฏิบัติการในฝ่ายที่เลือก — ดูและสร้างได้ ห้ามแก้/ลบ',
  'ShieldCheck',
  ARRAY['admin']::app_role[],
  ARRAY[
    'delivery_entry','goods_receipt','issue_request','goods_issue','reports',
    'billboards','pm_schedule','equipment_pm','transfer','ad_entry','ad_issue_request','ad_warehouse',
    'admin','delivery_confirm','direct_shipping_request','direct_shipping_procurement',
    'swap_request_manage','assessment_create','claim_create','claim_view','assessment_view'
  ],
  true, true, false, false,
  2, true, true
)
ON CONFLICT (template_key) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description, icon = EXCLUDED.icon,
  suggested_roles = EXCLUDED.suggested_roles, suggested_functions = EXCLUDED.suggested_functions,
  default_dept_can_view = EXCLUDED.default_dept_can_view,
  default_dept_can_create = EXCLUDED.default_dept_can_create,
  default_dept_can_edit = EXCLUDED.default_dept_can_edit,
  default_dept_can_delete = EXCLUDED.default_dept_can_delete,
  display_order = EXCLUDED.display_order,
  is_active = true, is_quick_preset = true;

-- Manager
INSERT INTO public.permission_templates (
  template_key, label, description, icon,
  suggested_roles, suggested_functions,
  default_dept_can_view, default_dept_can_create, default_dept_can_edit, default_dept_can_delete,
  display_order, is_active, is_quick_preset
) VALUES (
  'manager',
  'ผู้จัดการฝ่าย',
  'อนุมัติคำขอและดูรายงานของฝ่ายที่รับผิดชอบ',
  'ShieldCheck',
  ARRAY['manager']::app_role[],
  ARRAY['reports','manager_approval','direct_shipping_approval','ad_issue_request','issue_request'],
  true, false, true, false,
  3, true, true
)
ON CONFLICT (template_key) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description, icon = EXCLUDED.icon,
  suggested_roles = EXCLUDED.suggested_roles, suggested_functions = EXCLUDED.suggested_functions,
  default_dept_can_view = EXCLUDED.default_dept_can_view,
  default_dept_can_create = EXCLUDED.default_dept_can_create,
  default_dept_can_edit = EXCLUDED.default_dept_can_edit,
  default_dept_can_delete = EXCLUDED.default_dept_can_delete,
  display_order = EXCLUDED.display_order,
  is_active = true, is_quick_preset = true;

-- Warehouse Staff
INSERT INTO public.permission_templates (
  template_key, label, description, icon,
  suggested_roles, suggested_functions,
  default_dept_can_view, default_dept_can_create, default_dept_can_edit, default_dept_can_delete,
  display_order, is_active, is_quick_preset
) VALUES (
  'warehouse_staff',
  'เจ้าหน้าที่คลัง',
  'รับเข้า จ่ายออก และจัดการสต็อกของฝ่ายที่รับผิดชอบ',
  'Package',
  ARRAY['warehouse_staff']::app_role[],
  ARRAY[
    'goods_receipt','goods_issue','reports','transfer','ad_warehouse',
    'delivery_confirm','swap_request_manage','assessment_create','claim_create'
  ],
  true, true, true, false,
  4, true, true
)
ON CONFLICT (template_key) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description, icon = EXCLUDED.icon,
  suggested_roles = EXCLUDED.suggested_roles, suggested_functions = EXCLUDED.suggested_functions,
  default_dept_can_view = EXCLUDED.default_dept_can_view,
  default_dept_can_create = EXCLUDED.default_dept_can_create,
  default_dept_can_edit = EXCLUDED.default_dept_can_edit,
  default_dept_can_delete = EXCLUDED.default_dept_can_delete,
  display_order = EXCLUDED.display_order,
  is_active = true, is_quick_preset = true;

-- Receiver
INSERT INTO public.permission_templates (
  template_key, label, description, icon,
  suggested_roles, suggested_functions,
  default_dept_can_view, default_dept_can_create, default_dept_can_edit, default_dept_can_delete,
  display_order, is_active, is_quick_preset
) VALUES (
  'receiver',
  'เจ้าหน้าที่รับเข้า',
  'สร้างเอกสารนำสินค้าเข้าและอัพโหลดเอกสารประกอบ',
  'ShoppingCart',
  ARRAY['receiver']::app_role[],
  ARRAY['delivery_entry'],
  true, true, false, false,
  5, true, true
)
ON CONFLICT (template_key) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description, icon = EXCLUDED.icon,
  suggested_roles = EXCLUDED.suggested_roles, suggested_functions = EXCLUDED.suggested_functions,
  default_dept_can_view = EXCLUDED.default_dept_can_view,
  default_dept_can_create = EXCLUDED.default_dept_can_create,
  default_dept_can_edit = EXCLUDED.default_dept_can_edit,
  default_dept_can_delete = EXCLUDED.default_dept_can_delete,
  display_order = EXCLUDED.display_order,
  is_active = true, is_quick_preset = true;

-- Requester
INSERT INTO public.permission_templates (
  template_key, label, description, icon,
  suggested_roles, suggested_functions,
  default_dept_can_view, default_dept_can_create, default_dept_can_edit, default_dept_can_delete,
  display_order, is_active, is_quick_preset
) VALUES (
  'requester',
  'ผู้ขอเบิก',
  'ส่งคำขอเบิกสินค้าและติดตามสถานะของตัวเอง',
  'Wrench',
  ARRAY['requester']::app_role[],
  ARRAY['issue_request','ad_issue_request','direct_shipping_request','swap_request_create','assessment_view','claim_view'],
  true, true, false, false,
  6, true, true
)
ON CONFLICT (template_key) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description, icon = EXCLUDED.icon,
  suggested_roles = EXCLUDED.suggested_roles, suggested_functions = EXCLUDED.suggested_functions,
  default_dept_can_view = EXCLUDED.default_dept_can_view,
  default_dept_can_create = EXCLUDED.default_dept_can_create,
  default_dept_can_edit = EXCLUDED.default_dept_can_edit,
  default_dept_can_delete = EXCLUDED.default_dept_can_delete,
  display_order = EXCLUDED.display_order,
  is_active = true, is_quick_preset = true;
