// ─── Menu Name → Route Resolver ───
// แปลงข้อความ menu (เช่น "รับเข้า > นำสินค้าใหม่เข้าระบบ") ให้เป็น route path
// ถ้า match ไม่ได้ → return null (UI จะแสดงข้อความเฉยๆ ไม่มีปุ่ม)

interface MenuRoute {
  /** keywords ที่ต้องมีอยู่ใน menu string (case-insensitive, all must match) */
  keywords: string[];
  path: string;
}

// เรียงจาก specific → general (match ตัวแรกที่เจอ)
const MENU_ROUTES: MenuRoute[] = [
  // ─── Direct Shipping ───
  { keywords: ["direct shipping", "อนุมัติ"], path: "/direct-shipping-approval" },
  { keywords: ["direct shipping", "จัดซื้อ"], path: "/direct-shipping-procurement" },
  { keywords: ["ส่งตรง", "อนุมัติ"], path: "/direct-shipping-approval" },
  { keywords: ["ส่งตรง", "จัดซื้อ"], path: "/direct-shipping-procurement" },
  { keywords: ["ส่งตรง"], path: "/direct-shipping" },
  { keywords: ["direct shipping"], path: "/direct-shipping" },

  // ─── Media Player ───
  { keywords: ["media player", "report"], path: "/media-player-report" },
  { keywords: ["media player", "รายงาน"], path: "/media-player-report" },
  { keywords: ["media player", "profile"], path: "/media-player/search" },
  { keywords: ["จัดการ media player"], path: "/master-data" },

  // ─── Billboard / ป้ายโฆษณา ───
  { keywords: ["ป้ายโฆษณา", "pm"], path: "/pm-billboard" },
  { keywords: ["แจ้ง pm"], path: "/pm-billboard" },
  { keywords: ["billboard", "package"], path: "/billboard-packages" },
  { keywords: ["กลุ่มป้าย"], path: "/billboard-packages" },
  { keywords: ["billboard", "issue"], path: "/billboard-issue-report" },
  { keywords: ["รายงานป้าย"], path: "/billboard-issue-report" },
  { keywords: ["ป้ายโฆษณา"], path: "/billboards" },
  { keywords: ["billboards"], path: "/billboards" },

  // ─── Ad Management ───
  { keywords: ["ภาพโฆษณา", "รับเข้า"], path: "/ad-receive" },
  { keywords: ["ภาพโฆษณา", "ขอเบิก"], path: "/ad-request" },
  { keywords: ["ภาพโฆษณา", "เบิก"], path: "/ad-request" },
  { keywords: ["ภาพโฆษณา", "จ่าย"], path: "/ad-issue" },
  { keywords: ["ภาพโฆษณา", "นำเข้า"], path: "/ad-entry" },
  { keywords: ["ภาพโฆษณา"], path: "/ad-entry" },
  { keywords: ["ad management"], path: "/ad-entry" },

  // ─── Tools / เครื่องมือ ───
  { keywords: ["pm task"], path: "/tool-pm-tasks" },
  { keywords: ["pm tasks"], path: "/tool-pm-tasks" },
  { keywords: ["pm history"], path: "/tool-pm-history" },
  { keywords: ["pm report"], path: "/tool-pm-report" },
  { keywords: ["pm schedule"], path: "/tool-pm-schedule" },
  { keywords: ["จัดการเครื่องมือ"], path: "/tool-management" },
  { keywords: ["ทะเบียนเครื่องมือ"], path: "/tool-management" },

  // ─── Inventory / Reports ───
  { keywords: ["รายงานสินค้าคงคลัง"], path: "/inventory-report" },
  { keywords: ["inventory report"], path: "/inventory-report" },
  { keywords: ["รายงาน kpi"], path: "/kpi-report" },
  { keywords: ["kpi"], path: "/kpi-report" },
  { keywords: ["dead stock"], path: "/dead-stock" },
  { keywords: ["ค้างสต็อก"], path: "/dead-stock" },
  { keywords: ["stock card"], path: "/stock-card" },
  { keywords: ["stock movement"], path: "/stock-movement-log" },
  { keywords: ["ค้นหาอุปกรณ์"], path: "/equipment-tracking" },
  { keywords: ["equipment tracking"], path: "/equipment-tracking" },
  { keywords: ["ค้นหาเอกสาร"], path: "/document-search" },
  { keywords: ["document search"], path: "/document-search" },

  // ─── Inventory Lifecycle (รับเข้า/เบิก-จ่าย) ───
  { keywords: ["นำของเสีย"], path: "/defective-return" },
  { keywords: ["defective"], path: "/defective-return" },
  { keywords: ["นำสินค้าใหม่"], path: "/delivery-entry" },
  { keywords: ["delivery entry"], path: "/delivery-entry" },
  { keywords: ["รับเข้าคลัง"], path: "/receive-goods" },
  { keywords: ["receive goods"], path: "/receive-goods" },
  { keywords: ["ขอเบิก"], path: "/issue-request" },
  { keywords: ["issue request"], path: "/issue-request" },
  { keywords: ["จ่ายสินค้า"], path: "/issue-goods" },
  { keywords: ["issue goods"], path: "/issue-goods" },
  { keywords: ["ยืนยันรับ"], path: "/delivery-confirmation" },
  { keywords: ["delivery confirmation"], path: "/delivery-confirmation" },
  { keywords: ["อนุมัติ", "manager"], path: "/manager-approval" },
  { keywords: ["ผู้จัดการอนุมัติ"], path: "/manager-approval" },
  { keywords: ["แผนจัดเตรียม"], path: "/warehouse-planning" },
  { keywords: ["warehouse planning"], path: "/warehouse-planning" },
  { keywords: ["ขอซื้อ"], path: "/purchase-requests" },
  { keywords: ["purchase request"], path: "/purchase-requests" },
  { keywords: ["รออะไหล่"], path: "/waiting-stock" },
  { keywords: ["รอสต็อก"], path: "/waiting-stock" },

  // ─── โอนย้ายและยืม ───
  { keywords: ["ยืมอุปกรณ์"], path: "/equipment-loans" },
  { keywords: ["equipment loan"], path: "/equipment-loans" },
  { keywords: ["โอนย้าย"], path: "/transfer-history" },
  { keywords: ["transfer"], path: "/transfer-history" },
  { keywords: ["swap"], path: "/swap" },
  { keywords: ["สลับ"], path: "/swap" },
  { keywords: ["assessment"], path: "/assessment" },
  { keywords: ["ประเมิน"], path: "/assessment" },
  { keywords: ["claim"], path: "/claims" },
  { keywords: ["เคลม"], path: "/claims" },

  // ─── Admin / Settings ───
  { keywords: ["จัดการผู้ใช้"], path: "/admin" },
  { keywords: ["user management"], path: "/admin" },
  { keywords: ["admin"], path: "/admin" },
  { keywords: ["ตั้งค่าแจ้งเตือน"], path: "/notification-settings" },
  { keywords: ["notification setting"], path: "/notification-settings" },
  { keywords: ["รหัสทรัพย์สิน"], path: "/pending-asset-codes" },
  { keywords: ["pending asset"], path: "/pending-asset-codes" },

  // ─── Master Data ───
  { keywords: ["ข้อมูลหลัก"], path: "/master-data" },
  { keywords: ["master data"], path: "/master-data" },

  // ─── Dashboard / Misc ───
  { keywords: ["dashboard ผู้เบิก"], path: "/requester-dashboard" },
  { keywords: ["requester dashboard"], path: "/requester-dashboard" },
  { keywords: ["dashboard"], path: "/dashboard" },
  { keywords: ["แดชบอร์ด"], path: "/dashboard" },
  { keywords: ["qr"], path: "/qr-code" },
  { keywords: ["pm history", "ทั่วไป"], path: "/pm-history" },
  { keywords: ["incomplete"], path: "/incomplete-issues" },
  { keywords: ["ค้างจ่าย"], path: "/incomplete-issues" },
];

/**
 * พยายามหา route จากชื่อเมนู
 * @returns path เช่น "/delivery-entry" หรือ null ถ้า match ไม่ได้
 */
export function resolveMenuPath(menu: string): string | null {
  if (!menu) return null;
  const lower = menu.toLowerCase();
  for (const entry of MENU_ROUTES) {
    if (entry.keywords.every((kw) => lower.includes(kw.toLowerCase()))) {
      return entry.path;
    }
  }
  return null;
}
