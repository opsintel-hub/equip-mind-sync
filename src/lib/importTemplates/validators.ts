import type { RefLookups } from "./refData";
import { SUB_MEDIA_TYPES, requiresSubMediaType, isValidSubMediaType } from "@/lib/mediaPlayerSubTypes";

export interface ValidatedRow {
  rowNumber: number;
  payload: Record<string, any>;
  errors: string[];
}

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
    // Excel serial
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

export function validateEquipmentRows(rows: any[], refs: RefLookups, existingCodes: Set<string>): ValidatedRow[] {
  const seenCodes = new Set<string>();
  const out: ValidatedRow[] = [];

  const catNames = new Set(refs.categories.map((c) => c.name));
  const subNames = new Set(refs.subcategories.map((c) => c.name));
  const unitNames = new Set(refs.units.map((c) => c.name));
  const brandNames = new Set(refs.brands.map((c) => c.name));
  const deptNames = new Set(refs.departments.map((c) => c.name));
  const supplierByCode = new Map(refs.suppliers.map((c) => [c.code, c.id]));
  const companyByName = new Map(refs.companies.map((c) => [c.name, c.id]));
  const locationByCode = new Map(refs.locations.map((c) => [c.code, c.id]));
  const subcatByName = new Map(refs.subcategories.map((c) => [c.name, c.id]));
  const billboardByOldCode = new Map(
    refs.billboards.filter((b) => b.old_code).map((b) => [String(b.old_code), b.id])
  );

  rows.forEach((row, idx) => {
    const rowNumber = idx + 2;
    const errors: string[] = [];

    const code = s(row.code);
    const name = s(row.name);
    if (!code) errors.push("code ว่าง");
    if (!name) errors.push("name ว่าง");
    if (code && seenCodes.has(code)) errors.push(`code "${code}" ซ้ำในไฟล์`);
    if (code) seenCodes.add(code);
    if (code && existingCodes.has(code)) errors.push(`code "${code}" มีอยู่แล้วในระบบ`);

    const category = s(row.category);
    if (!category) errors.push("category ว่าง");
    else if (!catNames.has(category)) errors.push(`category "${category}" ไม่อยู่ใน master`);

    const subcategoryName = s(row.subcategory);
    let subcategoryId: string | null = null;
    if (subcategoryName) {
      if (!subNames.has(subcategoryName)) errors.push(`subcategory "${subcategoryName}" ไม่อยู่ใน master`);
      else subcategoryId = subcatByName.get(subcategoryName) || null;
    }

    const unit = s(row.unit);
    if (!unit) errors.push("unit ว่าง");
    else if (!unitNames.has(unit)) errors.push(`unit "${unit}" ไม่อยู่ใน master`);

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
    if (!locationCode) errors.push("location_code ว่าง");
    else {
      const id = locationByCode.get(locationCode);
      if (!id) errors.push(`location_code "${locationCode}" ไม่อยู่ใน master`);
      else locationId = id;
    }

    const qty = n(row.quantity_in_stock);
    if (qty === null || Number.isNaN(qty) || qty < 0 || !Number.isInteger(qty))
      errors.push("quantity_in_stock ต้องเป็นจำนวนเต็ม ≥ 0");

    const price = n(row.unit_price);
    if (price === null || Number.isNaN(price) || price < 0) errors.push("unit_price ต้องเป็นตัวเลข ≥ 0");

    const condition = s(row.item_condition).toLowerCase();
    if (!["new", "used", "refurbished"].includes(condition))
      errors.push("item_condition ต้องเป็น new / used / refurbished");

    const entryDate = isoDate(row.warehouse_entry_date);
    if (!entryDate || entryDate === "INVALID") errors.push("warehouse_entry_date รูปแบบไม่ถูกต้อง (YYYY-MM-DD)");

    const warrantyDate = isoDate(row.warranty_expiry_date);
    if (warrantyDate === "INVALID") errors.push("warranty_expiry_date รูปแบบไม่ถูกต้อง");

    // Optional install
    const billboardOldCode = s(row.install_billboard_old_code);
    let billboardId: string | null = null;
    let installDate: string | null = null;
    let installQty: number | null = null;
    if (billboardOldCode) {
      const bid = billboardByOldCode.get(billboardOldCode);
      if (!bid) errors.push(`install_billboard_old_code "${billboardOldCode}" ไม่พบในระบบ`);
      else billboardId = bid;

      installDate = isoDate(row.install_date);
      if (!installDate || installDate === "INVALID") errors.push("install_date จำเป็นเมื่อระบุป้าย (YYYY-MM-DD)");

      const iq = n(row.install_quantity);
      if (iq === null || Number.isNaN(iq) || iq < 1 || !Number.isInteger(iq))
        errors.push("install_quantity ต้องเป็นจำนวนเต็ม ≥ 1 เมื่อระบุป้าย");
      else if (qty !== null && !Number.isNaN(qty) && iq > qty)
        errors.push(`install_quantity (${iq}) เกินกว่า quantity_in_stock (${qty})`);
      else installQty = iq;
    }

    const payload = {
      code, name,
      description: s(row.description) || null,
      category: category || null,
      subcategory_id: subcategoryId,
      unit: unit || null,
      brand: brand || null,
      supplier_id: supplierId,
      company_id: companyId,
      department: department || null,
      location_id: locationId,
      quantity_in_stock: qty,
      min_stock_level: n(row.min_stock_level),
      unit_price: price,
      item_condition: condition,
      warehouse_entry_date: entryDate,
      warranty_expiry_date: warrantyDate === "INVALID" ? null : warrantyDate,
      warranty_years: n(row.warranty_years),
      serial_number: s(row.serial_number) || null,
      asset_code: s(row.asset_code) || null,
      equipment_id_code: s(row.equipment_id_code) || null,
      is_asset: ["yes", "y", "true", "1"].includes(s(row.is_asset).toLowerCase()),
      depreciation_months: n(row.depreciation_months),
      volt: n(row.volt), amp: n(row.amp), watt: n(row.watt),
      lumen: n(row.lumen), lux: n(row.lux),
      width_cm: n(row.width_cm), height_cm: n(row.height_cm), depth_cm: n(row.depth_cm),
      po_number: s(row.po_number) || null,
      pr_number: s(row.pr_number) || null,
      invoice_number: s(row.invoice_number) || null,
      po_item_no: s(row.po_item_no) || null,
      notes: s(row.notes) || null,
      billboard_id: billboardId,
      install_date: installDate === "INVALID" ? null : installDate,
      install_quantity: installQty,
    };

    out.push({ rowNumber, payload, errors });
  });

  return out;
}

export function validateMediaPlayerRows(rows: any[], refs: RefLookups, existingSerials: Set<string>): ValidatedRow[] {
  const seenSerials = new Set<string>();
  const out: ValidatedRow[] = [];

  const brandNames = new Set(refs.brands.map((c) => c.name));
  const deptNames = new Set(refs.departments.map((c) => c.name));
  const mpModelByName = new Map(refs.mp_models.map((c) => [c.name, c.id]));
  const cmsByName = new Map(refs.cms_types.map((c) => [c.name, c.id]));
  const supplierByCode = new Map(refs.suppliers.map((c) => [c.code, c.id]));
  const companyByName = new Map(refs.companies.map((c) => [c.name, c.id]));
  const locationByCode = new Map(refs.locations.map((c) => [c.code, c.id]));
  const billboardByOldCode = new Map(
    refs.billboards.filter((b) => b.old_code).map((b) => [String(b.old_code), b.id])
  );

  rows.forEach((row, idx) => {
    const rowNumber = idx + 2;
    const errors: string[] = [];

    const code = s(row.code);
    const name = s(row.name);
    const sn1 = s(row.serial_number_1);
    const sn2 = s(row.serial_number_2);

    if (!code) errors.push("code ว่าง");
    if (!name) errors.push("name ว่าง");
    if (!sn1) errors.push("serial_number_1 ว่าง");

    if (sn1) {
      if (seenSerials.has(sn1)) errors.push(`S/N "${sn1}" ซ้ำในไฟล์`);
      seenSerials.add(sn1);
      if (existingSerials.has(sn1)) errors.push(`S/N "${sn1}" มีอยู่แล้วในระบบ`);
    }
    if (sn2) {
      if (seenSerials.has(sn2)) errors.push(`S/N "${sn2}" ซ้ำในไฟล์`);
      seenSerials.add(sn2);
      if (existingSerials.has(sn2)) errors.push(`S/N "${sn2}" มีอยู่แล้วในระบบ`);
    }

    const brand = s(row.brand);
    if (brand && !brandNames.has(brand)) errors.push(`brand "${brand}" ไม่อยู่ใน master`);

    const modelName = s(row.model);
    let modelId: string | null = null;
    if (modelName) {
      const id = mpModelByName.get(modelName);
      if (!id) errors.push(`model "${modelName}" ไม่อยู่ใน master`);
      else modelId = id;
    }

    const cmsName = s(row.cms_type);
    let cmsId: string | null = null;
    if (cmsName) {
      const id = cmsByName.get(cmsName);
      if (!id) errors.push(`cms_type "${cmsName}" ไม่อยู่ใน master`);
      else cmsId = id;
    }

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

    const subMediaTypeRaw = s(row.sub_media_type).toUpperCase();
    let subMediaType: string | null = null;
    if (requiresSubMediaType(department)) {
      if (!subMediaTypeRaw) errors.push(`ฝ่าย 7-Eleven Media ต้องระบุ sub_media_type (${SUB_MEDIA_TYPES.join(" / ")})`);
      else if (!isValidSubMediaType(subMediaTypeRaw)) errors.push(`sub_media_type "${subMediaTypeRaw}" ไม่ถูกต้อง`);
      else subMediaType = subMediaTypeRaw;
    } else if (subMediaTypeRaw) {
      // silently ignore for non-7-Eleven, trigger will null it
      subMediaType = null;
    }

    const deviceTypeRaw = s(row.device_type).toUpperCase();
    let deviceType: string = "MEDIA_PLAYER";
    if (deviceTypeRaw) {
      if (deviceTypeRaw !== "MEDIA_PLAYER" && deviceTypeRaw !== "MONITOR")
        errors.push(`device_type "${deviceTypeRaw}" ไม่ถูกต้อง — ใช้ MEDIA_PLAYER หรือ MONITOR`);
      else deviceType = deviceTypeRaw;
    }



    const locationCode = s(row.location_code);
    let locationId: string | null = null;
    if (!locationCode) errors.push("location_code ว่าง");
    else {
      const id = locationByCode.get(locationCode);
      if (!id) errors.push(`location_code "${locationCode}" ไม่อยู่ใน master`);
      else locationId = id;
    }

    const condition = s(row.item_condition).toLowerCase();
    if (!["new", "used", "refurbished"].includes(condition))
      errors.push("item_condition ต้องเป็น new / used / refurbished");

    const price = n(row.unit_price);
    if (price === null || Number.isNaN(price) || price < 0) errors.push("unit_price ต้องเป็นตัวเลข ≥ 0");

    const receiptDate = isoDate(row.date_of_receipt);
    if (!receiptDate || receiptDate === "INVALID") errors.push("date_of_receipt รูปแบบไม่ถูกต้อง");
    const warrantyDate = isoDate(row.warranty_expiry_date);
    if (warrantyDate === "INVALID") errors.push("warranty_expiry_date รูปแบบไม่ถูกต้อง");

    const billboardOldCode = s(row.install_billboard_old_code);
    let billboardId: string | null = null;
    let installDate: string | null = null;
    if (billboardOldCode) {
      const bid = billboardByOldCode.get(billboardOldCode);
      if (!bid) errors.push(`install_billboard_old_code "${billboardOldCode}" ไม่พบในระบบ`);
      else billboardId = bid;

      installDate = isoDate(row.install_date);
      if (!installDate || installDate === "INVALID") errors.push("install_date จำเป็นเมื่อระบุป้าย");
    }

    const payload = {
      code, name,
      description: s(row.description) || null,
      brand: brand || null,
      specification: s(row.specification) || null,
      serial_number_1: sn1,
      serial_number_2: sn2 || null,
      model_id: modelId,
      cms_type_id: cmsId,
      company_id: companyId,
      supplier_id: supplierId,
      department: department || null,
      location_id: locationId,
      item_condition: condition,
      unit_price: price,
      depreciation_months: n(row.depreciation_months),
      usage_lifespan_months: n(row.usage_lifespan_months),
      date_of_receipt: receiptDate,
      warranty_expiry_date: warrantyDate === "INVALID" ? null : warrantyDate,
      warranty_years: n(row.warranty_years),
      asset_code: s(row.asset_code) || null,
      equipment_id_code: s(row.equipment_id_code) || null,
      remote_name: s(row.remote_name) || null,
      activate_windows: s(row.activate_windows) || null,
      po_number: s(row.po_number) || null,
      pr_number: s(row.pr_number) || null,
      invoice_number: s(row.invoice_number) || null,
      po_item_no: s(row.po_item_no) || null,
      order_for_project: s(row.order_for_project) || null,
      asset_caretaker: s(row.asset_caretaker) || null,
      planned_install_location: s(row.planned_install_location) || null,
      notes: s(row.notes) || null,
      billboard_id: billboardId,
      sub_media_type: subMediaType,
      install_date: installDate === "INVALID" ? null : installDate,
    };

    out.push({ rowNumber, payload, errors });
  });

  return out;
}
