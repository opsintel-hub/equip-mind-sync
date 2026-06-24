import * as XLSX from "xlsx";
import type { RefLookups } from "./refData";

const HEADERS = [
  "code", "name", "brand", "model", "cms_type", "specification",
  "serial_number_1", "serial_number_2", "asset_code", "equipment_id_code",
  "remote_name", "activate_windows",
  "company_name", "department", "location_code", "supplier_code",
  "item_condition", "unit_price",
  "depreciation_months", "usage_lifespan_months",
  "date_of_receipt", "warranty_expiry_date", "warranty_years",
  "po_number", "pr_number", "invoice_number", "po_item_no",
  "order_for_project", "asset_caretaker", "planned_install_location", "notes",
  "install_billboard_old_code", "install_date",
];

export function downloadMediaPlayerTemplate(refs: RefLookups) {
  const wb = XLSX.utils.book_new();

  const instructions = [
    ["คอลัมน์", "จำเป็น", "คำอธิบาย / ค่าที่ใช้ได้"],
    ["code", "✅", "รหัส MP (1 บรรทัด = 1 เครื่อง — code ซ้ำได้ในไฟล์เดียว ถ้าเป็นรุ่นเดียวกันคนละเครื่อง)"],
    ["name", "✅", "ชื่อรุ่น"],
    ["brand", "", "ดูชีต _ref_brands (brand_type = media_player)"],
    ["model", "", "ดูชีต _ref_mp_models"],
    ["cms_type", "", "ดูชีต _ref_cms_types"],
    ["specification", "", "Spec / รายละเอียด"],
    ["serial_number_1", "✅", "S/N เครื่อง — ห้ามซ้ำในระบบ"],
    ["serial_number_2", "", "S/N สำรอง (ถ้ามี) — ห้ามซ้ำเช่นกัน"],
    ["asset_code", "", "รหัสทรัพย์สิน"],
    ["equipment_id_code", "", "Equipment ID"],
    ["remote_name", "", "ชื่อ remote"],
    ["activate_windows", "", "Windows activation key/note"],
    ["company_name", "", "ดูชีต _ref_companies"],
    ["department", "", "ดูชีต _ref_departments"],
    ["location_code", "✅", "ใช้ code จาก _ref_locations (คลังเริ่มต้น)"],
    ["supplier_code", "", "ใช้ code จาก _ref_suppliers"],
    ["item_condition", "✅", "new / used / refurbished"],
    ["unit_price", "✅", "ราคา (บาท)"],
    ["depreciation_months", "", "ค่าเสื่อม (default 60 เดือน)"],
    ["usage_lifespan_months", "", "อายุใช้งาน (เดือน)"],
    ["date_of_receipt", "✅", "วันที่รับเข้า YYYY-MM-DD"],
    ["warranty_expiry_date", "", "วันหมดประกัน YYYY-MM-DD"],
    ["warranty_years", "", "ระยะรับประกัน (ปี)"],
    ["po_number / pr_number / invoice_number / po_item_no", "", "เลขเอกสาร"],
    ["order_for_project", "", "โครงการ"],
    ["asset_caretaker", "", "ผู้ดูแลทรัพย์สิน"],
    ["planned_install_location", "", "Location ตามแผน PO"],
    ["notes", "", "หมายเหตุ"],
    ["install_billboard_old_code", "", "ถ้ากรอก = ติดตั้งบนป้ายทันที (old_code จาก _ref_billboards)"],
    ["install_date", "", "จำเป็นถ้ามี install_billboard_old_code"],
    [],
    ["หมายเหตุสำคัญ", "", "ระบบจะตรวจสอบทุกแถวก่อนนำเข้า — ถ้ามี error ใดๆ จะไม่นำเข้าทั้งไฟล์"],
  ];
  const wsInstr = XLSX.utils.aoa_to_sheet(instructions);
  wsInstr["!cols"] = [{ wch: 45 }, { wch: 10 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInstr, "Instructions");

  const example: Record<string, any> = {
    code: "MP-EXAMPLE-001",
    name: "Media Player รุ่นตัวอย่าง",
    brand: (refs.brands.find((b) => b.brand_type === "media_player")?.name) || refs.brands[0]?.name || "",
    model: refs.mp_models[0]?.name || "",
    cms_type: refs.cms_types[0]?.name || "",
    specification: "ตัวอย่าง — ลบแถวนี้ก่อนนำเข้า",
    serial_number_1: "SN-EXAMPLE-A",
    serial_number_2: "SN-EXAMPLE-B",
    asset_code: "",
    equipment_id_code: "",
    remote_name: "",
    activate_windows: "",
    company_name: refs.companies[0]?.name || "",
    department: refs.departments[0]?.name || "",
    location_code: refs.locations[0]?.code || "",
    supplier_code: refs.suppliers[0]?.code || "",
    item_condition: "new",
    unit_price: 15000,
    depreciation_months: 60,
    usage_lifespan_months: 60,
    date_of_receipt: new Date().toISOString().slice(0, 10),
    warranty_expiry_date: "",
    warranty_years: 2,
    po_number: "", pr_number: "", invoice_number: "", po_item_no: "",
    order_for_project: "",
    asset_caretaker: "",
    planned_install_location: "",
    notes: "",
    install_billboard_old_code: "",
    install_date: "",
  };
  const ws = XLSX.utils.json_to_sheet([example], { header: HEADERS });
  ws["!cols"] = HEADERS.map((h) => ({ wch: Math.max(14, h.length + 2) }));
  XLSX.utils.book_append_sheet(wb, ws, "MediaPlayer");

  appendRef(wb, "_ref_brands", ["name", "brand_type"], refs.brands);
  appendRef(wb, "_ref_mp_models", ["name"], refs.mp_models.map((m) => ({ name: m.name })));
  appendRef(wb, "_ref_cms_types", ["name"], refs.cms_types.map((c) => ({ name: c.name })));
  appendRef(wb, "_ref_companies", ["name"], refs.companies.map((c) => ({ name: c.name })));
  appendRef(wb, "_ref_departments", ["name"], refs.departments);
  appendRef(wb, "_ref_suppliers", ["code", "name"], refs.suppliers.map((s) => ({ code: s.code, name: s.name })));
  appendRef(wb, "_ref_locations", ["code", "name", "department"], refs.locations.map((l) => ({ code: l.code, name: l.name, department: l.department || "" })));
  appendRef(wb, "_ref_billboards", ["old_code", "location_name", "equipment_id"],
    refs.billboards.filter((b) => b.old_code).map((b) => ({
      old_code: b.old_code, location_name: b.location_name || "", equipment_id: b.equipment_id,
    })));

  XLSX.writeFile(wb, `media_player_import_template_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function appendRef(wb: XLSX.WorkBook, name: string, headers: string[], rows: any[]) {
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(18, h.length + 2) }));
  XLSX.utils.book_append_sheet(wb, ws, name);
}

export { HEADERS as MP_HEADERS };
