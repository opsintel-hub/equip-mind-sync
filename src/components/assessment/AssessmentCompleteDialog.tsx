import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { SymptomSelect } from "@/components/media-player/SymptomSelect";
import { AssessmentResultSelect } from "@/components/media-player/AssessmentResultSelect";

interface AssessmentLogLite {
  id: string;
  document_no: string;
  media_player_id: string | null;
  equipment_id: string | null;
  serial_number: string | null;
  symptom_id: string | null;
  symptom_description: string | null;
  assessment_result_id: string | null;
  diagnosis_notes: string | null;
  recommended_action: string | null;
  assessor_name: string | null;
  notes: string | null;
  source_type?: string | null;
  source_reference_id?: string | null;
}

interface SourceContext {
  sourceLabel: string;       // เช่น "Swap SWP-20260504-0003" / "ของเสีย DR-..."
  itemCode: string | null;   // รหัสเครื่อง
  itemName: string | null;   // ชื่อเครื่อง
  billboardLabel: string | null;
  billboardId: string | null;
  reportedSymptom: string | null;
  reporter: string | null;
  reportedAt: string | null;
  photos: string[];
  description: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: AssessmentLogLite | null;
  onCompleted: () => void;
}

const OUTCOME_OPTIONS = [
  { v: "defective", label: "1. เข้าของเสีย", desc: "ซ่อมไม่ได้/หมดประกัน" },
  { v: "claim", label: "2. ส่งเคลม", desc: "ส่งซ่อมกับ Supplier" },
  { v: "self_repair", label: "3. ซ่อมเอง", desc: "บันทึกรายการซ่อม" },
  { v: "return_refurb", label: "4. คืน Spare", desc: "Refurbished คืนคลัง" },
] as const;

export function AssessmentCompleteDialog({ open, onOpenChange, log, onCompleted }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const [symptomId, setSymptomId] = useState("");
  const [symptomDescription, setSymptomDescription] = useState("");
  const [assessmentResultId, setAssessmentResultId] = useState("");
  const [diagnosisNotes, setDiagnosisNotes] = useState("");
  const [recommendedAction, setRecommendedAction] = useState("");
  const [assessorName, setAssessorName] = useState("");
  const [notes, setNotes] = useState("");
  const [outcome, setOutcome] = useState<"" | "defective" | "claim" | "self_repair" | "return_refurb">("");
  const [repairDescription, setRepairDescription] = useState("");
  const [externalRepairVendor, setExternalRepairVendor] = useState("");
  const [externalRepairContact, setExternalRepairContact] = useState("");
  const [externalRepairPhone, setExternalRepairPhone] = useState("");
  const [supplierAutofill, setSupplierAutofill] = useState<{ name: string; manufacturer: string | null; warranty: string | null } | null>(null);
  const [sourceCtx, setSourceCtx] = useState<SourceContext | null>(null);

  useEffect(() => {
    if (!open || !log) return;
    setSymptomId(log.symptom_id || "");
    setSymptomDescription(log.symptom_description || "");
    setAssessmentResultId(log.assessment_result_id || "");
    setDiagnosisNotes(log.diagnosis_notes || "");
    setRecommendedAction(log.recommended_action || "");
    setAssessorName(log.assessor_name || "");
    setNotes(log.notes || "");
    setOutcome("");
    setRepairDescription("");
    setExternalRepairVendor("");
    setExternalRepairContact("");
    setExternalRepairPhone("");
    setSupplierAutofill(null);
    setSourceCtx(null);

    // Load source context (Swap / Defective Return / Manual)
    (async () => {
      try {
        let ctx: SourceContext = {
          sourceLabel: "ป้อนเอง",
          itemCode: null,
          itemName: null,
          billboardLabel: null,
          billboardId: null,
          reportedSymptom: log.symptom_description || null,
          reporter: null,
          reportedAt: null,
          photos: [],
          description: null,
        };

        // Item code/name from media_player or equipment
        if (log.media_player_id) {
          const { data: mp } = await supabase
            .from("media_players")
            .select("code, name, billboard_id, billboard:billboards(equipment_id, old_code, location_name)")
            .eq("id", log.media_player_id)
            .maybeSingle() as any;
          if (mp) {
            ctx.itemCode = mp.code;
            ctx.itemName = mp.name;
            if (mp.billboard) {
              const parts = [mp.billboard.old_code, mp.billboard.equipment_id, mp.billboard.location_name].filter(Boolean);
              ctx.billboardLabel = parts.join(" - ");
              ctx.billboardId = mp.billboard_id;
            }
          }
        } else if (log.equipment_id) {
          const { data: eq } = await supabase
            .from("equipment")
            .select("code, name")
            .eq("id", log.equipment_id)
            .maybeSingle() as any;
          if (eq) { ctx.itemCode = eq.code; ctx.itemName = eq.name; }
        }

        // Source-specific context
        if (log.source_type === "swap" && log.source_reference_id) {
          const { data: sw } = await supabase
            .from("swap_requests")
            .select("document_no, billboard_id, description, symptom_other, technician_name, photo_urls, created_at, billboard:billboards(equipment_id, old_code, location_name)")
            .eq("id", log.source_reference_id)
            .maybeSingle() as any;
          if (sw) {
            ctx.sourceLabel = `Swap ${sw.document_no}`;
            ctx.description = sw.description || sw.symptom_other || null;
            ctx.reporter = sw.technician_name || null;
            ctx.reportedAt = sw.created_at || null;
            ctx.photos = Array.isArray(sw.photo_urls) ? sw.photo_urls : [];
            if (sw.billboard && !ctx.billboardLabel) {
              const parts = [sw.billboard.old_code, sw.billboard.equipment_id, sw.billboard.location_name].filter(Boolean);
              ctx.billboardLabel = parts.join(" - ");
              ctx.billboardId = sw.billboard_id;
            }
          }
        } else if (log.source_type === "defective" && log.source_reference_id) {
          const { data: dr } = await supabase
            .from("defective_returns")
            .select("document_no, reason, billboard_id, created_at, billboard:billboards(equipment_id, old_code, location_name)")
            .eq("id", log.source_reference_id)
            .maybeSingle() as any;
          if (dr) {
            ctx.sourceLabel = `ของเสีย ${dr.document_no}`;
            ctx.description = dr.reason || null;
            ctx.reportedAt = dr.created_at || null;
            if (dr.billboard && !ctx.billboardLabel) {
              const parts = [dr.billboard.old_code, dr.billboard.equipment_id, dr.billboard.location_name].filter(Boolean);
              ctx.billboardLabel = parts.join(" - ");
              ctx.billboardId = dr.billboard_id;
            }
          }
        }

        setSourceCtx(ctx);
      } catch {
        /* ignore */
      }
    })();

    // autofill supplier
    (async () => {
      try {
        if (log.media_player_id) {
          const { data } = await supabase
            .from("media_players")
            .select("manufacturer, warranty_expiry_date, supplier:supplier_id(name)")
            .eq("id", log.media_player_id)
            .maybeSingle() as any;
          if (data) {
            setSupplierAutofill({
              name: data.supplier?.name || "",
              manufacturer: data.manufacturer || null,
              warranty: data.warranty_expiry_date || null,
            });
          }
        } else if (log.serial_number) {
          const { data } = await supabase
            .from("equipment_serial_numbers")
            .select("warranty_expiry_date, equipment:equipment_id(supplier:supplier_id(name), brand:brand_id(name))")
            .eq("serial_number", log.serial_number)
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
        /* ignore */
      }
    })();
  }, [open, log]);

  if (!log) return null;

  const canSubmit =
    !!assessmentResultId &&
    !!outcome &&
    (outcome !== "self_repair" || !!repairDescription.trim()) &&
    (outcome !== "claim" || !!supplierAutofill?.name || !!externalRepairVendor.trim());

  const handleSubmit = async () => {
    setSubmitting(true);
    const { error } = await supabase
      .from("assessment_logs")
      .update({
        symptom_id: symptomId || null,
        symptom_description: symptomDescription.trim() || null,
        assessment_result_id: assessmentResultId,
        diagnosis_notes: diagnosisNotes.trim() || null,
        recommended_action: recommendedAction.trim() || null,
        assessor_name: assessorName.trim() || null,
        assessed_by: user?.id ?? null,
        outcome,
        repair_description: outcome === "self_repair" ? repairDescription.trim() : null,
        external_repair_vendor: outcome === "claim" ? (externalRepairVendor.trim() || supplierAutofill?.name || null) : null,
        external_repair_contact: outcome === "claim" ? externalRepairContact.trim() || null : null,
        external_repair_phone: outcome === "claim" ? externalRepairPhone.trim() || null : null,
        notes: notes.trim() || null,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", log.id);

    if (error) {
      setSubmitting(false);
      toast.error("บันทึกไม่สำเร็จ: " + error.message);
      return;
    }

    // Outcome side-effects
    let createdDefectiveDocNo: string | null = null;
    try {
      if (outcome === "defective") {
        // Auto-create defective_returns row (pending warehouse entry — stock not yet cut)
        const { data: drRow } = await supabase
          .from("defective_returns")
          .insert({
            equipment_id: log.equipment_id,
            media_player_id: log.media_player_id,
            is_media_player: !!log.media_player_id,
            quantity: 1,
            item_condition: "defective",
            reason: `จากการประเมิน ${log.document_no}: ${diagnosisNotes.trim() || symptomDescription.trim() || "ซ่อมไม่ได้"}`,
            status: "pending_warehouse_entry",
            source_type: "from_assessment",
            assessment_log_id: log.id,
            dispose_status: "pending_disposal_review",
            notes: log.serial_number ? `S/N: ${log.serial_number}` : null,
            created_by: user?.id ?? null,
          } as any)
          .select("document_no")
          .maybeSingle();
        createdDefectiveDocNo = drRow?.document_no || null;
      } else if (outcome === "claim") {
        await supabase.from("claim_records").insert({
          document_no: "",
          subject_type: log.media_player_id ? "media_player" : "equipment",
          media_player_id: log.media_player_id,
          equipment_id: log.equipment_id,
          serial_number: log.serial_number,
          source_type: "assessment",
          source_reference_id: log.id,
          supplier_name: supplierAutofill?.name || externalRepairVendor.trim() || null,
          manufacturer: supplierAutofill?.manufacturer || null,
          warranty_expiry_date: supplierAutofill?.warranty || null,
          symptom_id: symptomId || null,
          symptom_description: symptomDescription.trim() || null,
          status: "submitted",
          notes: `จาก Assessment ${log.document_no}`,
          created_by: user?.id ?? null,
        });
      } else if ((outcome === "self_repair" || outcome === "return_refurb") && log.serial_number) {
        await supabase
          .from("equipment_serial_numbers")
          .update({
            is_refurbished: true,
            refurbished_at: new Date().toISOString(),
            refurbished_notes:
              outcome === "self_repair"
                ? `ซ่อมเอง: ${repairDescription.trim()}`
                : `คืน Spare หลังเคลม/ตรวจสอบ`,
          } as any)
          .eq("serial_number", log.serial_number);
      }
    } catch (e: any) {
      toast.warning("บันทึกแล้ว แต่ side-effect บางส่วนล้มเหลว: " + (e?.message || ""));
    }

    setSubmitting(false);
    if (outcome === "defective") {
      toast.success(
        `สร้างใบของเสีย ${createdDefectiveDocNo || ""} แล้ว — กำลังพาไปยืนยันที่เมนู "นำของเสียเข้าระบบ"`,
        { duration: 4000 }
      );
      onCompleted();
      // Navigate to defective entry with prefill so warehouse staff can confirm + cut stock
      setTimeout(() => {
        navigate("/defective-return-entry", {
          state: {
            fromAssessment: {
              assessmentLogId: log.id,
              isMediaPlayer: !!log.media_player_id,
              itemId: log.media_player_id || log.equipment_id,
              serial: log.serial_number,
              reason: diagnosisNotes.trim() || symptomDescription.trim(),
              docNo: createdDefectiveDocNo,
            },
          },
        });
      }, 400);
    } else {
      toast.success(
        outcome === "claim"
          ? "บันทึกและสร้างคำขอเคลมแล้ว — ติดตามที่เมนู 'ติดตามการเคลม'"
          : "บันทึกการประเมินเสร็จสิ้น"
      );
      onCompleted();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            ประเมินรายการ — {log.document_no}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 flex-wrap">
            {log.serial_number && <Badge variant="outline" className="font-mono">S/N: {log.serial_number}</Badge>}
            {log.symptom_description && <span className="text-xs">อาการ: {log.symptom_description}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>อาการเสีย</Label>
              <SymptomSelect value={symptomId} onChange={setSymptomId} />
            </div>
            <div className="space-y-2">
              <Label>ผลการประเมิน <span className="text-destructive">*</span></Label>
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
            <Textarea value={diagnosisNotes} onChange={(e) => setDiagnosisNotes(e.target.value)} rows={2} />
          </div>

          {/* Outcome 4 paths */}
          <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Label className="text-base font-semibold">ผลการตัดสินใจ <span className="text-destructive">*</span> (เลือก 1 ใน 4)</Label>
              {supplierAutofill && (
                <span className="text-xs text-muted-foreground">
                  ผู้จัดจำหน่ายล่าสุด: <span className="font-medium text-foreground">{supplierAutofill.name || "—"}</span>
                  {supplierAutofill.warranty && ` • ประกันถึง ${supplierAutofill.warranty}`}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {OUTCOME_OPTIONS.map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setOutcome(opt.v)}
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
                <Label>รายละเอียดการซ่อม <span className="text-destructive">*</span></Label>
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
                    <Input value={externalRepairVendor} onChange={(e) => setExternalRepairVendor(e.target.value)} placeholder="ชื่อร้าน/ผู้รับเคลม *" />
                    <Input value={externalRepairContact} onChange={(e) => setExternalRepairContact(e.target.value)} placeholder="ชื่อผู้ติดต่อ" />
                    <Input value={externalRepairPhone} onChange={(e) => setExternalRepairPhone(e.target.value)} placeholder="เบอร์ติดต่อ" />
                  </div>
                )}
              </div>
            )}

            {outcome === "defective" && (
              <p className="text-xs text-destructive pt-2 border-t">
                ⚠ หลังบันทึก ระบบจะแจ้งให้ไปคีย์ที่เมนู <strong>"นำของเสียเข้าระบบ"</strong> เพื่อตัด Stock เข้าคลังของเสีย
              </p>
            )}

            {outcome === "return_refurb" && (
              <p className="text-xs text-success pt-2 border-t">
                ✓ S/N นี้จะถูกตั้งสถานะ <strong>refurbished</strong> และคืนเข้า Spare ปกติ
              </p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>ชื่อผู้ประเมิน</Label>
              <Input value={assessorName} onChange={(e) => setAssessorName(e.target.value)} placeholder="ชื่อ-สกุล" />
            </div>
            <div className="space-y-2">
              <Label>หมายเหตุอื่น ๆ</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>การดำเนินการที่แนะนำ</Label>
            <Textarea value={recommendedAction} onChange={(e) => setRecommendedAction(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>ยกเลิก</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? "กำลังบันทึก..." : "บันทึกผล + ปิดรายการ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
