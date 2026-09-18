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

/* ============================================================
 * ACCESS LEVELS — "ระดับผู้ใช้" ที่เดียวที่ใช้กำหนดสิทธิ์
 * ============================================================ */

export type AccessLevelKey =
  | "super_admin"
  | "admin"
  | "warehouse"
  | "approver"
  | "general"
  | "ad_user"
  | "finance"
  | "custom";

export interface AccessLevelDef {
  key: AccessLevelKey;
  order: number;
  label: string;
  description: string;
  icon: string;
  color: string; // tailwind bg class for badge dot
  roles: UserRole[];
  fns: string[];
  /** "all" = เห็นทุกฝ่ายอัตโนมัติ (ไม่ต้องเลือก), "select" = ต้องเลือกฝ่าย */
  deptMode: "all" | "select";
  /** สิทธิ์ในข้อมูลของฝ่าย */
  deptPerm: { view: boolean; create: boolean; edit: boolean; delete: boolean };
  highlights: string[];
}

const ALL_FNS = SYSTEM_FUNCTIONS.map((f) => f.name);
const ADMIN_LEVEL_FNS = ALL_FNS.filter((n) => !SUPER_ADMIN_ONLY_FNS.includes(n));

export const ACCESS_LEVELS: AccessLevelDef[] = [
  {
    key: "super_admin",
    order: 1,
    label: "Super Admin",
    description: "ดูแลระบบทั้งหมด รวมงานที่สงวนไว้",
    icon: "ShieldCheck",
    color: "bg-red-500",
    roles: ["super_admin"],
    fns: ALL_FNS,
    deptMode: "all",
    deptPerm: { view: true, create: true, edit: true, delete: true },
    highlights: ["ทุกเมนูในระบบ", "จัดการผู้ใช้และสิทธิ์", "นำเข้าข้อมูลเริ่มต้น", "ทดสอบระบบ & คู่มือ Database", "เห็นทุกฝ่าย/ทุกคลัง"],
  },
  {
    key: "admin",
    order: 2,
    label: "Admin",
    description: "ทุกเมนูงาน เห็นทุกคลัง/ทุกฝ่ายเสมอ (ยกเว้น 4 เรื่องที่สงวนให้ Super Admin)",
    icon: "Shield",
    color: "bg-orange-500",
    roles: ["admin"],
    fns: ADMIN_LEVEL_FNS,
    deptMode: "all",
    deptPerm: { view: true, create: true, edit: true, delete: true },
    highlights: ["ทุกเมนูงาน", "เห็นทุกคลัง/ทุกฝ่าย", "ยกเว้น: จัดการผู้ใช้, นำเข้าข้อมูลเริ่มต้น, ทดสอบระบบ/คู่มือ DB, แก้คู่มือสิทธิ์"],
  },
  {
    key: "warehouse",
    order: 3,
    label: "เจ้าหน้าที่คลัง",
    description: "งานคลังครบวงจร — เลือกได้หลายฝ่าย",
    icon: "Package",
    color: "bg-blue-500",
    roles: ["warehouse_staff", "receiver"],
    fns: [
      "delivery_entry", "goods_receipt", "delivery_confirm",
      "issue_request", "goods_issue", "transfer",
      "disposal_request", "disposal_report",
      "swap_request_manage", "assessment_create", "claim_create",
      "swap_request_create", "assessment_view", "claim_view",
      "equipment_pm", "reports", "stock_reconcile",
      "master_data", "md_equipment", "md_media_player", "md_tools", "md_locations", "md_warehouses",
    ],
    deptMode: "select",
    deptPerm: { view: true, create: true, edit: true, delete: false },
    highlights: ["รับเข้า-จ่ายสินค้า", "โอนย้าย, ของเสีย", "Swap/ประเมิน/เคลม", "ข้อมูลหลักคลัง + รายงาน"],
  },
  {
    key: "approver",
    order: 4,
    label: "ผู้อนุมัติ",
    description: "อนุมัติงานของฝ่ายที่รับผิดชอบ",
    icon: "ShieldCheck",
    color: "bg-purple-500",
    roles: ["manager"],
    fns: [...APPROVAL_FNS, "reports", "disposal_report"],
    deptMode: "select",
    deptPerm: { view: true, create: false, edit: true, delete: false },
    highlights: ["อนุมัติเบิกทรัพย์สิน", "อนุมัติส่งตรง", "อนุมัติของเสีย ชั้น 1-2", "อนุมัติ/ดำเนินการ Swap", "ดูรายงาน"],
  },
  {
    key: "general",
    order: 5,
    label: "ผู้ใช้งานทั่วไป",
    description: "ขอนำเข้า ขอเบิก ขอส่งตรง และติดตามคำขอของตัวเอง",
    icon: "ShoppingCart",
    color: "bg-emerald-500",
    roles: ["requester"],
    fns: ["delivery_entry", "issue_request", "direct_shipping_request", "delivery_confirm"],
    deptMode: "select",
    deptPerm: { view: true, create: true, edit: false, delete: false },
    highlights: ["ขอนำสินค้าเข้า", "ขอเบิกสินค้า", "ขอส่งตรง", "ยืนยันรับสินค้า"],
  },
  {
    key: "ad_user",
    order: 6,
    label: "ผู้ใช้ภาพโฆษณา",
    description: "นำเข้า/เบิกภาพโฆษณา และจัดแพ็กป้ายโฆษณา",
    icon: "ImageIcon",
    color: "bg-pink-500",
    roles: ["requester"],
    fns: ["ad_entry", "ad_issue_request", "ad_warehouse", "billboards"],
    deptMode: "select",
    deptPerm: { view: true, create: true, edit: true, delete: false },
    highlights: ["นำเข้าภาพโฆษณา", "เบิกภาพโฆษณา", "คลังภาพโฆษณา", "ป้ายโฆษณา & Package"],
  },
  {
    key: "finance",
    order: 7,
    label: "บัญชี & จัดซื้อ",
    description: "ตรวจสอบยอดและดูรายงานเท่านั้น (ไม่แก้ไขข้อมูล)",
    icon: "BarChart3",
    color: "bg-slate-500",
    roles: [],
    fns: ["reports", "activity_audit_view", "disposal_report", "disposal_audit_view", "disposal_finance", "stock_reconcile"],
    deptMode: "select",
    deptPerm: { view: true, create: false, edit: false, delete: false },
    highlights: ["รายงานทุกหน้า + Stock Card + KPI", "ค้นหาเอกสาร", "ประวัติการใช้งานระบบ", "บัญชีรับทราบของเสีย"],
  },
];

export function getAccessLevel(key: AccessLevelKey): AccessLevelDef | undefined {
  return ACCESS_LEVELS.find((l) => l.key === key);
}

const sameSet = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
};

/** เดาระดับผู้ใช้จากสิทธิ์ปัจจุบัน — คืน "custom" ถ้าไม่ตรงระดับใดเลย */
export function detectAccessLevel(roles: UserRole[], fns: string[]): AccessLevelKey {
  if (roles.includes("super_admin")) return "super_admin";
  if (roles.includes("admin")) return "admin";
  const match = ACCESS_LEVELS.filter((l) => l.deptMode === "select").find((l) => sameSet(l.fns, fns));
  return match ? match.key : "custom";
}

export const ACCESS_LEVEL_LABELS: Record<AccessLevelKey, string> = {
  ...(Object.fromEntries(ACCESS_LEVELS.map((l) => [l.key, l.label])) as Record<AccessLevelKey, string>),
  custom: "ปรับแต่งเอง",
};

