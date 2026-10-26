import { test, expect } from "bun:test";
import { stayLabel, metricRows, distribution, dwellStats, leadCounts, departmentSummaries, formatDuration, formatHoursMinutes } from "./siteAccessAnalytics";
const base = { id: "1", ticket_no: "WAP-1", department: "ฝ่าย A", warehouse_id: "w", warehouse_name: "คลัง", contractor_name: "ทีม", worker_count: 4, purpose: "bring_in", status: "completed", created_at: "2026-10-23T16:30:00Z", planned_start_at: "2026-10-24T03:00:00Z", planned_end_at: "2026-10-24T05:00:00Z", checkin_at: "2026-10-24T03:15:00Z", checkout_at: "2026-10-24T04:15:00Z", admin_closed_at: null };
test("creation on Friday and entry on Saturday are counted independently in Bangkok", () => {
  expect(distribution([base], "booking").days[5].count).toBe(1);
  expect(distribution([base], "actual").days[6].count).toBe(1);
  expect(distribution([base], "actual").hours[10].count).toBe(1);
});
test("date filtering uses each event date, including Bangkok midnight boundary", () => {
  const r = { ...base, created_at: "2026-10-23T17:00:00Z" };
  expect(metricRows([r], "booking", "2026-10-24", "2026-10-24")).toHaveLength(1);
  expect(metricRows([base], "booking", "2026-10-24", "2026-10-24")).toHaveLength(0);
  expect(metricRows([base], "actual", "2026-10-24", "2026-10-24")).toHaveLength(1);
});
test("rejected and cancelled requests are bookings but never staffing visits", () => {
  for (const status of ["rejected", "cancelled"]) {
    const row = { ...base, status };
    expect(metricRows([row], "booking", "2026-10-01", "2026-10-31")).toHaveLength(1);
    expect(metricRows([row], "planned", "2026-10-01", "2026-10-31")).toHaveLength(0);
    expect(metricRows([row], "actual", "2026-10-01", "2026-10-31")).toHaveLength(0);
  }
});
test("dwell time excludes admin-close and unclosed visits", () => {
  expect(dwellStats([base, { ...base, admin_closed_at: base.checkout_at }, { ...base, checkout_at: null }])).toEqual({ sample: 1, averageMinutes: 60, overtime: 0 });
});
test("walk-ins include urgent and retrospective requests", () => {
  expect(leadCounts([{ ...base, created_at: base.planned_start_at }, { ...base, created_at: "2026-10-25T00:00:00Z" }]).walkin).toBe(2);
});
test("department totals never duplicate a visit across departments", () => {
  const summaries = departmentSummaries([base, { ...base, id: "2", department: "ฝ่าย B", worker_count: 2 }], "2026-10-01", "2026-10-31");
  expect(summaries.map(r => [r.department, r.actual, r.workers])).toEqual([["ฝ่าย A", 1, 4], ["ฝ่าย B", 1, 2]]);
});
test("average stay is readable hours and minutes, never a raw minute count", () => {
  expect(formatHoursMinutes(2232)).toBe("37 ชม. 12 นาที");
  expect(formatHoursMinutes(4239)).toBe("70 ชม. 39 นาที");
  expect(formatHoursMinutes(60)).toBe("1 ชม. 0 นาที");
  expect(formatHoursMinutes(0)).toBe("0 ชม. 0 นาที");
  expect(formatDuration(2232)).toBe("1 วัน 13 ชม. 12 นาที");
});
test("stay label formats", () => {
  expect(stayLabel({ status: "completed", checkin_at: "2026-10-19T05:00:00Z", checkout_at: "2026-10-19T08:45:00Z", admin_closed_at: null })).toBe("3 ชม. 45 นาที");
  expect(stayLabel({ status: "completed", checkin_at: "2026-10-16T05:51:00Z", checkout_at: "2026-10-19T04:30:00Z", admin_closed_at: null })).toBe("2 วัน 22 ชม. 39 นาที");
  expect(stayLabel({ status: "checked_in", checkin_at: "2026-10-19T05:00:00Z", checkout_at: null, admin_closed_at: null }, Date.parse("2026-10-19T06:30:00Z"))).toBe("อยู่ในพื้นที่ (1 ชม. 30 นาที)");
  expect(stayLabel({ status: "completed", checkin_at: "2026-10-19T05:00:00Z", checkout_at: "2026-10-20T05:00:00Z", admin_closed_at: "2026-10-20T05:00:00Z" })).toBe("ปิดโดย Admin (ไม่นับเวลา)");
  expect(stayLabel({ status: "cancelled", checkin_at: null, checkout_at: null, admin_closed_at: null })).toBe("—");
});
