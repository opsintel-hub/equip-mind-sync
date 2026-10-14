import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, CameraOff, CheckCircle2, LogOut, ImagePlus, Search, ShieldAlert, Truck, Users, MapPin, Phone } from "lucide-react";
import { SITE_ACCESS_PURPOSE, SITE_ACCESS_STATUS, fmtDT } from "@/lib/siteAccess";

const SELECT = "*, warehouses(name, code), locations:assigned_location_id(code, name)";

export default function SiteAccessGate() {
  const [query, setQuery] = useState("");
  const [ticket, setTicket] = useState<any | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [tab, setTab] = useState("scan");
  const [inside, setInside] = useState<any[]>([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const loadInside = async () => {
    const { data } = await supabase.from("warehouse_access_tickets" as any).select(SELECT)
      .eq("status", "checked_in").order("checkin_at", { ascending: false });
    setInside((data as any[]) || []);
  };
  useEffect(() => { loadInside(); return () => { stopScan(); }; }, []);

  const lookup = async (raw: string) => {
    const q = raw.trim().toUpperCase();
    if (!q) return;
    setBusy(true); setNotFound(false);
    let { data } = await supabase.from("warehouse_access_tickets" as any).select(SELECT).eq("ticket_no", q).maybeSingle();
    if (!data) {
      const r = await supabase.from("warehouse_access_tickets" as any).select(SELECT)
        .contains("vehicle_plates", [raw.trim()]).in("status", ["approved", "checked_in"])
        .order("planned_start_at", { ascending: true }).limit(1).maybeSingle();
      data = r.data;
    }
    setTicket(data || null); setNotFound(!data); setBusy(false);
  };

  const stopScan = async () => {
    const s = scannerRef.current; scannerRef.current = null;
    if (s) { try { await s.stop(); s.clear(); } catch { /* ignore */ } }
    setScanning(false);
  };
  const startScan = async () => {
    setScanning(true);
    await new Promise((r) => setTimeout(r, 50));
    try {
      const s = new Html5Qrcode("gate-qr-reader");
      scannerRef.current = s;
      await s.start({ facingMode: "environment" }, { fps: 10, qrbox: 240 }, (text) => {
        stopScan(); setQuery(text); lookup(text);
      }, () => {});
    } catch {
      toast.error("เปิดกล้องไม่ได้ — กรุณาอนุญาตกล้อง หรือพิมพ์เลขตั๋วแทน");
      setScanning(false);
    }
  };

  const stampIn = async () => {
    if (!ticket) return;
    setBusy(true);
    const { error } = await supabase.rpc("access_ticket_gate_stamp" as any, { _ticket_id: ticket.id, _action: "checkin" });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`บันทึกเวลาเข้าแล้ว ${ticket.ticket_no}`);
    await lookup(ticket.ticket_no); loadInside();
  };

  const [photos, setPhotos] = useState<{ id: string; photo_type: string; image_url: string }[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const loadPhotos = async (id: string) => {
    const { data } = await supabase.from("warehouse_access_photos").select("id,photo_type,image_url").eq("ticket_id", id).order("created_at");
    setPhotos(data || []);
  };
  useEffect(() => { if (ticket?.status === "checked_in") loadPhotos(ticket.id); else setPhotos([]); }, [ticket?.id, ticket?.status]);

  const uploadPhoto = async (type: "placement" | "cleanliness", file?: File) => {
    if (!ticket || !file) return;
    if (!file.type.startsWith("image/")) return toast.error("กรุณาเลือกไฟล์รูปภาพ");
    setUploading(type);
    const path = `site-access/${ticket.id}/${type}-${Date.now()}.${(file.name.split(".").pop() || "jpg").toLowerCase()}`;
    const up = await supabase.storage.from("delivery-confirmations").upload(path, file, { upsert: false });
    if (up.error) { setUploading(null); return toast.error(up.error.message); }
    const url = supabase.storage.from("delivery-confirmations").getPublicUrl(path).data.publicUrl;
    const { error } = await supabase.from("warehouse_access_photos").insert({ ticket_id: ticket.id, photo_type: type, image_url: url });
    setUploading(null);
    if (error) return toast.error(error.message);
    loadPhotos(ticket.id);
  };

  const stampOut = async () => {
    if (!ticket) return;
    setBusy(true);
    const { error } = await supabase.rpc("access_ticket_gate_stamp" as any, { _ticket_id: ticket.id, _action: "checkout" });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`บันทึกเวลาออกแล้ว ${ticket.ticket_no}`);
    await lookup(ticket.ticket_no); loadInside();
  };

  const reset = () => { setTicket(null); setQuery(""); setNotFound(false); };

  const canEnter = ticket?.status === "approved" && !!ticket?.supervisor_id;
  const st = ticket ? SITE_ACCESS_STATUS[ticket.status] || { label: ticket.status, variant: "outline" as const } : null;

  return (
    <div className="mx-auto max-w-xl space-y-4 p-3 sm:p-6">
      <h1 className="text-2xl font-bold">จุดตรวจ รปภ.</h1>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2 h-12">
          <TabsTrigger value="scan" className="text-base">สแกนตั๋ว</TabsTrigger>
          <TabsTrigger value="inside" className="text-base" onClick={loadInside}>อยู่ในพื้นที่ ({inside.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="scan" className="space-y-4">
          {!ticket && (
            <Card><CardContent className="space-y-3 pt-6">
              {scanning ? (
                <>
                  <div id="gate-qr-reader" className="overflow-hidden rounded-lg" />
                  <Button variant="outline" className="h-12 w-full text-base" onClick={stopScan}><CameraOff className="mr-2 h-5 w-5" />ปิดกล้อง</Button>
                </>
              ) : (
                <Button className="h-20 w-full text-xl" onClick={startScan}><Camera className="mr-2 h-7 w-7" />สแกน QR ของพนักงานบริษัท</Button>
              )}
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); lookup(query); }}>
                <Input className="h-12 text-base" placeholder="หรือพิมพ์เลขตั๋ว / ทะเบียนรถ" value={query} onChange={(e) => setQuery(e.target.value)} />
                <Button type="submit" className="h-12" disabled={busy}><Search className="h-5 w-5" /></Button>
              </form>
              {notFound && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive bg-destructive/10 p-4 text-lg font-semibold text-destructive">
                  <ShieldAlert className="h-6 w-6" />ไม่พบตั๋ว — ห้ามเข้าพื้นที่
                </div>
              )}
            </CardContent></Card>
          )}

          {ticket && (
            <Card><CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-lg font-bold">{ticket.ticket_no}</span>
                <Badge variant={st!.variant} className="text-sm">{st!.label}</Badge>
              </div>

              <div className="rounded-lg border bg-muted/40 p-4">
                <div className="text-sm text-muted-foreground">พนักงานบริษัทผู้คุมงาน</div>
                <div className="text-2xl font-bold">{ticket.supervisor_name || "— ไม่มี —"}</div>
                {ticket.supervisor_phone && (
                  <a href={`tel:${ticket.supervisor_phone}`} className="mt-1 inline-flex items-center gap-1 text-lg text-primary"><Phone className="h-5 w-5" />{ticket.supervisor_phone}</a>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-base">
                <div className="rounded-lg border p-3"><Users className="mb-1 h-5 w-5" /><div className="text-3xl font-bold">{ticket.worker_count}</div><div className="text-sm text-muted-foreground">คน · {ticket.contractor_name}</div></div>
                <div className="rounded-lg border p-3"><Truck className="mb-1 h-5 w-5" /><div className="whitespace-pre-line font-mono text-lg font-bold">{(ticket.vehicle_plates || []).join("\n")}</div></div>
              </div>

              <div className="rounded-lg border border-primary/40 bg-primary/10 p-4">
                <div className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />จุดวางของที่คลังกำหนด</div>
                <div className="text-xl font-bold">{ticket.locations ? `${ticket.locations.code} ${ticket.locations.name}` : "-"}</div>
                {ticket.assigned_location_note && <div>{ticket.assigned_location_note}</div>}
                <div className="mt-1 text-sm">{SITE_ACCESS_PURPOSE[ticket.purpose] || ticket.purpose}: {ticket.items_description}</div>
              </div>

              <div className="text-sm text-muted-foreground">นัดหมาย {fmtDT(ticket.planned_start_at)} – {fmtDT(ticket.planned_end_at)}</div>
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-center font-semibold text-destructive">🚭 ห้ามสูบบุหรี่ · 🚯 ห้ามทิ้งขยะ</div>

              {canEnter ? (
                <Button className="h-24 w-full text-2xl" disabled={busy} onClick={stampIn}>
                  <CheckCircle2 className="mr-2 h-8 w-8" />{busy ? "กำลังบันทึก..." : "บันทึกเวลาเข้า"}
                </Button>
              ) : ticket.status === "checked_in" ? (
                <div className="space-y-3">
                  <div className="rounded-lg border bg-primary/10 p-3 text-center text-lg font-semibold">เข้าพื้นที่แล้วเมื่อ {fmtDT(ticket.checkin_at)}</div>
                  <div className="text-base font-semibold">ถ่ายรูปตรวจพื้นที่ก่อนปล่อยรถ</div>
                  <div className="grid grid-cols-2 gap-3">
                    {([["placement", "จุดวางของ"], ["cleanliness", "ความสะอาด / ไม่มีขยะ"]] as const).map(([type, label]) => {
                      const list = photos.filter((p) => p.photo_type === type);
                      return (
                        <label key={type} className={`flex min-h-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-2 text-center ${list.length ? "border-primary bg-primary/5" : "border-muted-foreground/40"}`}>
                          {list.length ? <img src={list[list.length - 1].image_url} alt={label} className="h-24 w-full rounded object-cover" /> : <ImagePlus className="h-8 w-8" />}
                          <span className="text-sm font-medium">{uploading === type ? "กำลังอัปโหลด..." : list.length ? `✓ ${label} (แตะเพื่อถ่ายใหม่)` : `ถ่ายรูป${label}`}</span>
                          <input type="file" accept="image/*" capture="environment" className="hidden" disabled={!!uploading}
                            onChange={(e) => { uploadPhoto(type, e.target.files?.[0]); e.target.value = ""; }} />
                        </label>
                      );
                    })}
                  </div>
                  <Button className="h-20 w-full text-xl" disabled={busy || !!uploading || !photos.some((p) => p.photo_type === "placement") || !photos.some((p) => p.photo_type === "cleanliness")} onClick={stampOut}>
                    <LogOut className="mr-2 h-7 w-7" />{busy ? "กำลังบันทึก..." : "บันทึกเวลาออก / ปล่อยรถ"}
                  </Button>
                </div>
              ) : ticket.status === "completed" ? (
                <div className="rounded-lg border bg-muted p-4 text-center text-lg font-semibold">ออกจากพื้นที่แล้วเมื่อ {fmtDT(ticket.checkout_at)}</div>
              ) : (
                <div className="flex items-center justify-center gap-2 rounded-lg border border-destructive bg-destructive/10 p-4 text-lg font-semibold text-destructive">
                  <ShieldAlert className="h-6 w-6" />ห้ามเข้าพื้นที่ — {!ticket.supervisor_id ? "ไม่มีผู้คุมงานบริษัท" : "ตั๋วยังไม่อนุมัติ"}
                </div>
              )}
              <Button variant="outline" className="h-12 w-full text-base" onClick={reset}>สแกนตั๋วถัดไป</Button>
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="inside" className="space-y-3">
          {inside.length === 0 && <p className="text-muted-foreground">ไม่มีใครอยู่ในพื้นที่</p>}
          {inside.map((t) => (
            <Card key={t.id}><CardContent className="space-y-1 pt-4 text-base">
              <div className="flex justify-between"><span className="font-mono font-bold">{t.ticket_no}</span><span className="text-sm">เข้า {fmtDT(t.checkin_at)}</span></div>
              <div>ผู้คุม: <b>{t.supervisor_name}</b> {t.supervisor_phone}</div>
              <div>{t.worker_count} คน · {t.contractor_name}</div>
              <div className="font-mono">{(t.vehicle_plates || []).join(", ")}</div>
              <Button variant="outline" className="mt-2 h-11 w-full" onClick={() => { setTab("scan"); setQuery(t.ticket_no); lookup(t.ticket_no); }}>ตรวจพื้นที่ / บันทึกออก</Button>
            </CardContent></Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
