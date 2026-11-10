export interface IssueHeaderLine {
  quantity: number | null;
  issued_quantity: number | null;
  remaining_quantity: number | null;
  status: string;
}

// Terminal lines cannot contribute a pending-to-issue balance, including
// legacy rejected rows whose remaining_quantity still equals requested stock.
export function issueHeaderTotals(items: IssueHeaderLine[]) {
  const quantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const issued_quantity = items.reduce((sum, item) => sum + (item.issued_quantity || 0), 0);
  const remaining_quantity = items.reduce((sum, item) => {
    if (item.status === "rejected" || item.status === "issued") return sum;
    return sum + Math.max(0, item.remaining_quantity ?? ((item.quantity || 0) - (item.issued_quantity || 0)));
  }, 0);
  const allRejected = items.length > 0 && items.every(item => item.status === "rejected");
  const allProcessed = items.length > 0 && items.every(item => item.status === "issued" || item.status === "rejected");
  const anyIssued = issued_quantity > 0;
  const status = allRejected ? "rejected" : allProcessed ? "issued"
    : anyIssued || items.some(item => item.status === "waiting_stock") ? "waiting_stock" : "pending";
  return { quantity, issued_quantity, remaining_quantity, total_items: items.length, status, anyIssued };
}