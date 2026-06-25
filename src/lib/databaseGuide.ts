// คำอธิบาย Table ในระบบ + เมนูที่เกี่ยวข้อง
// เมื่อมี table ใหม่ในฐานข้อมูล หน้า DatabaseGuide จะแสดงโดยอัตโนมัติ
// แต่จะเป็น "ยังไม่มีคำอธิบาย" — มาเพิ่มในไฟล์นี้เพื่อให้สมบูรณ์

export interface TableMeta {
  description: string;
  category: string;
  relatedRoutes?: { label: string; path: string }[];
}

export const TABLE_GUIDE: Record<string, TableMeta> = {
  // ==================== ป้ายโฆษณา ====================
  billboards: {
    category: "ป้ายโฆษณา",
    description: "ข้อมูลหลักป้ายโฆษณาทั้งหมด รวมรหัส Old Code, ตำแหน่ง, ขนาด, สถานะ และข้อมูลภูมิศาสตร์",
    relatedRoutes: [{ label: "จัดการป้ายโฆษณา", path: "/billboards" }],
  },
  billboard_equipment: {
    category: "ป้ายโฆษณา",
    description: "อุปกรณ์ที่ติดตั้งบนแต่ละป้ายโฆษณา (เชื่อมป้ายกับ equipment_serial_numbers)",
    relatedRoutes: [
      { label: "จัดการป้ายโฆษณา", path: "/billboards" },
      { label: "ค้นหาอุปกรณ์ป้าย", path: "/equipment-tracking" },
    ],
  },
  billboard_equipment_history: {
    category: "ป้ายโฆษณา",
    description: "ประวัติการติดตั้ง/ถอดอุปกรณ์ออกจากป้าย",
    relatedRoutes: [{ label: "ค้นหาอุปกรณ์ป้าย", path: "/equipment-tracking" }],
  },
  billboard_packages: {
    category: "ป้ายโฆษณา",
    description: "Package/กลุ่มป้ายสำหรับการขายและการจัดการ",
    relatedRoutes: [{ label: "จัดการ Package ป้าย", path: "/billboard-packages" }],
  },
  billboard_package_items: {
    category: "ป้ายโฆษณา",
    description: "รายการป้ายภายในแต่ละ Package",
    relatedRoutes: [{ label: "จัดการ Package ป้าย", path: "/billboard-packages" }],
  },
  billboard_pm_actions: {
    category: "ป้ายโฆษณา",
    description: "รายการแจ้ง PM/ซ่อมบำรุงป้ายโฆษณาที่รอดำเนินการ",
    relatedRoutes: [{ label: "แจ้ง PM ป้ายโฆษณา", path: "/pm-billboard" }],
  },
  billboard_pm_history: {
    category: "ป้ายโฆษณา",
    description: "ประวัติการทำ PM ป้ายโฆษณาที่ดำเนินการเสร็จแล้ว",
    relatedRoutes: [{ label: "ประวัติ PM ป้าย", path: "/pm-history" }],
  },
  billboard_sync_logs: {
    category: "ป้ายโฆษณา",
    description: "Log การ Sync ข้อมูลป้ายจากฐานข้อมูล MSSQL ภายนอก",
  },

  // ==================== คลังสินค้า/อุปกรณ์ ====================
  equipment: {
    category: "คลังสินค้า",
    description: "ข้อมูลหลักของอุปกรณ์/สินค้าทั้งหมด รวมรหัส, ชื่อ, หมวดหมู่, จำนวนคงคลัง",
    relatedRoutes: [{ label: "ข้อมูลหลัก", path: "/master-data" }],
  },
  equipment_serial_numbers: {
    category: "คลังสินค้า",
    description: "Serial Number รายชิ้นของอุปกรณ์ — แหล่งข้อมูลหลักสำหรับสต็อก",
    relatedRoutes: [
      { label: "รายงานสินค้าคงคลัง", path: "/inventory-report" },
      { label: "ค้นหาอุปกรณ์ป้าย", path: "/equipment-tracking" },
    ],
  },
  equipment_images: {
    category: "คลังสินค้า",
    description: "รูปภาพอุปกรณ์ (1-5 รูปต่อรายการ)",
    relatedRoutes: [{ label: "ข้อมูลหลัก", path: "/master-data" }],
  },
  equipment_code_prefixes: {
    category: "คลังสินค้า",
    description: "Prefix สำหรับการตั้งรหัสอุปกรณ์อัตโนมัติ",
    relatedRoutes: [{ label: "ข้อมูลหลัก", path: "/master-data" }],
  },
  equipment_loans: {
    category: "คลังสินค้า",
    description: "บันทึกการยืม-คืนอะไหล่ข้ามบริษัท",
    relatedRoutes: [{ label: "ยืมข้ามบริษัท", path: "/equipment-loans" }],
  },
  equipment_transfers: {
    category: "คลังสินค้า",
    description: "ประวัติการโอนย้ายอุปกรณ์ระหว่างคลัง/ฝ่าย",
    relatedRoutes: [{ label: "ประวัติการย้าย", path: "/transfer-history" }],
  },
  defective_returns: {
    category: "คลังสินค้า",
    description: "บันทึกการนำสินค้าเสีย/ชำรุดเข้าระบบ",
    relatedRoutes: [{ label: "นำของเสียเข้าระบบ", path: "/defective-return" }],
  },
  stock_movements: {
    category: "คลังสินค้า",
    description: "Stock Movement Log — บันทึกความเคลื่อนไหวสต็อกทุกรายการ",
    relatedRoutes: [{ label: "Stock Card", path: "/stock-card" }],
  },
  low_stock_alerts: {
    category: "คลังสินค้า",
    description: "การแจ้งเตือนสินค้าต่ำกว่า Min Stock",
  },
  purchase_requests: {
    category: "คลังสินค้า",
    description: "ใบขอซื้อ (PR) ที่ระบบสร้างอัตโนมัติเมื่อสต็อกต่ำ",
    relatedRoutes: [{ label: "ใบขอซื้อ (PR)", path: "/purchase-requests" }],
  },

  // ==================== รับเข้า ====================
  goods_receipt: {
    category: "รับเข้า",
    description: "บันทึกการรับสินค้าเข้าคลัง (GR)",
    relatedRoutes: [{ label: "รับเข้าคลัง", path: "/receive-goods" }],
  },
  goods_receipt_pending: {
    category: "รับเข้า",
    description: "รายการสินค้าที่นำเข้าระบบแล้วรอรับเข้าคลัง / รอรหัสทรัพย์สิน",
    relatedRoutes: [
      { label: "รับเข้าคลัง", path: "/receive-goods" },
      { label: "รายการรอรหัส", path: "/pending-asset-codes" },
    ],
  },
  receipt_purposes: {
    category: "รับเข้า",
    description: "วัตถุประสงค์การรับเข้า เช่น ซื้อ, รับโอน, คืน",
    relatedRoutes: [{ label: "ข้อมูลหลัก", path: "/master-data" }],
  },

  // ==================== เบิก-จ่าย ====================
  goods_issue: {
    category: "เบิก-จ่าย",
    description: "บันทึกการจ่ายสินค้าออกจากคลัง",
    relatedRoutes: [{ label: "จ่ายสินค้า", path: "/issue-goods" }],
  },
  goods_issue_pending: {
    category: "เบิก-จ่าย",
    description: "คำขอเบิกสินค้าที่รออนุมัติ/รอจ่าย/รอสต็อก",
    relatedRoutes: [
      { label: "ขอเบิกสินค้า", path: "/issue-request" },
      { label: "อนุมัติเบิกทรัพย์สิน", path: "/manager-approval" },
      { label: "คำขอรอสินค้า", path: "/waiting-stock" },
    ],
  },
  goods_issue_pending_items: {
    category: "เบิก-จ่าย",
    description: "รายการสินค้าย่อยในแต่ละคำขอเบิก",
    relatedRoutes: [{ label: "ขอเบิกสินค้า", path: "/issue-request" }],
  },
  issue_purposes: {
    category: "เบิก-จ่าย",
    description: "วัตถุประสงค์การเบิก เช่น ซ่อม, ติดตั้ง, อะไหล่สำรอง",
    relatedRoutes: [{ label: "ข้อมูลหลัก", path: "/master-data" }],
  },
  issue_purpose_categories: {
    category: "เบิก-จ่าย",
    description: "หมวดหมู่ของวัตถุประสงค์การเบิก",
    relatedRoutes: [{ label: "ข้อมูลหลัก", path: "/master-data" }],
  },
  delivery_confirmations: {
    category: "เบิก-จ่าย",
    description: "การยืนยันรับสินค้าหลังการจ่าย (พร้อมลายเซ็น/ภาพหลักฐาน)",
    relatedRoutes: [{ label: "ยืนยันรับสินค้า", path: "/delivery-confirmation" }],
  },

  // ==================== ส่งตรง ====================
  direct_shipments: {
    category: "ส่งตรง",
    description: "คำขอส่งสินค้าตรงจาก Supplier ถึงปลายทาง (ข้ามคลัง)",
    relatedRoutes: [
      { label: "ขอส่งตรง", path: "/direct-shipping" },
      { label: "อนุมัติส่งตรง", path: "/direct-shipping-approval" },
      { label: "จัดซื้อ-ดำเนินการ", path: "/direct-shipping-procurement" },
    ],
  },
  direct_shipment_items: {
    category: "ส่งตรง",
    description: "รายการสินค้าในแต่ละการส่งตรง",
    relatedRoutes: [{ label: "ขอส่งตรง", path: "/direct-shipping" }],
  },

  // ==================== ภาพโฆษณา ====================
  advertisements: {
    category: "ภาพโฆษณา",
    description: "ข้อมูลภาพโฆษณาที่นำเข้าระบบ",
    relatedRoutes: [{ label: "นำเข้าภาพโฆษณา", path: "/ad-entry" }],
  },
  ad_versions: {
    category: "ภาพโฆษณา",
    description: "เวอร์ชันของภาพโฆษณาแต่ละชิ้น",
    relatedRoutes: [{ label: "นำเข้าภาพโฆษณา", path: "/ad-entry" }],
  },
  ad_issue_requests: {
    category: "ภาพโฆษณา",
    description: "คำขอเบิกภาพโฆษณา",
    relatedRoutes: [
      { label: "เบิกภาพโฆษณา", path: "/ad-request" },
      { label: "จ่ายภาพโฆษณา", path: "/ad-issue" },
    ],
  },
  ad_target_billboards: {
    category: "ภาพโฆษณา",
    description: "ป้ายเป้าหมายของแต่ละภาพโฆษณา",
    relatedRoutes: [{ label: "นำเข้าภาพโฆษณา", path: "/ad-entry" }],
  },
  ad_media_types: {
    category: "ภาพโฆษณา",
    description: "ประเภทสื่อของภาพโฆษณา (Master Data)",
  },
  ad_sizes: {
    category: "ภาพโฆษณา",
    description: "ขนาดของภาพโฆษณา (Master Data)",
  },
  contractors: {
    category: "ภาพโฆษณา",
    description: "ข้อมูลผู้รับเหมาภายนอก (สำหรับการนำส่งภาพ)",
  },

  // ==================== Media Player ====================
  media_players: {
    category: "Media Player / จอภาพ",
    description: "ข้อมูลหลัก Media Player และจอภาพ (Monitor) — แยกประเภทด้วยคอลัมน์ device_type ('MEDIA_PLAYER' / 'MONITOR') ใช้ workflow และตารางชุดเดียวกันทั้งหมด (1 เครื่อง = 1 row พร้อม S/N)",
    relatedRoutes: [
      { label: "MP / จอภาพ Profile", path: "/media-player/search" },
      { label: "รายงาน MP / จอภาพ", path: "/media-player-report" },
    ],
  },
  media_player_images: {
    category: "Media Player",
    description: "รูปภาพ Media Player",
    relatedRoutes: [{ label: "Media Player Profile", path: "/media-player/search" }],
  },
  media_player_specifications: {
    category: "Media Player",
    description: "สเปกทางเทคนิคของแต่ละเครื่อง",
    relatedRoutes: [{ label: "Media Player Profile", path: "/media-player/search" }],
  },
  media_player_billboard_history: {
    category: "Media Player",
    description: "ประวัติการติดตั้ง Media Player กับป้ายโฆษณา",
    relatedRoutes: [{ label: "Media Player Profile", path: "/media-player/search" }],
  },
  media_player_models: { category: "Media Player", description: "รุ่น Media Player (Master Data)" },
  media_player_names: { category: "Media Player", description: "ชื่อ Media Player (Master Data)" },
  media_player_statuses: { category: "Media Player", description: "สถานะของ Media Player (Master Data)" },
  media_player_code_prefixes: { category: "Media Player", description: "Prefix สำหรับรหัส Media Player อัตโนมัติ" },
  mp_symptoms: { category: "Media Player", description: "อาการเสียของ Media Player (Master Data)" },
  mp_assessment_results: { category: "Media Player", description: "ผลการประเมิน Media Player (Master Data)" },
  mp_swap_reject_reasons: { category: "Media Player", description: "เหตุผลการปฏิเสธ Swap (Master Data)" },
  mp_claim_results: { category: "Media Player", description: "ผลการเคลม Media Player (Master Data)" },

  // ==================== เครื่องมือ ====================
  tools: {
    category: "เครื่องมือ",
    description: "ข้อมูลหลักเครื่องมือช่าง",
    relatedRoutes: [{ label: "ข้อมูลเครื่องมือ", path: "/tool-management" }],
  },
  tool_categories: { category: "เครื่องมือ", description: "หมวดหมู่เครื่องมือ" },
  tool_code_prefixes: { category: "เครื่องมือ", description: "Prefix สำหรับรหัสเครื่องมืออัตโนมัติ" },
  tool_pm_tasks: {
    category: "เครื่องมือ",
    description: "งาน PM เครื่องมือที่รอดำเนินการ",
    relatedRoutes: [{ label: "งาน PM", path: "/tool-pm-tasks" }],
  },
  tool_pm_history: {
    category: "เครื่องมือ",
    description: "ประวัติการทำ PM เครื่องมือ",
    relatedRoutes: [{ label: "ประวัติ PM", path: "/tool-pm-history" }],
  },
  tool_pm_task_images: { category: "เครื่องมือ", description: "รูปภาพประกอบงาน PM เครื่องมือ" },
  tool_pm_types: { category: "เครื่องมือ", description: "ประเภทการ PM เครื่องมือ" },
  technicians: { category: "เครื่องมือ", description: "ข้อมูลช่างเทคนิค" },
  technician_tools: { category: "เครื่องมือ", description: "ความสัมพันธ์ช่าง-เครื่องมือที่รับผิดชอบ" },

  // ==================== PM อุปกรณ์ ====================
  equipment_pm_schedules: { category: "PM อุปกรณ์", description: "ตาราง PM อุปกรณ์" },
  equipment_pm_tasks: { category: "PM อุปกรณ์", description: "งาน PM อุปกรณ์รอทำ" },
  equipment_pm_history: { category: "PM อุปกรณ์", description: "ประวัติการ PM อุปกรณ์" },
  equipment_pm_task_images: { category: "PM อุปกรณ์", description: "รูปภาพประกอบงาน PM อุปกรณ์" },
  pm_schedules: { category: "PM อุปกรณ์", description: "ตาราง PM ทั่วไป" },
  pm_history: { category: "PM อุปกรณ์", description: "ประวัติ PM ทั่วไป" },
  pm_action_types: { category: "PM อุปกรณ์", description: "ประเภทการกระทำ PM" },
  pm_results: { category: "PM อุปกรณ์", description: "ผลการ PM" },
  pm_types: { category: "PM อุปกรณ์", description: "ประเภท PM" },

  // ==================== การประเมิน/Swap/Claim ====================
  swap_requests: {
    category: "การประเมิน",
    description: "คำขอ Swap อุปกรณ์/Media Player",
    relatedRoutes: [{ label: "Swap อุปกรณ์/MP", path: "/swap" }],
  },
  swap_executions: { category: "การประเมิน", description: "การดำเนินการ Swap จริง" },
  assessment_logs: {
    category: "การประเมิน",
    description: "บันทึกการประเมินอุปกรณ์",
    relatedRoutes: [{ label: "บันทึกการประเมิน", path: "/assessment" }],
  },
  claim_records: {
    category: "การประเมิน",
    description: "บันทึกการเคลมประกัน/ผู้ขาย",
    relatedRoutes: [{ label: "ติดตามการเคลม", path: "/claims" }],
  },

  // ==================== Master Data ====================
  brands: { category: "Master Data", description: "ยี่ห้อสินค้า/อุปกรณ์", relatedRoutes: [{ label: "ข้อมูลหลัก", path: "/master-data" }] },
  categories: { category: "Master Data", description: "หมวดหมู่หลักของสินค้า", relatedRoutes: [{ label: "ข้อมูลหลัก", path: "/master-data" }] },
  subcategories: { category: "Master Data", description: "หมวดหมู่ย่อยของสินค้า", relatedRoutes: [{ label: "ข้อมูลหลัก", path: "/master-data" }] },
  cms_types: { category: "Master Data", description: "ประเภท CMS (Master Data)" },
  companies: { category: "Master Data", description: "บริษัทในเครือ", relatedRoutes: [{ label: "ข้อมูลหลัก", path: "/master-data" }] },
  departments: { category: "Master Data", description: "ฝ่ายงาน — แหล่งข้อมูลหลัก", relatedRoutes: [{ label: "ข้อมูลหลัก", path: "/master-data" }] },
  sections: { category: "Master Data", description: "แผนกย่อยภายใต้ฝ่าย", relatedRoutes: [{ label: "ข้อมูลหลัก", path: "/master-data" }] },
  suppliers: { category: "Master Data", description: "ผู้จัดจำหน่าย/Supplier", relatedRoutes: [{ label: "ข้อมูลหลัก", path: "/master-data" }] },
  units: { category: "Master Data", description: "หน่วยนับสินค้า", relatedRoutes: [{ label: "ข้อมูลหลัก", path: "/master-data" }] },
  warehouses: { category: "Master Data", description: "คลังสินค้า", relatedRoutes: [{ label: "ข้อมูลหลัก", path: "/master-data" }] },
  locations: { category: "Master Data", description: "ตำแหน่งจัดเก็บภายในคลัง", relatedRoutes: [{ label: "ข้อมูลหลัก", path: "/master-data" }] },
  storage_slots: { category: "Master Data", description: "ช่องจัดเก็บในตำแหน่ง" },
  sub_storage_slots: { category: "Master Data", description: "ช่องจัดเก็บย่อย" },

  // ==================== ผู้ใช้/สิทธิ์ ====================
  profiles: { category: "ผู้ใช้/สิทธิ์", description: "ข้อมูลโปรไฟล์ผู้ใช้ (ชื่อ, เบอร์โทร)" },
  user_roles: { category: "ผู้ใช้/สิทธิ์", description: "บทบาทของผู้ใช้ (admin/super_admin/user/manager)", relatedRoutes: [{ label: "จัดการผู้ใช้", path: "/admin" }] },
  user_departments: { category: "ผู้ใช้/สิทธิ์", description: "สิทธิ์เข้าถึงตามฝ่าย", relatedRoutes: [{ label: "จัดการผู้ใช้", path: "/admin" }] },
  user_function_permissions: { category: "ผู้ใช้/สิทธิ์", description: "สิทธิ์เข้าถึงแต่ละฟังก์ชัน/เมนู", relatedRoutes: [{ label: "จัดการผู้ใช้", path: "/admin" }] },
  permission_templates: { category: "ผู้ใช้/สิทธิ์", description: "เทมเพลตชุดสิทธิ์สำเร็จรูป สำหรับมอบหมายให้ผู้ใช้ใหม่ได้รวดเร็ว", relatedRoutes: [{ label: "จัดการผู้ใช้", path: "/admin" }] },

  // ==================== ระบบ/อื่นๆ ====================
  notifications: { category: "ระบบ", description: "การแจ้งเตือนภายในระบบ" },
  notification_settings: { category: "ระบบ", description: "การตั้งค่าการแจ้งเตือนของผู้ใช้", relatedRoutes: [{ label: "ตั้งค่าแจ้งเตือน", path: "/notification-settings" }] },
  notification_dismissals: { category: "ระบบ", description: "การซ่อนแจ้งเตือนรายบุคคล" },
  system_settings: { category: "ระบบ", description: "การตั้งค่าระดับระบบ" },
  external_db_connections: { category: "ระบบ", description: "การตั้งค่าเชื่อมต่อฐานข้อมูลภายนอก (MSSQL ฯลฯ)" },
};

export const CATEGORY_ORDER = [
  "ป้ายโฆษณา",
  "คลังสินค้า",
  "รับเข้า",
  "เบิก-จ่าย",
  "ส่งตรง",
  "ภาพโฆษณา",
  "Media Player",
  "เครื่องมือ",
  "PM อุปกรณ์",
  "การประเมิน",
  "Master Data",
  "ผู้ใช้/สิทธิ์",
  "ระบบ",
  "ยังไม่มีคำอธิบาย",
];
