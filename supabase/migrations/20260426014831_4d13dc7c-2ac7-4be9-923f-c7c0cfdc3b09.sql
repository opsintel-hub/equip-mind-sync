-- Permission templates for job roles (Wizard-driven user setup)
CREATE TABLE public.permission_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  suggested_roles app_role[] NOT NULL DEFAULT '{}',
  suggested_functions TEXT[] NOT NULL DEFAULT '{}',
  default_dept_can_view BOOLEAN NOT NULL DEFAULT true,
  default_dept_can_create BOOLEAN NOT NULL DEFAULT false,
  default_dept_can_edit BOOLEAN NOT NULL DEFAULT false,
  default_dept_can_delete BOOLEAN NOT NULL DEFAULT false,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.permission_templates ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read (needed for wizard preview)
CREATE POLICY "Authenticated can view templates"
ON public.permission_templates FOR SELECT
TO authenticated
USING (true);

-- Only admins can manage
CREATE POLICY "Admins manage templates"
ON public.permission_templates FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_permission_templates_updated_at
BEFORE UPDATE ON public.permission_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed 4 job role templates
INSERT INTO public.permission_templates
  (template_key, label, description, icon, suggested_roles, suggested_functions,
   default_dept_can_view, default_dept_can_create, default_dept_can_edit, default_dept_can_delete, display_order)
VALUES
  ('warehouse_staff', 'เจ้าหน้าที่คลัง', 'รับเข้า จ่าย นับสต็อก ดูรายงานคลัง', 'Package',
   ARRAY['warehouse_staff']::app_role[],
   ARRAY['delivery_entry','goods_receipt','goods_issue','delivery_confirm','reports','master_data','transfer','ad_warehouse'],
   true, true, true, false, 1),
  ('requester', 'ผู้ขอเบิก', 'ขอเบิกสินค้า ดูสถานะคำขอ ยืนยันรับสินค้า', 'ShoppingCart',
   ARRAY['requester']::app_role[],
   ARRAY['issue_request','delivery_confirm','ad_issue_request','direct_shipping_request'],
   true, true, false, false, 2),
  ('manager', 'ผู้จัดการ/อนุมัติ', 'อนุมัติคำขอ ดูรายงานฝ่าย ติดตาม KPI', 'ShieldCheck',
   ARRAY['manager']::app_role[],
   ARRAY['manager_approval','direct_shipping_approval','reports','issue_request','delivery_confirm'],
   true, false, false, false, 3),
  ('technician', 'ช่าง/ฝ่ายเทคนิค', 'PM ป้าย จัดการ Media Player ยืมเครื่องมือ', 'Wrench',
   ARRAY['warehouse_staff']::app_role[],
   ARRAY['pm_schedule','equipment_pm','billboards','master_data','reports','issue_request'],
   true, true, true, false, 4);