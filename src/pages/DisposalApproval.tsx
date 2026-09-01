import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFunctionPermissions } from "@/hooks/useFunctionPermissions";
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
import { ShieldCheck, ShieldAlert, Search, RefreshCw, Trash2, Recycle, HeartHandshake, Wrench, ImagePlus, X, Eye, CheckCircle2, FileText, Calculator } from "lucide-react";
import { toast } from "sonner";
import { DisposalAuditTimeline } from "@/components/disposal/DisposalAuditTimeline";
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
  item_condition: string;
  source_type: string;
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
  // 2-tier + value/expired columns
  is_expired: boolean;
  still_usable: boolean | null;
  unit_price_snapshot: number | null;
  total_value: number | null;
  l1_approved_by: string | null;
  l1_approved_at: string | null;
  l1_notes: string | null;
  l2_approved_by: string | null;
  l2_approved_at: string | null;
  l2_notes: string | null;
  finance_ack_by: string | null;
  finance_ack_at: string | null;
  finance_ack_notes: string | null;
  disposal_rejected_by: string | null;
  disposal_rejected_reason: string | null;
  // joined
  equipment?: { code: string; name: string; brand: string | null; serial_number: string | null; department: string | null } | null;
  media_player?: { code: string; name: string; remote_name: string | null; brand: string | null; serial_number_1: string | null; serial_number_2: string | null; department: string | null; warranty_expiry_date: string | null; specification: string | null; unit_price: number | null } | null;
  // extra enrichment
  billboard_label?: string | null;
  swap_info?: { doc_no: string; old_label: string | null; new_label: string | null; old_sn: string | null; new_sn: string | null; description: string | null } | null;
  assessment_doc_no?: string | null;
  // user name enrichment
  l1_name?: string | null;
  l2_name?: string | null;
  finance_name?: string | null;
}

const DISPOSAL_METHODS: Record<string, { label: string; icon: any; color: string }> = {
  destroy: { label: "ทำลายทิ้ง", icon: Trash2, color: "bg-destructive/10 text-destructive border-destructive/30" },
  sell_scrap: { label: "จำหน่ายเป็นซาก", icon: Recycle, color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  csr: { label: "นำไปทำ CSR", icon: HeartHandshake, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  repair_return: { label: "ซ่อมและคืนคลัง", icon: Wrench, color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
};

const STATUS_LABEL: Record<string, { label: string; variant: "secondary" | "default" | "outline" | "destructive" }> = {
  pending_disposal_review: { label: "รออนุมัติขั้นที่ 1", variant: "secondary" },
  l1_approved: { label: "อนุมัติชั้น 1 แล้ว", variant: "secondary" },
  approved: { label: "อนุมัติขั้นสุดท้าย", variant: "default" },
  rejected: { label: "ปฏิเสธ", variant: "destructive" },
  completed: { label: "ดำเนินการเสร็จ", variant: "outline" },
};

const fmtMoney = (n: number | null | undefined) =>
  n == null ? "—" : `฿${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function DisposalApproval() {
  const { user } = useAuth();
  const { hasFunctionAccess } = useFunctionPermissions();
  const canL1 = hasFunctionAccess("disposal_approve_l1");
  const canL2 = hasFunctionAccess("disposal_approve_l2");
  const canFinance = hasFunctionAccess("disposal_finance");
  const canRequest = hasFunctionAccess("disposal_request");

  const [rows, setRows] = useState<DefectiveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("l1");

  // Approval dialog state (L1 or L2)
  const [editing, setEditing] = useState<DefectiveRow | null>(null);
  const [editingTier, setEditingTier] = useState<"l1" | "l2">("l1");
  const [method, setMethod] = useState<string>("");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [evidencePreviews, setEvidencePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Complete dialog state
  const [completing, setCompleting] = useState<DefectiveRow | null>(null);
  const [completeNotes, setCompleteNotes] = useState("");
  const [completeFiles, setCompleteFiles] = useState<File[]>([]);
  const [completePreviews, setCompletePreviews] = useState<string[]>([]);

  // Finance ack dialog
  const [finAck, setFinAck] = useState<DefectiveRow | null>(null);
  const [finNotes, setFinNotes] = useState("");

  // Preview dialog
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
        is_expired, still_usable, unit_price_snapshot, total_value,
        l1_approved_by, l1_approved_at, l1_notes,
        l2_approved_by, l2_approved_at, l2_notes,
        finance_ack_by, finance_ack_at, finance_ack_notes,
        disposal_rejected_by, disposal_rejected_reason,
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
    const userIds = [...new Set([
      ...rowsRaw.map((r) => r.l1_approved_by),
      ...rowsRaw.map((r) => r.l2_approved_by),
      ...rowsRaw.map((r) => r.finance_ack_by),
    ].filter(Boolean))] as string[];

    const [swapRes, asmRes, bbRes, usersRes] = await Promise.all([
      swapIds.length ? supabase.from("swap_requests").select("id, document_no, billboard_id, description, old_serial_number, new_serial_number, old_media_player_id, new_media_player_id").in("id", swapIds) : Promise.resolve({ data: [] as any[] }),
      asmIds.length ? supabase.from("assessment_logs").select("id, document_no").in("id", asmIds) : Promise.resolve({ data: [] as any[] }),
      bbIds.length ? supabase.from("billboards").select("id, old_code, equipment_id, location_name").in("id", bbIds) : Promise.resolve({ data: [] as any[] }),
      userIds.length ? supabase.rpc("get_users_emails" as any).then((r: any) => r) : Promise.resolve({ data: [] as any[] }),
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
    const userMap = new Map<string, string>(((usersRes.data as any[]) || []).map((u: any) => [u.id, u.email]));
    const labelOf = (mp: any) => mp ? `${mp.code}${mp.remote_name ? ` (${mp.remote_name})` : mp.name ? ` - ${mp.name}` : ""}` : null;

    const enriched: DefectiveRow[] = rowsRaw.map((r) => {
      const swap = r.swap_request_id ? swapMap.get(r.swap_request_id) : null;
      const bbId = r.billboard_id || swap?.billboard_id || null;
      const bb = bbId ? bbMap.get(bbId) : null;
      return {
        ...r,
        billboard_label: bb ? [bb.old_code, bb.equipment_id, bb.location_name].filter(Boolean).join(" - ") : null,
        assessment_doc_no: r.assessment_log_id ? asmMap.get(r.assessment_log_id)?.document_no || null : null,
        l1_name: r.l1_approved_by ? userMap.get(r.l1_approved_by) || null : null,
        l2_name: r.l2_approved_by ? userMap.get(r.l2_approved_by) || null : null,
        finance_name: r.finance_ack_by ? userMap.get(r.finance_ack_by) || null : null,
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
      if (tab === "l1") return r.dispose_status === "pending_disposal_review";
      if (tab === "l2") return r.dispose_status === "l1_approved";
      if (tab === "approved") return r.dispose_status === "approved";
      if (tab === "completed") return r.dispose_status === "completed";
      if (tab === "finance") return !r.finance_ack_by && r.dispose_status !== "rejected";
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
    l1: rows.filter((r) => r.dispose_status === "pending_disposal_review").length,
    l2: rows.filter((r) => r.dispose_status === "l1_approved").length,
    approved: rows.filter((r) => r.dispose_status === "approved").length,
    completed: rows.filter((r) => r.dispose_status === "completed").length,
    pendingFinance: rows.filter((r) => !r.finance_ack_by && r.dispose_status !== "rejected").length,
  }), [rows]);

  const openApproval = (row: DefectiveRow, tier: "l1" | "l2") => {
    setEditing(row);
    setEditingTier(tier);
    setMethod(row.disposal_method || "");
    setDecisionNotes(tier === "l1" ? (row.l1_notes || "") : (row.l2_notes || row.disposal_notes || ""));
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
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name}: ใหญ่กว่า 10MB`); return false; }
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

  const submitTierDecision = async (decision: "approve" | "reject") => {
    if (!editing) return;
    if (decision === "approve" && !method) { toast.error("กรุณาเลือกวิธีจัดการ"); return; }
    setSubmitting(true);
    try {
      const newUrls = evidenceFiles.length > 0 ? await uploadEvidence(editing.id) : [];
      const merged = [...(editing.disposal_evidence_urls || []), ...newUrls];
      const nowIso = new Date().toISOString();

      if (decision === "reject") {
        const { error } = await supabase.from("defective_returns").update({
          dispose_status: "rejected",
          disposal_rejected_by: user?.id,
          disposal_rejected_reason: decisionNotes.trim() || null,
          disposal_evidence_urls: merged.length ? merged : null,
        }).eq("id", editing.id);
        if (error) throw error;
        toast.success("ปฏิเสธคำขอแล้ว");
      } else if (editingTier === "l1") {
        // Compute value snapshot if missing
        let unitPrice = editing.unit_price_snapshot;
        if (unitPrice == null) {
          unitPrice = editing.is_media_player ? editing.media_player?.unit_price ?? null : null;
        }
        const totalVal = unitPrice != null ? Number((unitPrice * editing.quantity).toFixed(2)) : null;
        const { error } = await supabase.from("defective_returns").update({
          dispose_status: "l1_approved",
          disposal_method: method,
          l1_approved_by: user?.id,
          l1_approved_at: nowIso,
          l1_notes: decisionNotes.trim() || null,
          unit_price_snapshot: unitPrice,
          total_value: totalVal,
          disposal_evidence_urls: merged.length ? merged : null,
        }).eq("id", editing.id);
        if (error) throw error;
        toast.success("อนุมัติชั้นที่ 1 แล้ว — ส่งให้ผู้อนุมัติชั้นที่ 2");
      } else {
        const { error } = await supabase.from("defective_returns").update({
          dispose_status: "approved",
          disposal_method: method,
          l2_approved_by: user?.id,
          l2_approved_at: nowIso,
          l2_notes: decisionNotes.trim() || null,
          disposal_notes: decisionNotes.trim() || null,
          disposal_approved_by: user?.id,
          disposal_approved_at: nowIso,
          disposal_evidence_urls: merged.length ? merged : null,
        }).eq("id", editing.id);
        if (error) throw error;
        toast.success("อนุมัติขั้นสุดท้ายแล้ว — พร้อมดำเนินการ");
      }
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
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name}: ใหญ่กว่า 10MB`); return false; }
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

    if (isFinalDisposal && completeFiles.length === 0) {
      toast.error("กรุณาแนบรูปยืนยันการดำเนินการอย่างน้อย 1 รูป");
      return;
    }

    setSubmitting(true);
    try {
      const completionUrls = completeFiles.length > 0 ? await uploadCompleteEvidence(row.id) : [];
      const merged = [...(row.disposal_evidence_urls || []), ...completionUrls];

      let itemCode = "", itemName = "";
      if (row.is_media_player && row.media_player_id) {
        const { data: mp } = await supabase.from("media_players").select("code, name").eq("id", row.media_player_id).maybeSingle();
        if (mp) { itemCode = mp.code; itemName = mp.name; }
      } else if (row.equipment_id) {
        const { data: eq } = await supabase.from("equipment").select("code, name").eq("id", row.equipment_id).maybeSingle();
        if (eq) { itemCode = eq.code; itemName = eq.name; }
      }

      const { data: loc } = await supabase
        .from("locations")
        .select("id, warehouses:warehouse_id!inner(code)")
        .eq("code", "LOC-DEFECT")
        .eq("warehouses.code", "WH-DEFECT")
        .maybeSingle();
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

  const submitFinanceAck = async () => {
    if (!finAck) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("defective_returns").update({
        finance_ack_by: user?.id,
        finance_ack_at: new Date().toISOString(),
        finance_ack_notes: finNotes.trim() || null,
      }).eq("id", finAck.id);
      if (error) throw error;
      toast.success("บันทึกรับทราบของเสียเรียบร้อย");
      setFinAck(null);
      setFinNotes("");
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
            อนุมัติจัดการของเสีย (2 ชั้น)
          </h1>
          <p className="text-muted-foreground mt-1">
            ชั้นที่ 1: หัวหน้าฝ่ายเจ้าของของยืนยันเสียจริง + เสนอวิธีจัดการ → ชั้นที่ 2: ผู้จัดการทรัพย์สินอนุมัติขั้นสุดท้าย → บัญชีรับทราบ
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          โหลดใหม่
        </Button>
      </div>

      <Card className="border-blue-500/40 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="pt-4 pb-4 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm space-y-1">
            <p className="font-medium text-blue-900 dark:text-blue-200">🔒 การควบคุม Stock ของเสีย (2 ชั้นอนุมัติ)</p>
            <ul className="text-xs text-blue-800/90 dark:text-blue-300/90 space-y-0.5 list-disc ml-4">
              <li><b>กรณี A (ถอดจากป้าย/เบิกออก):</b> ไม่ตัดสต็อกหลักซ้ำ (ตัดไปแล้วตอนเบิก) — รับเข้าคลังของเสียเท่านั้น</li>
              <li><b>กรณี B (ของหมดอายุในคลัง):</b> ตัดสต็อกหลัก ย้ายเข้า WH-DEFECT เพื่อรอจำหน่าย/ทำลาย</li>
              <li>ของหมดอายุแต่ยังใช้ได้ → เบิกออกปกติได้ ไม่ต้องเข้า Flow นี้</li>
              <li>ทุกขั้นตอนถูกบันทึกใน <b>Stock Card / Stock Movements</b> พร้อมมูลค่าสำหรับฝ่ายบัญชี</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardHeader className="pb-2"><CardDescription>รออนุมัติ ชั้น 1</CardDescription><CardTitle className="text-2xl text-warning">{stats.l1}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>รออนุมัติ ชั้น 2</CardDescription><CardTitle className="text-2xl text-amber-600">{stats.l2}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>อนุมัติแล้ว (รอดำเนินการ)</CardDescription><CardTitle className="text-2xl text-primary">{stats.approved}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>ดำเนินการเสร็จ</CardDescription><CardTitle className="text-2xl text-success">{stats.completed}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>รอบัญชีรับทราบ</CardDescription><CardTitle className="text-2xl text-purple-600">{stats.pendingFinance}</CardTitle></CardHeader></Card>
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
            <TabsList className="flex flex-wrap h-auto">
              {canL1 && <TabsTrigger value="l1">รอชั้น 1 ({stats.l1})</TabsTrigger>}
              {canL2 && <TabsTrigger value="l2">รอชั้น 2 ({stats.l2})</TabsTrigger>}
              <TabsTrigger value="approved">อนุมัติแล้ว ({stats.approved})</TabsTrigger>
              <TabsTrigger value="completed">เสร็จสิ้น ({stats.completed})</TabsTrigger>
              {canFinance && <TabsTrigger value="finance">บัญชีรับทราบ ({stats.pendingFinance})</TabsTrigger>}
              <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="mt-4">
              <div className="overflow-x-auto">
                <Table className="min-w-[1900px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[140px]">เลขที่</TableHead>
                      <TableHead className="min-w-[220px]">รายการ</TableHead>
                      <TableHead className="min-w-[150px]">S/N</TableHead>
                      <TableHead className="min-w-[110px]">ฝ่าย</TableHead>
                      <TableHead className="min-w-[80px] text-right">จำนวน</TableHead>
                      <TableHead className="min-w-[130px] text-right">มูลค่า</TableHead>
                      <TableHead className="min-w-[150px]">ที่มา / ป้าย</TableHead>
                      <TableHead className="min-w-[220px]">เหตุผล</TableHead>
                      <TableHead className="min-w-[150px]">วิธีจัดการ</TableHead>
                      <TableHead className="min-w-[130px]">สถานะ</TableHead>
                      <TableHead className="min-w-[120px]">ผู้อนุมัติ</TableHead>
                      <TableHead className="min-w-[110px]">วันที่</TableHead>
                      <TableHead className="min-w-[150px] text-right">การจัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={13} className="text-center py-12 text-muted-foreground">กำลังโหลด...</TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={13} className="text-center py-12 text-muted-foreground">ไม่มีรายการ</TableCell></TableRow>
                    ) : filtered.map((row) => {
                      const mp = row.media_player;
                      const eq = row.equipment;
                      const code = row.is_media_player ? mp?.code : eq?.code;
                      const primaryName = row.is_media_player ? (mp?.remote_name || mp?.name) : eq?.name;
                      const department = row.is_media_player ? mp?.department : eq?.department;
                      const sns = row.is_media_player
                        ? [mp?.serial_number_1, mp?.serial_number_2].filter(Boolean)
                        : [eq?.serial_number].filter(Boolean);
                      const status = STATUS_LABEL[row.dispose_status] || { label: row.dispose_status, variant: "outline" as const };
                      const dm = row.disposal_method ? DISPOSAL_METHODS[row.disposal_method] : null;
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="font-mono text-xs align-top">{row.document_no}</TableCell>
                          <TableCell className="align-top">
                            <div className="font-mono font-medium">{code || "—"}</div>
                            <div className="text-xs text-foreground">{primaryName || ""}</div>
                            {row.is_expired && <Badge variant="destructive" className="text-[10px] h-4 px-1 mt-1">หมดอายุ</Badge>}
                          </TableCell>
                          <TableCell className="align-top text-xs font-mono whitespace-pre-line">{sns.length ? sns.join("\n") : "—"}</TableCell>
                          <TableCell className="align-top text-xs">{department || "—"}</TableCell>
                          <TableCell className="text-right font-mono align-top">{row.quantity}</TableCell>
                          <TableCell className="text-right align-top text-xs font-mono">{row.total_value != null ? fmtMoney(row.total_value) : "—"}</TableCell>
                          <TableCell className="align-top">
                            <Badge variant="outline" className="text-xs mb-1">
                              {row.swap_info ? "จาก Swap" : row.assessment_doc_no ? "จากการประเมิน" : row.source_type === "billboard" ? "ถอดจากป้าย" : row.is_expired ? "หมดอายุในคลัง" : "คลัง/ภาคสนาม"}
                            </Badge>
                            {row.billboard_label && <div className="text-[11px] text-muted-foreground">📍 {row.billboard_label}</div>}
                            {row.swap_info && <div className="text-[11px] text-blue-600 dark:text-blue-400 font-mono">{row.swap_info.doc_no}</div>}
                            {row.assessment_doc_no && <div className="text-[11px] text-amber-600 dark:text-amber-400 font-mono">{row.assessment_doc_no}</div>}
                          </TableCell>
                          <TableCell className="max-w-[260px] text-xs whitespace-pre-line align-top">{row.reason || "—"}</TableCell>
                          <TableCell className="align-top">
                            {dm ? (
                              <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border ${dm.color}`}>
                                <dm.icon className="w-3 h-3" /> {dm.label}
                              </span>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="align-top"><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                          <TableCell className="align-top text-[11px]">
                            {row.l1_name && <div className="text-amber-600">1️⃣ {row.l1_name}</div>}
                            {row.l2_name && <div className="text-emerald-600">2️⃣ {row.l2_name}</div>}
                            {row.finance_name && <div className="text-purple-600">💰 {row.finance_name}</div>}
                            {!row.l1_name && !row.l2_name && "—"}
                          </TableCell>
                          <TableCell className="text-xs align-top">{format(new Date(row.created_at), "dd MMM yy HH:mm", { locale: th })}</TableCell>
                          <TableCell className="text-right align-top">
                            <div className="flex gap-1 justify-end flex-wrap">
                              <Button size="sm" variant="ghost" onClick={() => setPreviewing(row)} title="ดูเอกสาร">
                                <Eye className="w-4 h-4" />
                              </Button>
                              {row.dispose_status === "pending_disposal_review" && canL1 && (
                                <Button size="sm" onClick={() => openApproval(row, "l1")}>พิจารณา L1</Button>
                              )}
                              {row.dispose_status === "l1_approved" && canL2 && (
                                <Button size="sm" onClick={() => openApproval(row, "l2")}>พิจารณา L2</Button>
                              )}
                              {row.dispose_status === "approved" && (
                                <Button size="sm" onClick={() => openCompleteDialog(row)}>
                                  <CheckCircle2 className="w-4 h-4 mr-1" /> เสร็จสิ้น
                                </Button>
                              )}
                              {row.dispose_status !== "rejected" && row.dispose_status !== "pending_disposal_review" && canFinance && !row.finance_ack_by && (
                                <Button size="sm" variant="outline" onClick={() => { setFinAck(row); setFinNotes(""); }}>
                                  <Calculator className="w-4 h-4 mr-1" /> รับทราบ
                                </Button>
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

      {/* Approval dialog (L1 / L2) */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && closeApproval()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              {editingTier === "l1" ? "อนุมัติชั้นที่ 1 — ยืนยันเสียจริง + เสนอวิธีจัดการ" : "อนุมัติชั้นที่ 2 — อนุมัติขั้นสุดท้าย"} — {editing?.document_no}
            </DialogTitle>
            <DialogDescription>
              {editing && (editing.is_media_player ? editing.media_player?.code : editing.equipment?.code)} • จำนวน {editing?.quantity}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {editing && editingTier === "l2" && editing.l1_approved_by === user?.id && (
              <div className="rounded-md border border-warning/50 bg-warning/10 p-3 text-xs flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <span>
                  คุณเป็นผู้อนุมัติชั้นที่ 1 ของใบนี้เอง — การอนุมัติขั้นสุดท้ายจะถูกบันทึกใน Audit Log ว่า
                  <strong> “อนุมัติข้ามชั้นโดยผู้ใช้คนเดียวกัน” </strong>
                  (ระบบอนุญาตให้ทำได้ แต่จะแสดงในรายงานตรวจสอบ)
                </span>
              </div>
            )}
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
                    <div><span className="text-muted-foreground">จำนวน:</span> <span className="font-mono">{editing.quantity}</span></div>
                    <div><span className="text-muted-foreground">ที่มา:</span> {editing.swap_info ? "จาก Swap" : editing.assessment_doc_no ? "จากการประเมิน" : editing.source_type === "billboard" ? "ถอดจากป้าย" : editing.is_expired ? "หมดอายุในคลัง" : "คลัง/ภาคสนาม"}</div>
                    {editing.is_media_player && mp?.unit_price != null && (
                      <div><span className="text-muted-foreground">ราคา/หน่วย:</span> {fmtMoney(mp.unit_price)}</div>
                    )}
                    {warrantyTxt && (
                      <div className="flex items-center gap-2">
                        <Badge variant={inWarranty ? "default" : "destructive"} className="text-[10px] py-0 px-1.5 h-4">{inWarranty ? "ในประกัน" : "หมดประกัน"}</Badge>
                        <span className="text-xs text-muted-foreground">หมดประกัน: {warrantyTxt}</span>
                      </div>
                    )}
                  </div>
                  <div className="pt-2 border-t border-border/60">
                    <div className="text-muted-foreground text-xs mb-1">เหตุผล/สาเหตุ:</div>
                    <div className="whitespace-pre-line text-sm bg-background rounded p-2 border">{editing.reason || "—"}</div>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-2">
              <Label>เลือกวิธีจัดการ *</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue placeholder="เลือกวิธี..." /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DISPOSAL_METHODS)
                    .filter(([k]) => SELECTABLE_DISPOSAL_METHODS.includes(k))
                    .map(([k, v]) => (
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
              <Label>หลักฐาน (ภาพถ่าย / เอกสาร)</Label>
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
            <Button variant="destructive" onClick={() => submitTierDecision("reject")} disabled={submitting}>ปฏิเสธ</Button>
            <Button onClick={() => submitTierDecision("approve")} disabled={submitting || !method}>
              {submitting ? "กำลังบันทึก..." : editingTier === "l1" ? "อนุมัติชั้น 1" : "อนุมัติขั้นสุดท้าย"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete dialog */}
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

      {/* Finance acknowledgement dialog */}
      <Dialog open={!!finAck} onOpenChange={(o) => { if (!o) { setFinAck(null); setFinNotes(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-purple-600" />
              บัญชีรับทราบของเสีย — {finAck?.document_no}
            </DialogTitle>
            <DialogDescription>
              {finAck && (finAck.is_media_player ? finAck.media_player?.code : finAck.equipment?.code)} • มูลค่ารวม {finAck && fmtMoney(finAck.total_value)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md bg-muted/40 p-3 text-sm grid grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">วิธีจัดการ:</span> {finAck?.disposal_method ? DISPOSAL_METHODS[finAck.disposal_method]?.label : "—"}</div>
              <div><span className="text-muted-foreground">จำนวน:</span> <span className="font-mono">{finAck?.quantity}</span></div>
              <div><span className="text-muted-foreground">มูลค่า/หน่วย:</span> {fmtMoney(finAck?.unit_price_snapshot)}</div>
              <div><span className="text-muted-foreground">มูลค่ารวม:</span> <span className="font-mono font-medium">{fmtMoney(finAck?.total_value)}</span></div>
            </div>
            <div className="space-y-2">
              <Label>หมายเหตุฝ่ายบัญชี</Label>
              <Textarea value={finNotes} onChange={(e) => setFinNotes(e.target.value)} rows={2} placeholder="เช่น บันทึกบัญชีเลขที่... ตรวจสอบแล้ว" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setFinAck(null); setFinNotes(""); }} disabled={submitting}>ยกเลิก</Button>
            <Button onClick={submitFinanceAck} disabled={submitting}>
              {submitting ? "กำลังบันทึก..." : "ยืนยันรับทราบ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
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
                <div><span className="text-muted-foreground">ที่มา:</span> {previewing.source_type === "billboard" ? "ถอดจากป้าย" : previewing.is_expired ? "หมดอายุในคลัง" : previewing.swap_request_id ? "จาก Swap" : "คลัง/ภาคสนาม"}</div>
                <div><span className="text-muted-foreground">สภาพ:</span> {previewing.item_condition || "—"}</div>
                <div><span className="text-muted-foreground">มูลค่ารวม:</span> <span className="font-mono">{fmtMoney(previewing.total_value)}</span></div>
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

              {(previewing.l1_name || previewing.l2_name || previewing.finance_name) && (
                <div className="rounded-md border border-border p-3 space-y-1 text-xs">
                  <div className="font-medium text-muted-foreground">ลำดับการอนุมัติ</div>
                  {previewing.l1_name && <div>1️⃣ ชั้น 1: <span className="font-medium">{previewing.l1_name}</span>{previewing.l1_approved_at && ` · ${format(new Date(previewing.l1_approved_at), "dd MMM yyyy HH:mm", { locale: th })}`}</div>}
                  {previewing.l2_name && <div>2️⃣ ชั้น 2: <span className="font-medium">{previewing.l2_name}</span>{previewing.l2_approved_at && ` · ${format(new Date(previewing.l2_approved_at), "dd MMM yyyy HH:mm", { locale: th })}`}</div>}
                  {previewing.finance_name && <div>💰 บัญชีรับทราบ: <span className="font-medium">{previewing.finance_name}</span>{previewing.finance_ack_at && ` · ${format(new Date(previewing.finance_ack_at), "dd MMM yyyy HH:mm", { locale: th })}`}</div>}
                </div>
              )}

              {previewing.l1_notes && (
                <div className="text-xs"><span className="text-muted-foreground">หมายเหตุชั้น 1:</span> <span className="whitespace-pre-line">{previewing.l1_notes}</span></div>
              )}
              {previewing.l2_notes && (
                <div className="text-xs"><span className="text-muted-foreground">หมายเหตุชั้น 2:</span> <span className="whitespace-pre-line">{previewing.l2_notes}</span></div>
              )}
              {previewing.disposal_rejected_reason && (
                <div className="text-xs text-destructive"><span className="font-medium">เหตุผลการปฏิเสธ:</span> {previewing.disposal_rejected_reason}</div>
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

              <DisposalAuditTimeline defectiveReturnId={previewing.id} />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewing(null)}>ปิด</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={(o) => !o && setLightboxUrl(null)}>
        <DialogContent className="max-w-4xl p-2">
          {lightboxUrl && <img src={lightboxUrl} alt="evidence full" className="w-full h-auto rounded" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
