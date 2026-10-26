import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import * as XLSX from "xlsx";
import { BarChart3, Download, RefreshCw, Clock, Users, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAllowedDepartments } from "@/hooks/useAllowedDepartments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AccessMetric, AccessReportRow, WEEKDAYS, METRIC_LABELS, bangkokParts, departmentSummaries, distribution, dwellStats, formatHoursMinutes, leadCounts, metricRows, peak, stayLabel } from "@/lib/siteAccessAnalytics";
import { LEAD_TIERS, LeadTier, SITE_ACCESS_STATUS, purposeLabel } from "@/lib/siteAccess";

const dateLabel = (value: string | null) => value ? new Date(value).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" }) : "—";
const tiers = Object.keys(LEAD_TIERS) as LeadTier[];
const chartColor = "hsl(var(--primary))";
const chartSuccess = "hsl(var(--success))";

function CountChart({ title, data, line = false }: { title: string; data: { name: string; count: number }[]; line?: boolean }) {
  return <section className="min-w-0 space-y-3">
    <h2 className="font-semibold">{title}</h2>
    <div className="h-64 w-full" aria-label={title}>
      <ResponsiveContainer width="100%" height="100%">
        {line ? <LineChart data={data} margin={{ top: 8, right: 16, bottom: 12, left: -20 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={v => v.slice(5)} />
          <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
          <Tooltip /><Line type="monotone" dataKey="count" name="จำนวนตั๋ว" stroke={chartSuccess} strokeWidth={2} isAnimationActive={false} />
        </LineChart> : <BarChart data={data} margin={{ top: 8, right: 16, bottom: 12, left: -20 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
          <Tooltip /><Bar dataKey="count" name="จำนวนตั๋ว" fill={chartColor} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>}
      </ResponsiveContainer>
    </div>
  </section>;
}

export default function SiteAccessReport() {
  const today = bangkokParts(new Date().toISOString())?.date || "";
  const [from, setFrom] = useState(() => `${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [department, setDepartment] = useState("__all__");
  const [warehouse, setWarehouse] = useState("__all__");
  const [metric, setMetric] = useState<AccessMetric>("actual");
  const [tab, setTab] = useState("overview");
  const [page, setPage] = useState(0);
  const { allowedDepartments, loading: scopeLoading } = useAllowedDepartments();
  const span = (new Date(to).getTime() - new Date(from).getTime()) / 86400000;
  const validRange = !!from && !!to && span >= 0 && span <= 365;
  const { data: rows = [], isFetching, error, refetch } = useQuery({
    queryKey: ["site-access-report", from, to], enabled: validRange,
    queryFn: async () => {
      const end = new Date(`${to}T00:00:00+07:00`);
      end.setUTCDate(end.getUTCDate() + 1);
      const result: AccessReportRow[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase.rpc("site_access_report", { _from: `${from}T00:00:00+07:00`, _to: end.toISOString() }).range(offset, offset + 999);
        if (error) throw error;
        result.push(...(data || []) as AccessReportRow[]);
        if (!data || data.length < 1000) break;
      }
      return result;
    },
  });
  const filtered = useMemo(() => rows.filter(r => (department === "__all__" || r.department === department) && (warehouse === "__all__" || r.warehouse_id === warehouse)), [rows, department, warehouse]);
  const warehouses = useMemo(() => [...new Map(rows.filter(r => department === "__all__" || r.department === department).map(r => [r.warehouse_id, r.warehouse_name || "ไม่ระบุคลัง"])).entries()], [rows, department]);
  const booked = metricRows(filtered, "booking", from, to);
  const planned = metricRows(filtered, "planned", from, to);
  const actual = metricRows(filtered, "actual", from, to);
  const selected = metricRows(filtered, metric, from, to);
  const dist = distribution(selected, metric);
  const dayPeak = peak(dist.days), hourPeak = peak(dist.hours);
  const leads = leadCounts(planned), dwell = dwellStats(actual);
  const departments = departmentSummaries(filtered, from, to);
  const purposeCounts = [...new Set(planned.map(r => r.purpose))].map(purpose => ({ name: purposeLabel(purpose), count: planned.filter(r => r.purpose === purpose).length }));
  const teamCounts = [...new Set(planned.map(r => r.contractor_name))].map(name => {
    const own = planned.filter(r => r.contractor_name === name);
    return { name, count: own.length, walkin: leadCounts(own).walkin };
  }).sort((a, b) => b.count - a.count);
  const heatMax = Math.max(1, ...dist.heat.flat());
  const visiblePage = Math.min(page, Math.max(0, Math.ceil(selected.length / 25) - 1));

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const add = (name: string, data: object[]) => {
      const sheet = XLSX.utils.json_to_sheet(data);
      sheet["!cols"] = Array.from({ length: Object.keys(data[0] || {}).length }, () => ({ wch: 24 }));
      XLSX.utils.book_append_sheet(wb, sheet, name);
    };
    add("เงื่อนไขรายงาน", [{ "ตั้งแต่": from, "ถึง": to, "ฝ่าย": department === "__all__" ? "ทุกฝ่ายตามสิทธิ" : department, "คลัง": warehouse === "__all__" ? "ทุกคลังตามสิทธิ" : warehouses.find(([id]) => id === warehouse)?.[1], "มุมมอง": METRIC_LABELS[metric], "เขตเวลา": "ประเทศไทย UTC+7" }]);
    add("สรุปรายฝ่าย", departments.map(r => ({ "ฝ่าย": r.department, "สร้างการจอง": r.booking, "ขอเข้าพื้นที่": r.planned, "เข้าจริง": r.actual, "จำนวนคนตามตั๋วเข้าจริง": r.workers, "วันสร้างจองสูงสุด": r.bookingDay.label, "วันขอเข้าสูงสุด": r.plannedDay.label, "วันเข้าจริงสูงสุด": r.actualDay.label, "เวลาเข้าจริงสูงสุด": r.actualHour.label, "ขอเข้าทันที": r.lead.walkin, "เวลาอยู่เฉลี่ย": r.dwell.sample ? formatHoursMinutes(r.dwell.averageMinutes) : "—" })));
    add("วันและชั่วโมง", dist.heat.flatMap((counts, day) => counts.map((count, hour) => ({ "วัน": WEEKDAYS[day], "ชั่วโมง": `${String(hour).padStart(2, "0")}:00`, "จำนวนตั๋ว": count }))));
    add("จองล่วงหน้า", tiers.map(tier => ({ "ช่วงการจองล่วงหน้า": LEAD_TIERS[tier].label, "จำนวนตั๋ว": leads[tier] })));
    add("ผู้รับเหมา", teamCounts.map(r => ({ "ผู้รับเหมา": r.name, "ขอเข้าพื้นที่": r.count, "ขอเข้าทันที": r.walkin })));
    add("ตั๋วตามมุมมอง", selected.map(r => ({ "เลขตั๋ว": r.ticket_no, "ฝ่าย": r.department || "ไม่ระบุฝ่าย", "คลัง": r.warehouse_name, "ผู้รับเหมา": r.contractor_name, "จำนวนคนตามตั๋ว": r.worker_count, "วัตถุประสงค์": purposeLabel(r.purpose), "สถานะ": SITE_ACCESS_STATUS[r.status]?.label || r.status, "วันที่สร้างการจอง": dateLabel(r.created_at), "วันที่ขอเข้าพื้นที่": dateLabel(r.planned_start_at), "เข้าจริง": dateLabel(r.checkin_at), "ออกจริง": r.admin_closed_at ? "ปิดโดย Admin ไม่ใช่เวลาออกจริง" : dateLabel(r.checkout_at), "ระยะเวลาในคลัง": stayLabel(r) })));
    XLSX.writeFile(wb, `รายงานเข้าพื้นที่-${from}-${to}.xlsx`);
  };

  return <div className="space-y-6 min-w-0">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6 shrink-0" />รายงานการขอเข้าพื้นที่</h1><p className="mt-1 text-sm text-muted-foreground">ข้อมูลตามสิทธิฝ่าย · เวลาประเทศไทย (UTC+7)</p></div>
      <div className="flex gap-2"><Button size="icon" variant="outline" title="โหลดข้อมูลใหม่" aria-label="โหลดข้อมูลใหม่" disabled={isFetching || !validRange} onClick={() => refetch()}><RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /></Button><Button variant="outline" disabled={isFetching || !validRange || !filtered.length} onClick={exportExcel}><Download className="mr-2 h-4 w-4" />Export Excel</Button></div>
    </header>
    <div className="flex flex-wrap items-end gap-3 border-y py-4">
      <div className="space-y-1"><Label htmlFor="report-from">ตั้งแต่วันที่</Label><Input id="report-from" type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
      <div className="space-y-1"><Label htmlFor="report-to">ถึงวันที่</Label><Input id="report-to" type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
      <div className="space-y-1 w-52"><Label>ฝ่าย</Label><Select value={department} onValueChange={v => { setDepartment(v); setWarehouse("__all__"); setPage(0); }} disabled={scopeLoading}><SelectTrigger aria-label="ฝ่าย"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__all__">ทุกฝ่ายตามสิทธิ</SelectItem>{allowedDepartments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1 w-52"><Label>คลัง</Label><Select value={warehouse} onValueChange={v => { setWarehouse(v); setPage(0); }}><SelectTrigger aria-label="คลัง"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__all__">ทุกคลังตามสิทธิ</SelectItem>{warehouses.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent></Select></div>
    </div>
    {!validRange && <p role="alert" className="text-destructive">เลือกวันที่เริ่มไม่เกินวันที่สิ้นสุด และช่วงเวลาไม่เกิน 366 วัน</p>}
    {error && <div role="alert" className="text-destructive">ไม่สามารถโหลดรายงานได้ กรุณาลองโหลดข้อมูลใหม่</div>}
    {isFetching ? <p role="status" className="text-muted-foreground">กำลังโหลดรายงาน...</p> : validRange && !error && <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label: "สร้างการจอง", value: booked.length, icon: CalendarDays }, { label: "ขอเข้าพื้นที่", value: planned.length, icon: CalendarDays }, { label: "เข้าจริง", value: actual.length, icon: Users }, { label: "เวลาอยู่เฉลี่ย", value: dwell.sample ? formatHoursMinutes(dwell.averageMinutes) : "—", icon: Clock }].map(item => <div key={item.label} className="border-l-2 border-primary pl-4 py-1"><div className="flex items-center gap-2 text-sm text-muted-foreground"><item.icon className="h-4 w-4" />{item.label}</div><div className="text-2xl font-bold mt-1">{item.value}</div></div>)}
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground"><Badge variant="outline">คนตามตั๋วเข้าจริง {actual.reduce((sum, r) => sum + r.worker_count, 0)} คน</Badge><Badge variant="outline">ออกเกินเวลาจอง {dwell.overtime} ตั๋ว</Badge><Badge variant="outline">เวลาอยู่: {dwell.sample} ตั๋วที่ รปภ. บันทึกเข้า–ออก</Badge><Badge variant="outline">ยกเลิก / ไม่อนุมัติ {booked.filter(r => ["rejected", "cancelled"].includes(r.status)).length} ตั๋วที่สร้างในช่วงนี้</Badge></div>
      {!filtered.length ? <p className="py-12 text-center text-muted-foreground">ไม่พบข้อมูลในช่วงเวลาหรือฝ่ายที่มีสิทธิ</p> : <>
        <Tabs value={tab} onValueChange={setTab}><TabsList className="h-auto flex-wrap"><TabsTrigger value="overview">วันและเวลา</TabsTrigger><TabsTrigger value="departments">เปรียบเทียบฝ่าย</TabsTrigger><TabsTrigger value="discipline">การจองและผู้รับเหมา</TabsTrigger><TabsTrigger value="tickets">รายการตั๋ว</TabsTrigger></TabsList></Tabs>
        {(tab === "overview" || tab === "tickets") && <Tabs value={metric} onValueChange={v => { setMetric(v as AccessMetric); setPage(0); }}><TabsList className="h-auto flex-wrap">{(Object.keys(METRIC_LABELS) as AccessMetric[]).map(m => <TabsTrigger key={m} value={m}>{METRIC_LABELS[m]}</TabsTrigger>)}</TabsList></Tabs>}
        {tab === "overview" && <div className="space-y-6">
          <div className="flex flex-wrap gap-4 border-b pb-4"><div><span className="text-sm text-muted-foreground">วันสูงสุด · </span><b>{dayPeak.label}</b> ({dayPeak.count} ตั๋ว)</div><div><span className="text-sm text-muted-foreground">ชั่วโมงสูงสุด · </span><b>{hourPeak.label}</b> ({hourPeak.count} ตั๋ว)</div></div>
          <div className="grid lg:grid-cols-2 gap-6"><CountChart title={`${METRIC_LABELS[metric]} · ตามวันในสัปดาห์`} data={dist.days} /><CountChart title={`${METRIC_LABELS[metric]} · ตามชั่วโมง`} data={dist.hours} /></div>
          <section className="space-y-3"><h2 className="font-semibold">ความหนาแน่นวัน × ชั่วโมง · {METRIC_LABELS[metric]}</h2><div className="overflow-x-auto"><table className="w-full min-w-[960px] text-xs border-separate border-spacing-1"><thead><tr><th className="text-left">วัน / เวลา</th>{dist.hours.map(h => <th key={h.name}>{h.name.slice(0, 2)}</th>)}</tr></thead><tbody>{dist.heat.map((counts, day) => <tr key={day}><th className="text-left font-medium whitespace-nowrap">{WEEKDAYS[day]}</th>{counts.map((count, hour) => <td key={hour} title={`${WEEKDAYS[day]} ${dist.hours[hour].name} · ${count} ตั๋ว`} className={`text-center h-8 rounded-sm ${!count ? "bg-muted text-muted-foreground" : count / heatMax > .66 ? "bg-primary text-primary-foreground" : count / heatMax > .33 ? "bg-primary/40 text-foreground" : "bg-primary/15 text-foreground"}`}>{count || "—"}</td>)}</tr>)}</tbody></table></div></section>
          <CountChart title={`${METRIC_LABELS[metric]} · แนวโน้มรายวัน`} data={dist.dates} line />
        </div>}
        {tab === "departments" && <section className="space-y-3"><h2 className="font-semibold">พฤติกรรมรายฝ่าย</h2><div className="overflow-x-auto"><table className="w-full min-w-[1300px] text-sm"><thead><tr className="border-b text-left">{["ฝ่าย", "สร้างจอง", "ขอเข้า", "เข้าจริง", "วันสร้างจองสูงสุด", "วันขอเข้าสูงสุด", "วันเข้าจริงสูงสุด", "เวลาเข้าจริงสูงสุด", "ขอเข้าทันที", "อยู่เฉลี่ย"].map(t => <th key={t} className="p-3 whitespace-nowrap">{t}</th>)}</tr></thead><tbody>{departments.map(r => <tr key={r.department} className="border-b hover:bg-muted/50"><td className="p-3 font-medium">{r.department}</td>{[r.booking, r.planned, r.actual, r.bookingDay.label, r.plannedDay.label, r.actualDay.label, r.actualHour.label, r.lead.walkin, r.dwell.sample ? formatHoursMinutes(r.dwell.averageMinutes) : "—"].map((v, i) => <td key={i} className="p-3">{v}</td>)}</tr>)}</tbody></table></div></section>}
        {tab === "discipline" && <div className="space-y-6"><section><h2 className="font-semibold mb-3">ระยะเวลาจองล่วงหน้า · ตามวันที่ขอเข้าพื้นที่</h2><div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{tiers.map(tier => <div key={tier} className={`rounded-lg border p-3 ${LEAD_TIERS[tier].className}`}><div className="text-2xl font-bold">{leads[tier]}</div><div className="text-sm">{LEAD_TIERS[tier].label}</div><div className="text-xs mt-1">{planned.length ? Math.round(leads[tier] / planned.length * 100) : 0}%</div></div>)}</div></section><CountChart title="วัตถุประสงค์การขอเข้า" data={purposeCounts} /><section><h2 className="font-semibold mb-3">ผู้รับเหมา</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">ผู้รับเหมา</th><th className="p-2">ขอเข้าพื้นที่</th><th className="p-2">ขอเข้าทันที</th></tr></thead><tbody>{teamCounts.map(r => <tr key={r.name} className="border-b"><td className="p-2">{r.name}</td><td className="p-2">{r.count}</td><td className="p-2">{r.walkin}</td></tr>)}</tbody></table></div></section></div>}
        {tab === "tickets" && <section><h2 className="font-semibold mb-3">{METRIC_LABELS[metric]} · {selected.length} ตั๋ว</h2><div className="overflow-x-auto"><table className="w-full min-w-[1150px] text-sm"><thead><tr className="text-left border-b">{["เลขตั๋ว", "ฝ่าย / คลัง", "สถานะ", "สร้างการจอง", "ขอเข้าพื้นที่", "เข้าจริง", "ออกจากพื้นที่", "ระยะเวลาในคลัง"].map(t => <th key={t} className="p-2">{t}</th>)}</tr></thead><tbody>{selected.slice(visiblePage * 25, visiblePage * 25 + 25).map(r => <tr key={r.id} className="border-b"><td className="p-2 font-mono">{r.ticket_no}</td><td className="p-2">{r.department || "ไม่ระบุฝ่าย"}<div className="text-muted-foreground text-xs">{r.warehouse_name}</div></td><td className="p-2">{SITE_ACCESS_STATUS[r.status]?.label || r.status}</td><td className="p-2">{dateLabel(r.created_at)}</td><td className="p-2">{dateLabel(r.planned_start_at)}</td><td className="p-2">{dateLabel(r.checkin_at)}</td><td className="p-2">{r.admin_closed_at ? "ปิดโดย Admin" : dateLabel(r.checkout_at)}</td><td className="p-2 whitespace-nowrap">{stayLabel(r)}</td></tr>)}</tbody></table></div><div className="flex items-center justify-end gap-3 mt-3"><Button variant="outline" size="sm" disabled={!visiblePage} onClick={() => setPage(visiblePage - 1)}>ก่อนหน้า</Button><span className="text-sm">{visiblePage + 1} / {Math.max(1, Math.ceil(selected.length / 25))}</span><Button variant="outline" size="sm" disabled={(visiblePage + 1) * 25 >= selected.length} onClick={() => setPage(visiblePage + 1)}>ถัดไป</Button></div></section>}
      </>}
    </>}
  </div>;
}