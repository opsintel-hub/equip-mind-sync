import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Line = { id: string; equipment_code: string | null; equipment_name: string | null; serial_number: string | null; issued_quantity: number | null; installed_qty: number | null; unit: string | null; status: string | null };
type Doc = { id: string; document_no: string; requester_name: string | null; status: string | null; lines: Line[] };

export default function MagicTicketDocumentRollback() {
  const qc = useQueryClient();
  const [docNo, setDocNo] = useState("");
  const [doc, setDoc] = useState<Doc | null>(null);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  const lookup = async () => {
    setBusy(true); setDoc(null); setConfirmed(false);
    try {
      const { data: h, error } = await supabase.from("goods_issue_pending").select("id,document_no,requester_name,status").eq("document_no", docNo.trim().toUpperCase()).maybeSingle();
      if (error) throw error;
      if (!h) { toast.error("ไม่พบเลขที่ใบเบิกนี้"); return; }
      const { data: lines, error: e2 } = await supabase.from("goods_issue_pending_items").select("id,equipment_code,equipment_name,serial_number,issued_quantity,installed_qty,unit,status").eq("pending_id", h.id);
      if (e2) throw e2;
      setDoc({ ...h, lines: (lines || []) as Line[] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "ค้นหาไม่สำเร็จ"); }
    finally { setBusy(false); }
  };

  const rollback = async () => {
    if (!doc) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("mt_rollback_issue_document", { p_document_no: doc.document_no, p_confirm: confirmed, p_reason: reason.trim() || null });
      if (error) throw error;
      const r = data as { duplicate?: boolean; units?: number };
      toast.success(r?.duplicate ? "ใบเบิกนี้ถูกคืนไปแล้ว" : `คืนเข้า Store แล้ว ${r?.units ?? 0} ชิ้น`);
      qc.invalidateQueries();
      setDoc(null); setDocNo(""); setReason(""); setConfirmed(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : String((e as { message?: string })?.message || e)); }
    finally { setBusy(false); }
  };

  const cancelled = doc?.status === "cancelled";
  return <section className="space-y-4">
    <h2 className="text-xl font-semibold flex items-center gap-2"><RotateCcw className="h-5 w-5 text-primary" />คืนของทดสอบด้วยเลขที่ใบเบิก</h2>
    <div className="border-l-4 border-primary bg-muted p-4 text-sm space-y-1">
      <p>กรอกเลขที่ใบเบิกที่ใช้ทดสอบ ระบบจะถอดออกจากป้าย คืนยอดเข้าตำแหน่งเดิมใน Store และยกเลิกใบเบิก</p>
      <p className="text-muted-foreground">ต้องนำของจริงกลับครบก่อน • ใบที่มีของเสีย/ของเก่าส่งคืนต้องตรวจเอง • ตั๋วใน Magic Ticket ต้องปิดแยก</p>
    </div>
    <div className="flex gap-2 max-w-md">
      <Input aria-label="เลขที่ใบเบิก" placeholder="GI-REQ-000000" value={docNo} onChange={e => setDocNo(e.target.value)} onKeyDown={e => e.key === "Enter" && docNo.trim() && lookup()} />
      <Button onClick={lookup} disabled={busy || !docNo.trim()}><Search className="h-4 w-4 mr-2" />ตรวจสอบ</Button>
    </div>
    {doc && <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2"><span className="font-mono font-semibold">{doc.document_no}</span><span className="text-sm text-muted-foreground">{doc.requester_name}</span><Badge variant="outline">{doc.status}</Badge></div>
      <div className="border rounded-md overflow-x-auto"><Table><TableHeader><TableRow><TableHead>สินค้า</TableHead><TableHead>S/N</TableHead><TableHead>จ่าย</TableHead><TableHead>ติดตั้ง</TableHead><TableHead>สถานะ</TableHead></TableRow></TableHeader><TableBody>
        {doc.lines.map(l => <TableRow key={l.id}><TableCell>{l.equipment_code} {l.equipment_name}</TableCell><TableCell className="whitespace-pre-line text-xs">{l.serial_number || "-"}</TableCell><TableCell>{l.issued_quantity || 0} {l.unit}</TableCell><TableCell>{l.installed_qty || 0} {l.unit}</TableCell><TableCell>{l.status}</TableCell></TableRow>)}
      </TableBody></Table></div>
      {cancelled ? <p className="text-muted-foreground">ใบเบิกนี้ถูกยกเลิก/คืนแล้ว</p> : <>
        <div className="space-y-1"><Label htmlFor="rb-reason">หมายเหตุ</Label><Textarea id="rb-reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="เช่น ทดสอบ Magic Ticket V5" /></div>
        <div className="flex items-center gap-2"><Checkbox id="rb-confirm" checked={confirmed} onCheckedChange={v => setConfirmed(v === true)} /><Label htmlFor="rb-confirm">ยืนยันว่าของจริงทุกชิ้นกลับเข้า Store ครบแล้ว</Label></div>
        <Button variant="destructive" disabled={busy || !confirmed} onClick={rollback}><RotateCcw className="h-4 w-4 mr-2" />คืนทั้งใบเข้า Store</Button>
      </>}
    </div>}
  </section>;
}
