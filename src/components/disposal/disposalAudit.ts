export interface DisposalAuditRow {
  id: string;
  defective_return_id: string;
  actor_id: string | null;
  action: string;
  from_status: string | null;
  to_status: string | null;
  disposal_method: string | null;
  notes: string | null;
  is_super_admin_action: boolean;
  is_self_approval: boolean;
  created_at: string;
}

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  created: "เปิดใบของเสีย",
  l1_approved: "อนุมัติชั้นที่ 1",
  l2_approved: "อนุมัติขั้นสุดท้าย (ชั้น 2)",
  finance_ack: "บัญชีรับทราบ",
  rejected: "ปฏิเสธคำขอ",
  completed: "ดำเนินการเสร็จสิ้น",
  status_changed: "เปลี่ยนสถานะ",
};

export const AUDIT_ACTION_ICON: Record<string, string> = {
  created: "📝",
  l1_approved: "1️⃣",
  l2_approved: "2️⃣",
  finance_ack: "💰",
  rejected: "⛔",
  completed: "✅",
  status_changed: "🔄",
};

export const AUDIT_METHOD_LABEL: Record<string, string> = {
  destroy: "ทำลายทิ้ง",
  sell_scrap: "จำหน่ายเป็นซาก",
  csr: "นำไปทำ CSR",
  repair_return: "ซ่อมและคืนคลัง",
};
