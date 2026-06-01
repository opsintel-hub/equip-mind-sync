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
import { ShieldCheck, Search, RefreshCw, Trash2, Recycle, HeartHandshake, Wrench, ImagePlus, X, Eye, CheckCircle2, FileText } from "lucide-react";
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
  notes: string | null;
  item_condition: string | null;
  source_type: string | null;
  status: string;
  dispose_status: string;
  disposal_method: string | null;
  disposal_notes: string | null;
  disposal_evidence_urls: string[] | null;
  disposal_approved_at: string | null;
  swap_request_id: string | null;
  assessment_log_id: string | null;
  billboard_id: string | null;
  reporter_name: string | null;
  reporter_department: string | null;
  created_at: string;
  // joined
  equipment?: { code: string; name: string; brand: string | null; serial_number: string | null; department: string | null } | null;
  media_player?: { code: string; name: string; remote_name: string | null; brand: string | null; serial_number_1: string | null; serial_number_2: string | null; department: string | null; warranty_expiry_date: string | null; specification: string | null; unit_price: number | null } | null;
  // extra enrichment
  billboard_label?: string | null;
  swap_info?: { doc_no: string; old_label: string | null; new_label: string | null; old_sn: string | null; new_sn: string | null; description: string | null } | null;
  assessment_doc_no?: string | null;
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

  // Complete dialog state (final disposal — requires evidence photo)
  const [completing, setCompleting] = useState<DefectiveRow | null>(null);
  const [completeNotes, setCompleteNotes] = useState("");
  const [completeFiles, setCompleteFiles] = useState<File[]>([]);
  const [completePreviews, setCompletePreviews] = useState<string[]>([]);

  // Preview dialog state (read-only document view)
  const [previewing, setPreviewing] = useState<DefectiveRow | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);


  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("defective_returns")
      .select(`
        id, document_no, equipment_id, media_player_id, is_media_player, quantity, reason, notes,
        item_condition, source_type, status, dispose_status, disposal_method, disposal_notes,
        disposal_evidence_urls, disposal_approved_at, swap_request_id, assessment_log_id,
        billboard_id, reporter_name, reporter_department, created_at,
        equipment:equipment_id(code, name, brand, serial_number, department),
        media_player:media_player_id(code, name, remote_name, brand, serial_number_1, serial_number_2, department, warranty_expiry_date, specification, unit_price)
      `)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) { toast.error("โหลดข้อมูลไม่สำเร็จ: " + error.message); setLoading(false); return; }

    const rowsRaw = (data as any[]) || [];
    const swapIds = [...new Set(rowsRaw.map((r) => r.swap_request_id).filter(Boolean))];
    const asmIds = [...new Set(rowsRaw.map((r) => r.assessment_log_id).filter(Boolean))];
    const bbIds = [...new Set(rowsRaw.map((r) => r.billboard_id).filter(Boolean))];

    const [swapRes, asmRes, bbRes] = await Promise.all([
      swapIds.length ? supabase.from("swap_requests").select("id, document_no, billboard_id, description, old_serial_number, new_serial_number, old_media_player_id, new_media_player_id").in("id", swapIds) : Promise.resolve({ data: [] as any[] }),
      asmIds.length ? supabase.from("assessment_logs").select("id, document_no").in("id", asmIds) : Promise.resolve({ data: [] as any[] }),
      bbIds.length ? supabase.from("billboards").select("id, old_code, equipment_id, location_name").in("id", bbIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const swapBbIds = [...new Set(((swapRes.data as any[]) || []).map((s) => s.billboard_id).filter(Boolean))];
    const swapMpIds = [...new Set(((swapRes.data as any[]) || []).flatMap((s) => [s.old_media_player_id, s.new_media_player_id]).filter(Boolean))];
    const [extraBbRes, swapMpRes] = await Promise.all([
      swapBbIds.length ? supabase.from("billboards").select("id, old_code, equipment_id, location_name").in("id", swapBbIds) : Promise.resolve({ data: [] as any[] }),
      swapMpIds.length ? supabase.from("media_players").select("id, code, remote_name, name").in("id", swapMpIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const bbMap = new Map<string, any>([...((bbRes.data as any[]) || []), ...((extraBbRes.data as any[]) || [])].map((b) => [b.id, b]));
    const swapMpMap = new Map<string, any>(((swapMpRes.data as any[]) || []).map((m) => [m.id, m]));
    const swapMap = new Map<string, any>(((swapRes.data as any[]) || []).map((s) => [s.id, s]));
    const asmMap = new Map<string, any>(((asmRes.data as any[]) || []).map((a) => [a.id, a]));
    const labelOf = (mp: any) => mp ? `${mp.code}${mp.remote_name ? ` (${mp.remote_name})` : mp.name ? ` - ${mp.name}` : ""}` : null;

    const enriched: DefectiveRow[] = rowsRaw.map((r) => {
      const swap = r.swap_request_id ? swapMap.get(r.swap_request_id) : null;
      const bbId = r.billboard_id || swap?.billboard_id || null;
      const bb = bbId ? bbMap.get(bbId) : null;
      return {
        ...r,
        billboard_label: bb ? [bb.old_code, bb.equipment_id, bb.location_name].filter(Boolean).join(" - ") : null,
        assessment_doc_no: r.assessment_log_id ? asmMap.get(r.assessment_log_id)?.document_no || null : null,
        swap_info: swap ? {
          doc_no: swap.document_no,
          description: swap.description,
          old_sn: swap.old_serial_number,
          new_sn: swap.new_serial_number,
          old_label: labelOf(swap.old_media_player_id ? swapMpMap.get(swap.old_media_player_id) : null),
          new_label: labelOf(swap.new_media_player_id ? swapMpMap.get(swap.new_media_player_id) : null),
        } : null,
      };
    });
    setRows(enriched);
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

  const openCompleteDialog = (row: DefectiveRow) => {
    setCompleting(row);
    setCompleteNotes("");
    setCompleteFiles([]);
    setCompletePreviews([]);
  };

  const closeCompleteDialog = () => {
    completePreviews.forEach((u) => URL.revokeObjectURL(u));
    setCompleting(null);
    setCompleteNotes("");
    setCompleteFiles([]);
    setCompletePreviews([]);
  };

  const handleAddCompleteEvidence = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter((f) => {
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name}: ใหญ่เกิน 10MB`); return false; }
      return true;
    });
    setCompleteFiles((p) => [...p, ...valid]);
    setCompletePreviews((p) => [...p, ...valid.map((f) => URL.createObjectURL(f))]);
    e.target.value = "";
  };

  const removeCompleteEvidence = (idx: number) => {
    URL.revokeObjectURL(completePreviews[idx]);
    setCompleteFiles((p) => p.filter((_, i) => i !== idx));
    setCompletePreviews((p) => p.filter((_, i) => i !== idx));
  };

  const uploadCompleteEvidence = async (defectiveId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of completeFiles) {
      const ext = file.name.split(".").pop();
      const path = `disposal/${defectiveId}/completion-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("equipment-images").upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from("equipment-images").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  };

  const submitCompletion = async () => {
    if (!completing) return;
    const row = completing;
    const finalDisposalTypes = ["destroy", "sell_scrap", "csr"];
    const isFinalDisposal = row.disposal_method && finalDisposalTypes.includes(row.disposal_method);

    // 🔒 Mandatory evidence for final disposal
    if (isFinalDisposal && completeFiles.length === 0) {
      toast.error("กรุณาแนบรูปยืนยันการดำเนินการอย่างน้อย 1 รูป");
      return;
    }

    setSubmitting(true);
    try {
      // Upload completion evidence
      const completionUrls = completeFiles.length > 0 ? await uploadCompleteEvidence(row.id) : [];
      const merged = [...(row.disposal_evidence_urls || []), ...completionUrls];

      // Get item info for stock_movement
      let itemCode = "", itemName = "";
      if (row.is_media_player && row.media_player_id) {
        const { data: mp } = await supabase.from("media_players").select("code, name").eq("id", row.media_player_id).maybeSingle();
        if (mp) { itemCode = mp.code; itemName = mp.name; }
      } else if (row.equipment_id) {
        const { data: eq } = await supabase.from("equipment").select("code, name").eq("id", row.equipment_id).maybeSingle();
        if (eq) { itemCode = eq.code; itemName = eq.name; }
      }

      const { data: loc } = await supabase.from("locations").select("id").eq("code", "LOC-DEFECT").maybeSingle();
      const nowIso = new Date().toISOString();

      if (isFinalDisposal) {
        await supabase.from("stock_movements").insert({
          equipment_id: row.is_media_player ? row.media_player_id : row.equipment_id,
          equipment_code: itemCode,
          equipment_name: itemName,
          movement_type: `disposal_${row.disposal_method}`,
          quantity: 0,
          stock_before: 0,
          stock_after: 0,
          reference_type: "defective_return",
          reference_id: row.id,
          reference_document: row.document_no,
          location_id: loc?.id || null,
          notes: `[จำหน่ายออกจากคลังของเสีย: ${row.disposal_method}] ${completeNotes || row.disposal_notes || ""}`.trim(),
          item_condition: "defective",
          created_by: user?.id,
        });
      }

      const { error } = await supabase
        .from("defective_returns")
        .update({
          dispose_status: "completed",
          stock_disposed_at: nowIso,
          disposal_evidence_urls: merged.length ? merged : null,
          disposal_notes: completeNotes.trim()
            ? `${row.disposal_notes ? row.disposal_notes + "\n--\n" : ""}[เสร็จสิ้น] ${completeNotes.trim()}`
            : row.disposal_notes,
        })
        .eq("id", row.id);
      if (error) throw error;

      toast.success(isFinalDisposal
        ? `บันทึก "${DISPOSAL_METHODS[row.disposal_method!]?.label}" สำเร็จ — แนบหลักฐาน ${completionUrls.length} รูป`
        : "บันทึกเสร็จสิ้นแล้ว — สำหรับ 'ซ่อมและคืนคลัง' กรุณารับเข้าใหม่ผ่านเมนู Receive Goods");
      closeCompleteDialog();
      fetchData();
    } catch (e: any) {
      toast.error("บันทึกไม่สำเร็จ: " + e.message);
    } finally {
      setSubmitting(false);
    }
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

      {/* Anti-fraud info banner */}
      <Card className="border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20">
        <CardContent className="pt-4 pb-4 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm space-y-1">
            <p className="font-medium text-amber-900 dark:text-amber-200">🔒 การควบคุม Stock ของเสีย (ป้องกันทุจริต)</p>
            <ul className="text-xs text-amber-800/90 dark:text-amber-300/90 space-y-0.5 list-disc ml-4">
              <li>เมื่อบันทึกของเสีย ระบบจะ <span className="font-semibold">ตัด stock จากคลังหลักทันที</span> และย้ายเข้า <span className="font-mono">คลังของเสีย (WH-DEFECT)</span></li>
              <li>ทุกการเปลี่ยนแปลงถูกบันทึกใน <span className="font-semibold">Stock Card / Stock Movements</span> เพื่อ audit ย้อนหลัง</li>
              <li>เมื่อกด <span className="font-semibold">"เสร็จสิ้น"</span> สำหรับทำลาย/ขายซาก/CSR ระบบจะบันทึกการจำหน่ายออก พร้อมหลักฐานรูปภาพ</li>
              <li>กรณี <span className="font-semibold">"ซ่อมและคืนคลัง"</span> ต้องรับเข้าใหม่ผ่านเมนู Receive Goods (ต้องมี PO/หลักฐาน)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

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
                <Table className="min-w-[1800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[140px]">เลขที่</TableHead>
                      <TableHead className="min-w-[220px]">รายการ</TableHead>
                      <TableHead className="min-w-[150px]">S/N</TableHead>
                      <TableHead className="min-w-[120px]">ยี่ห้อ</TableHead>
                      <TableHead className="min-w-[120px]">ฝ่าย</TableHead>
                      <TableHead className="min-w-[80px] text-right">จำนวน</TableHead>
                      <TableHead className="min-w-[160px]">ประกัน</TableHead>
                      <TableHead className="min-w-[220px]">ที่มา / ป้าย</TableHead>
                      <TableHead className="min-w-[240px]">เหตุผล</TableHead>
                      <TableHead className="min-w-[140px]">ผู้แจ้ง</TableHead>
                      <TableHead className="min-w-[140px]">วิธีจัดการ</TableHead>
                      <TableHead className="min-w-[130px]">สถานะ</TableHead>
                      <TableHead className="min-w-[110px]">วันที่</TableHead>
                      <TableHead className="min-w-[110px] text-right">การจัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={14} className="text-center py-12 text-muted-foreground">กำลังโหลด...</TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={14} className="text-center py-12 text-muted-foreground">ไม่มีรายการ</TableCell></TableRow>
                    ) : filtered.map((row) => {
                      const mp = row.media_player;
                      const eq = row.equipment;
                      const code = row.is_media_player ? mp?.code : eq?.code;
                      const primaryName = row.is_media_player ? (mp?.remote_name || mp?.name) : eq?.name;
                      const brand = row.is_media_player ? mp?.brand : eq?.brand;
                      const department = row.is_media_player ? mp?.department : eq?.department;
                      const sns = row.is_media_player
                        ? [mp?.serial_number_1, mp?.serial_number_2].filter(Boolean)
                        : [eq?.serial_number].filter(Boolean);
                      const warrantyTxt = mp?.warranty_expiry_date ? format(new Date(mp.warranty_expiry_date), "dd MMM yy", { locale: th }) : null;
                      const inWarranty = mp?.warranty_expiry_date ? new Date(mp.warranty_expiry_date) >= new Date() : null;
                      const status = STATUS_LABEL[row.dispose_status] || { label: row.dispose_status, variant: "outline" as const };
                      const dm = row.disposal_method ? DISPOSAL_METHODS[row.disposal_method] : null;
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="font-mono text-xs align-top">{row.document_no}</TableCell>
                          <TableCell className="align-top">
                            <div className="font-mono font-medium">{code || "—"}</div>
                            <div className="text-xs text-foreground">{primaryName || ""}</div>
                            {row.is_media_player && mp?.specification && <div className="text-[10px] text-muted-foreground line-clamp-1">{mp.specification}</div>}
                          </TableCell>
                          <TableCell className="align-top text-xs font-mono whitespace-pre-line">{sns.length ? sns.join("\n") : "—"}</TableCell>
                          <TableCell className="align-top text-xs">{brand || "—"}</TableCell>
                          <TableCell className="align-top text-xs">{department || "—"}</TableCell>
                          <TableCell className="text-right font-mono align-top">{row.quantity}</TableCell>
                          <TableCell className="align-top text-xs">
                            {warrantyTxt ? (
                              <div className="flex flex-col gap-0.5">
                                <Badge variant={inWarranty ? "default" : "destructive"} className="text-[10px] py-0 px-1.5 h-4 w-fit">
                                  {inWarranty ? "ในประกัน" : "หมดประกัน"}
                                </Badge>
                                <span className="text-muted-foreground">{warrantyTxt}</span>
                              </div>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="align-top">
                            <Badge variant="outline" className="text-xs mb-1">
                              {row.swap_info ? "จาก Swap" : row.assessment_doc_no ? "จากการประเมิน" : row.source_type === "billboard" ? "ถอดจากป้าย" : "คลัง/ภาคสนาม"}
                            </Badge>
                            {row.billboard_label && <div className="text-[11px] text-muted-foreground">📍 {row.billboard_label}</div>}
                            {row.swap_info && <div className="text-[11px] text-blue-600 dark:text-blue-400 font-mono">{row.swap_info.doc_no}</div>}
                            {row.assessment_doc_no && <div className="text-[11px] text-amber-600 dark:text-amber-400 font-mono">{row.assessment_doc_no}</div>}
                          </TableCell>
                          <TableCell className="max-w-[260px] text-xs whitespace-pre-line align-top">{row.reason || "—"}</TableCell>
                          <TableCell className="align-top text-xs">
                            <div className="font-medium text-foreground">{row.reporter_name || "—"}</div>
                            {row.reporter_department && <div className="text-muted-foreground">{row.reporter_department}</div>}
                          </TableCell>
                          <TableCell className="align-top">
                            {dm ? (
                              <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border ${dm.color}`}>
                                <dm.icon className="w-3 h-3" /> {dm.label}
                              </span>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="align-top"><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                          <TableCell className="text-xs align-top">{format(new Date(row.created_at), "dd MMM yy HH:mm", { locale: th })}</TableCell>
                          <TableCell className="text-right align-top">
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="ghost" onClick={() => setPreviewing(row)} title="ดูเอกสาร">
                                <Eye className="w-4 h-4" />
                              </Button>
                              {row.dispose_status === "pending_disposal_review" && (
                                <Button size="sm" onClick={() => openApproval(row)}>พิจารณา</Button>
                              )}
                              {row.dispose_status === "approved" && (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => openApproval(row)}>แก้ไข</Button>
                                  <Button size="sm" onClick={() => openCompleteDialog(row)}>
                                    <CheckCircle2 className="w-4 h-4 mr-1" /> เสร็จสิ้น
                                  </Button>
                                </>
                              )}
                            </div>
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
            {editing && (() => {
              const mp = editing.media_player;
              const eq = editing.equipment;
              const code = editing.is_media_player ? mp?.code : eq?.code;
              const primaryName = editing.is_media_player ? (mp?.remote_name || mp?.name) : eq?.name;
              const brand = editing.is_media_player ? mp?.brand : eq?.brand;
              const department = editing.is_media_player ? mp?.department : eq?.department;
              const sns = editing.is_media_player
                ? [mp?.serial_number_1, mp?.serial_number_2].filter(Boolean)
                : [eq?.serial_number].filter(Boolean);
              const warrantyTxt = mp?.warranty_expiry_date ? format(new Date(mp.warranty_expiry_date), "dd MMM yyyy", { locale: th }) : null;
              const inWarranty = mp?.warranty_expiry_date ? new Date(mp.warranty_expiry_date) >= new Date() : null;
              return (
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm space-y-2">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    <div><span className="text-muted-foreground">รหัส:</span> <span className="font-mono font-medium">{code || "—"}</span></div>
                    <div><span className="text-muted-foreground">{editing.is_media_player ? "ชื่อ Remote" : "ชื่อ"}:</span> <span className="font-medium">{primaryName || "—"}</span></div>
                    <div><span className="text-muted-foreground">ยี่ห้อ:</span> {brand || "—"}</div>
                    <div><span className="text-muted-foreground">ฝ่าย:</span> {department || "—"}</div>
                    <div className="col-span-2"><span className="text-muted-foreground">S/N:</span> <span className="font-mono whitespace-pre-line">{sns.length ? sns.join(" / ") : "—"}</span></div>
                    {editing.is_media_player && mp?.specification && (
                      <div className="col-span-2"><span className="text-muted-foreground">Spec:</span> {mp.specification}</div>
                    )}
                    <div><span className="text-muted-foreground">จำนวน:</span> <span className="font-mono">{editing.quantity}</span></div>
                    <div><span className="text-muted-foreground">สภาพ:</span> {editing.item_condition || "—"}</div>
                    {warrantyTxt && (
                      <div className="col-span-2 flex items-center gap-2">
                        <Badge variant={inWarranty ? "default" : "destructive"} className="text-[10px] py-0 px-1.5 h-4">{inWarranty ? "ในประกัน" : "หมดประกัน"}</Badge>
                        <span className="text-xs text-muted-foreground">หมดประกัน: {warrantyTxt}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border/60 space-y-1.5">
                    <div><span className="text-muted-foreground">ที่มา:</span> <Badge variant="outline" className="text-xs ml-1">{editing.swap_info ? "จาก Swap" : editing.assessment_doc_no ? "จากการประเมิน" : editing.source_type === "billboard" ? "ถอดจากป้าย" : "คลัง/ภาคสนาม"}</Badge></div>
                    {editing.billboard_label && <div className="text-xs">📍 <span className="text-muted-foreground">ป้าย:</span> <span className="text-foreground">{editing.billboard_label}</span></div>}
                    {editing.assessment_doc_no && <div className="text-xs">📋 <span className="text-muted-foreground">ใบประเมิน:</span> <span className="font-mono">{editing.assessment_doc_no}</span></div>}
                    {editing.swap_info && (
                      <div className="text-xs rounded-md border border-blue-300/60 bg-blue-50/60 dark:border-blue-800/60 dark:bg-blue-950/30 px-2 py-1.5 space-y-0.5 mt-1">
                        <div className="font-medium text-blue-700 dark:text-blue-300">🔄 จาก Swap: <span className="font-mono">{editing.swap_info.doc_no}</span></div>
                        {(editing.swap_info.old_label || editing.swap_info.old_sn) && (
                          <div>เครื่องเก่า (ถอด): <span className="font-medium">{editing.swap_info.old_label || "—"}</span>{editing.swap_info.old_sn && <> · S/N: <span className="font-mono">{editing.swap_info.old_sn}</span></>}</div>
                        )}
                        {(editing.swap_info.new_label || editing.swap_info.new_sn) && (
                          <div>เครื่องใหม่ (ติดแทน): <span className="font-medium">{editing.swap_info.new_label || "—"}</span>{editing.swap_info.new_sn && <> · S/N: <span className="font-mono">{editing.swap_info.new_sn}</span></>}</div>
                        )}
                        {editing.swap_info.description && <div className="text-muted-foreground">อาการ: {editing.swap_info.description}</div>}
                      </div>
                    )}
                    {(editing.reporter_name || editing.reporter_department) && (
                      <div className="text-xs"><span className="text-muted-foreground">ผู้แจ้ง:</span> <span className="text-foreground font-medium">{editing.reporter_name || "—"}</span>{editing.reporter_department && <> · <span className="text-muted-foreground">ฝ่าย:</span> {editing.reporter_department}</>}</div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border/60">
                    <div className="text-muted-foreground text-xs mb-1">เหตุผล/สาเหตุ:</div>
                    <div className="whitespace-pre-line text-sm bg-background rounded p-2 border">{editing.reason || "—"}</div>
                    {editing.notes && (
                      <div className="mt-2"><div className="text-muted-foreground text-xs mb-1">หมายเหตุ:</div><div className="whitespace-pre-line text-xs">{editing.notes}</div></div>
                    )}
                  </div>
                </div>
              );
            })()}


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

      {/* Complete dialog — requires confirmation photo */}
      <Dialog open={!!completing} onOpenChange={(o) => !o && closeCompleteDialog()}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              ยืนยันดำเนินการเสร็จสิ้น — {completing?.document_no}
            </DialogTitle>
            <DialogDescription>
              {completing && (completing.is_media_player ? completing.media_player?.code : completing.equipment?.code)} • จำนวน {completing?.quantity}
              {completing?.disposal_method && (
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-primary/10 text-primary">
                  วิธี: {DISPOSAL_METHODS[completing.disposal_method]?.label}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {completing?.disposal_method && ["destroy", "sell_scrap", "csr"].includes(completing.disposal_method) && (
              <div className="rounded-md border border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20 p-3 text-xs text-amber-900 dark:text-amber-200">
                🔒 <span className="font-medium">บังคับแนบรูปยืนยัน</span> อย่างน้อย 1 รูป (ถ่ายขณะดำเนินการจริง / ใบเสร็จรับซาก / รูปกิจกรรม CSR) เพื่อ audit ป้องกันทุจริต
              </div>
            )}

            <div className="space-y-2">
              <Label>หมายเหตุการดำเนินการ</Label>
              <Textarea value={completeNotes} onChange={(e) => setCompleteNotes(e.target.value)} rows={2} placeholder="เช่น ทำลายโดย... ขายให้... จัดกิจกรรมที่..." />
            </div>

            <div className="space-y-2">
              <Label>
                รูปยืนยันการดำเนินการ
                {completing?.disposal_method && ["destroy", "sell_scrap", "csr"].includes(completing.disposal_method) && (
                  <span className="text-destructive ml-1">*</span>
                )}
              </Label>
              <input id="complete-evidence" type="file" accept="image/*" multiple className="hidden" onChange={handleAddCompleteEvidence} />
              <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("complete-evidence")?.click()}>
                <ImagePlus className="w-4 h-4 mr-1" /> เพิ่มรูปยืนยัน
              </Button>
              {completePreviews.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {completePreviews.map((url, i) => (
                    <div key={i} className="relative">
                      <img src={url} alt="confirmation" className="w-full h-24 object-cover rounded border" />
                      <Button type="button" size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6" onClick={() => removeCompleteEvidence(i)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeCompleteDialog} disabled={submitting}>ยกเลิก</Button>
            <Button onClick={submitCompletion} disabled={submitting}>
              {submitting ? "กำลังบันทึก..." : "ยืนยันเสร็จสิ้น"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog — read-only document view */}
      <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              เอกสาร {previewing?.document_no}
            </DialogTitle>
            <DialogDescription>
              สร้างเมื่อ {previewing && format(new Date(previewing.created_at), "dd MMM yyyy HH:mm", { locale: th })}
            </DialogDescription>
          </DialogHeader>

          {previewing && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 rounded-md bg-muted/40 p-3">
                <div><span className="text-muted-foreground">รหัส:</span> <span className="font-medium">{(previewing.is_media_player ? previewing.media_player?.code : previewing.equipment?.code) || "—"}</span></div>
                <div><span className="text-muted-foreground">ชื่อ:</span> <span className="font-medium">{(previewing.is_media_player ? previewing.media_player?.name : previewing.equipment?.name) || "—"}</span></div>
                <div><span className="text-muted-foreground">ประเภท:</span> {previewing.is_media_player ? "Media Player" : "สินค้า/อะไหล่"}</div>
                <div><span className="text-muted-foreground">จำนวน:</span> <span className="font-mono">{previewing.quantity}</span></div>
                <div><span className="text-muted-foreground">ที่มา:</span> {previewing.source_type === "billboard" ? "ถอดจากป้าย" : previewing.swap_request_id ? "จาก Swap" : "คลัง/ภาคสนาม"}</div>
                <div><span className="text-muted-foreground">สภาพ:</span> {previewing.item_condition || "—"}</div>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground text-xs">เหตุผล/สาเหตุ:</span>
                <p className="whitespace-pre-line bg-muted/30 rounded p-2">{previewing.reason || "—"}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-muted-foreground text-xs">สถานะ:</span>
                  <Badge variant={(STATUS_LABEL[previewing.dispose_status] || { variant: "outline" as const }).variant}>
                    {STATUS_LABEL[previewing.dispose_status]?.label || previewing.dispose_status}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground text-xs">วิธีจัดการ:</span>
                  {previewing.disposal_method ? (
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border w-fit ${DISPOSAL_METHODS[previewing.disposal_method]?.color}`}>
                      {DISPOSAL_METHODS[previewing.disposal_method]?.label}
                    </span>
                  ) : <p className="text-xs">—</p>}
                </div>
              </div>

              {previewing.disposal_notes && (
                <div className="space-y-1">
                  <span className="text-muted-foreground text-xs">หมายเหตุการตัดสินใจ:</span>
                  <p className="whitespace-pre-line bg-muted/30 rounded p-2 text-xs">{previewing.disposal_notes}</p>
                </div>
              )}

              {previewing.disposal_approved_at && (
                <div className="text-xs text-muted-foreground">
                  อนุมัติเมื่อ {format(new Date(previewing.disposal_approved_at), "dd MMM yyyy HH:mm", { locale: th })}
                </div>
              )}

              <div className="space-y-2">
                <span className="text-muted-foreground text-xs font-medium">📷 หลักฐาน ({previewing.disposal_evidence_urls?.length || 0} รูป):</span>
                {previewing.disposal_evidence_urls && previewing.disposal_evidence_urls.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {previewing.disposal_evidence_urls.map((url, i) => (
                      <button key={i} type="button" onClick={() => setLightboxUrl(url)} className="relative group">
                        <img src={url} alt={`evidence ${i + 1}`} className="w-full h-24 object-cover rounded border hover:opacity-80 transition" />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition rounded">
                          <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100" />
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">ยังไม่มีรูปหลักฐาน</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewing(null)}>ปิด</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox for full-size image */}
      <Dialog open={!!lightboxUrl} onOpenChange={(o) => !o && setLightboxUrl(null)}>
        <DialogContent className="max-w-4xl p-2">
          {lightboxUrl && <img src={lightboxUrl} alt="full" className="w-full h-auto max-h-[85vh] object-contain rounded" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
