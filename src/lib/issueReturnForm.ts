export interface ReturnBillboard {
  id: string;
  label: string;
  qty: number;
}

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