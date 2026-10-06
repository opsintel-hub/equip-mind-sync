import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardCheck } from "lucide-react";
import { SITE_ACCESS_PURPOSE, SITE_ACCESS_STATUS, fmtDT } from "@/lib/siteAccess";

export default function SiteAccessManage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("pending_assignment");
  const [tickets, setTickets] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<any | null>(null);
  const [mode, setMode] = useState<"approve" | "reject">("approve");
  const [locations, setLocations] = useState<{ id: string; code: string; name: string }[]>([]);
  const [locId, setLocId] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    let q = supabase.from("warehouse_access_tickets").select("*, warehouses(name), locations:assigned_location_id(code,name)")
      .order("planned_start_at", { ascending: tab === "pending_assignment" || tab === "approved" }).limit(200);
    if (tab !== "all") q = q.eq("status", tab);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setTickets(data || []);
  };
  useEffect(() => { load(); }, [tab]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return tickets;
    return tickets.filter((t) => [t.ticket_no, t.contractor_name, t.supervisor_name, ...(t.vehicle_plates || [])].join(" ").toLowerCase().includes(s));
  }, [tickets, search]);

  const open = async (t: any, m: "approve" | "reject") => {
    setActive(t); setMode(m); setLocId(t.assigned_location_id || ""); setNote(m === "approve" ? t.assigned_location_note || "" : "");
    if (m === "approve" && t.warehouse_id) {
      const { data } = await supabase.from("locations").select("id,code,name").eq("warehouse_id", t.warehouse_id).order("code");
      setLocations(data || []);
    }
  };

  const save = async () => {
    if (!active || !user) return;
    if (mode === "approve" && !locId) return toast.error("กรุณาเลือกจุดวางของ");
    if (mode === "reject" && !note.trim()) return toast.error("กรุณาระบุเหตุผล");
    setSaving(true);
    const patch = mode === "approve"
      ? { status: "approved", assigned_location_id: locId, assigned_location_note: note.trim().slice(0, 500) || null, assigned_by: user.id, assigned_at: new Date().toISOString(), reject_reason: null }
      : { status: "rejected", reject_reason: note.trim().slice(0, 500), assigned_by: user.id, assigned_at: new Date().toISOString() };
    const { error } = await supabase.from("warehouse_access_tickets").update(patch).eq("id", active.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(mode === "approve" ? `อนุมัติ ${active.ticket_no} แล้ว` : `ไม่อนุมัติ ${active.ticket_no}`);
    setActive(null); load();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardCheck className="h-6 w-6" />จัดการตั๋วเข้าพื้นที่</h1>
        <p className="text-muted-foreground text-sm">คลังตรวจคำขอ ระบุจุดวางของ และอนุมัติก่อนวันเข้าพื้นที่</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="pending_assignment">รออนุมัติ</TabsTrigger>
            <TabsTrigger value="approved">อนุมัติแล้ว</TabsTrigger>
            <TabsTrigger value="checked_in">อยู่ในพื้นที่</TabsTrigger>
            <TabsTrigger value="completed">ปิดแล้ว</TabsTrigger>
            <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input className="sm:w-72" placeholder="ค้นหา เลขตั๋ว / ผู้รับเหมา / ทะเบียนรถ" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                <div><b>คลัง:</b> {t.warehouses?.name || "-"} · {SITE_ACCESS_PURPOSE[t.purpose] || t.purpose}</div>
                <div><b>ผู้คุม:</b> {t.supervisor_name} {t.supervisor_phone && `(${t.supervisor_phone})`}</div>
                <div><b>ผู้รับเหมา:</b> {t.contractor_name} · {t.worker_count} คน</div>
                <div><b>ทะเบียนรถ:</b> {(t.vehicle_plates || []).join(", ") || "-"}</div>
                <div className="whitespace-pre-line"><b>สิ่งของ:</b> {t.items_description || "-"}</div>
                {t.locations && <div><b>จุดวาง:</b> {t.locations.code} {t.locations.name}{t.assigned_location_note ? ` — ${t.assigned_location_note}` : ""}</div>}
                {t.reject_reason && <div className="text-destructive">เหตุผล: {t.reject_reason}</div>}
                {(t.status === "pending_assignment" || t.status === "approved") && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={() => open(t, "approve")}>{t.status === "approved" ? "แก้จุดวาง" : "ระบุจุดวาง & อนุมัติ"}</Button>
                    <Button size="sm" variant="outline" onClick={() => open(t, "reject")}>ไม่อนุมัติ</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{mode === "approve" ? "ระบุจุดวางและอนุมัติ" : "ไม่อนุมัติตั๋ว"} {active?.ticket_no}</DialogTitle></DialogHeader>
          {mode === "approve" ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>จุดวางของ *</Label>
                <Select value={locId || undefined} onValueChange={setLocId}>
                  <SelectTrigger><SelectValue placeholder="เลือกตำแหน่ง" /></SelectTrigger>
                  <SelectContent className="max-h-72">{locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.code} {l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>คำแนะนำเพิ่มเติม</Label>
                <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="เช่น วางชิดผนังด้านทิศเหนือ ห้ามวางทับทางเดินรถ" />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
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
