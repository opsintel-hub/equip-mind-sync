import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, CalendarDays, BarChart3 } from "lucide-react";
import { SITE_ACCESS_STATUS } from "@/lib/siteAccess";

type Row = {
  id: string; ticket_no: string; warehouse_id: string; warehouse_name: string | null; warehouse_code: string | null;
  supervisor_name: string | null; department: string | null; contractor_name: string; worker_count: number;
  purpose: string; status: string; planned_start_at: string; planned_end_at: string; checkin_at: string | null;
};

const DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const DAYS_FULL = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

/** green = อนุมัติ/เข้าแล้ว/ปิดแล้ว, yellow = รออนุมัติ, red = ไม่อนุมัติ */
const tone = (s: string) =>
  s === "rejected" ? "border-destructive/50 bg-destructive/15 text-destructive"
  : s === "pending_assignment" ? "border-warning/50 bg-warning/20 text-warning-foreground"
  : "border-success/50 bg-success/15 text-success";

const hhmm = (s: string) => new Date(s).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
const ymd = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export default function SiteAccessCalendar() {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [rows, setRows] = useState<Row[]>([]);
  const [wh, setWh] = useState("__all__");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const from = new Date(month.getFullYear(), month.getMonth(), 1);
    const to = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    supabase.rpc("access_ticket_calendar", { _from: from.toISOString(), _to: to.toISOString() })
      .then(({ data }) => setRows((data as Row[]) || []));
  }, [month]);

  const warehouses = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => m.set(r.warehouse_id, `${r.warehouse_name ?? ""} (${r.warehouse_code ?? ""})`));
    return [...m.entries()];
  }, [rows]);
  const list = wh === "__all__" ? rows : rows.filter((r) => r.warehouse_id === wh);

  const byDay = useMemo(() => {
    const m = new Map<string, Row[]>();
    list.forEach((r) => { const k = ymd(new Date(r.planned_start_at)); m.set(k, [...(m.get(k) || []), r]); });
    return m;
  }, [list]);

  const cells = useMemo(() => {
    const start = new Date(month); start.setDate(1 - month.getDay());
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [month]);

  // ---- summary (exclude rejected) ----
  const valid = list.filter((r) => r.status !== "rejected");
  const entered = valid.filter((r) => r.checkin_at);
  const count = (key: (r: Row) => string) => {
    const m = new Map<string, number>();
    valid.forEach((r) => { const k = key(r) || "-"; m.set(k, (m.get(k) || 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const byPerson = count((r) => r.supervisor_name || "");
  const byDept = count((r) => r.department || "ไม่ระบุฝ่าย");
  const byHour = count((r) => { const h = new Date(r.planned_start_at).getHours(); return `${String(h).padStart(2, "0")}:00–${String(h + 1).padStart(2, "0")}:00`; });
  const byWeekday = DAYS_FULL.map((d, i) => [d, valid.filter((r) => new Date(r.planned_start_at).getDay() === i).length] as [string, number]);
  const maxWd = Math.max(1, ...byWeekday.map((x) => x[1]));

  const dayRows = selected ? byDay.get(selected) || [] : [];
  const monthLabel = month.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
  const today = ymd(new Date());

  const Rank = ({ title, data }: { title: string; data: [string, number][] }) => (
    <div className="rounded-lg border p-3">
      <div className="mb-2 font-semibold">{title}</div>
      {data.length === 0 ? <div className="text-sm text-muted-foreground">-</div> : data.slice(0, 8).map(([k, v]) => (
        <div key={k} className="flex justify-between border-b py-1 text-sm last:border-0"><span className="truncate">{k}</span><b>{v} ครั้ง</b></div>
      ))}
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-lg">ปฏิทินเข้าพื้นที่คลัง (ทุกคนเห็น)</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={wh} onValueChange={setWh}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">ทุกคลัง</SelectItem>
              {warehouses.map(([id, n]) => <SelectItem key={id} value={id}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="icon" variant="outline" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="min-w-32 text-center font-semibold">{monthLabel}</span>
          <Button size="icon" variant="outline" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="cal">
          <TabsList>
            <TabsTrigger value="cal"><CalendarDays className="mr-1 h-4 w-4" />ปฏิทิน</TabsTrigger>
            <TabsTrigger value="sum"><BarChart3 className="mr-1 h-4 w-4" />สรุปเดือนนี้</TabsTrigger>
          </TabsList>

          <TabsContent value="cal" className="space-y-3">
            <div className="flex flex-wrap gap-3 text-xs">
              <span className={`rounded border px-2 py-0.5 ${tone("approved")}`}>อนุมัติแล้ว</span>
              <span className={`rounded border px-2 py-0.5 ${tone("pending_assignment")}`}>รออนุมัติ</span>
              <span className={`rounded border px-2 py-0.5 ${tone("rejected")}`}>ไม่อนุมัติ</span>
              <span className="text-muted-foreground">แนะนำจองเวลาเดียวกับคนอื่น เพื่อให้คลังเปิดรอบเดียว</span>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground">{DAYS.map((d) => <div key={d}>{d}</div>)}</div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((d) => {
                const k = ymd(d); const items = byDay.get(k) || []; const inMonth = d.getMonth() === month.getMonth();
                return (
                  <button type="button" key={k} onClick={() => setSelected(k)}
                    className={`min-h-20 rounded-md border p-1 text-left align-top transition-colors hover:bg-muted ${inMonth ? "" : "opacity-40"} ${selected === k ? "ring-2 ring-primary" : ""}`}>
                    <div className={`text-xs ${k === today ? "font-bold text-primary" : ""}`}>{d.getDate()}</div>
                    {items.slice(0, 3).map((r) => (
                      <div key={r.id} className={`mt-0.5 truncate rounded border px-1 text-[10px] ${tone(r.status)}`}>{hhmm(r.planned_start_at)} {r.supervisor_name}</div>
                    ))}
                    {items.length > 3 && <div className="text-[10px] text-muted-foreground">+{items.length - 3} รายการ</div>}
                  </button>
                );
              })}
            </div>
            {selected && (
              <div className="space-y-2 rounded-lg border p-3">
                <div className="font-semibold">รายการวันที่เลือก ({dayRows.length})</div>
                {dayRows.length === 0 && <div className="text-sm text-muted-foreground">ยังไม่มีการจอง — ว่าง</div>}
                {dayRows.map((r) => (
                  <div key={r.id} className={`rounded border p-2 text-sm ${tone(r.status)}`}>
                    <div className="flex justify-between gap-2"><b>{hhmm(r.planned_start_at)}–{hhmm(r.planned_end_at)}</b><span>{SITE_ACCESS_STATUS[r.status]?.label || r.status}</span></div>
                    <div className="text-foreground">{r.supervisor_name} · {r.department || "ไม่ระบุฝ่าย"} · {r.contractor_name} ({r.worker_count} คน)</div>
                    <div className="text-xs text-muted-foreground">{r.warehouse_name} ({r.warehouse_code}) · {r.ticket_no}</div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sum" className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border p-3"><div className="text-sm text-muted-foreground">จองทั้งหมด</div><div className="text-2xl font-bold">{valid.length}</div></div>
              <div className="rounded-lg border p-3"><div className="text-sm text-muted-foreground">เข้าจริง</div><div className="text-2xl font-bold">{entered.length}</div></div>
              <div className="rounded-lg border p-3"><div className="text-sm text-muted-foreground">ผู้ขอเข้า</div><div className="text-2xl font-bold">{byPerson.length} คน</div></div>
              <div className="rounded-lg border p-3"><div className="text-sm text-muted-foreground">ไม่อนุมัติ</div><div className="text-2xl font-bold">{list.length - valid.length}</div></div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Rank title="ใครขอเข้าบ่อย" data={byPerson} />
              <Rank title="ฝ่ายที่เข้า" data={byDept} />
              <Rank title="ช่วงเวลาที่เข้า" data={byHour} />
            </div>
            <div className="rounded-lg border p-3">
              <div className="mb-2 font-semibold">ส่วนใหญ่เข้าวันอะไร</div>
              {byWeekday.map(([d, v]) => (
                <div key={d} className="flex items-center gap-2 py-0.5 text-sm">
                  <span className="w-20">{d}</span>
                  <div className="h-4 flex-1 rounded bg-muted"><div className="h-4 rounded bg-primary" style={{ width: `${(v / maxWd) * 100}%` }} /></div>
                  <span className="w-12 text-right">{v}</span>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
