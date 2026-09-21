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
  actor_email?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

/** Badge color class per action type (semantic tokens only) */
export const AUDIT_ACTION_BADGE: Record<string, string> = {
  created: "bg-success/15 text-success border-success/30",
  approved: "bg-success/15 text-success border-success/30",
  received: "bg-success/15 text-success border-success/30",
  completed: "bg-success/15 text-success border-success/30",
  updated: "bg-warning/15 text-warning border-warning/30",
  status_changed: "bg-warning/15 text-warning border-warning/30",
  deleted: "bg-destructive/15 text-destructive border-destructive/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
  issued: "bg-primary/15 text-primary border-primary/30",
  returned: "bg-primary/15 text-primary border-primary/30",
};

export const auditActionBadge = (a: string) =>
  AUDIT_ACTION_BADGE[a] || "bg-muted text-muted-foreground border-border";

/** Short, human readable device label from a user agent string */
export const deviceLabel = (ua?: string | null): string => {
  if (!ua) return "—";
  const os = /iPhone|iPad/i.test(ua)
    ? "iOS"
    : /Android/i.test(ua)
      ? "Android"
      : /Mac OS X/i.test(ua)
        ? "macOS"
        : /Windows/i.test(ua)
          ? "Windows"
          : /Linux/i.test(ua)
            ? "Linux"
            : "อื่นๆ";
  const browser = /Edg\//i.test(ua)
    ? "Edge"
    : /Chrome\//i.test(ua)
      ? "Chrome"
      : /Safari\//i.test(ua)
        ? "Safari"
        : /Firefox\//i.test(ua)
          ? "Firefox"
          : "Browser";
  return `${os} · ${browser}`;
};

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
