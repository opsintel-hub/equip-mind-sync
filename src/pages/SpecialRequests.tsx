import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Inbox, Plus, ExternalLink, Check, X, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SpecialRequestDialog } from "@/components/special-request/SpecialRequestDialog";
import { getRequestType, STATUS_LABEL } from "@/components/special-request/requestTypes";

const statusVariant = (s: string) =>
  s === "done" ? "default" : s === "rejected" ? "destructive" : s === "pending" ? "secondary" : "outline";

const fmt = (d?: string | null) => (d ? format(new Date(d), "d MMM yy HH:mm", { locale: th }) : "-");

const SpecialRequests = ({ mode = "admin" }: { mode?: "mine" | "admin" }) => {
  const { user } = useAuth();
  const { isSuperAdmin: isSA } = useIsSuperAdmin();
  const isSuperAdmin = mode === "admin" && isSA;
  const mine = !isSuperAdmin;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState("pending");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["special-requests", user?.id, isSuperAdmin, mode],
    enabled: !!user,
    queryFn: async () => {
      let query = supabase.from("special_requests").select("*").order("created_at", { ascending: false }).limit(500);
      if (!isSuperAdmin) query = query.eq("requested_by", user!.id);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = { pending: 0, approved: 0 };
    rows.forEach((r: any) => (c[r.status] = (c[r.status] || 0) + 1));
    return c;
  }, [rows]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r: any) => {
      if (tab === "pending" && r.status !== "pending") return false;
      if (tab === "approved" && r.status !== "approved") return false;
      if (tab === "closed" && !["done", "rejected", "cancelled"].includes(r.status)) return false;
      if (!s) return true;
      return [r.request_number, r.target_doc_number, r.requester_name, r.reason, getRequestType(r.request_type).label]
        .some((v) => (v || "").toLowerCase().includes(s));
    });
  }, [rows, tab, q]);

  const review = async (decision: "approved" | "rejected" | "done") => {
    if (!selected) return;
    setBusy(true);
    const { data, error } = selected.status === "approved"
      ? await supabase.rpc("mark_special_request_done" as any, { _id: selected.id, _notes: notes || null })
      : await supabase.rpc("review_special_request" as any, { _id: selected.id, _decision: decision, _notes: notes || null });
    setBusy(false);
    if (error) return toast.error(error.message);
    const res = data as any;
    toast.success(res?.written_off ? `ปิดยอดค้าง ${res.written_off} ชิ้นแล้ว${res.document_closed ? " และปิดเอกสาร" : ""}` : "บันทึกผลแล้ว");
    setSelected(null);
    setNotes("");
    qc.invalidateQueries({ queryKey: ["special-requests"] });
  };

  const cancelOwn = async (r: any) => {
    const { error } = await supabase.from("special_requests").update({ status: "cancelled" }).eq("id", r.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["special-requests"] });
  };

  const t = selected ? getRequestType(selected.request_type) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-3"><Inbox className="h-8 w-8 text-primary" />{mine ? "คำร้องพิเศษของฉัน" : "อนุมัติคำร้องพิเศษ"}</h1>
          <p className="text-muted-foreground">
            {isSuperAdmin ? "คำร้องจากผู้ใช้ที่ต้องให้ Super Admin ดำเนินการ — กดที่แถวเพื่อดูว่าต้องทำอะไร" : "ส่งคำร้องเรื่องที่ต้องให้ Super Admin ช่วย และติดตามผลได้ที่นี่"}
          </p>
        </div>
        {mine && <SpecialRequestDialog trigger={<Button className="gap-2"><Plus className="w-4 h-4" />ส่งคำร้องใหม่</Button>} />}
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="pending">{mine ? "รอพิจารณา" : "รออนุมัติ"} ({counts.pending || 0})</TabsTrigger>
              <TabsTrigger value="approved">{mine ? "อนุมัติแล้ว" : "อนุมัติแล้ว-รอดำเนินการ"} ({counts.approved || 0})</TabsTrigger>
              <TabsTrigger value="closed">ปิดแล้ว</TabsTrigger>
              <TabsTrigger value="all">{mine ? "ทั้งหมด" : "ประวัติทั้งหมด (Log)"}</TabsTrigger>
            </TabsList>
          </Tabs>
          <Input className="max-w-xs" placeholder={mine ? "ค้นหา เลขคำร้อง / เลขเอกสาร" : "ค้นหา เลขคำร้อง / เลขเอกสาร / ผู้ร้อง"} value={q} onChange={(e) => setQ(e.target.value)} />
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>เลขคำร้อง</TableHead>
                <TableHead>ประเภท</TableHead>
                <TableHead>เอกสาร</TableHead>
                <TableHead>ผู้ร้อง</TableHead>
                <TableHead>เหตุผล</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>ผู้ดำเนินการ</TableHead>
                <TableHead>วันที่</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-6">กำลังโหลด...</TableCell></TableRow>}
              {!isLoading && list.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">ไม่มีคำร้อง</TableCell></TableRow>}
              {list.map((r: any) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => { setSelected(r); setNotes(""); }}>
                  <TableCell className="font-mono text-sm whitespace-nowrap">
                    {r.request_number}
                    {r.priority === "urgent" && <Badge variant="destructive" className="ml-2 text-[10px]">ด่วน</Badge>}
                  </TableCell>
                  <TableCell className="text-sm max-w-[220px]">{getRequestType(r.request_type).label}</TableCell>
                  <TableCell className="font-mono text-sm">{r.target_doc_number || "-"}{r.quantity ? ` · ${r.quantity}` : ""}</TableCell>
                  <TableCell className="text-sm">{r.requester_name || "-"}</TableCell>
                  <TableCell className="text-sm max-w-[260px] truncate">{r.reason}</TableCell>
                  <TableCell><Badge variant={statusVariant(r.status) as any}>{STATUS_LABEL[r.status] || r.status}</Badge></TableCell>
                  <TableCell className="text-sm">{r.reviewer_name || "-"}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{fmt(r.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && t && (
            <>
              <DialogHeader><DialogTitle>{selected.request_number} — {t.label}</DialogTitle></DialogHeader>
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">ผู้ร้อง:</span> {selected.requester_name} · {fmt(selected.created_at)}</p>
                {selected.target_doc_number && <p><span className="text-muted-foreground">เอกสาร:</span> <span className="font-mono">{selected.target_doc_number}</span>{selected.quantity ? ` · จำนวน ${selected.quantity}` : ""}</p>}
                {selected.payload?.item && <p><span className="text-muted-foreground">รายการ:</span> {selected.payload.item}</p>}
                <p><span className="text-muted-foreground">เหตุผล:</span> {selected.reason}</p>
                {!mine && <div className="rounded-md bg-muted p-3">
                  <p className="font-medium">สิ่งที่ Super Admin ต้องทำ</p>
                  <p>{t.actionHint}</p>
                  {(selected.target_url || t.actionUrl) && (
                    <Button variant="link" className="px-0 gap-1" onClick={() => navigate(
                      (selected.target_url || t.actionUrl) + (selected.target_doc_number && (selected.target_url || t.actionUrl) === "/document-search" ? `?q=${encodeURIComponent(selected.target_doc_number)}` : "")
                    )}>
                      ไปที่หน้าที่ต้องทำ <ExternalLink className="w-3 h-3" />
                    </Button>
                  )}
                </div>}
                <p><span className="text-muted-foreground">สถานะ:</span> {STATUS_LABEL[selected.status]}</p>
                {selected.reviewed_at && <p><span className="text-muted-foreground">ผล:</span> {selected.reviewer_name} · {fmt(selected.reviewed_at)} {selected.review_notes ? `— ${selected.review_notes}` : ""}</p>}
                {isSuperAdmin && ["pending", "approved"].includes(selected.status) && (
                  <Textarea rows={2} placeholder="หมายเหตุ (บังคับเมื่อไม่อนุมัติ)" value={notes} onChange={(e) => setNotes(e.target.value)} />
                )}
              </div>
              <DialogFooter className="gap-2 flex-wrap">
                {mine && selected.status === "pending" && selected.requested_by === user?.id && (
                  <Button variant="outline" onClick={() => { cancelOwn(selected); setSelected(null); }}>ยกเลิกคำร้อง</Button>
                )}
                {isSuperAdmin && selected.status === "pending" && (
                  <>
                    <Button variant="destructive" disabled={busy} onClick={() => review("rejected")} className="gap-1"><X className="w-4 h-4" />ไม่อนุมัติ</Button>
                    {t.auto ? (
                      <Button disabled={busy} onClick={() => review("approved")} className="gap-1"><Check className="w-4 h-4" />อนุมัติและปิดยอดให้อัตโนมัติ</Button>
                    ) : (
                      <>
                        <Button variant="outline" disabled={busy} onClick={() => review("approved")} className="gap-1"><Check className="w-4 h-4" />อนุมัติ (ทำภายหลัง)</Button>
                        <Button disabled={busy} onClick={() => review("done")} className="gap-1"><CheckCheck className="w-4 h-4" />ทำเสร็จแล้ว</Button>
                      </>
                    )}
                  </>
                )}
                {isSuperAdmin && selected.status === "approved" && (
                  <Button disabled={busy} onClick={() => review("done")} className="gap-1"><CheckCheck className="w-4 h-4" />ทำเสร็จแล้ว</Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SpecialRequests;
