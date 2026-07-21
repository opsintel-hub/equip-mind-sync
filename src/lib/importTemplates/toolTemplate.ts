import * as XLSX from "xlsx";
import type { RefLookups } from "./refData";

const HEADERS = [
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

export function downloadToolTemplate(refs: RefLookups) {
  const wb = XLSX.utils.book_new();

  const instructions = [
    ["คอลัมน์", "จำเป็น", "คำอธิบาย / ค่าที่ใช้ได้"],
    ["code", "✅", "รหัสเครื่องมือ (ห้ามซ้ำ)"],
    ["name", "✅", "ชื่อเครื่องมือ"],
    ["description", "", "รายละเอียด"],
    ["tool_category", "", "ดูชีต _ref_tool_categories (ใช้ชื่อ)"],
    ["tool_subcategory", "", "ดูชีต _ref_tool_subcategories"],
    ["brand", "", "ดูชีต _ref_brands"],
    ["supplier_code", "", "code จากชีต _ref_suppliers"],
    ["company_name", "", "name จากชีต _ref_companies"],
    ["department", "", "ดูชีต _ref_departments"],
    ["location_code", "", "code จากชีต _ref_locations"],
    ["unit", "✅", "หน่วย เช่น ชิ้น / เครื่อง / ตัว"],
    ["quantity", "✅", "จำนวนที่รับเข้า (ตัวเลข ≥ 1)"],
    ["unit_price", "", "ราคาต่อหน่วย (บาท)"],
    ["serial_number", "", "S/N (ถ้ามี)"],
    ["warehouse_entry_date", "✅", "วันรับเข้าคลัง YYYY-MM-DD"],
    ["warranty_expiry_date", "", "วันหมดประกัน YYYY-MM-DD"],
    ["has_warranty", "", "Yes / No (default Yes)"],
    ["pm_interval_days", "", "จำนวนวันระหว่างการ PM (default 30 — ใส่ 0 ถ้าไม่ต้อง PM)"],
    ["is_asset", "", "Yes / No — เป็นทรัพย์สินของบริษัทมั้ย"],
    ["asset_code", "", "รหัสทรัพย์สิน"],
    ["is_personal_tool", "", "Yes / No — เครื่องมือประจำตัวช่าง (default No)"],
    ["requires_approval", "", "Yes / No — ต้องอนุมัติจากหัวหน้าก่อนจ่ายมั้ย (default No — คลังจ่ายได้เลย)"],
    ["return_required", "", "Yes / No — ต้องคืนคลังหลังใช้งานมั้ย (default Yes; personal tool = No)"],
    ["notes", "", "หมายเหตุ"],
    [],
    ["หมายเหตุ", "", "ระบบจะตรวจสอบทุกแถวก่อนนำเข้า — ถ้ามี error ใดๆ จะไม่นำเข้าทั้งไฟล์"],
  ];
  const wsInstr = XLSX.utils.aoa_to_sheet(instructions);
  wsInstr["!cols"] = [{ wch: 24 }, { wch: 10 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInstr, "Instructions");

  const example: Record<string, any> = {
    code: "TOOL-EXAMPLE-001",
    name: "มิเตอร์วัดไฟ (ตัวอย่าง)",
    description: "ตัวอย่าง — ลบก่อนนำเข้า",
    tool_category: refs.tool_categories[0]?.name || "",
    tool_subcategory: "",
    brand: refs.brands[0]?.name || "",
    supplier_code: refs.suppliers[0]?.code || "",
    company_name: refs.companies[0]?.name || "",
    department: refs.departments[0]?.name || "",
    location_code: refs.locations[0]?.code || "",
    unit: "ชิ้น",
    quantity: 1,
    unit_price: 2500,
    serial_number: "",
    warehouse_entry_date: new Date().toISOString().slice(0, 10),
    warranty_expiry_date: "",
    has_warranty: "Yes",
    pm_interval_days: 180,
    is_asset: "Yes",
    asset_code: "",
    is_personal_tool: "No",
    requires_approval: "No",
    return_required: "Yes",
    notes: "",
  };
  const ws = XLSX.utils.json_to_sheet([example], { header: HEADERS });
  ws["!cols"] = HEADERS.map((h) => ({ wch: Math.max(16, h.length + 2) }));
  XLSX.utils.book_append_sheet(wb, ws, "Tools");

  appendRef(wb, "_ref_tool_categories", ["name"], refs.tool_categories);
  appendRef(wb, "_ref_tool_subcategories", ["name"], refs.tool_subcategories.map((s) => ({ name: s.name })));
  appendRef(wb, "_ref_brands", ["name", "brand_type"], refs.brands);
  appendRef(wb, "_ref_suppliers", ["code", "name"], refs.suppliers.map((s) => ({ code: s.code, name: s.name })));
  appendRef(wb, "_ref_companies", ["name"], refs.companies.map((c) => ({ name: c.name })));
  appendRef(wb, "_ref_departments", ["name"], refs.departments);
  appendRef(wb, "_ref_locations", ["code", "name", "department"],
    refs.locations.map((l) => ({ code: l.code, name: l.name, department: l.department || "" })));

  XLSX.writeFile(wb, `tool_import_template_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function appendRef(wb: XLSX.WorkBook, name: string, headers: string[], rows: any[]) {
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(18, h.length + 2) }));
  XLSX.utils.book_append_sheet(wb, ws, name);
}
