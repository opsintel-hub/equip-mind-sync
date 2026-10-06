import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Ticket } from "lucide-react";
import { SITE_ACCESS_PURPOSE, SITE_ACCESS_STATUS, fmtDT } from "@/lib/siteAccess";

const schema = z.object({
  warehouse_id: z.string().uuid({ message: "กรุณาเลือกคลัง" }),
  contractor_name: z.string().trim().min(1, "กรุณาระบุชื่อผู้รับเหมา").max(200),
  worker_count: z.number().int().min(1, "จำนวนคนต้องอย่างน้อย 1"),
  vehicle_plates: z.array(z.string().trim().min(1).max(30)).min(1, "กรุณาระบุทะเบียนรถอย่างน้อย 1 คัน"),
  items_description: z.string().trim().min(1, "กรุณาระบุรายการสิ่งของ").max(2000),
  supervisor_phone: z.string().trim().min(9, "กรุณาระบุเบอร์โทรผู้คุม").max(20),
  planned_start_at: z.string().min(1, "กรุณาระบุเวลาเริ่ม"),
  planned_end_at: z.string().min(1, "กรุณาระบุเวลาสิ้นสุด"),
});

export default function SiteAccessRequest() {
  const { user } = useAuth();
  const { profile } = useCurrentUserProfile();
  const [warehouses, setWarehouses] = useState<{ id: string; name: string; code: string }[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    warehouse_id: "", contractor_name: "", worker_count: "1", purpose: "bring_in",
    items_description: "", supervisor_phone: "", planned_start_at: "", planned_end_at: "", notes: "",
  });
  const [plates, setPlates] = useState<string[]>([""]);
  const [ack, setAck] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("warehouse_access_tickets").select("*, warehouses(name), locations:assigned_location_id(code,name)")
      .eq("created_by", user.id).order("created_at", { ascending: false }).limit(50);
    setTickets(data || []);
  };

  useEffect(() => {
    supabase.from("warehouses").select("id,name,code").eq("is_active", true).order("name").then(({ data }) => {
      setWarehouses(data || []);
      const bst = (data || []).find((w) => w.name.includes("บางเสาธง"));
      if (bst) setForm((f) => (f.warehouse_id ? f : { ...f, warehouse_id: bst.id }));
    });
    load();
  }, [user?.id]);

  useEffect(() => {
    if (profile?.phone) setForm((f) => (f.supervisor_phone ? f : { ...f, supervisor_phone: profile.phone }));
  }, [profile?.phone]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    const parsed = schema.safeParse({ ...form, worker_count: Number(form.worker_count), vehicle_plates: plates.filter((p) => p.trim()) });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (new Date(form.planned_end_at) <= new Date(form.planned_start_at)) return toast.error("เวลาสิ้นสุดต้องหลังเวลาเริ่ม");
    if (!ack) return toast.error("กรุณายืนยันว่าจะไปคุมงานด้วยตนเองและรับทราบกฎความปลอดภัย");
    setSaving(true);
    const d = parsed.data;
    const { data, error } = await supabase.from("warehouse_access_tickets").insert({
      warehouse_id: d.warehouse_id, contractor_name: d.contractor_name, worker_count: d.worker_count,
      vehicle_plates: d.vehicle_plates.map((p) => p.toUpperCase()), purpose: form.purpose,
      items_description: d.items_description, supervisor_id: user.id,
      supervisor_name: profile.displayName || profile.fullName, supervisor_phone: d.supervisor_phone,
      planned_start_at: new Date(d.planned_start_at).toISOString(), planned_end_at: new Date(d.planned_end_at).toISOString(),
      notes: form.notes.trim() || null, safety_acknowledged: true,
    }).select("ticket_no").single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`เปิดตั๋ว ${data.ticket_no} แล้ว รอคลังระบุจุดวางและอนุมัติ`);
    setForm((f) => ({ ...f, contractor_name: "", worker_count: "1", items_description: "", planned_start_at: "", planned_end_at: "", notes: "" }));
    setPlates([""]); setAck(false); load();
  };

  const cancel = async (id: string) => {
    const { error } = await supabase.from("warehouse_access_tickets").update({ status: "cancelled" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("ยกเลิกตั๋วแล้ว"); load();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Ticket className="h-6 w-6" />จองเข้าพื้นที่คลัง</h1>
        <p className="text-muted-foreground text-sm">ผู้คุมงานของบริษัทเปิดตั๋วล่วงหน้า — ผู้รับเหมาเข้าพื้นที่ได้เฉพาะเมื่อมีผู้คุมอยู่ด้วย</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">เปิดตั๋วใหม่</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>คลัง *</Label>
                <Select value={form.warehouse_id || undefined} onValueChange={(v) => set("warehouse_id", v)}>
                  <SelectTrigger><SelectValue placeholder="เลือกคลัง" /></SelectTrigger>
                  <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name} ({w.code})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>วัตถุประสงค์ *</Label>
                <Select value={form.purpose} onValueChange={(v) => set("purpose", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(SITE_ACCESS_PURPOSE).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>เวลาเริ่ม *</Label>
                <Input type="datetime-local" value={form.planned_start_at} onChange={(e) => set("planned_start_at", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>เวลาสิ้นสุด *</Label>
                <Input type="datetime-local" value={form.planned_end_at} onChange={(e) => set("planned_end_at", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>ผู้คุมงาน (บริษัท)</Label>
                <Input value={profile?.displayName || profile?.fullName || ""} disabled />
              </div>
              <div className="space-y-1.5">
                <Label>เบอร์โทรผู้คุม *</Label>
                <Input value={form.supervisor_phone} onChange={(e) => set("supervisor_phone", e.target.value)} maxLength={20} />
              </div>
              <div className="space-y-1.5">
                <Label>บริษัทผู้รับเหมา *</Label>
                <Input value={form.contractor_name} onChange={(e) => set("contractor_name", e.target.value)} maxLength={200} />
              </div>
              <div className="space-y-1.5">
                <Label>จำนวนคนผู้รับเหมา *</Label>
                <Input type="number" min={1} value={form.worker_count} onWheel={(e) => e.currentTarget.blur()} onChange={(e) => set("worker_count", e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>ทะเบียนรถ * (ทุกคันที่จะเข้า)</Label>
              {plates.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={p} placeholder="เช่น 70-1234 กรุงเทพ" maxLength={30}
                    onChange={(e) => setPlates((ps) => ps.map((x, j) => (j === i ? e.target.value : x)))} />
                  {plates.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => setPlates((ps) => ps.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setPlates((ps) => [...ps, ""])}><Plus className="h-4 w-4 mr-1" />เพิ่มรถ</Button>
            </div>

            <div className="space-y-1.5">
              <Label>รายการสิ่งของที่นำเข้า/ออก *</Label>
              <Textarea rows={3} value={form.items_description} onChange={(e) => set("items_description", e.target.value)} placeholder="เช่น โครงเหล็กป้าย 3 ชุด, แผ่นไวนิลรอทิ้ง 20 ม้วน" maxLength={2000} />
            </div>
            <div className="space-y-1.5">
              <Label>หมายเหตุ</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} maxLength={1000} />
            </div>

            <label className="flex items-start gap-2 text-sm rounded-md border p-3 bg-muted/40">
              <Checkbox checked={ack} onCheckedChange={(v) => setAck(!!v)} className="mt-0.5" />
              <span>ข้าพเจ้าจะไปคุมงานด้วยตนเองตลอดเวลา และรับทราบกฎ: ห้ามสูบบุหรี่ ห้ามทิ้งขยะ ต้องถ่ายรูปจุดวางและความสะอาดก่อนออก</span>
            </label>

            <Button type="submit" disabled={saving} className="w-full sm:w-auto">{saving ? "กำลังบันทึก..." : "ส่งคำขอเข้าพื้นที่"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">ตั๋วของฉัน</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {tickets.length === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีตั๋ว</p>}
          {tickets.map((t) => {
            const st = SITE_ACCESS_STATUS[t.status] || { label: t.status, variant: "outline" as const };
            return (
              <div key={t.id} className="rounded-lg border p-3 space-y-1 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono font-semibold">{t.ticket_no}</span>
                  <Badge variant={st.variant}>{st.label}</Badge>
                </div>
                <div>{t.warehouses?.name} · {t.contractor_name} · {t.worker_count} คน · {(t.vehicle_plates || []).join(", ")}</div>
                <div className="text-muted-foreground">{fmtDT(t.planned_start_at)} – {fmtDT(t.planned_end_at)}</div>
                {t.status !== "pending_assignment" && t.locations && (
                  <div>จุดวาง: <b>{t.locations.code} {t.locations.name}</b>{t.assigned_location_note ? ` — ${t.assigned_location_note}` : ""}</div>
                )}
                {t.status === "rejected" && t.reject_reason && <div className="text-destructive">เหตุผล: {t.reject_reason}</div>}
                {t.status === "pending_assignment" && (
                  <Button size="sm" variant="outline" onClick={() => cancel(t.id)}>ยกเลิกตั๋ว</Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
