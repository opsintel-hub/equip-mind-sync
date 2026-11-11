import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Plus, RotateCcw, Square, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { bangkokInputToISO, parseTicketCodes } from "@/lib/magicTicketTestSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Tables } from "@/integrations/supabase/types";

type Session = Tables<"magic_ticket_test_sessions">;
type Asset = { id: string; code: string; name: string; department: string | null; sn?: string | null };
const dt = (v: string) => new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(v));
const statuses: Record<string, string> = { open: "เปิดรอบ", ended: "รอตรวจคืน", rolled_back: "คืนข้อมูลแล้ว" };

export default function MagicTicketTestSessions() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [tickets, setTickets] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [general, setGeneral] = useState("");
  const [assetLimit, setAssetLimit] = useState(100);
  const [serial, setSerial] = useState("");
  const [review, setReview] = useState<Session | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const sessions = useQuery({ queryKey: ["mt-test-sessions"], queryFn: () => fetchAllRows<Session>(() => supabase.from("magic_ticket_test_sessions").select("*").order("created_at", { ascending: false })) });
  const assets = useQuery({ queryKey: ["mt-test-assets"], enabled: createOpen, queryFn: async () => {
    const [eq, mp] = await Promise.all([
      fetchAllRows<Asset>(() => supabase.from("equipment").select("id,code,name,department").eq("is_active", true).order("code")),
      fetchAllRows<Asset & { serial_number_1: string | null; serial_number_2: string | null }>(() => supabase.from("media_players").select("id,code,name,department,serial_number_1,serial_number_2").order("code")),
    ]);
    return [...eq, ...mp.map(m => ({ ...m, sn: [m.serial_number_1, m.serial_number_2].filter(Boolean).join("\n") }))];
  } });
  const details = useQuery({ queryKey: ["mt-test-detail", review?.id], enabled: !!review, queryFn: async () => {
    if (!review) return [];
    const docs = await fetchAllRows<Tables<"magic_ticket_test_documents">>(() => supabase.from("magic_ticket_test_documents").select("*").eq("session_id", review.id));
    const rows = [];
    for (const doc of docs) {
      const { data: header, error } = await supabase.from("goods_issue_pending").select("document_no,requester_name").eq("id", doc.pending_id).single();
      if (error) throw error;
      const lines = await fetchAllRows<Tables<"goods_issue_pending_items">>(() => supabase.from("goods_issue_pending_items").select("*").eq("pending_id", doc.pending_id));
      for (const line of lines) rows.push({ ...line, doc: header.document_no, requester: header.requester_name, ticket: doc.ticket_code });
    }
    return rows;
  } });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["mt-test-sessions"] }); qc.invalidateQueries({ queryKey: ["mt-test-detail"] }); qc.invalidateQueries({ queryKey: ["magic-ticket-events"] }); };
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try { await action(); refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : String((error as { message?: string })?.message || error)); }
    finally { setBusy(false); }
  };
  const create = () => run(async () => {
    const { error } = await supabase.rpc("mt_test_create", { p_name: name, p_start: bangkokInputToISO(start), p_end: bangkokInputToISO(end), p_tickets: parseTicketCodes(tickets), p_assets: selected });
    if (error) throw error;
    setCreateOpen(false); setName(""); setSelected([]); setTickets(""); toast.success("เปิดรอบทดสอบแล้ว");
  });
  const finish = (s: Session) => run(async () => {
    const { error } = await supabase.rpc("mt_test_end", { p_id: s.id }); if (error) throw error;
    setReview({ ...s, status: "ended" }); setConfirmed(false); toast.success("จบรอบแล้ว พร้อมตรวจรายการคืน");
  });
  const rollback = () => run(async () => {
    if (!review) return;
    const { error } = await supabase.rpc("mt_test_rollback", { p_id: review.id, p_confirm: confirmed }); if (error) throw error;
    setReview(null); toast.success("คืนข้อมูลและปิดใบเบิกทดสอบแล้ว");
  });
  const filtered = (assets.data || []).filter(a => (!general || `${a.code} ${a.name} ${a.department}`.toLowerCase().includes(general.toLowerCase())) && (!serial || a.sn?.toLowerCase().includes(serial.toLowerCase())));
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold flex items-center gap-2"><CalendarClock className="h-5 w-5 text-primary" />รอบทดสอบ Magic Ticket</h2><div className="flex gap-2"><Button variant="outline" size="icon" aria-label="รีเฟรชรอบทดสอบ" onClick={refresh}><RefreshCw className="h-4 w-4" /></Button><Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />เปิดรอบทดสอบ</Button></div></div>
    <div className="border-l-4 border-primary bg-muted p-4 text-sm space-y-1"><p>เวลาประเทศไทย • เฉพาะตั๋วใหม่และสินค้าที่เลือก • Super Admin</p><p className="text-muted-foreground">พักสินค้าชุดที่เลือกเมื่อหมดเวลา จนคืนข้อมูลแล้ว — ต้องนำของจริงกลับครบก่อนคืนยอด; ตั๋วใน Magic Ticket ต้องปิดแยกต่างหาก</p></div>
    {sessions.error && <p role="alert" className="text-destructive">โหลดรอบทดสอบไม่สำเร็จ</p>}
    <div className="border rounded-md overflow-x-auto"><Table><TableHeader><TableRow><TableHead>รอบทดสอบ</TableHead><TableHead>ช่วงเวลา (ไทย)</TableHead><TableHead>ตั๋ว</TableHead><TableHead>สถานะ</TableHead><TableHead /></TableRow></TableHeader><TableBody>
      {(sessions.data || []).map(s => <TableRow key={s.id}><TableCell className="font-medium">{s.name}</TableCell><TableCell className="whitespace-nowrap">{dt(s.starts_at)}<br />{dt(s.ends_at)}</TableCell><TableCell className="whitespace-pre-line font-mono text-xs">{s.ticket_codes.join("\n")}</TableCell><TableCell><Badge variant={s.status === "rolled_back" ? "secondary" : "outline"}>{statuses[s.status] || s.status}</Badge></TableCell><TableCell><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => { setReview(s); setConfirmed(false); }}>ตรวจรายการ</Button>{s.status === "open" && <Button variant="outline" size="sm" disabled={busy} onClick={() => finish(s)}><Square className="h-3 w-3 mr-1" />จบรอบ</Button>}</div></TableCell></TableRow>)}
      {!sessions.data?.length && <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">{sessions.isLoading ? "กำลังโหลด…" : "ยังไม่มีรอบทดสอบ"}</TableCell></TableRow>}
    </TableBody></Table></div>
    <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>เปิดรอบทดสอบ</DialogTitle><DialogDescription>ใช้เลขตั๋วจริงได้ ไม่ต้องเพิ่มคำว่า Test; สินค้าที่เลือกควรไม่มีงานจริงใช้ร่วมกัน</DialogDescription></DialogHeader>
      <div className="space-y-4"><div><Label htmlFor="mt-name">ชื่อรอบ</Label><Input id="mt-name" value={name} onChange={e => setName(e.target.value)} maxLength={120} /></div><div className="grid sm:grid-cols-2 gap-3"><div><Label htmlFor="mt-start">เริ่ม (เวลาประเทศไทย)</Label><Input id="mt-start" type="datetime-local" value={start} onChange={e => setStart(e.target.value)} /></div><div><Label htmlFor="mt-end">สิ้นสุด (เวลาประเทศไทย)</Label><Input id="mt-end" type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} /></div></div><div><Label htmlFor="mt-tickets">เลขตั๋ว Magic Ticket (หนึ่งเลขต่อบรรทัด)</Label><Textarea id="mt-tickets" value={tickets} onChange={e => setTickets(e.target.value)} /></div>
      <Label>สินค้าที่ทดสอบ ({selected.length} รายการ)</Label><div className="grid sm:grid-cols-2 gap-2"><Input aria-label="ค้นหา S/N" placeholder="S/N" value={serial} onChange={e => { setSerial(e.target.value); setAssetLimit(100); }} /><Input aria-label="ค้นหาสินค้าทดสอบ" placeholder="รหัส ชื่อสินค้า ฝ่าย" value={general} onChange={e => { setGeneral(e.target.value); setAssetLimit(100); }} /></div><div className="border rounded-md max-h-56 overflow-y-auto">{filtered.slice(0, assetLimit).map(a => <label key={a.id} className="flex items-start gap-3 p-3 border-b cursor-pointer"><Checkbox checked={selected.includes(a.id)} onCheckedChange={checked => setSelected(ids => checked ? [...ids, a.id] : ids.filter(id => id !== a.id))} /><span className="text-sm min-w-0 break-words"><strong>{a.code}</strong> {a.name}<span className="block text-xs text-muted-foreground whitespace-pre-line">{a.department} {a.sn}</span></span></label>)}{filtered.length > assetLimit && <Button variant="ghost" className="w-full" onClick={() => setAssetLimit(v => v + 100)}>แสดงเพิ่ม ({filtered.length - assetLimit} รายการ)</Button>}{assets.isLoading && <p className="p-3">กำลังโหลด…</p>}{assets.error && <p className="p-3 text-destructive">โหลดสินค้าไม่สำเร็จ</p>}</div></div>
      <DialogFooter><Button onClick={create} disabled={busy || !name.trim() || !start || !end || !tickets.trim() || !selected.length}>บันทึกรอบทดสอบ</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={!!review} onOpenChange={open => { if (!open) setReview(null); }}><DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{review?.name} — ตรวจรายการคืน</DialogTitle><DialogDescription>คืนสถานะสินค้าและป้ายตามบันทึกก่อนทดสอบ เก็บประวัติการย้อนคืนไว้; หากพบงานอื่นใช้สินค้าร่วมกัน ระบบจะไม่ดำเนินการ</DialogDescription></DialogHeader>
      <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>ตั๋ว / ใบเบิก</TableHead><TableHead>สินค้า / S/N</TableHead><TableHead>จ่าย</TableHead><TableHead>ติดตั้ง</TableHead><TableHead>คืนดี / เสีย</TableHead></TableRow></TableHeader><TableBody>{(details.data || []).map(l => <TableRow key={l.id}><TableCell className="text-xs">{l.ticket}<br />{l.doc}<br />{l.requester}</TableCell><TableCell>{l.equipment_code} {l.equipment_name}<div className="text-xs whitespace-pre-line">{l.serial_number}</div></TableCell><TableCell>{l.issued_quantity || 0} {l.unit}</TableCell><TableCell>{l.installed_qty || 0} {l.unit}</TableCell><TableCell>{l.returned_good_qty || 0} / {l.returned_defective_qty || 0} {l.unit}</TableCell></TableRow>)}{!details.data?.length && <TableRow><TableCell colSpan={5}>{details.isLoading ? "กำลังโหลด…" : "ยังไม่มีใบเบิกในรอบนี้"}</TableCell></TableRow>}</TableBody></Table></div>
      {details.error && <p role="alert" className="text-destructive">ตรวจรายการไม่สำเร็จ กรุณารีเฟรช</p>}
      {review?.status === "ended" && <><label className="flex items-start gap-3 text-sm"><Checkbox checked={confirmed} onCheckedChange={v => setConfirmed(v === true)} /><span>ตรวจแล้ว: นำอะไหล่กลับคลังเดิมครบ และคืนของเดิมกลับป้ายเดิมแล้ว (ถ้ามี) รวมถึงหยุดส่งรายการจาก Magic Ticket สำหรับตั๋วชุดนี้</span></label><DialogFooter><Button variant="destructive" disabled={busy || !confirmed || details.isLoading || !!details.error} onClick={rollback}><RotateCcw className="h-4 w-4 mr-2" />{busy ? "กำลังคืนข้อมูล…" : "คืนข้อมูลและปิดรอบทดสอบ"}</Button></DialogFooter></>}
    </DialogContent></Dialog>
  </section>;
}