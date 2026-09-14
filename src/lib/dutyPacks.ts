import type { Database } from "@/integrations/supabase/types";
import { SYSTEM_FUNCTIONS, SUPER_ADMIN_ONLY_FNS } from "@/hooks/useFunctionPermissions";

export type UserRole = Database["public"]["Enums"]["app_role"];


/**
 * DUTY PACKS — "หน้าที่งาน"
 * แหล่งนิยามกลางเพียงที่เดียว ใช้ร่วมกันทั้ง PermissionWizard และ PermissionMatrix
 * 1 คนเลือกได้หลายหน้าที่ ระบบรวมสิทธิ์ให้อัตโนมัติ
 */
export interface DutyPack {
  key: string;
  label: string;
  description: string;
  icon: string; // lucide icon name (mapped in components)
  fns: string[];
  roles?: UserRole[];
}

export const DUTY_PACKS: DutyPack[] = [
  {
    key: "duty_receive",
    label: "รับเข้า-คลัง",
    description: "นำสินค้าเข้า, รับเข้าคลัง, ยืนยันรับสินค้า",
    icon: "Truck",
    fns: ["delivery_entry", "goods_receipt", "delivery_confirm"],
    roles: ["receiver", "warehouse_staff"],
  },
  {
    key: "duty_issue",
    label: "เบิก-จ่ายสินค้า",
    description: "ขอเบิก, จ่ายของ, โอนย้าย, รับคืน",
    icon: "ShoppingCart",
    fns: ["issue_request", "goods_issue", "transfer"],
    roles: ["requester", "warehouse_staff"],
  },
  {
    key: "duty_disposal",
    label: "ของเสีย / ตัดจำหน่าย",
    description: "เปิดใบของเสีย และดูรายงานของเสีย",
    icon: "Recycle",
    fns: ["disposal_request", "disposal_report"],
    roles: ["warehouse_staff"],
  },
  {
    key: "duty_swap_tech",
    label: "ช่างหน้างาน (Swap/ประเมิน/เคลม)",
    description: "แจ้ง Swap, ดูผลประเมิน, ติดตามเคลม",
    icon: "ArrowLeftRight",
    fns: ["swap_request_create", "assessment_view", "claim_view"],
  },
  {
    key: "duty_swap_wh",
    label: "คลังงาน Swap/ประเมิน/เคลม",
    description: "จัดการคำขอ Swap, บันทึกประเมิน, สร้างเคลม",
    icon: "Wrench",
    fns: ["swap_request_manage", "assessment_create", "claim_create"],
    roles: ["warehouse_staff"],
  },
  {
    key: "duty_billboard",
    label: "ป้ายโฆษณา & PM",
    description: "ข้อมูลป้าย, PM ป้าย, PM เครื่องมือ",
    icon: "MapPin",
    fns: ["billboards", "pm_schedule", "equipment_pm"],
  },
  {
    key: "duty_ad",
    label: "ภาพโฆษณา",
    description: "นำเข้าภาพ, เบิกภาพ, คลังภาพโฆษณา",
    icon: "ImageIcon",
    fns: ["ad_entry", "ad_issue_request", "ad_warehouse"],
  },
  {
    key: "duty_direct",
    label: "ส่งตรง (Direct Shipping)",
    description: "ขอส่งตรง และดำเนินการจัดซื้อ-ส่งตรง",
    icon: "Send",
    fns: ["direct_shipping_request", "direct_shipping_procurement"],
  },
  {
    key: "duty_master",
    label: "ข้อมูลหลัก (Master Data)",
    description: "จัดการข้อมูลหลักทุก Tab (ปรับราย Tab ได้ที่ปรับละเอียด)",
    icon: "Database",
    fns: [
      "master_data",
      "md_equipment", "md_tools", "md_categories", "md_warehouses", "md_locations",
      "md_suppliers", "md_contractors", "md_departments", "md_sections", "md_companies",
      "md_issue_purposes", "md_receipt_purposes", "md_technicians", "md_pm_action_types",
      "md_media_player",
    ],
  },
  {
    key: "duty_reports",
    label: "รายงาน & ตรวจสอบ",
    description: "รายงานทุกหน้า, Stock Card, KPI, Audit Trail",
    icon: "BarChart3",
    fns: ["reports", "activity_audit_view", "disposal_audit_view"],
  },
  {
    key: "duty_admin",
    label: "ผู้ดูแลระบบ",
    description: "จัดการผู้ใช้ สิทธิ์ และการนำเข้าข้อมูลเริ่มต้น",
    icon: "Shield",
    fns: ["admin"],
    roles: ["admin"],
  },
];

/** สิทธิ์กลุ่ม "ผู้อนุมัติ" — แยกกล่องต่างหากเพื่อให้เห็นชัดว่าใครอนุมัติอะไร */
export interface ApprovalPerm {
  fn: string;
  label: string;
  description: string;
  role?: UserRole;
}

export const APPROVAL_PERMISSIONS: ApprovalPerm[] = [
  {
    fn: "manager_approval",
    label: "อนุมัติเบิกทรัพย์สิน",
    description: "อนุมัติคำขอเบิกที่เป็นทรัพย์สิน — เห็นเฉพาะฝ่าย/แผนกที่กำหนดในขั้นที่ 2",
    role: "manager",
  },
  {
    fn: "swap_request_manage",
    label: "อนุมัติ/ดำเนินการ Swap",
    description: "รับคำขอ Swap จากช่างและดำเนินการจ่ายของทดแทน",
  },
  {
    fn: "direct_shipping_approval",
    label: "อนุมัติส่งตรง",
    description: "อนุมัติ/ปฏิเสธคำขอส่งสินค้าตรงจากผู้จำหน่าย",
    role: "manager",
  },
  {
    fn: "disposal_approve_l1",
    label: "อนุมัติของเสีย ชั้น 1",
    description: "หัวหน้าฝ่ายเจ้าของของ — ยืนยันว่าเสียจริงและเห็นชอบวิธีจัดการ",
  },
  {
    fn: "disposal_approve_l2",
    label: "อนุมัติของเสีย ชั้น 2",
    description: "ผู้จัดการทรัพย์สิน/ผู้บริหารคลัง — อนุมัติขั้นสุดท้าย",
    role: "manager",
  },
  {
    fn: "disposal_finance",
    label: "บัญชีรับทราบของเสีย",
    description: "ฝ่ายบัญชี เห็นทุกใบข้ามฝ่าย พร้อมมูลค่า",
  },
];

export const APPROVAL_FNS = APPROVAL_PERMISSIONS.map((a) => a.fn);

/** กลุ่มคอลัมน์สำหรับ Matrix — derived จาก duty packs เพื่อไม่ให้ต้องนิยามซ้ำ */
export const MATRIX_GROUPS: { key: string; label: string; icon: string; fns: string[] }[] = [
  ...DUTY_PACKS.map((d) => ({ key: d.key, label: d.label, icon: d.icon, fns: d.fns })),
  { key: "approval", label: "ผู้อนุมัติ", icon: "ShieldCheck", fns: APPROVAL_FNS },
];

/** รวมสิทธิ์จาก duty ที่เลือก */
export function functionsFromDuties(dutyKeys: string[]): string[] {
  const s = new Set<string>();
  DUTY_PACKS.filter((d) => dutyKeys.includes(d.key)).forEach((d) => d.fns.forEach((f) => s.add(f)));
  return Array.from(s);
}

/** บทบาทที่ควรได้จาก duty + สิทธิ์อนุมัติที่เลือก */
export function rolesFromSelection(dutyKeys: string[], approvalFns: string[]): UserRole[] {
  const s = new Set<UserRole>();
  DUTY_PACKS.filter((d) => dutyKeys.includes(d.key)).forEach((d) => (d.roles || []).forEach((r) => s.add(r)));
  APPROVAL_PERMISSIONS.filter((a) => approvalFns.includes(a.fn)).forEach((a) => a.role && s.add(a.role));
  return Array.from(s);
}

/** duty ไหนที่ "เปิดครบ" อยู่แล้วตามชุดสิทธิ์ปัจจุบัน */
export function dutiesFromFunctions(fns: string[]): string[] {
  const set = new Set(fns);
  return DUTY_PACKS.filter((d) => d.fns.every((f) => set.has(f))).map((d) => d.key);
}
