import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ClipboardCheck, ListChecks, PlusCircle, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SymptomSelect } from "@/components/media-player/SymptomSelect";
import { AssessmentResultSelect } from "@/components/media-player/AssessmentResultSelect";

interface AssessmentLog {
  id: string;
  document_no: string;
  media_player_id: string | null;
  equipment_id: string | null;
  serial_number: string | null;
  source_type: string;
  symptom_id: string | null;
  symptom_description: string | null;
  assessment_result_id: string | null;
  diagnosis_notes: string | null;
  recommended_action: string | null;
  assessor_name: string | null;
  assessed_at: string;
  status: string;
  outcome: string | null;
  repair_description: string | null;
  external_repair_vendor: string | null;
  external_repair_contact: string | null;
  external_repair_phone: string | null;
  notes: string | null;
  created_at: string;
}

interface SubjectOption {
  id: string;
  type: "media_player" | "equipment";
  code: string;
  name: string;
  serial: string | null;
}

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "รอประเมิน", variant: "secondary" },
  completed: { label: "ประเมินแล้ว", variant: "default" },
  cancelled: { label: "ยกเลิก", variant: "outline" },
};

const OUTCOME_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  defective: { label: "เข้าของเสีย (ซ่อมไม่ได้)", variant: "destructive" },
  claim: { label: "ส่งเคลม", variant: "secondary" },
  self_repair: { label: "ซ่อมเอง", variant: "default" },
  return_refurb: { label: "คืน Spare (refurbished)", variant: "outline" },
};

export default function AssessmentLog() {
  const { user } = useAuth();
  const location = useLocation();
  const [logs, setLogs] = useState<AssessmentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");

  // Subject options (combined media_players + equipment serials)
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);

  // Form state
  const [subjectKey, setSubjectKey] = useState(""); // "mp:<id>" or "eq:<id>"
  const [symptomId, setSymptomId] = useState("");
  const [symptomDescription, setSymptomDescription] = useState("");
  const [assessmentResultId, setAssessmentResultId] = useState("");
  const [diagnosisNotes, setDiagnosisNotes] = useState("");
  const [recommendedAction, setRecommendedAction] = useState("");
  const [assessorName, setAssessorName] = useState("");
  const [notes, setNotes] = useState("");
  const [statusForm, setStatusForm] = useState<"pending" | "completed">("completed");
  const [submitting, setSubmitting] = useState(false);

  // Outcome fields
  const [outcome, setOutcome] = useState<"" | "defective" | "claim" | "self_repair" | "return_refurb">("");
  const [repairDescription, setRepairDescription] = useState("");
  const [externalRepairVendor, setExternalRepairVendor] = useState("");
  const [externalRepairContact, setExternalRepairContact] = useState("");
  const [externalRepairPhone, setExternalRepairPhone] = useState("");
  const [supplierAutofill, setSupplierAutofill] = useState<{ name: string; manufacturer: string | null; warranty: string | null } | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("assessment_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast.error("โหลดข้อมูลไม่สำเร็จ");
    } else {
      setLogs((data as AssessmentLog[]) || []);
    }
    setLoading(false);
  };

  const fetchSubjects = async () => {
    setSubjectsLoading(true);
    const [mpRes, eqRes] = await Promise.all([
      supabase
        .from("media_players")
        .select("id, code, name, serial_number")
        .order("code")
        .limit(500),
      supabase
        .from("equipment_serial_numbers")
        .select("id, serial_number, equipment:equipment_id(code, name)")
        .order("serial_number")
        .limit(500),
    ]);

    const items: SubjectOption[] = [];
    (mpRes.data || []).forEach((mp: any) => {
      items.push({
        id: mp.id,
        type: "media_player",
        code: mp.code,
        name: mp.name || "Media Player",
        serial: mp.serial_number,
      });
    });
    (eqRes.data || []).forEach((sn: any) => {
      items.push({
        id: sn.id,
        type: "equipment",
        code: sn.equipment?.code || "—",
        name: sn.equipment?.name || "Equipment",
        serial: sn.serial_number,
      });
    });
    setSubjects(items);
    setSubjectsLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    fetchSubjects();
  }, []);

  // Apply prefill from navigation state (e.g., from Defective Returns)
  useEffect(() => {
    const prefill = (location.state as any)?.prefill;
    if (!prefill || subjects.length === 0) return;
    const { isMediaPlayer, itemId, serial, symptomDescription: sym } = prefill;
    // Find matching subject
    const subj = subjects.find((s) =>
      isMediaPlayer
        ? s.type === "media_player" && s.id === itemId
        : s.type === "equipment" && (s.serial === serial || (!serial && s.code === itemId))
    );
    if (subj) {
      const key = `${subj.type === "media_player" ? "mp" : "eq"}:${subj.id}${subj.type === "equipment" && subj.serial ? `:${subj.serial}` : ""}`;
      setSubjectKey(key);
    }
    if (sym) setSymptomDescription(sym);
    setActiveTab("new");
    toast.info("เติมข้อมูลจากรายการของเสียให้แล้ว — โปรดตรวจสอบและบันทึก");
    // Clear state
    window.history.replaceState({}, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects]);

  const subjectOptions = useMemo(
    () =>
      subjects.map((s) => ({
        value: `${s.type === "media_player" ? "mp" : "eq"}:${s.id}${s.type === "equipment" && s.serial ? `:${s.serial}` : ""}`,
        label: `${s.code} — ${s.name}${s.serial ? ` (S/N: ${s.serial})` : ""}`,
        description: s.type === "media_player" ? "Media Player" : "Equipment",
        searchableText: `${s.code} ${s.name} ${s.serial || ""}`,
      })),
    [subjects]
  );

  const stats = useMemo(() => {
    const total = logs.length;
    const pending = logs.filter((l) => l.status === "pending").length;
    const completed = logs.filter((l) => l.status === "completed").length;
    return { total, pending, completed };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    if (!searchTerm.trim()) return logs;
    const q = searchTerm.toLowerCase();
    return logs.filter(
      (l) =>
        l.document_no.toLowerCase().includes(q) ||
        (l.serial_number || "").toLowerCase().includes(q) ||
        (l.assessor_name || "").toLowerCase().includes(q) ||
        (l.diagnosis_notes || "").toLowerCase().includes(q)
    );
  }, [logs, searchTerm]);

  const resetForm = () => {
    setSubjectKey("");
    setSymptomId("");
    setSymptomDescription("");
    setAssessmentResultId("");
    setDiagnosisNotes("");
    setRecommendedAction("");
    setAssessorName("");
    setNotes("");
    setStatusForm("completed");
    setOutcome("");
    setRepairDescription("");
    setExternalRepairVendor("");
    setExternalRepairContact("");
    setExternalRepairPhone("");
    setSupplierAutofill(null);
  };

  // Auto-fill supplier info when subject changes (for claim outcome convenience)
  useEffect(() => {
    setSupplierAutofill(null);
    if (!subjectKey) return;
    const [prefix, id, serial] = subjectKey.split(":");
    const isMP = prefix === "mp";
    (async () => {
      // Try latest delivery_entry_items / receive history for this S/N or item
      try {
        if (isMP) {
          const { data } = await supabase
            .from("media_players")
            .select("supplier_name:supplier_id, manufacturer, warranty_expiry_date, supplier:supplier_id(name)")
            .eq("id", id)
            .maybeSingle() as any;
          if (data) {
            setSupplierAutofill({
              name: data.supplier?.name || "",
              manufacturer: data.manufacturer || null,
              warranty: data.warranty_expiry_date || null,
            });
          }
        } else if (serial) {
          const { data } = await supabase
            .from("equipment_serial_numbers")
            .select("warranty_expiry_date, equipment:equipment_id(supplier:supplier_id(name), brand:brand_id(name))")
            .eq("serial_number", serial)
            .maybeSingle() as any;
          if (data) {
            setSupplierAutofill({
              name: data.equipment?.supplier?.name || "",
              manufacturer: data.equipment?.brand?.name || null,
              warranty: data.warranty_expiry_date || null,
            });
          }
        }
      } catch {
        // best-effort autofill — ignore failures
      }
    })();
  }, [subjectKey]);

  const handleSubmit = async () => {
    if (!subjectKey) {
      toast.error("กรุณาเลือกอุปกรณ์/Media Player ที่ประเมิน");
      return;
    }
    if (!symptomId && !symptomDescription.trim()) {
      toast.error("กรุณาระบุอาการเสีย");
      return;
    }
    if (statusForm === "completed" && !assessmentResultId) {
      toast.error("กรุณาเลือกผลการประเมินก่อนบันทึกแบบ 'ประเมินแล้ว'");
      return;
    }
    if (statusForm === "completed" && !outcome) {
      toast.error("กรุณาเลือก 'ผลการตัดสินใจ' (1-4) ก่อนบันทึก");
      return;
    }
    if (outcome === "self_repair" && !repairDescription.trim()) {
      toast.error("กรุณาระบุรายละเอียดการซ่อม (กรณีซ่อมเอง)");
      return;
    }

    const [prefix, id, serial] = subjectKey.split(":");
    const isMP = prefix === "mp";
    const subject = subjects.find((s) => s.id === id);
    const finalSerial = serial || subject?.serial || null;

    setSubmitting(true);
    // 1) Insert assessment log
    const { data: inserted, error } = await supabase
      .from("assessment_logs")
      .insert({
        document_no: "",
        media_player_id: isMP ? id : null,
        equipment_id: !isMP ? subject?.id || null : null,
        serial_number: finalSerial,
        source_type: "manual",
        symptom_id: symptomId || null,
        symptom_description: symptomDescription.trim() || null,
        assessment_result_id: assessmentResultId || null,
        diagnosis_notes: diagnosisNotes.trim() || null,
        recommended_action: recommendedAction.trim() || null,
        assessor_name: assessorName.trim() || null,
        assessed_by: user?.id ?? null,
        status: statusForm,
        completed_at: statusForm === "completed" ? new Date().toISOString() : null,
        outcome: outcome || null,
        repair_description: outcome === "self_repair" ? repairDescription.trim() : null,
        external_repair_vendor: outcome === "claim" ? externalRepairVendor.trim() || null : null,
        external_repair_contact: outcome === "claim" ? externalRepairContact.trim() || null : null,
        external_repair_phone: outcome === "claim" ? externalRepairPhone.trim() || null : null,
        notes: notes.trim() || null,
        created_by: user?.id ?? null,
      })
      .select("id, document_no")
      .maybeSingle();

    if (error) {
      setSubmitting(false);
      toast.error("บันทึกไม่สำเร็จ: " + error.message);
      return;
    }

    // 2) Outcome side-effects
    try {
      if (outcome === "defective") {
        toast.info("กรุณาไปบันทึกที่เมนู 'นำของเสียเข้าระบบ' ต่อ", { duration: 5000 });
      } else if (outcome === "claim") {
        // Create claim_records draft
        await supabase.from("claim_records").insert({
          document_no: "",
          subject_type: isMP ? "media_player" : "equipment",
          media_player_id: isMP ? id : null,
          equipment_id: !isMP ? subject?.id || null : null,
          serial_number: finalSerial,
          source_type: "assessment",
          source_reference_id: inserted?.id || null,
          supplier_name: supplierAutofill?.name || externalRepairVendor.trim() || null,
          manufacturer: supplierAutofill?.manufacturer || null,
          warranty_expiry_date: supplierAutofill?.warranty || null,
          symptom_id: symptomId || null,
          symptom_description: symptomDescription.trim() || null,
          status: "submitted",
          notes: `จาก Assessment ${inserted?.document_no || ""}`,
          created_by: user?.id ?? null,
        });
        toast.success("สร้างคำขอเคลมและส่งให้ติดตามที่ 'ติดตามการเคลม' แล้ว");
      } else if (outcome === "self_repair" || outcome === "return_refurb") {
        // Mark S/N as refurbished, return to spare stock (location stays as-is for now)
        if (finalSerial) {
          await supabase
            .from("equipment_serial_numbers")
            .update({
              is_refurbished: true,
              refurbished_at: new Date().toISOString(),
              refurbished_notes:
                outcome === "self_repair"
                  ? `ซ่อมเอง: ${repairDescription.trim()}`
                  : `คืน Spare หลังเคลม/ตรวจสอบ`,
            })
            .eq("serial_number", finalSerial);
        }
        toast.success(
          outcome === "self_repair"
            ? "บันทึกการซ่อมและคืน Spare (refurbished) แล้ว"
            : "คืนเข้า Spare (refurbished) แล้ว"
        );
      }
    } catch (e: any) {
      toast.warning("บันทึกผลแล้ว แต่ side-effect บางส่วนล้มเหลว: " + (e?.message || ""));
    }

    setSubmitting(false);
    toast.success("บันทึกการประเมินแล้ว");
    resetForm();
    setActiveTab("list");
    fetchLogs();
  };

  const markCompleted = async (log: AssessmentLog) => {
    if (!log.assessment_result_id) {
      toast.error("กรุณาแก้ไขรายการก่อนเพื่อระบุผลการประเมิน");
      return;
    }
    const { error } = await supabase
      .from("assessment_logs")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", log.id);
    if (error) {
      toast.error("อัปเดตไม่สำเร็จ");
      return;
    }
    toast.success("ปิดรายการประเมินแล้ว");
    fetchLogs();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-8 w-8 text-primary" />
            บันทึกการประเมินทรัพย์สิน
          </h1>
          <p className="text-muted-foreground mt-1">
            บันทึกผลการประเมินอุปกรณ์/Media Player/ทรัพย์สินที่ถูกถอนกลับมา (ซ่อมเอง / ส่งเคลม / Write-off ฯลฯ)
          </p>
        </div>
        <Button variant="outline" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          โหลดใหม่
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>รายการทั้งหมด</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>รอประเมิน</CardDescription>
            <CardTitle className="text-3xl text-warning">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>ประเมินแล้ว</CardDescription>
            <CardTitle className="text-3xl text-success">{stats.completed}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">
            <ListChecks className="h-4 w-4 mr-2" /> รายการประเมิน
          </TabsTrigger>
          <TabsTrigger value="new">
            <PlusCircle className="h-4 w-4 mr-2" /> บันทึกการประเมินใหม่
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>รายการประเมินล่าสุด</CardTitle>
                  <CardDescription>คลิก "ปิดรายการ" เพื่อยืนยันการประเมินที่ค้างอยู่</CardDescription>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาเลขที่ / S/N / ผู้ประเมิน..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-[280px]"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  ยังไม่มีรายการประเมิน — กดแท็บ "บันทึกการประเมินใหม่" เพื่อเริ่ม
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLogs.map((log) => {
                    const status = STATUS_LABELS[log.status] || { label: log.status, variant: "outline" as const };
                    return (
                      <div
                        key={log.id}
                        className="flex items-center justify-between gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors flex-wrap"
                      >
                        <div className="flex-1 min-w-[200px] space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-semibold">{log.document_no}</span>
                            <Badge variant={status.variant}>{status.label}</Badge>
                            {log.serial_number && (
                              <Badge variant="outline">S/N: {log.serial_number}</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {log.diagnosis_notes || log.symptom_description || "—"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ผู้ประเมิน: {log.assessor_name || "—"} •{" "}
                            {format(new Date(log.assessed_at), "dd MMM yyyy HH:mm", { locale: th })}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {log.status === "pending" && (
                            <Button size="sm" variant="outline" onClick={() => markCompleted(log)}>
                              ปิดรายการ
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>บันทึกการประเมินใหม่</CardTitle>
              <CardDescription>
                ระบุอุปกรณ์ + อาการ + ผลการประเมิน (ค่า dropdown มาจาก Master Data หมวด Media Player)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>อุปกรณ์/Media Player ที่ประเมิน *</Label>
                <SearchableSelect
                  options={subjectOptions}
                  value={subjectKey}
                  onValueChange={setSubjectKey}
                  placeholder="ค้นหาด้วยรหัส, ชื่อ หรือ S/N"
                  searchPlaceholder="ค้นหา..."
                  isLoading={subjectsLoading}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>อาการเสีย *</Label>
                  <SymptomSelect value={symptomId} onChange={setSymptomId} />
                </div>
                <div className="space-y-2">
                  <Label>ผลการประเมิน {statusForm === "completed" ? "*" : ""}</Label>
                  <AssessmentResultSelect value={assessmentResultId} onChange={setAssessmentResultId} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>คำอธิบายอาการเพิ่มเติม</Label>
                <Input
                  value={symptomDescription}
                  onChange={(e) => setSymptomDescription(e.target.value)}
                  placeholder="ระบุอาการที่ไม่มีในรายการ"
                />
              </div>

              <div className="space-y-2">
                <Label>หมายเหตุการวินิจฉัย</Label>
                <Textarea
                  value={diagnosisNotes}
                  onChange={(e) => setDiagnosisNotes(e.target.value)}
                  placeholder="สิ่งที่ตรวจพบ, สาเหตุ, ฯลฯ"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>การดำเนินการที่แนะนำ</Label>
                <Textarea
                  value={recommendedAction}
                  onChange={(e) => setRecommendedAction(e.target.value)}
                  placeholder="เช่น ส่งซ่อม, สั่งอะไหล่, Write-off, ส่งเคลม"
                  rows={2}
                />
              </div>

              {/* Outcome decision (4 paths) */}
              <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Label className="text-base font-semibold">ผลการตัดสินใจ * (เลือก 1 ใน 4)</Label>
                  {supplierAutofill && (
                    <span className="text-xs text-muted-foreground">
                      ผู้จัดจำหน่ายล่าสุด: <span className="font-medium text-foreground">{supplierAutofill.name || "—"}</span>
                      {supplierAutofill.warranty && ` • ประกันถึง ${supplierAutofill.warranty}`}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { v: "defective", label: "1. เข้าของเสีย", desc: "ซ่อมไม่ได้/หมดประกัน" },
                    { v: "claim", label: "2. ส่งเคลม", desc: "ส่งซ่อมกับ Supplier" },
                    { v: "self_repair", label: "3. ซ่อมเอง", desc: "บันทึกรายการซ่อม" },
                    { v: "return_refurb", label: "4. คืน Spare", desc: "Refurbished คืนคลัง" },
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setOutcome(opt.v as any)}
                      className={`text-left rounded-md border p-3 transition-colors ${
                        outcome === opt.v
                          ? "border-primary bg-primary/10 ring-2 ring-primary/40"
                          : "border-input bg-background hover:bg-accent/50"
                      }`}
                    >
                      <div className="font-medium text-sm">{opt.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>

                {outcome === "self_repair" && (
                  <div className="space-y-2 pt-2 border-t">
                    <Label>รายละเอียดการซ่อม *</Label>
                    <Textarea
                      value={repairDescription}
                      onChange={(e) => setRepairDescription(e.target.value)}
                      placeholder="ระบุว่าซ่อมอะไรไป เปลี่ยนอะไหล่อะไร..."
                      rows={2}
                    />
                  </div>
                )}

                {outcome === "claim" && (
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      {supplierAutofill?.name
                        ? `จะส่งเคลมที่ ${supplierAutofill.name} (จากประวัติการซื้อ S/N นี้)`
                        : "ไม่พบประวัติการซื้อ — กรุณาระบุผู้รับเคลม"}
                    </p>
                    {!supplierAutofill?.name && (
                      <div className="grid md:grid-cols-3 gap-2">
                        <Input
                          value={externalRepairVendor}
                          onChange={(e) => setExternalRepairVendor(e.target.value)}
                          placeholder="ชื่อร้าน/ผู้รับเคลม *"
                        />
                        <Input
                          value={externalRepairContact}
                          onChange={(e) => setExternalRepairContact(e.target.value)}
                          placeholder="ชื่อผู้ติดต่อ"
                        />
                        <Input
                          value={externalRepairPhone}
                          onChange={(e) => setExternalRepairPhone(e.target.value)}
                          placeholder="เบอร์ติดต่อ"
                        />
                      </div>
                    )}
                  </div>
                )}

                {outcome === "defective" && (
                  <p className="text-xs text-destructive pt-2 border-t">
                    ⚠ หลังบันทึก ระบบจะแจ้งให้ไปคีย์รายการที่เมนู <strong>"นำของเสียเข้าระบบ"</strong> เพื่อตัด Stock เข้าคลังของเสีย
                  </p>
                )}

                {outcome === "return_refurb" && (
                  <p className="text-xs text-success pt-2 border-t">
                    ✓ S/N นี้จะถูกตั้งสถานะ <strong>refurbished</strong> และคืนเข้า Spare ปกติเพื่อรอเบิกใช้งาน
                  </p>
                )}
              </div>

                  <Input value={assessorName} onChange={(e) => setAssessorName(e.target.value)} placeholder="ชื่อ-สกุล" />
                </div>
                <div className="space-y-2">
                  <Label>สถานะ</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={statusForm}
                    onChange={(e) => setStatusForm(e.target.value as "pending" | "completed")}
                  >
                    <option value="completed">ประเมินแล้ว</option>
                    <option value="pending">รอประเมิน (บันทึกร่าง)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>หมายเหตุอื่น ๆ</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="—" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={resetForm}>ล้างฟอร์ม</Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "กำลังบันทึก..." : "บันทึกการประเมิน"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
