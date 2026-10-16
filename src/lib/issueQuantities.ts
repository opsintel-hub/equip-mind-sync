export interface IssueQuantities {
  quantity?: number | null;
  issued_quantity?: number | null;
  installed_qty?: number | null;
  billboard_id?: string | null;
  returned_good_qty?: number | null;
  returned_defective_qty?: number | null;
  written_off_qty?: number | null;
  transferred_qty?: number | null;
}

export const lineIssued = (line: IssueQuantities) => Number(line.issued_quantity ?? line.quantity ?? 0);
export const lineInstalled = (line: IssueQuantities) =>
  line.installed_qty != null ? Number(line.installed_qty) : line.billboard_id ? lineIssued(line) : 0;
export const lineLeft = (line: IssueQuantities) => Math.max(
  0,
  lineIssued(line) - lineInstalled(line) - Number(line.returned_good_qty || 0)
    - Number(line.returned_defective_qty || 0) - Number(line.written_off_qty || 0)
    - Number(line.transferred_qty || 0),
);
const settledOther = (line: IssueQuantities) =>
  Number(line.written_off_qty || 0) + Number(line.transferred_qty || 0);
const returnedTotal = (line: IssueQuantities) =>
  Number(line.returned_good_qty || 0) + Number(line.returned_defective_qty || 0);

/** Units still awaiting a billboard assignment (cleared once installed). */
export const billboardLeft = (line: IssueQuantities) =>
  Math.max(0, lineIssued(line) - lineInstalled(line) - returnedTotal(line) - settledOther(line));

/** Units still to be returned when a purpose needs BOTH billboard and return: installing does not clear it. */
export const returnLeftIndependent = (line: IssueQuantities) =>
  Math.max(0, lineIssued(line) - returnedTotal(line) - settledOther(line));
