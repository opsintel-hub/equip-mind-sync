/**
 * Registry of special request types. Add a new type here (no DB change needed):
 * `auto` types are executed by the review_special_request RPC; others are
 * handled manually by Super Admin on `actionUrl`, then marked done.
 */
export interface SpecialRequestType {
  key: string;
  label: string;
  description: string;
  actionHint: string;
  actionUrl?: string;
  auto?: boolean;
  needsDoc?: boolean;
}

export const SPECIAL_REQUEST_TYPES: SpecialRequestType[] = [
  {
    key: "force_close_issue_item",
    label: "ขอปิดรายการเบิก (ไม่ต้องคืน / ไม่ต้องระบุป้าย)",
    description: "ของเบิกไปใช้หมดแล้ว หรือไม่ต้องติดตั้งป้าย/คืนคลัง",
    actionHint: "กดอนุมัติ ระบบปิดยอดค้างให้อัตโนมัติ (ไม่คืนสต็อก)",
    actionUrl: "/incomplete-issues",
    auto: true,
    needsDoc: true,
  },
  {
    key: "cancel_return_to_stock",
    label: "ขอยกเลิกและคืนของเข้าคลัง",
    description: "เบิกผิด/ไม่ได้ใช้ ต้องการคืนของกลับเข้าคลัง",
    actionHint: "ไปหน้ารายการเบิกที่ยังไม่สมบูรณ์ → กด “รับคืน” ตามจำนวน แล้วกลับมากด “ทำเสร็จแล้ว”",
    actionUrl: "/incomplete-issues",
    needsDoc: true,
  },
  {
    key: "edit_approved_doc",
    label: "ขอแก้ไขเอกสารที่อนุมัติ/ปิดแล้ว",
    description: "ข้อมูลในเอกสารผิด เช่น จำนวน ราคา S/N ป้าย",
    actionHint: "เปิดเอกสารจากหน้าค้นหาเอกสาร แล้วแก้ตามคำร้อง",
    actionUrl: "/document-search",
    needsDoc: true,
  },
  {
    key: "delete_doc",
    label: "ขอยกเลิก/ลบเอกสาร",
    description: "สร้างเอกสารซ้ำ หรือสร้างผิด",
    actionHint: "ตรวจสอบเอกสารในหน้าค้นหาเอกสาร แล้วยกเลิกตามขั้นตอน",
    actionUrl: "/document-search",
    needsDoc: true,
  },
  {
    key: "stock_adjust",
    label: "ขอปรับยอดสต็อก",
    description: "ยอดในระบบไม่ตรงกับของจริง",
    actionHint: "ไปหน้าตรวจสอบยอด & สถานะ Stock เพื่อปรับยอด",
    actionUrl: "/stock-reconciliation",
  },
  {
    key: "permission_request",
    label: "ขอสิทธิ์ใช้งานเพิ่ม",
    description: "ต้องการเข้าเมนูหรือฝ่าย/แผนกเพิ่มเติม",
    actionHint: "ไปหน้าจัดการผู้ใช้ เพื่อเพิ่มสิทธิ์ให้ผู้ร้อง",
    actionUrl: "/admin",
  },
  {
    key: "other",
    label: "อื่น ๆ",
    description: "เรื่องอื่นที่ต้องให้ Super Admin ช่วย",
    actionHint: "อ่านรายละเอียดคำร้องแล้วดำเนินการตามความเหมาะสม",
  },
];

export const getRequestType = (key: string) =>
  SPECIAL_REQUEST_TYPES.find((t) => t.key === key) ?? SPECIAL_REQUEST_TYPES[SPECIAL_REQUEST_TYPES.length - 1];

export const STATUS_LABEL: Record<string, string> = {
  pending: "รอดำเนินการ",
  approved: "อนุมัติ (รอทำ)",
  done: "เสร็จแล้ว",
  rejected: "ไม่อนุมัติ",
  cancelled: "ยกเลิกโดยผู้ร้อง",
};
