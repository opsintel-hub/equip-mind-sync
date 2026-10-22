export interface ReturnBillboard {
  id: string;
  label: string;
  qty: number;
}

export interface DefectiveAllocation {
  billboardId: string;
  quantity: string;
}

export const validateDefectiveAllocations = (billboards: ReturnBillboard[], rows: DefectiveAllocation[], defective: number) => {
  if (defective === 0 || billboards.length === 0) return null;
  const seen = new Set<string>();
  let total = 0;
  for (const row of rows) {
    const billboard = billboards.find((b) => b.id === row.billboardId);
    if (!billboard) return "กรุณาเลือกป้ายจากใบเบิก";
    if (seen.has(row.billboardId)) return "เลือกป้ายซ้ำ กรุณารวมจำนวนในแถวเดียว";
    seen.add(row.billboardId);
    const qty = Number(row.quantity);
    if (!Number.isInteger(qty) || qty <= 0) return "กรุณาระบุจำนวนของเสียแต่ละป้ายอย่างน้อย 1";
    if (qty > billboard.qty) return `จำนวนของเสียที่ ${billboard.label} เกินยอดติดตั้งคงเหลือ (${billboard.qty})`;
    total += qty;
  }
  return total === defective ? null : `ยอดแยกป้าย ${total} ต้องเท่ากับจำนวนของเสีย ${defective}`;
};

/** Only a single known assignment may be selected without a user choice. */
export const defaultReturnBillboard = (billboards: ReturnBillboard[]) =>
  billboards.length === 1 ? billboards[0].id : "";

export const validReturnBillboard = (billboards: ReturnBillboard[], selected: string) =>
  billboards.some((billboard) => billboard.id === selected) ? selected : null;

/** Good and defective units partition the outstanding issue quantity, never add to it. */
export const balanceIssueReturn = (outstanding: number, value: string) => {
  const total = Math.max(0, outstanding);
  const selected = Math.min(total, Math.max(0, parseInt(value || "0", 10) || 0));
  return { selected, remaining: total - selected };
};

/**
 * Units installed as replacement for a lost/stolen original have no old part to return.
 * Only purposes requiring return independently of installation can close installed units.
 * Otherwise installation already closes them and outstanding represents unused stock.
 */
export const lostReplacementCap = (outstanding: number, installed: number, alreadyLost: number, independentOfInstall: boolean) =>
  independentOfInstall ? Math.max(0, Math.min(outstanding, installed - alreadyLost)) : 0;

/** Quantity still to be split between good and defective after the lost-replacement close-out. */
export const returnableAfterLost = (outstanding: number, lost: number) => Math.max(0, outstanding - Math.max(0, lost));