import * as XLSX from "xlsx";

/**
 * Canonical Excel template definitions.
 * เวอร์ชันของ Template คำนวณจากรายชื่อคอลัมน์จริง — ถ้าคอลัมน์เปลี่ยน เวอร์ชันจะเปลี่ยนทันที
 * ไฟล์เก่าที่ผู้ใช้เก็บไว้จะถูกตรวจจับและบล็อกก่อนนำเข้า
 */

export const EQUIPMENT_HEADERS = [
  "code", "name", "description", "category", "subcategory", "unit",
  "brand", "supplier_code", "company_name", "department", "location_code",
  "quantity_in_stock", "min_stock_level", "unit_price", "item_condition",
  "warehouse_entry_date", "warranty_expiry_date", "warranty_years",
  "serial_number", "asset_code", "equipment_id_code", "is_asset", "depreciation_months",
  "volt", "amp", "watt", "lumen", "lux",
  "width_cm", "height_cm", "depth_cm",
  "po_number", "pr_number", "invoice_number", "po_item_no",
  "notes",
  "install_billboard_old_code", "install_date", "install_quantity",
];

export const MEDIA_PLAYER_HEADERS = [
  "code", "name", "device_type", "brand", "model", "cms_type", "specification",
  "serial_number_1", "serial_number_2", "asset_code", "equipment_id_code",
  "remote_name", "activate_windows",
  "company_name", "department", "sub_media_type", "location_code", "supplier_code",
  "item_condition", "unit_price",
  "depreciation_months", "usage_lifespan_months",
  "date_of_receipt", "warranty_expiry_date", "warranty_years",
  "po_number", "pr_number", "invoice_number", "po_item_no",
  "order_for_project", "asset_caretaker", "planned_install_location", "notes",
  "install_billboard_old_code", "install_date",
];

export const TOOL_HEADERS = [
  "code", "name", "description", "tool_category", "tool_subcategory",
  "brand", "supplier_code", "company_name", "department", "location_code",
  "unit", "quantity", "unit_price",
  "serial_number", "warehouse_entry_date",
  "warranty_expiry_date", "has_warranty",
  "pm_interval_days",
  "is_asset", "asset_code",
  "is_personal_tool", "requires_approval", "return_required",
  "notes",
];

export const SUPPLIER_HEADERS = [
  "Company", "Vendor ID", "Tax ID", "Vendor Name", "Description",
  "Media Site Name", "Contact Person", "Phone", "Email", "Address", "Notes",
];

export const WAREHOUSE_SHEET_HEADERS = [
  "รหัสคลัง (code)*",
  "ชื่อคลัง (name)*",
  "ประเภทพื้นที่ (storage_area) Indoor|Outdoor|Semi-outdoor*",
  "ฝ่าย (department)",
  "รายละเอียด (description)",
];

export const LOCATION_SHEET_HEADERS = [
  "รหัสคลังสินค้า (warehouse_code)*",
  "รหัสตำแหน่ง (code)*",
  "ชื่อตำแหน่ง (name)*",
  "รายละเอียด (description)",
  "พื้นที่จัดเก็บ (storage_area)",
  "รหัสโซน (zone_code)",
  "ชื่อโซน (zone_name)",
  "กว้าง cm (width_cm)",
  "สูง cm (height_cm)",
  "ลึก cm (depth_cm)",
];

/** Legacy in-dialog templates (simplified column sets) */
export const EQUIPMENT_SIMPLE_HEADERS = [
  "รหัสอุปกรณ์ (code)*",
  "ชื่ออุปกรณ์ (name)*",
  "หมวดหมู่ (category)*",
  "ฝ่าย (department)",
  "ยี่ห้อ (brand)",
  "หน่วย (unit)*",
  "จำนวน (quantity_in_stock)*",
  "จุดสั่งซื้อ (min_stock_level)",
  "ราคาต่อหน่วย (unit_price)",
  "หมายเลขซีเรียล (serial_number)",
  "โวลท์ (volt)",
  "แอมป์ (amp)",
  "วัตต์ (watt)",
  "ลูเมน (lumen)",
  "ลักซ์ (lux)",
  "วันหมดอายุ (expiry_date)",
  "วันหมดประกัน (warranty_expiry_date)",
  "เป็นสินทรัพย์ (is_asset)",
  "รหัสสินทรัพย์ (asset_code)",
  "รหัส Equipment ID (equipment_id_code)",
  "หมายเหตุ (notes)",
];

export const TOOL_SIMPLE_HEADERS = [
  "รหัสเครื่องมือ*",
  "ชื่อเครื่องมือ*",
  "หมวดหมู่",
  "ฝ่าย",
  "บริษัท",
  "ยี่ห้อ",
  "หน่วย*",
  "จำนวน*",
  "Serial Number",
  "ราคาต่อชิ้น (บาท)",
  "ระยะเวลา PM (วัน)*",
  "เป็นทรัพย์สิน",
  "เลขที่ทรัพย์สิน",
  "ผู้รับผิดชอบ",
  "ประจำตัวช่าง",
  "มีประกัน",
  "วันหมดประกัน (yyyy-mm-dd)",
  "วันหมดอายุ (yyyy-mm-dd)",
  "วันที่นำเข้าคลัง (yyyy-mm-dd)",
  "หมายเหตุ",
];

/** kinds ที่ใช้หน้า ImportPageShell (มี RPC + prefix counter) */
export type ImportTemplateKind = "equipment" | "media_player" | "tool";
export type TemplateKind = ImportTemplateKind | "supplier" | "location" | "equipment_simple" | "tool_simple";

interface TemplateDef {
  kind: TemplateKind;
  label: string;
  sheetName: string;
  headers: string[];
  /** major revision — เพิ่มเลขนี้เมื่อเปลี่ยนความหมายของคอลัมน์โดยชื่อไม่เปลี่ยน */
  revision: number;
}

export const TEMPLATE_DEFS: Record<TemplateKind, TemplateDef> = {
  equipment: { kind: "equipment", label: "อุปกรณ์", sheetName: "Equipment", headers: EQUIPMENT_HEADERS, revision: 1 },
  media_player: { kind: "media_player", label: "Media Player / จอภาพ", sheetName: "MediaPlayer", headers: MEDIA_PLAYER_HEADERS, revision: 1 },
  tool: { kind: "tool", label: "เครื่องมือ", sheetName: "Tools", headers: TOOL_HEADERS, revision: 1 },
  supplier: { kind: "supplier", label: "ผู้จำหน่าย", sheetName: "Vendor list-Store", headers: SUPPLIER_HEADERS, revision: 1 },
  equipment_simple: { kind: "equipment_simple", label: "อุปกรณ์ (แบบย่อ)", sheetName: "Equipment", headers: EQUIPMENT_SIMPLE_HEADERS, revision: 1 },
  tool_simple: { kind: "tool_simple", label: "เครื่องมือ (แบบย่อ)", sheetName: "เครื่องมือ", headers: TOOL_SIMPLE_HEADERS, revision: 1 },
  location: {
    kind: "location", label: "คลัง & ตำแหน่งจัดเก็บ", sheetName: "Locations",
    headers: [...WAREHOUSE_SHEET_HEADERS, ...LOCATION_SHEET_HEADERS], revision: 1,
  },
};


const META_SHEET = "_template_meta";

function hashHeaders(headers: string[]): string {
  let h = 0x811c9dc5;
  const s = headers.join("|");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function templateVersion(kind: TemplateKind): string {
  const def = TEMPLATE_DEFS[kind];
  return `v${def.revision}.${def.headers.length}-${hashHeaders(def.headers)}`;
}

/** แนบชีต meta เข้ากับ workbook ตอนดาวน์โหลด Template */
export function appendTemplateMeta(wb: XLSX.WorkBook, kind: TemplateKind) {
  const def = TEMPLATE_DEFS[kind];
  const rows = [
    ["key", "value"],
    ["template_kind", def.kind],
    ["template_version", templateVersion(kind)],
    ["sheet_name", def.sheetName],
    ["column_count", String(def.headers.length)],
    ["generated_at", new Date().toISOString()],
    ["columns", def.headers.join(",")],
    ["หมายเหตุ", "ห้ามลบหรือแก้ไขชีตนี้ — ระบบใช้ตรวจสอบว่า Template เป็นเวอร์ชันล่าสุด"],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 20 }, { wch: 100 }];
  XLSX.utils.book_append_sheet(wb, ws, META_SHEET);
}

export interface TemplateCheck {
  status: "ok" | "outdated" | "no_meta" | "wrong_kind";
  fileVersion: string | null;
  currentVersion: string;
  missing: string[];
  extra: string[];
  message: string;
  blocking: boolean;
}

/** ตรวจ workbook ที่ผู้ใช้อัปโหลด ว่าเป็น Template เวอร์ชันล่าสุดหรือไม่ */
export function verifyWorkbook(wb: XLSX.WorkBook, kind: TemplateKind, dataHeaders: string[]): TemplateCheck {
  const def = TEMPLATE_DEFS[kind];
  const current = templateVersion(kind);

  const missing = def.headers.filter((h) => !dataHeaders.includes(h));
  const extra = dataHeaders.filter((h) => !def.headers.includes(h));

  const metaWs = wb.Sheets[META_SHEET];
  let fileVersion: string | null = null;
  let fileKind: string | null = null;
  if (metaWs) {
    const rows = XLSX.utils.sheet_to_json<any>(metaWs, { header: 1 });
    for (const r of rows) {
      if (r?.[0] === "template_version") fileVersion = String(r[1] ?? "");
      if (r?.[0] === "template_kind") fileKind = String(r[1] ?? "");
    }
  }

  if (fileKind && fileKind !== kind) {
    return {
      status: "wrong_kind", fileVersion, currentVersion: current, missing, extra, blocking: true,
      message: `ไฟล์นี้เป็น Template ของ "${TEMPLATE_DEFS[fileKind as TemplateKind]?.label || fileKind}" ไม่ใช่ของ "${def.label}" — กรุณาดาวน์โหลด Template ที่ถูกต้อง`,
    };
  }

  if (fileVersion === current && missing.length === 0) {
    return { status: "ok", fileVersion, currentVersion: current, missing, extra, blocking: false, message: "Template เป็นเวอร์ชันล่าสุด" };
  }

  if (missing.length > 0) {
    return {
      status: "outdated", fileVersion, currentVersion: current, missing, extra, blocking: true,
      message: `Template ไม่ตรงกับโครงสร้างปัจจุบัน — ขาดคอลัมน์ ${missing.length} รายการ: ${missing.join(", ")} กรุณาดาวน์โหลด Template อัพเดทล่าสุดแล้วกรอกใหม่`,
    };
  }

  if (!fileVersion) {
    return {
      status: "no_meta", fileVersion, currentVersion: current, missing, extra, blocking: false,
      message: "ไม่พบข้อมูลเวอร์ชันในไฟล์ (อาจเป็นไฟล์ที่สร้างเอง) — คอลัมน์ครบถ้วน ระบบอนุญาตให้นำเข้าต่อได้",
    };
  }

  return {
    status: "outdated", fileVersion, currentVersion: current, missing, extra, blocking: false,
    message: `ไฟล์เป็น Template เวอร์ชัน ${fileVersion} (ล่าสุดคือ ${current}) — คอลัมน์หลักครบ จึงนำเข้าต่อได้ แต่แนะนำให้ใช้ไฟล์ล่าสุด`,
  };
}
