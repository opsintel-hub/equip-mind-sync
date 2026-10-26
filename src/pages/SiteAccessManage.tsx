import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, ClipboardCheck, Download, ImageIcon } from "lucide-react";
import SiteAccessCalendar from "@/components/site-access/SiteAccessCalendar";
import LeadTimeBadge from "@/components/site-access/LeadTimeBadge";
import { TablePagination } from "@/components/TablePagination";
import { useTablePagination } from "@/hooks/useTablePagination";
import { LEAD_TIERS, LeadTier, SITE_ACCESS_STATUS, fmtDT, fmtLead, leadHours, leadTier, purposeLabel } from "@/lib/siteAccess";

type Mode = "approve" | "reject" | "close";

export default function SiteAccessManage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("pending_assignment");
  const [tickets, setTickets] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [leadFilter, setLeadFilter] = useState<string>("__all__");
  const [active, setActive] = useState<any | null>(null);
  const [mode, setMode] = useState<Mode>("approve");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [photos, setPhotos] = useState<Record<string, any[]>>({});

  const load = async () => {
    let q = supabase.from("warehouse_access_tickets").select("*, warehouses(name)")
      .order("planned_start_at", { ascending: tab === "pending_assignment" || tab === "approved" }).limit(500);
    if (tab !== "all") q = q.eq("status", tab);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setTickets(data || []);
  };
  useEffect(() => { load(); }, [tab]);

  const withLead = useMemo(() => tickets.map((t) => {
    const h = leadHours(t.created_at, t.planned_start_at);
    return { ...t, _h: h, _tier: leadTier(h) as LeadTier | null };
  }), [tickets]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return withLead.filter((t) => (leadFilter === "__all__" || t._tier === leadFilter)
      && (!s || [t.ticket_no, t.contractor_name, t.supervisor_name, ...(t.vehicle_plates || [])].join(" ").toLowerCase().includes(s)));
  }, [withLead, search, leadFilter]);

  const summary = useMemo(() => {
    const m = new Map<string, Record<LeadTier, number> & { total: number }>();
    for (const t of filtered) {
      if (!t._tier) continue;
      const k = `${t.supervisor_name || "-"} · ${t.contractor_name || "-"}`;
      const r = m.get(k) || { gt48: 0, h24_48: 0, h12_24: 0, lt12: 0, walkin: 0, total: 0 };
      r[t._tier]++; r.total++; m.set(k, r);
    }
    return [...m.entries()].sort((a, b) => (b[1].walkin + b[1].lt12 + b[1].h12_24) - (a[1].walkin + a[1].lt12 + a[1].h12_24));
  }, [filtered]);

  const open = (t: any, m: Mode) => { setActive(t); setMode(m); setNote(""); };

  const save = async () => {
    if (!active || !user) return;
    if (mode !== "approve" && !note.trim()) return toast.error("กรุณาระบุเหตุผล");
    setSaving(true);
    let error: any = null;
    if (mode === "close") {
      ({ error } = await supabase.rpc("admin_close_access_ticket", { _ticket_id: active.id, _reason: note.trim() }));
    } else {
      const patch = mode === "approve"
        ? { status: "approved", assigned_by: user.id, assigned_at: new Date().toISOString(), reject_reason: null }
        : { status: "rejected", reject_reason: note.trim().slice(0, 500), assigned_by: user.id, assigned_at: new Date().toISOString() };
      ({ error } = await supabase.from("warehouse_access_tickets").update(patch).eq("id", active.id));
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(mode === "approve" ? `อนุมัติ ${active.ticket_no} แล้ว` : mode === "close" ? `ปิดตั๋ว ${active.ticket_no} โดย Admin แล้ว` : `ไม่อนุมัติ ${active.ticket_no}`);
    setActive(null); load();
  };

  const exportExcel = () => {
    const rows = filtered.map((t) => ({
      "เลขตั๋ว": t.ticket_no, "สถานะ": SITE_ACCESS_STATUS[t.status]?.label || t.status, "คลัง": t.warehouses?.name || "-",
      "วัตถุประสงค์": purposeLabel(t.purpose, t.purpose_other), "ผู้คุม": t.supervisor_name, "ฝ่ายผู้จอง": t.department || "-", "ผู้รับเหมา": t.contractor_name,
      "จองเมื่อ": fmtDT(t.created_at), "เวลาเริ่ม": fmtDT(t.planned_start_at), "จองล่วงหน้า": fmtLead(t._h),
      "ช่วงการจองล่วงหน้า": t._tier ? LEAD_TIERS[t._tier as LeadTier].label : "-",
      "เวลาเข้า": fmtDT(t.checkin_at), "เวลาออก": fmtDT(t.checkout_at),
      "ปิดตั๋วโดย Admin": t.admin_closed_at ? `${t.admin_closed_by_name || "-"} (${fmtDT(t.admin_closed_at)})` : "-",
      "เหตุผลปิดตั๋ว": t.admin_close_reason || "-",
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "ตั๋วเข้าพื้นที่");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary.map(([k, r]) => ({
      "ผู้คุม · ผู้รับเหมา": k, "ทั้งหมด": r.total, [LEAD_TIERS.gt48.label]: r.gt48, [LEAD_TIERS.h24_48.label]: r.h24_48,
      [LEAD_TIERS.h12_24.label]: r.h12_24, [LEAD_TIERS.lt12.label]: r.lt12, [LEAD_TIERS.walkin.label]: r.walkin,
    }))), "สรุปวินัยการจอง");
    XLSX.writeFile(wb, `site-access-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardCheck className="h-6 w-6" />จัดการตั๋วเข้าพื้นที่</h1>
        <p className="text-muted-foreground text-sm">คลังตรวจคำขอและอนุมัติก่อนวันเข้าพื้นที่ (ควรจองล่วงหน้า 48 ชั่วโมง)</p>
      </div>
      <SiteAccessCalendar />
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="pending_assignment">รออนุมัติ</TabsTrigger>
            <TabsTrigger value="approved">อนุมัติแล้ว</TabsTrigger>
            <TabsTrigger value="checked_in">อยู่ในพื้นที่</TabsTrigger>
            <TabsTrigger value="completed">ปิดแล้ว</TabsTrigger>
            <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={leadFilter} onValueChange={setLeadFilter}>
            <SelectTrigger className="sm:w-60"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">ทุกช่วงการจองล่วงหน้า</SelectItem>
              {(Object.keys(LEAD_TIERS) as LeadTier[]).map((k) => <SelectItem key={k} value={k}>{LEAD_TIERS[k].label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input className="sm:w-64" placeholder="ค้นหา เลขตั๋ว / ผู้รับเหมา / ทะเบียนรถ" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button variant="outline" onClick={exportExcel}><Download className="h-4 w-4 mr-1" />Export Excel</Button>
        </div>
      </div>

      <div className="grid gap-2 grid-cols-2 md:grid-cols-5">
        {(Object.keys(LEAD_TIERS) as LeadTier[]).map((k) => (
          <button key={k} type="button" onClick={() => setLeadFilter(leadFilter === k ? "__all__" : k)}
            className={`rounded-lg border p-3 text-left ${LEAD_TIERS[k].className} ${leadFilter === k ? "ring-2 ring-ring" : ""}`}>
            <div className="text-2xl font-bold">{withLead.filter((t) => t._tier === k).length}</div>
            <div className="text-xs">{LEAD_TIERS[k].label}</div>
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">ไม่มีรายการ</p>}
        {filtered.map((t) => {
          const st = SITE_ACCESS_STATUS[t.status] || { label: t.status, variant: "outline" as const };
          return (
            <Card key={t.id}>
              <CardContent className="pt-4 space-y-1.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-semibold">{t.ticket_no}</span>
                  <Badge variant={st.variant}>{st.label}</Badge>
                </div>
                <div className="text-muted-foreground">{fmtDT(t.planned_start_at)} – {fmtDT(t.planned_end_at)}</div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">จองเมื่อ {fmtDT(t.created_at)} <LeadTimeBadge createdAt={t.created_at} plannedStart={t.planned_start_at} /></div>
                <div><b>คลัง:</b> {t.warehouses?.name || "-"} · {purposeLabel(t.purpose, t.purpose_other)}</div>
                <div><b>ผู้จอง/ผู้คุม:</b> {t.supervisor_name} {t.supervisor_phone && `(${t.supervisor_phone})`}{t.department && <> · <b>ฝ่าย:</b> {t.department}</>}</div>
                <div><b>ผู้รับเหมา:</b> {t.contractor_name} · {t.worker_count} คน</div>
                <div><b>ทะเบียนรถ:</b> {(t.vehicle_plates || []).join(", ") || "-"}</div>
                <div className="whitespace-pre-line"><b>สิ่งของ:</b> {t.items_description || "-"}</div>
                {t.reject_reason && <div className="text-destructive">เหตุผล: {t.reject_reason}</div>}
                {t.admin_closed_at && (
                  <div className="rounded-md border bg-muted/40 p-2 text-xs">
                    <b>ปิดตั๋วโดย Admin:</b> {t.admin_closed_by_name || "-"} · {fmtDT(t.admin_closed_at)}<br />เหตุผล: {t.admin_close_reason}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  {t.status === "pending_assignment" && <Button size="sm" onClick={() => open(t, "approve")}>อนุมัติ</Button>}
                  {(t.status === "pending_assignment" || t.status === "approved") && <Button size="sm" variant="outline" onClick={() => open(t, "reject")}>ไม่อนุมัติ</Button>}
                  {(t.status === "checked_in" || t.status === "approved") && <Button size="sm" variant="secondary" onClick={() => open(t, "close")}>ปิดตั๋วแทน รปภ.</Button>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {summary.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">สรุปวินัยการจองล่วงหน้า (ตามผู้คุม · ผู้รับเหมา)</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left">
                <th className="p-2">ผู้คุม · ผู้รับเหมา</th><th className="p-2 text-right">ทั้งหมด</th>
                {(Object.keys(LEAD_TIERS) as LeadTier[]).map((k) => <th key={k} className="p-2 text-right">{LEAD_TIERS[k].label}</th>)}
              </tr></thead>
              <tbody>{summary.map(([k, r]) => (
                <tr key={k} className="border-b">
                  <td className="p-2">{k}</td><td className="p-2 text-right">{r.total}</td>
                  {(Object.keys(LEAD_TIERS) as LeadTier[]).map((tk) => <td key={tk} className="p-2 text-right">{r[tk]}</td>)}
                </tr>
              ))}</tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{mode === "approve" ? "อนุมัติตั๋ว" : mode === "close" ? "ปิดตั๋วแทน รปภ." : "ไม่อนุมัติตั๋ว"} {active?.ticket_no}</DialogTitle></DialogHeader>
          {mode === "approve" ? (
            <p className="text-sm text-muted-foreground">ยืนยันอนุมัติให้เข้าพื้นที่ตามวันเวลาที่จอง</p>
          ) : (
            <div className="space-y-1.5">
              {mode === "close" && <p className="text-sm text-muted-foreground">ใช้เมื่อ รปภ. ลืมปิดตั๋ว ระบบจะบันทึกว่าปิดโดย Admin (ชื่อของคุณ) — ทำได้เฉพาะ Admin ของฝ่ายที่เกี่ยวข้อง หรือ Super Admin</p>}
              <Label>เหตุผล *</Label>
              <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)}>ยกเลิก</Button>
            <Button variant={mode === "reject" ? "destructive" : "default"} disabled={saving} onClick={save}>{saving ? "กำลังบันทึก..." : "ยืนยัน"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
