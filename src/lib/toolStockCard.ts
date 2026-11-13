import { outstandingToolLoan, type ToolLoan } from "./toolMeetingReport";
import type { Database } from "@/integrations/supabase/types";

type Task = Database["public"]["Tables"]["tool_pm_tasks"]["Row"];
export type StockCardPM = Database["public"]["Tables"]["tool_pm_history"]["Row"] & {
  result: { name: string } | null;
  task: Pick<Task, "task_number" | "quantity_checked"> | null;
};
export type ToolStockSummary = { stock: number; held: number; total: number; pendingReturn: number; pmCount: number };
export type ToolStockEvent = { date: string; type: string; detail: string; quantity: number; document?: string | null };

export function toolStockSummary(stock: number, loans: ToolLoan[], history: StockCardPM[]): ToolStockSummary {
  const held = loans.reduce((sum, loan) => sum + outstandingToolLoan(loan), 0);
  const pendingReturn = loans.filter(l => l.status === "pending_return").reduce((sum, l) => sum + Math.min(outstandingToolLoan(l), Math.max(0, l.returned_quantity ?? 0)), 0);
  return { stock: Math.max(0, stock), held, total: Math.max(0, stock) + held, pendingReturn, pmCount: history.length };
}

export function toolStockEvents(loans: ToolLoan[], history: StockCardPM[]): ToolStockEvent[] {
  const events: ToolStockEvent[] = [];
  for (const loan of loans) {
    const owner = loan.holder_name || loan.requester_name;
    const document = `ยืม-${loan.id.slice(0, 8)}`;
    // Legacy borrowed rows predate issued_at; cancelled/unissued requests are never stock movements.
    if (loan.issued_at || ["issued", "borrowed", "pending_return", "holding_permanent", "returned"].includes(loan.status)) {
      events.push({ date: loan.issued_at || loan.loan_date, type: loan.pm_task_id || loan.purpose?.startsWith("PM") ? "tool_pm_issue" : "tool_loan", quantity: loan.quantity, document, detail: [owner, loan.return_required ? `กำหนดคืน ${loan.due_date}` : "ถือครองถาวร", loan.purpose, loan.notes].filter(Boolean).join(" · ") });
    }
    if (loan.status === "returned" && loan.return_date && (loan.returned_quantity ?? 0) > 0) {
      events.push({ date: loan.return_date, type: "tool_return", quantity: loan.returned_quantity ?? 0, document, detail: [owner, loan.return_notes].filter(Boolean).join(" · ") });
    }
  }
  for (const pm of history) {
    events.push({ date: pm.completed_date, type: "tool_pm_complete", quantity: pm.task?.quantity_checked ?? 0, document: pm.task?.task_number, detail: [pm.result?.name, pm.inspector_name, pm.notes].filter(Boolean).join(" · ") || "PM เสร็จแล้ว" });
  }
  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}