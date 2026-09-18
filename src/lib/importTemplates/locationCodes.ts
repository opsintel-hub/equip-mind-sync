export interface ParsedLocation {
  locationId: string;
  code: string;
  quantity: number;
}

export interface ParseLocationResult {
  primaryLocationId: string | null;
  allocations: ParsedLocation[];
  errors: string[];
}

/**
 * Accepts one or more storage location codes in a single cell.
 * Supported formats:
 *   "S02"                -> all quantity in S02
 *   "S02,BA10"           -> quantity split evenly (remainder goes to the first slot)
 *   "S02:5, BA10:3"      -> explicit quantity per slot (sum must equal total quantity)
 * Separators: comma, semicolon, slash, pipe, newline.
 */
export function parseLocationCodes(
  raw: string,
  locationByCode: Map<string, string>,
  totalQuantity: number | null
): ParseLocationResult {
  const errors: string[] = [];
  const parts = raw
    .split(/[,;/|\n\r]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return { primaryLocationId: null, allocations: [], errors };

  const entries: Array<{ code: string; qty: number | null }> = [];
  const seen = new Set<string>();

  parts.forEach((part) => {
    const m = part.match(/^(.*?)(?::|=|\s*x\s*)(\d+(?:\.\d+)?)$/i);
    const code = (m ? m[1] : part).trim();
    const qty = m ? Number(m[2]) : null;
    if (!code) return;
    if (seen.has(code)) {
      errors.push(`location_code "${code}" ซ้ำในช่องเดียวกัน`);
      return;
    }
    seen.add(code);
    if (!locationByCode.has(code)) {
      errors.push(`location_code "${code}" ไม่อยู่ใน master`);
      return;
    }
    entries.push({ code, qty });
  });

  if (entries.length === 0 || errors.length > 0) {
    return { primaryLocationId: null, allocations: [], errors };
  }

  const total = totalQuantity !== null && Number.isFinite(totalQuantity) ? Number(totalQuantity) : null;
  const hasExplicit = entries.some((e) => e.qty !== null);

  let allocations: ParsedLocation[];

  if (hasExplicit) {
    if (entries.some((e) => e.qty === null)) {
      errors.push("ถ้าระบุจำนวนต่อช่องจัดเก็บ ต้องระบุให้ครบทุกช่อง (เช่น S02:5, BA10:3)");
      return { primaryLocationId: null, allocations: [], errors };
    }
    allocations = entries.map((e) => ({
      locationId: locationByCode.get(e.code)!,
      code: e.code,
      quantity: e.qty as number,
    }));
    const sum = allocations.reduce((a, b) => a + b.quantity, 0);
    if (total !== null && sum !== total) {
      errors.push(`จำนวนรวมของทุกช่องจัดเก็บ (${sum}) ไม่เท่ากับจำนวนคงคลัง (${total})`);
      return { primaryLocationId: null, allocations: [], errors };
    }
  } else if (total === null || total <= 0 || entries.length === 1) {
    allocations = entries.map((e, i) => ({
      locationId: locationByCode.get(e.code)!,
      code: e.code,
      quantity: i === 0 ? (total ?? 0) : 0,
    }));
  } else {
    const base = Math.floor(total / entries.length);
    let remainder = total - base * entries.length;
    allocations = entries.map((e) => {
      const extra = remainder > 0 ? 1 : 0;
      if (remainder > 0) remainder -= 1;
      return { locationId: locationByCode.get(e.code)!, code: e.code, quantity: base + extra };
    });
  }

  const primary = allocations.slice().sort((a, b) => b.quantity - a.quantity)[0];
  return { primaryLocationId: primary.locationId, allocations, errors };
}
