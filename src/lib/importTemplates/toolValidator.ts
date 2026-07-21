import type { RefLookups } from "./refData";
import type { ValidatedRow } from "./validators";

const truthy = (v: any) => v !== undefined && v !== null && String(v).trim() !== "";
const s = (v: any) => (truthy(v) ? String(v).trim() : "");
const n = (v: any) => {
  if (!truthy(v)) return null;
  const x = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(x) ? x : NaN;
};
const isoDate = (v: any): string | null => {
  if (!truthy(v)) return null;
  if (typeof v === "number") {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  const str = String(v).trim();
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return "INVALID";
};
const boolYN = (v: any, def = false): boolean => {
  const t = s(v).toLowerCase();
  if (!t) return def;
  return ["yes", "y", "true", "1", "ใช่"].includes(t);
};

export function validateToolRows(rows: any[], refs: RefLookups, existingCodes: Set<string>): ValidatedRow[] {
  const seen = new Set<string>();
  const out: ValidatedRow[] = [];

  const brandNames = new Set(refs.brands.map((c) => c.name));
  const deptNames = new Set(refs.departments.map((c) => c.name));
  const supplierByCode = new Map(refs.suppliers.map((c) => [c.code, c.id]));
  const companyByName = new Map(refs.companies.map((c) => [c.name, c.id]));
  const locationByCode = new Map(refs.locations.map((c) => [c.code, c.id]));
  const catByName = new Map(refs.tool_categories.map((c) => [c.name, c.id]));
  const subcatByName = new Map(refs.tool_subcategories.map((c) => [c.name, c.id]));

  rows.forEach((row, idx) => {
    const rowNumber = idx + 2;
    const errors: string[] = [];

    const code = s(row.code);
    const name = s(row.name);
    if (!code) errors.push("code ว่าง");
    if (!name) errors.push("name ว่าง");
    if (code && seen.has(code)) errors.push(`code "${code}" ซ้ำในไฟล์`);
    if (code) seen.add(code);
    if (code && existingCodes.has(code)) errors.push(`code "${code}" มีอยู่แล้วในระบบ`);

    const catName = s(row.tool_category);
    let catId: string | null = null;
    if (catName) {
      const id = catByName.get(catName);
      if (!id) errors.push(`tool_category "${catName}" ไม่อยู่ใน master`);
      else catId = id;
    }

    const subName = s(row.tool_subcategory);
    let subId: string | null = null;
    if (subName) {
      const id = subcatByName.get(subName);
      if (!id) errors.push(`tool_subcategory "${subName}" ไม่อยู่ใน master`);
      else subId = id;
    }

    const brand = s(row.brand);
    if (brand && !brandNames.has(brand)) errors.push(`brand "${brand}" ไม่อยู่ใน master`);

    const supplierCode = s(row.supplier_code);
    let supplierId: string | null = null;
    if (supplierCode) {
      const id = supplierByCode.get(supplierCode);
      if (!id) errors.push(`supplier_code "${supplierCode}" ไม่อยู่ใน master`);
      else supplierId = id;
    }

    const companyName = s(row.company_name);
    let companyId: string | null = null;
    if (companyName) {
      const id = companyByName.get(companyName);
      if (!id) errors.push(`company_name "${companyName}" ไม่อยู่ใน master`);
      else companyId = id;
    }

    const department = s(row.department);
    if (department && !deptNames.has(department)) errors.push(`department "${department}" ไม่อยู่ใน master`);

    const locationCode = s(row.location_code);
    let locationId: string | null = null;
    if (locationCode) {
      const id = locationByCode.get(locationCode);
      if (!id) errors.push(`location_code "${locationCode}" ไม่อยู่ใน master`);
      else locationId = id;
    }

    const unit = s(row.unit) || "ชิ้น";
    const qty = n(row.quantity);
    if (qty === null || Number.isNaN(qty) || qty < 1 || !Number.isInteger(qty))
      errors.push("quantity ต้องเป็นจำนวนเต็ม ≥ 1");

    const price = n(row.unit_price);
    if (price !== null && (Number.isNaN(price) || price < 0)) errors.push("unit_price ต้องเป็นตัวเลข ≥ 0");

    const entryDate = isoDate(row.warehouse_entry_date);
    if (!entryDate || entryDate === "INVALID") errors.push("warehouse_entry_date รูปแบบไม่ถูกต้อง");
    const warrantyDate = isoDate(row.warranty_expiry_date);
    if (warrantyDate === "INVALID") errors.push("warranty_expiry_date รูปแบบไม่ถูกต้อง");

    const pmDays = n(row.pm_interval_days);
    if (pmDays !== null && (Number.isNaN(pmDays) || pmDays < 0 || !Number.isInteger(pmDays)))
      errors.push("pm_interval_days ต้องเป็นจำนวนเต็ม ≥ 0");

    const isPersonal = boolYN(row.is_personal_tool, false);

    const payload = {
      code, name,
      description: s(row.description) || null,
      tool_category_id: catId,
      tool_subcategory_id: subId,
      brand: brand || null,
      supplier_id: supplierId,
      company_id: companyId,
      department: department || null,
      location_id: locationId,
      unit,
      quantity: qty,
      unit_price: price ?? 0,
      serial_number: s(row.serial_number) || null,
      warehouse_entry_date: entryDate,
      warranty_expiry_date: warrantyDate === "INVALID" ? null : warrantyDate,
      has_warranty: boolYN(row.has_warranty, true),
      pm_interval_days: pmDays ?? 30,
      is_asset: boolYN(row.is_asset, false),
      asset_code: s(row.asset_code) || null,
      is_personal_tool: isPersonal,
      requires_approval: boolYN(row.requires_approval, false),
      // personal tool defaults to no-return unless explicitly set
      return_required: truthy(row.return_required) ? boolYN(row.return_required, true) : !isPersonal,
      notes: s(row.notes) || null,
    };

    out.push({ rowNumber, payload, errors });
  });

  return out;
}
