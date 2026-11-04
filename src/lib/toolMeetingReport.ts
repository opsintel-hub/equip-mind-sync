import type { Database } from "@/integrations/supabase/types";

type Row<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type MeetingTool = Row<"tools"> & {
  tool_category: { name: string } | null;
  tool_subcategory: { name: string } | null;
  company: { name: string } | null;
  location: { name: string; code: string; warehouse: { name: string; code: string } | null } | null;
};
export type ToolLoan = Row<"equipment_loans">;
export type ToolPM = Row<"tool_pm_tasks">;
export type ToolHistory = Row<"tool_pm_history"> & { result: { name: string } | null };
export type ToolAssignment = Row<"technician_tools"> & { technician: { name: string; department: string | null } | null };
export type ToolMeetingData = { tools: MeetingTool[]; loans: ToolLoan[]; tasks: ToolPM[]; history: ToolHistory[]; assignments: ToolAssignment[] };
export const emptyToolData: ToolMeetingData = { tools: [], loans: [], tasks: [], history: [], assignments: [] };
export const DATE_STATES = [{ value: "expired", label: "หมดแล้ว" }, { value: "30", label: "ภายใน 30 วัน" }, { value: "60", label: "31–60 วัน" }, { value: "90", label: "61–90 วัน" }, { value: "active", label: "มากกว่า 90 วัน" }, { value: "unknown", label: "ไม่ระบุวันที่" }];
export const PM_STATES = [{ value: "overdue", label: "PM เกินกำหนด" }, { value: "soon", label: "PM ภายใน 7 วัน" }, { value: "ok", label: "PM ยังไม่ถึงกำหนด" }, { value: "missing", label: "PM ไม่มีงานตามรอบ" }, { value: "none", label: "ไม่กำหนดรอบ PM" }];
export const PLACEMENT_STATES = [{ value: "stock", label: "มีคงเหลือในคลัง" }, { value: "loan", label: "มีผู้ถือครอง" }, { value: "personal", label: "ประจำตัวช่าง" }, { value: "overdue", label: "ยืมเกินกำหนด" }, { value: "safety", label: "กลุ่มเฝ้าระวังความปลอดภัย" }];
export type ToolFilters = { departments: string[]; categories: string[]; names: string[]; locations: string[]; owners: string[]; placements: string[]; warranties: string[]; expiries: string[]; pms: string[]; serial: string; search: string };
export const emptyToolFilters = (): ToolFilters => ({ departments: [], categories: [], names: [], locations: [], owners: [], placements: [], warranties: [], expiries: [], pms: [], serial: "", search: "" });
const day = (date: string | Date) => {
  const parsed = new Date(date);
  if (!Number.isFinite(parsed.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(parsed);
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value);
  return Date.UTC(get("year"), get("month") - 1, get("day")) / 86400000;
};
export function daysRemaining(date: string | null, now = new Date()) {
  const target = date ? day(date) : null; const today = day(now);
  return target === null || today === null ? null : target - today;
}
export function dateState(date: string | null, now = new Date()) {
  const remaining = daysRemaining(date, now);
  return remaining === null ? "unknown" : remaining < 0 ? "expired" : remaining <= 30 ? "30" : remaining <= 60 ? "60" : remaining <= 90 ? "90" : "active";
}
export function outstandingToolLoan(loan: ToolLoan) {
  if (["issued", "borrowed", "pending_return", "holding_permanent"].includes(loan.status)) return Math.max(0, loan.quantity);
  // A pending return is only a declaration; stock has not been received yet.
  if (loan.status === "returned") return Math.max(0, loan.quantity - (loan.returned_quantity ?? 0));
  return 0;
}
export type ToolMeetingRow = MeetingTool & {
  category: string; departmentName: string; storage: string; owners: string[];
  stock: number; held: number; total: number; ready: number; overdueLoans: ToolLoan[];
  holdings: ToolLoan[]; loanHistory: ToolLoan[]; pmHistory: ToolHistory[]; pmTasks: ToolPM[];
  pmState: string; nextPM: string | null; warrantyState: string; expiryState: string; safety: boolean;
};
export function buildToolMeetingRows(data: ToolMeetingData, now = new Date()): ToolMeetingRow[] {
  const index = <T extends { tool_id: string | null }>(rows: T[]) => {
    const map = new Map<string, T[]>();
    for (const row of rows) { if (row.tool_id) map.set(row.tool_id, [...(map.get(row.tool_id) ?? []), row]); }
    return map;
  };
  const loans = index(data.loans), tasks = index(data.tasks), history = index(data.history), assignments = index(data.assignments);
  return data.tools.map(tool => {
    const loanHistory = loans.get(tool.id) ?? [];
    const holdings = loanHistory.filter(l => outstandingToolLoan(l) > 0);
    const held = holdings.reduce((sum, l) => sum + outstandingToolLoan(l), 0);
    const stock = Math.max(0, tool.current_quantity);
    const pmHistory = (history.get(tool.id) ?? []).sort((a,b) => b.completed_date.localeCompare(a.completed_date));
    const pmTasks = (tasks.get(tool.id) ?? []).filter(t => ["pending", "in_progress"].includes(t.status)).sort((a,b) => a.due_date.localeCompare(b.due_date));
    const nextPM = pmTasks[0]?.due_date ?? null;
    const remaining = daysRemaining(nextPM, now);
    const pmState = !tool.pm_interval_days && !nextPM ? "none" : remaining === null ? "missing" : remaining < 0 ? "overdue" : remaining <= 7 ? "soon" : "ok";
    const overdueLoans = holdings.filter(l => l.return_required && (daysRemaining(l.due_date, now) ?? 0) < 0);
    const owners = [...new Set([...holdings.map(l => l.holder_name || l.requester_name), ...(assignments.get(tool.id) ?? []).map(a => a.technician?.name), tool.responsible_person].filter((s): s is string => !!s))];
    const category = tool.tool_category?.name || "ไม่ระบุหมวดหมู่";
    const safety = /safety|harness|clamp|ladder|นิรภัย|เซฟตี้|บันได|วัดไฟ|แคลมป์/i.test(`${category} ${tool.tool_subcategory?.name ?? ""} ${tool.name}`);
    const expiryState = dateState(tool.expiry_date, now);
    // No condition field exists: this is schedule-based availability, not a safety certification.
    const ready = expiryState === "expired" || ["overdue", "missing"].includes(pmState) ? 0 : stock;
    const location = tool.location;
    const storage = location ? [location.warehouse ? `${location.warehouse.code} ${location.warehouse.name}` : null, `${location.code} ${location.name}`].filter(Boolean).join(" · ") : "ไม่ระบุคลัง/ตำแหน่ง";
    return { ...tool, category, departmentName: tool.department || "ไม่ระบุฝ่าย", storage, owners, stock, held, total: stock + held, ready, holdings, loanHistory, pmHistory, pmTasks, pmState, nextPM, warrantyState: dateState(tool.warranty_expiry_date, now), expiryState, safety, overdueLoans };
  });
}
export function matchesToolMeeting(row: ToolMeetingRow, filters: ToolFilters) {
  const match = (values: string[], value: string) => !values.length || values.includes(value);
  const placements = [row.stock > 0 ? "stock" : "", row.held > 0 ? "loan" : "", row.is_personal_tool ? "personal" : "", row.overdueLoans.length ? "overdue" : "", row.safety ? "safety" : ""];
  return match(filters.departments, row.departmentName) && match(filters.categories, row.category) && match(filters.names, row.name) && match(filters.locations, row.storage) && (!filters.owners.length || row.owners.some(o => filters.owners.includes(o))) && (!filters.placements.length || placements.some(p => filters.placements.includes(p))) && match(filters.warranties, row.warrantyState) && match(filters.expiries, row.expiryState) && match(filters.pms, row.pmState) && (row.serial_number ?? "").toLowerCase().includes(filters.serial.trim().toLowerCase()) && [row.code, row.name, row.brand, row.asset_code, row.category, ...row.owners].join(" ").toLowerCase().includes(filters.search.trim().toLowerCase());
}
export function toolQuantity(rows: ToolMeetingRow[], field: "stock" | "held" | "total" | "ready" = "total") {
  const units = new Map<string, number>();
  for (const row of rows) units.set(row.unit, (units.get(row.unit) ?? 0) + row[field]);
  return [...units].map(([unit, qty]) => `${qty.toLocaleString("th-TH")} ${unit}`).join(" · ") || "—";
}