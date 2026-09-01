export interface ActivityAuditRow {
  id: string;
  module: string;
  entity_table: string;
  entity_id: string | null;
  doc_number: string | null;
  action: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_roles: string[] | null;
  is_super_admin_action: boolean;
  department: string | null;
  status_before: string | null;
  status_after: string | null;
  changed_fields: Record<string, { from: unknown; to: unknown }> | null;
  notes: string | null;
  created_at: string;
}

export const AUDIT_MODULE_LABEL: Record<string, string> = {
  goods_issue: "เบิก-จ่าย",
  goods_receipt: "รับเข้าสินค้า",
  swap: "Swap",
  assessment: "ประเมิน MP",
  claim: "เคลม",
  loan: "ยืม-คืน",
  direct_shipment: "จัดส่งตรง",
  purchase_request: "ใบขอซื้อ (PR)",
  permission: "สิทธิ์ผู้ใช้",
};

export const AUDIT_ACTION_LABEL_MAP: Record<string, string> = {
  created: "สร้างรายการ",
  updated: "แก้ไขข้อมูล",
  approved: "อนุมัติ",
  rejected: "ไม่อนุมัติ",
  cancelled: "ยกเลิก",
  completed: "เสร็จสิ้น",
  issued: "จ่ายของ",
  returned: "รับคืน",
  received: "รับเข้า",
  status_changed: "เปลี่ยนสถานะ",
  deleted: "ลบ/เพิกถอน",
};

export const AUDIT_ACTION_ICON_MAP: Record<string, string> = {
  created: "🆕",
  updated: "✏️",
  approved: "✅",
  rejected: "❌",
  cancelled: "🚫",
  completed: "🏁",
  issued: "📤",
  returned: "📥",
  received: "📦",
  status_changed: "🔄",
  deleted: "🗑️",
};

export const AUDIT_ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  warehouse_staff: "เจ้าหน้าที่คลัง",
  receiver: "ผู้นำเข้า",
  requester: "ผู้เบิก",
};

export const auditActionLabel = (a: string) => AUDIT_ACTION_LABEL_MAP[a] || a;
export const auditActionIcon = (a: string) => AUDIT_ACTION_ICON_MAP[a] || "•";
export const auditModuleLabel = (m: string) => AUDIT_MODULE_LABEL[m] || m;
export const auditRolesLabel = (roles: string[] | null) =>
  (roles || []).map((r) => AUDIT_ROLE_LABEL[r] || r).join(", ") || "—";

/** Fields that add noise to the "what changed" view */
export const AUDIT_HIDDEN_FIELDS = new Set([
  "updated_at",
  "created_at",
  "id",
  "search_vector",
]);

export const summarizeChanges = (changed: ActivityAuditRow["changed_fields"], max = 4): string => {
  if (!changed) return "";
  const keys = Object.keys(changed).filter((k) => !AUDIT_HIDDEN_FIELDS.has(k));
  if (keys.length === 0) return "";
  const shown = keys.slice(0, max).join(", ");
  return keys.length > max ? `${shown} +${keys.length - max}` : shown;
};
