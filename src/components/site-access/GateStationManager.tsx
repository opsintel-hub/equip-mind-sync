import { useEffect, useState } from "react";
import { toast } from "sonner";
import QRCode from "react-qr-code";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, KeyRound, Plus, Power, Trash2 } from "lucide-react";
import { fmtDT } from "@/lib/siteAccess";

const genPin = () => String(Math.floor(100000 + Math.random() * 900000));

export default function GateStationManager() {
  const [rows, setRows] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [edit, setEdit] = useState<any | null>(null);
  const [shownPin, setShownPin] = useState<{ code: string; pin: string } | null>(null);
  const [toDelete, setToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("gate_stations").select("id, code, name, warehouse_id, is_active, last_used_at, locked_until").order("created_at");
    setRows(data || []);
  };
  useEffect(() => {
    load();
    supabase.from("warehouses").select("id, code, name").order("code").then(({ data }) => setWarehouses(data || []));
  }, []);

  const link = (code: string) => `${window.location.origin}/gate/${code}`;

  const save = async () => {
    if (!edit.code?.trim() || !edit.name?.trim()) return toast.error("กรอกรหัสและชื่อจุดตรวจ");
    const pin = edit.id ? (edit.resetPin ? genPin() : null) : genPin();
    const { error } = await supabase.rpc("gate_station_upsert", {
      _id: edit.id || null, _code: edit.code, _name: edit.name,
      _warehouse_id: edit.warehouse_id && edit.warehouse_id !== "__none__" ? edit.warehouse_id : null, _pin: pin,
    } as any);
    if (error) return toast.error(error.message);
    if (pin) setShownPin({ code: edit.code.toUpperCase().trim(), pin });
    setEdit(null); load();
  };

  const resetPin = async (r: any) => {
    const pin = genPin();
    const { error } = await supabase.rpc("gate_station_upsert", { _id: r.id, _code: r.code, _name: r.name, _warehouse_id: r.warehouse_id, _pin: pin } as any);
    if (error) return toast.error(error.message);
    setShownPin({ code: r.code, pin }); load();
  };

  const toggle = async (r: any) => {
    const { error } = await supabase.from("gate_stations").update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const { error } = await supabase.from("gate_stations").delete().eq("id", toDelete.id);
    setDeleting(false);
    if (error) return toast.error(error.message);
    toast.success(`ลบจุดตรวจ ${toDelete.code} แล้ว`);
    setToDelete(null); load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">จุดตรวจ รปภ. (Station PIN)</CardTitle>
        <Button size="sm" onClick={() => setEdit({ code: "", name: "", warehouse_id: "__none__" })}><Plus className="mr-1 h-4 w-4" />เพิ่มจุดตรวจ</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีจุดตรวจ</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><span className="font-mono font-bold">{r.code}</span><span>{r.name}</span>
                <Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "ใช้งาน" : "ปิดใช้งาน"}</Badge></div>
              <div className="truncate text-xs text-muted-foreground">{link(r.code)} · ใช้ล่าสุด {r.last_used_at ? fmtDT(r.last_used_at) : "-"}</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(link(r.code)); toast.success("คัดลอกลิงก์แล้ว"); }}><Copy className="mr-1 h-4 w-4" />ลิงก์</Button>
            <Button size="sm" variant="outline" onClick={() => resetPin(r)}><KeyRound className="mr-1 h-4 w-4" />ตั้ง PIN ใหม่</Button>
            <Button size="sm" variant="outline" onClick={() => setEdit({ ...r, warehouse_id: r.warehouse_id || "__none__" })}>แก้ไข</Button>
            <Button size="sm" variant="outline" onClick={() => toggle(r)}><Power className="mr-1 h-4 w-4" />{r.is_active ? "ปิด" : "เปิด"}</Button>
            <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setToDelete(r)}><Trash2 className="mr-1 h-4 w-4" />ลบ</Button>
          </div>
        ))}
      </CardContent>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "แก้ไขจุดตรวจ" : "เพิ่มจุดตรวจ"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <Input placeholder="รหัสจุด เช่น BST-GATE1" value={edit.code} disabled={!!edit.id}
                onChange={(e) => setEdit({ ...edit, code: e.target.value.replace(/[^A-Za-z0-9-]/g, "").toUpperCase() })} />
              <Input placeholder="ชื่อ เช่น ป้อม รปภ. คลังบางเสาธง" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
              <Select value={edit.warehouse_id} onValueChange={(v) => setEdit({ ...edit, warehouse_id: v })}>
                <SelectTrigger><SelectValue placeholder="คลัง" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— ไม่ระบุคลัง —</SelectItem>
                  {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name} ({w.code})</SelectItem>)}
                </SelectContent>
              </Select>
              {!edit.id && <p className="text-xs text-muted-foreground">ระบบจะสร้าง PIN 6 หลักให้อัตโนมัติ และแสดงครั้งเดียว</p>}
            </div>
          )}
          <DialogFooter><Button onClick={save}>บันทึก</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!shownPin} onOpenChange={(o) => !o && setShownPin(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>PIN จุดตรวจ {shownPin?.code}</DialogTitle></DialogHeader>
          {shownPin && (
            <div className="space-y-3 text-center">
              <div className="font-mono text-5xl font-bold tracking-widest">{shownPin.pin}</div>
              <p className="text-sm text-destructive">PIN จะแสดงครั้งนี้ครั้งเดียว — จดแจ้งหัวหน้า รปภ. ทันที (PIN เดิมและเครื่องที่ล็อกอินอยู่จะใช้ไม่ได้)</p>
              <div className="mx-auto w-fit rounded bg-card p-3"><QRCode value={link(shownPin.code)} size={160} /></div>
              <div className="break-all text-xs">{link(shownPin.code)}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>ลบจุดตรวจ {toDelete?.code}?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            จะลบจุดตรวจ <b>{toDelete?.name}</b> และเครื่องที่ล็อกอินอยู่ทั้งหมดออกทันที (ประวัติตั๋วเข้า-ออกเดิมยังอยู่ครบ) — ลบแล้วกู้คืนไม่ได้
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>ยกเลิก</Button>
            <Button variant="destructive" disabled={deleting} onClick={remove}>{deleting ? "กำลังลบ..." : "ยืนยันลบ"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
