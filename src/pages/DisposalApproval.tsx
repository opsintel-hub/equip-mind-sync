import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ShieldCheck, Search, RefreshCw, Trash2, Recycle, HeartHandshake, Wrench, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface DefectiveRow {
  id: string;
  document_no: string;
  equipment_id: string | null;
  media_player_id: string | null;
  is_media_player: boolean;
  quantity: number;
  reason: string | null;
  item_condition: string | null;
  source_type: string | null;
  status: string;
  dispose_status: string;
  disposal_method: string | null;
  disposal_notes: string | null;
  disposal_evidence_urls: string[] | null;
  disposal_approved_at: string | null;
  swap_request_id: string | null;
  created_at: string;
  // joined
  equipment?: { code: string; name: string } | null;
  media_player?: { code: string; name: string } | null;
}

const DISPOSAL_METHODS: Record<string, { label: string; icon: any; color: string }> = {
  destroy: { label: "ทำลายทิ้ง", icon: Trash2, color: "bg-destructive/10 text-destructive border-destructive/30" },
  sell_scrap: { label: "จำหน่ายเป็นซาก", icon: Recycle, color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  csr: { label: "นำไปทำ CSR", icon: HeartHandshake, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  repair_return: { label: "ซ่อมและคืนคลัง", icon: Wrench, color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
};

const STATUS_LABEL: Record<string, { label: string; variant: "secondary" | "default" | "outline" | "destructive" }> = {
  pending_disposal_review: { label: "รออนุมัติวิธีจัดการ", variant: "secondary" },
  approved: { label: "อนุมัติแล้ว", variant: "default" },
  rejected: { label: "ปฏิเสธ", variant: "destructive" },
  completed: { label: "ดำเนินการเสร็จ", variant: "outline" },
};

export default function DisposalApproval() {
  const { user } = useAuth();
  const [rows, setRows] = useState<DefectiveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("pending");

  // Approval dialog state
  const [editing, setEditing] = useState<DefectiveRow | null>(null);
  const [method, setMethod] = useState<string>("");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [evidencePreviews, setEvidencePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("defective_returns")
      .select(`
        id, document_no, equipment_id, media_player_id, is_media_player, quantity, reason,
        item_condition, source_type, status, dispose_status, disposal_method, disposal_notes,
        disposal_evidence_urls, disposal_approved_at, swap_request_id, created_at,
        equipment:equipment_id(code, name),
        media_player:media_player_id(code, name)
      `)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error("โหลดข้อมูลไม่สำเร็จ: " + error.message);
    else setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    const byTab = rows.filter((r) => {
      if (tab === "pending") return r.dispose_status === "pending_disposal_review";
      if (tab === "approved") return r.dispose_status === "approved";
      if (tab === "completed") return r.dispose_status === "completed";
      return true;
    });
    if (!search.trim()) return byTab;
    const s = search.toLowerCase();
    return byTab.filter((r) =>
      r.document_no.toLowerCase().includes(s) ||
      r.equipment?.code?.toLowerCase().includes(s) ||
      r.equipment?.name?.toLowerCase().includes(s) ||
      r.media_player?.code?.toLowerCase().includes(s) ||
      r.media_player?.name?.toLowerCase().includes(s) ||
      r.reason?.toLowerCase().includes(s)
    );
  }, [rows, search, tab]);

  const stats = useMemo(() => ({
    pending: rows.filter((r) => r.dispose_status === "pending_disposal_review").length,
    approved: rows.filter((r) => r.dispose_status === "approved").length,
    completed: rows.filter((r) => r.dispose_status === "completed").length,
  }), [rows]);

  const openApproval = (row: DefectiveRow) => {
    setEditing(row);
    setMethod(row.disposal_method || "");
    setDecisionNotes(row.disposal_notes || "");
    setEvidenceFiles([]);
    setEvidencePreviews([]);
  };

  const closeApproval = () => {
    evidencePreviews.forEach((u) => URL.revokeObjectURL(u));
    setEditing(null);
    setMethod("");
    setDecisionNotes("");
    setEvidenceFiles([]);
    setEvidencePreviews([]);
  };

  const handleAddEvidence = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter((f) => {
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name}: ใหญ่เกิน 10MB`); return false; }
      return true;
    });
    setEvidenceFiles((p) => [...p, ...valid]);
    setEvidencePreviews((p) => [...p, ...valid.map((f) => URL.createObjectURL(f))]);
    e.target.value = "";
  };

  const removeEvidence = (idx: number) => {
    URL.revokeObjectURL(evidencePreviews[idx]);
    setEvidenceFiles((p) => p.filter((_, i) => i !== idx));
    setEvidencePreviews((p) => p.filter((_, i) => i !== idx));
  };

  const uploadEvidence = async (defectiveId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of evidenceFiles) {
      const ext = file.name.split(".").pop();
      const path = `disposal/${defectiveId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("equipment-images").upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from("equipment-images").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  };

  const submitDecision = async (decision: "approved" | "rejected") => {
    if (!editing) return;
    if (decision === "approved" && !method) {
      toast.error("กรุณาเลือกวิธีจัดการ");
      return;
    }
    setSubmitting(true);
    try {
      const newUrls = evidenceFiles.length > 0 ? await uploadEvidence(editing.id) : [];
      const merged = [...(editing.disposal_evidence_urls || []), ...newUrls];
      const { error } = await supabase
        .from("defective_returns")
        .update({
          dispose_status: decision,
          disposal_method: decision === "approved" ? method : null,
          disposal_notes: decisionNotes.trim() || null,
          disposal_evidence_urls: merged.length ? merged : null,
          disposal_approved_by: user?.id,
          disposal_approved_at: new Date().toISOString(),
        })
        .eq("id", editing.id);
      if (error) throw error;
      toast.success(decision === "approved" ? "อนุมัติวิธีจัดการแล้ว" : "ปฏิเสธคำขอแล้ว");
      closeApproval();
      fetchData();
    } catch (e: any) {
      toast.error("บันทึกไม่สำเร็จ: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const markCompleted = async (row: DefectiveRow) => {
    const { error } = await supabase
      .from("defective_returns")
      .update({ dispose_status: "completed" })
      .eq("id", row.id);
    if (error) toast.error("บันทึกไม่สำเร็จ: " + error.message);
    else { toast.success("ทำเครื่องหมายว่าดำเนินการเสร็จแล้ว"); fetchData(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            อนุมัติการจัดการของเสีย
          </h1>
          <p className="text-muted-foreground mt-1">
            พิจารณาวิธีจัดการของเสีย/ชำรุด: ทำลายทิ้ง / จำหน่ายเป็นซาก / นำไปทำ CSR / ซ่อมคืน
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          โหลดใหม่
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>รออนุมัติ</CardDescription><CardTitle className="text-3xl text-warning">{stats.pending}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>อนุมัติแล้ว (รอดำเนินการ)</CardDescription><CardTitle className="text-3xl text-primary">{stats.approved}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>ดำเนินการเสร็จ</CardDescription><CardTitle className="text-3xl text-success">{stats.completed}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle>รายการของเสีย/ชำรุด</CardTitle>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="ค้นหา: เลขที่/รหัส/ชื่อ/เหตุผล" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="pending">รออนุมัติ ({stats.pending})</TabsTrigger>
              <TabsTrigger value="approved">อนุมัติแล้ว ({stats.approved})</TabsTrigger>
              <TabsTrigger value="completed">เสร็จสิ้น ({stats.completed})</TabsTrigger>
              <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="mt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>เลขที่</TableHead>
                      <TableHead>รายการ</TableHead>
                      <TableHead className="text-right">จำนวน</TableHead>
                      <TableHead>เหตุผล</TableHead>
                      <TableHead>ที่มา</TableHead>
                      <TableHead>วิธีจัดการ</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>วันที่</TableHead>
                      <TableHead className="text-right">การจัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">กำลังโหลด...</TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">ไม่มีรายการ</TableCell></TableRow>
                    ) : filtered.map((row) => {
                      const item = row.is_media_player ? row.media_player : row.equipment;
                      const status = STATUS_LABEL[row.dispose_status] || { label: row.dispose_status, variant: "outline" as const };
                      const dm = row.disposal_method ? DISPOSAL_METHODS[row.disposal_method] : null;
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="font-mono text-xs">{row.document_no}</TableCell>
                          <TableCell>
                            <div className="font-medium">{item?.code || "—"}</div>
                            <div className="text-xs text-muted-foreground">{item?.name || ""}</div>
                          </TableCell>
                          <TableCell className="text-right font-mono">{row.quantity}</TableCell>
                          <TableCell className="max-w-[260px] text-xs whitespace-pre-line">{row.reason || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {row.source_type === "billboard" ? "ถอดจากป้าย" : row.swap_request_id ? "จาก Swap" : "คลัง/ภาคสนาม"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {dm ? (
                              <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border ${dm.color}`}>
                                <dm.icon className="w-3 h-3" /> {dm.label}
                              </span>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                          <TableCell className="text-xs">{format(new Date(row.created_at), "dd MMM yy HH:mm", { locale: th })}</TableCell>
                          <TableCell className="text-right">
                            {row.dispose_status === "pending_disposal_review" && (
                              <Button size="sm" onClick={() => openApproval(row)}>พิจารณา</Button>
                            )}
                            {row.dispose_status === "approved" && (
                              <div className="flex gap-1 justify-end">
                                <Button size="sm" variant="outline" onClick={() => openApproval(row)}>แก้ไข</Button>
                                <Button size="sm" onClick={() => markCompleted(row)}>เสร็จสิ้น</Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Approval dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && closeApproval()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>พิจารณาวิธีจัดการของเสีย — {editing?.document_no}</DialogTitle>
            <DialogDescription>
              {editing && (editing.is_media_player ? editing.media_player?.code : editing.equipment?.code)} • จำนวน {editing?.quantity}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
              <div><span className="text-muted-foreground">เหตุผล:</span> <span className="whitespace-pre-line">{editing?.reason || "—"}</span></div>
              <div><span className="text-muted-foreground">ที่มา:</span> {editing?.source_type === "billboard" ? "ถอดจากป้าย" : "คลัง/ภาคสนาม"}</div>
            </div>

            <div className="space-y-2">
              <Label>เลือกวิธีจัดการ *</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue placeholder="เลือกวิธี..." /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DISPOSAL_METHODS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      <span className="flex items-center gap-2"><v.icon className="w-4 h-4" /> {v.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>หมายเหตุการตัดสินใจ</Label>
              <Textarea value={decisionNotes} onChange={(e) => setDecisionNotes(e.target.value)} rows={2} placeholder="เหตุผลประกอบการตัดสินใจ..." />
            </div>

            <div className="space-y-2">
              <Label>หลักฐาน (ภาพถ่าย / ใบจำหน่ายซาก / เอกสาร CSR)</Label>
              <input id="disposal-evidence" type="file" accept="image/*" multiple className="hidden" onChange={handleAddEvidence} />
              <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("disposal-evidence")?.click()}>
                <ImagePlus className="w-4 h-4 mr-1" /> เพิ่มรูป
              </Button>
              {(evidencePreviews.length > 0 || (editing?.disposal_evidence_urls?.length ?? 0) > 0) && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {(editing?.disposal_evidence_urls || []).map((url, i) => (
                    <img key={`old-${i}`} src={url} alt="evidence" className="w-full h-20 object-cover rounded border" />
                  ))}
                  {evidencePreviews.map((url, i) => (
                    <div key={`new-${i}`} className="relative">
                      <img src={url} alt="new" className="w-full h-20 object-cover rounded border" />
                      <Button type="button" size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6" onClick={() => removeEvidence(i)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeApproval} disabled={submitting}>ยกเลิก</Button>
            <Button variant="destructive" onClick={() => submitDecision("rejected")} disabled={submitting}>ปฏิเสธ</Button>
            <Button onClick={() => submitDecision("approved")} disabled={submitting || !method}>
              {submitting ? "กำลังบันทึก..." : "อนุมัติ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
