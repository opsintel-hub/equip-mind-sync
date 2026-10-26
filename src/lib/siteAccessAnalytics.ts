import { leadHours, leadTier, LeadTier } from "./siteAccess";

export interface AccessReportRow {
  id: string; ticket_no: string; department: string | null; warehouse_id: string;
  warehouse_name: string | null; contractor_name: string; worker_count: number;
  purpose: string; status: string; created_at: string; planned_start_at: string;
  planned_end_at: string; checkin_at: string | null; checkout_at: string | null;
  admin_closed_at: string | null;
}
export type AccessMetric = "booking" | "planned" | "actual";
export const WEEKDAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
export const METRIC_LABELS: Record<AccessMetric, string> = { booking: "วันที่สร้างการจอง", planned: "วันที่ขอเข้าพื้นที่", actual: "วันที่เข้าจริง" };
const formatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" });
export function bangkokParts(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = Object.fromEntries(formatter.formatToParts(date).map(p => [p.type, p.value]));
  const key = `${parts.year}-${parts.month}-${parts.day}`;
  return { day: new Date(`${key}T00:00:00Z`).getUTCDay(), hour: Number(parts.hour), date: key };
}
export function metricDate(row: AccessReportRow, metric: AccessMetric) {
  return metric === "booking" ? row.created_at : metric === "planned" ? row.planned_start_at : row.checkin_at;
}
export function metricRows(rows: AccessReportRow[], metric: AccessMetric, from: string, to: string) {
  return rows.filter(row => {
    if (metric !== "booking" && ["cancelled", "rejected"].includes(row.status)) return false;
    const value = metricDate(row, metric);
    const p = value ? bangkokParts(value) : null;
    return p !== null && p.date >= from && p.date <= to;
  });
}
export function distribution(rows: AccessReportRow[], metric: AccessMetric) {
  const days = WEEKDAYS.map(name => ({ name, count: 0 }));
  const hours = Array.from({ length: 24 }, (_, hour) => ({ name: `${String(hour).padStart(2, "0")}:00`, count: 0 }));
  const heat = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  const dates = new Map<string, number>();
  for (const row of rows) {
    const value = metricDate(row, metric);
    const parts = value ? bangkokParts(value) : null;
    if (!parts) continue;
    days[parts.day].count++;
    hours[parts.hour].count++;
    heat[parts.day][parts.hour]++;
    dates.set(parts.date, (dates.get(parts.date) || 0) + 1);
  }
  return { days, hours, heat, dates: [...dates.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([name, count]) => ({ name, count })) };
}
export function peak(items: { name: string; count: number }[]) {
  const max = Math.max(0, ...items.map(i => i.count));
  return max ? { label: items.filter(i => i.count === max).map(i => i.name).join(", "), count: max } : { label: "—", count: 0 };
}
export function leadCounts(rows: AccessReportRow[]) {
  const counts: Record<LeadTier, number> = { gt48: 0, h24_48: 0, h12_24: 0, lt12: 0, walkin: 0 };
  for (const row of rows) {
    const tier = leadTier(leadHours(row.created_at, row.planned_start_at));
    if (tier) counts[tier]++;
  }
  return counts;
}
export function dwellStats(rows: AccessReportRow[]) {
  // Administrative close timestamps are not evidence of a guard-recorded exit.
  const completed = rows.filter(r => r.checkin_at && r.checkout_at && !r.admin_closed_at && new Date(r.checkout_at).getTime() >= new Date(r.checkin_at).getTime());
  const durations = completed.map(r => (new Date(r.checkout_at || "").getTime() - new Date(r.checkin_at || "").getTime()) / 60000);
  return { sample: completed.length, averageMinutes: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
    overtime: completed.filter(r => new Date(r.checkout_at || "").getTime() > new Date(r.planned_end_at).getTime()).length };
}
export function departmentSummaries(rows: AccessReportRow[], from: string, to: string) {
  const departments = [...new Set(rows.map(r => r.department || "ไม่ระบุฝ่าย"))];
  return departments.map(department => {
    const own = rows.filter(r => (r.department || "ไม่ระบุฝ่าย") === department);
    const booked = metricRows(own, "booking", from, to);
    const planned = metricRows(own, "planned", from, to);
    const actual = metricRows(own, "actual", from, to);
    const dist = distribution(actual, "actual");
    return { department, booking: booked.length, planned: planned.length, actual: actual.length,
      workers: actual.reduce((sum, r) => sum + r.worker_count, 0), lead: leadCounts(planned),
      bookingDay: peak(distribution(booked, "booking").days), plannedDay: peak(distribution(planned, "planned").days),
      actualDay: peak(dist.days), actualHour: peak(dist.hours), dwell: dwellStats(actual) };
  }).sort((a, b) => b.actual - a.actual || b.planned - a.planned);
}
export function formatDuration(minutes: number) {
  const total = Math.max(0, Math.floor(minutes));
  const d = Math.floor(total / 1440), h = Math.floor((total % 1440) / 60), m = total % 60;
  return d ? `${d} วัน ${h} ชม. ${m} นาที` : `${h} ชม. ${m} นาที`;
}
/** Display time spent on site; admin close-outs are not real exits so they are not timed. */
export function stayLabel(row: Pick<AccessReportRow, "status" | "checkin_at" | "checkout_at" | "admin_closed_at">, now = Date.now()) {
  if (row.admin_closed_at) return "ปิดโดย Admin (ไม่นับเวลา)";
  if (!row.checkin_at || ["cancelled", "rejected"].includes(row.status)) return "—";
  const start = new Date(row.checkin_at).getTime();
  if (row.checkout_at) return formatDuration((new Date(row.checkout_at).getTime() - start) / 60000);
  if (row.status === "checked_in") return `อยู่ในพื้นที่ (${formatDuration((now - start) / 60000)})`;
  return "—";
}
