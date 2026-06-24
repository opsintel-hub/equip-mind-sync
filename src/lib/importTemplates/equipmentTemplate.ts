import * as XLSX from "xlsx";
import type { RefLookups } from "./refData";

const HEADERS = [
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

export function downloadEquipmentTemplate(refs: RefLookups) {
  const wb = XLSX.utils.book_new();

  // Instructions sheet
  const instructions = [
    ["คอลัมน์", "จำเป็น", "คำอธิบาย / ค่าที่ใช้ได้"],
    ["code", "✅", "รหัสอุปกรณ์ (ห้ามซ้ำในไฟล์และในระบบ)"],
    ["name", "✅", "ชื่ออุปกรณ์"],
    ["description", "", "รายละเอียดเพิ่มเติม"],
    ["category", "✅", "ดูค่าที่ใช้ได้ในชีต _ref_categories"],
    ["subcategory", "", "ดูชีต _ref_subcategories (ใช้ชื่อ ไม่ใช่ id)"],
    ["unit", "✅", "ดูชีต _ref_units"],
    ["brand", "", "ดูชีต _ref_brands"],
    ["supplier_code", "", "ใช้ code ของ supplier จากชีต _ref_suppliers"],
    ["company_name", "", "ใช้ name จากชีต _ref_companies"],
    ["department", "", "ดูชีต _ref_departments"],
    ["location_code", "✅", "ใช้ code จากชีต _ref_locations (คลังเริ่มต้น)"],
    ["quantity_in_stock", "✅", "จำนวนรับเข้าครั้งแรก (ตัวเลข ≥ 0)"],
    ["min_stock_level", "", "จุดสั่งซื้อขั้นต่ำ"],
    ["unit_price", "✅", "ราคาต่อหน่วย (บาท)"],
    ["item_condition", "✅", "new / used / refurbished"],
    ["warehouse_entry_date", "✅", "วันที่รับเข้าคลัง — รูปแบบ YYYY-MM-DD"],
    ["warranty_expiry_date", "", "วันหมดประกัน YYYY-MM-DD"],
    ["warranty_years", "", "ระยะรับประกัน (ปี)"],
    ["serial_number", "", "S/N (ถ้ามี)"],
    ["asset_code", "", "รหัสทรัพย์สิน"],
    ["equipment_id_code", "", "Equipment ID"],
    ["is_asset", "", "Yes / No"],
    ["depreciation_months", "", "ค่าเสื่อม (เดือน)"],
    ["volt / amp / watt / lumen / lux", "", "Spec ไฟฟ้า/แสง"],
    ["width_cm / height_cm / depth_cm", "", "ขนาด (ซม.)"],
    ["po_number / pr_number / invoice_number / po_item_no", "", "เลขเอกสาร"],
    ["notes", "", "หมายเหตุ"],
    ["install_billboard_old_code", "", "ถ้ากรอก = ติดตั้งบนป้ายนี้ทันที (ใช้ old_code จากชีต _ref_billboards)"],
    ["install_date", "", "จำเป็นถ้ามี install_billboard_old_code — YYYY-MM-DD"],
    ["install_quantity", "", "จำเป็นถ้ามี install_billboard_old_code (1 ถึง quantity_in_stock)"],
    [],
    ["หมายเหตุสำคัญ", "", "ระบบจะตรวจสอบทุกแถวก่อนนำเข้า — ถ้ามี error ใดๆ จะไม่นำเข้าทั้งไฟล์"],
  ];
  const wsInstr = XLSX.utils.aoa_to_sheet(instructions);
  wsInstr["!cols"] = [{ wch: 40 }, { wch: 10 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInstr, "Instructions");

  // Main sheet with header + 1 example row
  const example: Record<string, any> = {
    code: "LED-EXAMPLE-001",
    name: "LED Display 55 นิ้ว (ตัวอย่าง)",
    description: "ตัวอย่างข้อมูล — ลบแถวนี้ก่อนนำเข้า",
    category: refs.categories[0]?.name || "อื่นๆ",
    subcategory: refs.subcategories[0]?.name || "",
    unit: refs.units[0]?.name || "ชิ้น",
    brand: refs.brands[0]?.name || "",
    supplier_code: refs.suppliers[0]?.code || "",
    company_name: refs.companies[0]?.name || "",
    department: refs.departments[0]?.name || "",
    location_code: refs.locations[0]?.code || "",
    quantity_in_stock: 10,
    min_stock_level: 2,
    unit_price: 25000,
    item_condition: "new",
    warehouse_entry_date: new Date().toISOString().slice(0, 10),
    warranty_expiry_date: "",
    warranty_years: 2,
    serial_number: "",
    asset_code: "",
    equipment_id_code: "",
    is_asset: "No",
    depreciation_months: 60,
    volt: "", amp: "", watt: "", lumen: "", lux: "",
    width_cm: "", height_cm: "", depth_cm: "",
    po_number: "", pr_number: "", invoice_number: "", po_item_no: "",
    notes: "",
    install_billboard_old_code: "",
    install_date: "",
    install_quantity: "",
  };
  const ws = XLSX.utils.json_to_sheet([example], { header: HEADERS });
  ws["!cols"] = HEADERS.map((h) => ({ wch: Math.max(14, h.length + 2) }));
  XLSX.utils.book_append_sheet(wb, ws, "Equipment");

  // Reference sheets
  appendRef(wb, "_ref_categories", ["name"], refs.categories);
  appendRef(wb, "_ref_subcategories", ["name"], refs.subcategories.map((s) => ({ name: s.name })));
  appendRef(wb, "_ref_units", ["name"], refs.units);
  appendRef(wb, "_ref_brands", ["name", "brand_type"], refs.brands);
  appendRef(wb, "_ref_suppliers", ["code", "name"], refs.suppliers.map((s) => ({ code: s.code, name: s.name })));
  appendRef(wb, "_ref_companies", ["name"], refs.companies.map((c) => ({ name: c.name })));
  appendRef(wb, "_ref_departments", ["name"], refs.departments);
  appendRef(wb, "_ref_locations", ["code", "name", "department"], refs.locations.map((l) => ({ code: l.code, name: l.name, department: l.department || "" })));
  appendRef(wb, "_ref_billboards", ["old_code", "location_name", "equipment_id"],
    refs.billboards.filter((b) => b.old_code).map((b) => ({
      old_code: b.old_code, location_name: b.location_name || "", equipment_id: b.equipment_id,
    })));

  XLSX.writeFile(wb, `equipment_import_template_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function appendRef(wb: XLSX.WorkBook, name: string, headers: string[], rows: any[]) {
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(18, h.length + 2) }));
  XLSX.utils.book_append_sheet(wb, ws, name);
}

export { HEADERS as EQUIPMENT_HEADERS };
