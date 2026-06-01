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
import { ClipboardCheck, ShieldCheck, ShieldAlert, Shield, History, Phone, Copy, ExternalLink, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { SymptomSelect } from "@/components/media-player/SymptomSelect";
import { AssessmentResultSelect } from "@/components/media-player/AssessmentResultSelect";
import { differenceInDays, parseISO, differenceInMonths } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  sourceLabel: string;
  itemCode: string | null;
  itemName: string | null;
  brand: string | null;
  modelSpec: string | null;
  modelName: string | null;
  remoteName: string | null;
  billboardLabel: string | null;
  billboardId: string | null;
  reportedSymptom: string | null;
  reporter: string | null;
  reportedAt: string | null;
  photos: string[];
  description: string | null;
  // Device facts
  unitPrice: number | null;
  depreciationMonths: number | null;
  dateOfReceipt: string | null;
  ageMonths: number | null;
  mediaPlayerProfileId: string | null;
}


interface DeviceHistory {
  installCount: number;
  installs: { billboardLabel: string; from: string | null; to: string | null; reason: string | null }[];
  pastAssessments: { docNo: string; outcome: string | null; completedAt: string | null }[];
  pastClaims: { docNo: string; status: string; createdAt: string }[];
  recentRepairCount6m: number; // for repeat-failure flag
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: AssessmentLogLite | null;
  onCompleted: () => void;
}

const OUTCOME_OPTIONS = [
  { v: "defective", label: "1. เข้าของเสีย", desc: "ซ่อมไม่ได้/หมดประกัน" },
  { v: "claim", label: "2. ส่งเคลม", desc: "ส่งซ่อมกับ Supplier (ในประกัน)" },
  { v: "self_repair", label: "3. ซ่อมเอง", desc: "บันทึกการซ่อม + คืน Spare ได้" },
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
  const [repairSuccess, setRepairSuccess] = useState(false);
  const [externalRepairVendor, setExternalRepairVendor] = useState("");
  const [externalRepairContact, setExternalRepairContact] = useState("");
  const [externalRepairPhone, setExternalRepairPhone] = useState("");

  const [supplierAutofill, setSupplierAutofill] = useState<{ name: string; manufacturer: string | null; warranty: string | null; phone: string | null; contact: string | null } | null>(null);
  const [sourceCtx, setSourceCtx] = useState<SourceContext | null>(null);
  const [history, setHistory] = useState<DeviceHistory | null>(null);
  const [defectiveAck, setDefectiveAck] = useState(false);
  const [defectiveAckReason, setDefectiveAckReason] = useState("");

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
    setRepairSuccess(false);

    setExternalRepairContact("");
    setExternalRepairPhone("");
    setSupplierAutofill(null);
    setSourceCtx(null);
    setHistory(null);
    setDefectiveAck(false);
    setDefectiveAckReason("");

    // Load source context, device info, supplier, and history (consolidated)
    (async () => {
      try {
        const ctx: SourceContext = {
          sourceLabel: "ป้อนเอง",
          itemCode: null, itemName: null, brand: null, modelSpec: null,
          billboardLabel: null, billboardId: null,
          reportedSymptom: log.symptom_description || null,
          reporter: null, reportedAt: null, photos: [], description: null,
          unitPrice: null, depreciationMonths: null, dateOfReceipt: null,
          ageMonths: null, mediaPlayerProfileId: null,
        };

        if (log.media_player_id) {
          const { data: mp } = await supabase
            .from("media_players")
            .select("id, code, name, brand, specification, billboard_id, manufacturer, warranty_expiry_date, unit_price, depreciation_months, date_of_receipt, supplier:supplier_id(name, phone, contact_person), billboard:billboards(equipment_id, old_code, location_name)")
            .eq("id", log.media_player_id)
            .maybeSingle() as any;
          if (mp) {
            ctx.itemCode = mp.code; ctx.itemName = mp.name;
            ctx.brand = mp.brand || mp.manufacturer || null;
            ctx.modelSpec = mp.specification || null;
            ctx.unitPrice = mp.unit_price ?? null;
            ctx.depreciationMonths = mp.depreciation_months ?? null;
            ctx.dateOfReceipt = mp.date_of_receipt || null;
            ctx.mediaPlayerProfileId = mp.id;
            if (mp.date_of_receipt) ctx.ageMonths = differenceInMonths(new Date(), parseISO(mp.date_of_receipt));
            if (mp.billboard) {
              const parts = [mp.billboard.old_code, mp.billboard.equipment_id, mp.billboard.location_name].filter(Boolean);
              ctx.billboardLabel = parts.join(" - ");
              ctx.billboardId = mp.billboard_id;
            }
            setSupplierAutofill({
              name: mp.supplier?.name || "",
              manufacturer: mp.manufacturer || mp.brand || null,
              warranty: mp.warranty_expiry_date || null,
              phone: mp.supplier?.phone || null,
              contact: mp.supplier?.contact_person || null,
            });
          }
        } else if (log.equipment_id) {
          const { data: eq } = await supabase
            .from("equipment")
            .select("code, name, brand:brand_id(name), supplier:supplier_id(name, phone, contact_person), unit_price, depreciation_months")
            .eq("id", log.equipment_id)
            .maybeSingle() as any;
          if (eq) {
            ctx.itemCode = eq.code; ctx.itemName = eq.name;
            ctx.brand = eq.brand?.name || null;
            ctx.unitPrice = eq.unit_price ?? null;
            ctx.depreciationMonths = eq.depreciation_months ?? null;
          }
          if (log.serial_number) {
            const { data: sn } = await supabase
              .from("equipment_serial_numbers")
              .select("warranty_expiry_date, warehouse_entry_date")
              .eq("serial_number", log.serial_number)
              .maybeSingle() as any;
            if (sn) {
              ctx.dateOfReceipt = sn.warehouse_entry_date || null;
              if (sn.warehouse_entry_date) ctx.ageMonths = differenceInMonths(new Date(), parseISO(sn.warehouse_entry_date));
              setSupplierAutofill({
                name: eq?.supplier?.name || "",
                manufacturer: eq?.brand?.name || null,
                warranty: sn.warranty_expiry_date || null,
                phone: eq?.supplier?.phone || null,
                contact: eq?.supplier?.contact_person || null,
              });
            }
          }
        }

        // Source-specific context
        if (log.source_type === "swap" && log.source_reference_id) {
          const { data: sw } = await supabase
            .from("swap_requests")
            .select("document_no, billboard_id, description, symptom_id, symptom_other, technician_name, photo_urls, created_at, billboard:billboards(equipment_id, old_code, location_name), symptom:mp_symptoms!swap_requests_symptom_id_fkey(name)")
            .eq("id", log.source_reference_id)
            .maybeSingle() as any;
          if (sw) {
            ctx.sourceLabel = `Swap ${sw.document_no}`;
            const symptomName = sw.symptom?.name || null;
            const descParts = [symptomName, sw.symptom_other, sw.description].filter(Boolean);
            ctx.description = descParts.length > 0 ? descParts.join(" — ") : null;
            ctx.reportedSymptom = symptomName || sw.symptom_other || sw.description || ctx.reportedSymptom;
            ctx.reporter = sw.technician_name || null;
            ctx.reportedAt = sw.created_at || null;
            ctx.photos = Array.isArray(sw.photo_urls) ? sw.photo_urls : [];
            // Pre-fill assessor's symptom dropdown when log doesn't already have one
            if (!log.symptom_id && sw.symptom_id) setSymptomId(sw.symptom_id);
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

        // History — installation count + past assessments + claims
        const hist: DeviceHistory = { installCount: 0, installs: [], pastAssessments: [], pastClaims: [], recentRepairCount6m: 0 };
        if (log.media_player_id) {
          const { data: hh } = await supabase
            .from("media_player_billboard_history")
            .select("installation_date, uninstall_date, uninstall_reason, billboard:billboards(equipment_id, old_code, location_name)")
            .eq("media_player_id", log.media_player_id)
            .order("installation_date", { ascending: false })
            .limit(10) as any;
          (hh || []).forEach((h: any) => {
            const parts = [h.billboard?.old_code, h.billboard?.equipment_id, h.billboard?.location_name].filter(Boolean);
            hist.installs.push({
              billboardLabel: parts.join(" - ") || "—",
              from: h.installation_date, to: h.uninstall_date, reason: h.uninstall_reason,
            });
          });
          hist.installCount = hist.installs.length;
        }
        // Past assessments (same MP/equipment, completed, exclude current)
        let asmQuery = supabase
          .from("assessment_logs")
          .select("document_no, outcome, completed_at")
          .eq("status", "completed")
          .neq("id", log.id)
          .order("completed_at", { ascending: false })
          .limit(5);
        if (log.media_player_id) asmQuery = asmQuery.eq("media_player_id", log.media_player_id);
        else if (log.equipment_id) asmQuery = asmQuery.eq("equipment_id", log.equipment_id);
        const { data: asms } = await asmQuery as any;
        (asms || []).forEach((a: any) => hist.pastAssessments.push({
          docNo: a.document_no, outcome: a.outcome, completedAt: a.completed_at,
        }));
        // Repeat-failure: completed self_repair within 6 months
        const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        hist.recentRepairCount6m = (asms || []).filter((a: any) =>
          a.outcome === "self_repair" && a.completed_at && new Date(a.completed_at) >= sixMonthsAgo
        ).length;

        // Past claims
        let clmQuery = supabase
          .from("claim_records")
          .select("document_no, status, created_at")
          .order("created_at", { ascending: false })
          .limit(5);
        if (log.media_player_id) clmQuery = clmQuery.eq("media_player_id", log.media_player_id);
        else if (log.equipment_id) clmQuery = clmQuery.eq("equipment_id", log.equipment_id);
        const { data: clms } = await clmQuery as any;
        (clms || []).forEach((c: any) => hist.pastClaims.push({
          docNo: c.document_no, status: c.status, createdAt: c.created_at,
        }));

        setHistory(hist);
      } catch (e) {
        console.error("Load assessment context failed:", e);
      }
    })();
  }, [open, log]);

  if (!log) return null;

  // ===== Warranty calculation =====
  const warrantyDate = supplierAutofill?.warranty || null;
  const warrantyDaysLeft = warrantyDate ? differenceInDays(parseISO(warrantyDate), new Date()) : null;
  const warrantyState: "active" | "ending" | "expired" | "unknown" =
    warrantyDaysLeft === null ? "unknown"
      : warrantyDaysLeft < 0 ? "expired"
      : warrantyDaysLeft <= 30 ? "ending"
      : "active";
  const isUnderWarranty = warrantyState === "active" || warrantyState === "ending";

  // ===== Cost-of-repair guard (rough) =====
  // มูลค่าคงเหลือ = price * (1 - usedMonths/depreciationMonths), >=0
  const remainingValue = (() => {
    if (!sourceCtx?.unitPrice || !sourceCtx?.depreciationMonths || !sourceCtx?.ageMonths) return null;
    const ratio = Math.max(0, 1 - (sourceCtx.ageMonths / sourceCtx.depreciationMonths));
    return sourceCtx.unitPrice * ratio;
  })();
  const isRepeatFailure = (history?.recentRepairCount6m || 0) >= 2;

  const needsDefectiveAck = outcome === "defective" && isUnderWarranty;

  const canSubmit =
    !!assessmentResultId &&
    !!outcome &&
    (outcome !== "self_repair" || !!repairDescription.trim()) &&
    (outcome !== "claim" || !!supplierAutofill?.name || !!externalRepairVendor.trim()) &&
    (!needsDefectiveAck || (defectiveAck && !!defectiveAckReason.trim()));

  const ageLabel = (() => {
    if (!sourceCtx?.ageMonths && sourceCtx?.ageMonths !== 0) return null;
    const m = sourceCtx.ageMonths;
    if (m < 12) return `${m} เดือน`;
    const y = Math.floor(m / 12); const rm = m % 12;
    return rm > 0 ? `${y} ปี ${rm} เดือน` : `${y} ปี`;
  })();

  const handleSubmit = async () => {
    setSubmitting(true);

    // Audit trail: บันทึกสถานะประกัน + อายุเครื่อง ตอนประเมิน
    const auditLines: string[] = [];
    if (warrantyState === "active") auditLines.push(`✅ ประเมินขณะ "ยังในประกัน" เหลือ ${warrantyDaysLeft} วัน (หมด ${warrantyDate})`);
    else if (warrantyState === "ending") auditLines.push(`⚠️ ประเมินขณะประกันใกล้หมด เหลือ ${warrantyDaysLeft} วัน (หมด ${warrantyDate})`);
    else if (warrantyState === "expired") auditLines.push(`❌ ประเมินขณะ "หมดประกันแล้ว" ${Math.abs(warrantyDaysLeft!)} วัน (หมดเมื่อ ${warrantyDate})`);
    else auditLines.push(`ℹ️ ประเมินโดยไม่มีข้อมูลประกัน`);
    if (ageLabel) auditLines.push(`อายุเครื่องนับจากรับเข้า: ${ageLabel}`);
    if (needsDefectiveAck && defectiveAckReason.trim()) auditLines.push(`เหตุผลที่ไม่ส่งเคลมแม้ยังในประกัน: ${defectiveAckReason.trim()}`);
    if (isRepeatFailure) auditLines.push(`ปัญหาซ้ำซาก: ซ่อม ${history?.recentRepairCount6m} ครั้งใน 6 เดือน`);
    const finalNotes = [notes.trim(), auditLines.join("\n")].filter(Boolean).join("\n---\n");

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
        notes: finalNotes || null,
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
      // Helper: เปลี่ยนสถานะ MP + S/N (logical warehouse)
      // quantity rule:
      //   - return_refurb (กลับเข้าคลัง active) → 1
      //   - claim/under_repair (ยังไม่อยู่ในคลังพร้อมใช้) → 0
      //   - defective (รอตัด stock จริงที่หน้า defective entry) → 0
      const flipStatus = async (mpStatus: string, snStatus: string, refurb = false, qty = 0) => {
        if (log.media_player_id) {
          const upd: any = { status: mpStatus, quantity: qty };
          if (refurb) { upd.is_refurbished = true; upd.refurbished_at = new Date().toISOString(); }
          await supabase.from("media_players").update(upd).eq("id", log.media_player_id);
        }
        if (log.serial_number) {
          const upd: any = { status: snStatus };
          if (refurb) {
            upd.is_refurbished = true;
            upd.refurbished_at = new Date().toISOString();
            upd.refurbished_notes = outcome === "self_repair"
              ? `ซ่อมเอง: ${repairDescription.trim()}`
              : `คืน Spare หลังประเมิน/เคลม`;
          }
          await supabase.from("equipment_serial_numbers").update(upd).eq("serial_number", log.serial_number);
        }
      };

      if (outcome === "defective") {
        // เครื่องค้างที่ pending_assessment จนกว่าคลังจะรับ
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
        await flipStatus("in_claim", "in_claim", false, 0);
      } else if (outcome === "self_repair") {
        await flipStatus("under_repair", "under_repair", false, 0);
      } else if (outcome === "return_refurb") {
        // คืนเข้าคลังพร้อมใช้ (active) — นับเป็น stock 1
        await flipStatus("active", "in_stock", true, 1);
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
          {/* Source Context — แสดงข้อมูลต้นทาง (Swap/ของเสีย/ป้อนเอง) */}
          {sourceCtx && (
            <div className="rounded-lg border bg-muted/40 p-3 space-y-2 text-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="font-semibold flex items-center gap-2">
                  <Badge variant="secondary">ที่มา: {sourceCtx.sourceLabel}</Badge>
                  {sourceCtx.itemCode && (
                    <span className="text-foreground">
                      {sourceCtx.itemCode}{sourceCtx.itemName ? ` — ${sourceCtx.itemName}` : ""}
                    </span>
                  )}
                </div>
                {sourceCtx.reportedAt && (
                  <span className="text-xs text-muted-foreground">
                    แจ้งเมื่อ {new Date(sourceCtx.reportedAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {sourceCtx.billboardLabel && (
                  <div><span className="text-muted-foreground">ป้ายต้นทาง: </span><span className="font-medium">{sourceCtx.billboardLabel}</span></div>
                )}
                {log.serial_number && (
                  <div><span className="text-muted-foreground">S/N: </span><span className="font-mono">{log.serial_number}</span></div>
                )}
                {sourceCtx.reporter && (
                  <div><span className="text-muted-foreground">ผู้แจ้ง: </span><span>{sourceCtx.reporter}</span></div>
                )}
                {(sourceCtx.description || sourceCtx.reportedSymptom) && (
                  <div className="md:col-span-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800/40 p-2">
                    <div className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-0.5">อาการที่แจ้งตอนคีย์เข้า (ผู้ประเมินเพิ่มเติมได้ในฟอร์มด้านล่าง)</div>
                    <div className="text-sm whitespace-pre-line">{sourceCtx.description || sourceCtx.reportedSymptom}</div>
                  </div>
                )}
              </div>
              {sourceCtx.photos.length > 0 && (
                <div className="flex gap-2 flex-wrap pt-1">
                  {sourceCtx.photos.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt={`อาการ ${i + 1}`} className="h-16 w-16 object-cover rounded border hover:ring-2 hover:ring-primary" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* === Warranty Banner === */}
          {(() => {
            const tone =
              warrantyState === "active" ? "border-success bg-success/10"
              : warrantyState === "ending" ? "border-warning bg-warning/10"
              : warrantyState === "expired" ? "border-destructive bg-destructive/10"
              : "border-muted bg-muted/40";
            const Icon = warrantyState === "active" ? ShieldCheck : warrantyState === "expired" ? ShieldAlert : Shield;
            const text =
              warrantyState === "active" ? `ยังอยู่ในประกัน — เหลือ ${warrantyDaysLeft} วัน (หมด ${warrantyDate}) → แนะนำ "ส่งเคลม"`
              : warrantyState === "ending" ? `ประกันใกล้หมด — เหลือ ${warrantyDaysLeft} วัน (หมด ${warrantyDate})`
              : warrantyState === "expired" ? `หมดประกันแล้ว ${Math.abs(warrantyDaysLeft!)} วัน (หมดเมื่อ ${warrantyDate})`
              : `ไม่พบข้อมูลประกัน — โปรดเช็คก่อนเลือกผล`;
            return (
              <div className={`rounded-lg border-2 p-3 flex items-start gap-3 ${tone}`}>
                <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="font-semibold text-sm">{text}</div>
                  {supplierAutofill?.name && (
                    <div className="text-xs flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>ผู้จัดจำหน่าย: <span className="font-medium">{supplierAutofill.name}</span></span>
                      {supplierAutofill.contact && <span>ผู้ติดต่อ: {supplierAutofill.contact}</span>}
                      {supplierAutofill.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <a href={`tel:${supplierAutofill.phone}`} className="underline font-mono">{supplierAutofill.phone}</a>
                          <button type="button" onClick={() => { navigator.clipboard.writeText(supplierAutofill.phone || ""); toast.success("คัดลอกเบอร์แล้ว"); }} className="hover:text-primary">
                            <Copy className="h-3 w-3" />
                          </button>
                        </span>
                      )}
                    </div>
                  )}
                  {isUnderWarranty && (
                    <Button size="sm" variant="outline" type="button" onClick={() => setOutcome("claim")} className="mt-1 h-7">
                      ใช้ผล: ส่งเคลม
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* === Repeat-failure flag === */}
          {isRepeatFailure && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>ปัญหาซ้ำซาก</AlertTitle>
              <AlertDescription>
                เครื่องนี้ถูกซ่อมไป {history?.recentRepairCount6m} ครั้งใน 6 เดือนล่าสุด — ควรพิจารณาเข้าของเสียหรือเคลมเต็มเครื่อง
              </AlertDescription>
            </Alert>
          )}

          {/* === Device Info & History === */}
          {sourceCtx && (
            <div className="rounded-lg border bg-card p-3 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-semibold flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  ข้อมูลเครื่อง & ประวัติ
                </div>
                {sourceCtx.mediaPlayerProfileId && (
                  <a
                    href={`/media-player-profile/${sourceCtx.mediaPlayerProfileId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                  >
                    เปิดโปรไฟล์เครื่อง <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <div className="grid md:grid-cols-3 gap-x-4 gap-y-1 text-xs">
                {sourceCtx.brand && <div><span className="text-muted-foreground">ยี่ห้อ: </span><span className="font-medium">{sourceCtx.brand}</span></div>}
                {sourceCtx.modelSpec && <div className="md:col-span-2"><span className="text-muted-foreground">Spec: </span><span>{sourceCtx.modelSpec}</span></div>}
                {sourceCtx.unitPrice != null && <div><span className="text-muted-foreground">ราคา: </span><span className="font-medium">{sourceCtx.unitPrice.toLocaleString()} บาท</span></div>}
                {sourceCtx.depreciationMonths != null && <div><span className="text-muted-foreground">ค่าเสื่อม: </span><span>{sourceCtx.depreciationMonths} เดือน</span></div>}
                {ageLabel && <div><span className="text-muted-foreground">อายุใช้งาน: </span><span>{ageLabel}</span></div>}
                {sourceCtx.dateOfReceipt && <div><span className="text-muted-foreground">รับเข้า: </span><span>{sourceCtx.dateOfReceipt}</span></div>}
                <div><span className="text-muted-foreground">ติดตั้งมาแล้ว: </span><span className="font-medium">{history?.installCount ?? 0} ครั้ง</span></div>
                {remainingValue != null && <div><span className="text-muted-foreground">มูลค่าคงเหลือ (ประมาณ): </span><span className="font-medium">{remainingValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} บาท</span></div>}
              </div>

              {(history?.installs.length || 0) > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">ประวัติการติดตั้ง ({history!.installs.length})</summary>
                  <ul className="mt-1 space-y-0.5 pl-3">
                    {history!.installs.slice(0, 5).map((h, i) => (
                      <li key={i}>
                        • <span className="font-medium">{h.billboardLabel}</span> · {h.from || "—"} → {h.to || "ปัจจุบัน"}
                        {h.reason && <span className="text-muted-foreground"> ({h.reason})</span>}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {(history?.pastAssessments.length || 0) > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">ประวัติการประเมิน ({history!.pastAssessments.length})</summary>
                  <ul className="mt-1 space-y-0.5 pl-3">
                    {history!.pastAssessments.map((a, i) => (
                      <li key={i}>• {a.docNo} — ผล: <span className="font-medium">{a.outcome || "—"}</span> {a.completedAt && `(${new Date(a.completedAt).toLocaleDateString("th-TH")})`}</li>
                    ))}
                  </ul>
                </details>
              )}

              {(history?.pastClaims.length || 0) > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">ประวัติการเคลม ({history!.pastClaims.length})</summary>
                  <ul className="mt-1 space-y-0.5 pl-3">
                    {history!.pastClaims.map((c, i) => (
                      <li key={i}>• {c.docNo} — สถานะ: {c.status} ({new Date(c.createdAt).toLocaleDateString("th-TH")})</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

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
              <div className="pt-2 border-t space-y-2">
                <p className="text-xs text-destructive">
                  ⚠ หลังบันทึก ระบบจะแจ้งให้ไปคีย์ที่เมนู <strong>"นำของเสียเข้าระบบ"</strong> เพื่อตัด Stock เข้าคลังของเสีย
                </p>
                {needsDefectiveAck && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>เครื่องนี้ยังอยู่ในประกัน!</AlertTitle>
                    <AlertDescription className="space-y-2">
                      <p>เหลือประกัน {warrantyDaysLeft} วัน — ปกติควรส่งเคลมก่อน หากยืนยันเข้าของเสียโปรดระบุเหตุผล</p>
                      <Textarea
                        value={defectiveAckReason}
                        onChange={(e) => setDefectiveAckReason(e.target.value)}
                        placeholder="เหตุผลที่ไม่ส่งเคลมแม้ยังในประกัน *"
                        rows={2}
                      />
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={defectiveAck} onChange={(e) => setDefectiveAck(e.target.checked)} />
                        ยืนยันสละสิทธิ์เคลม รับทราบและรับผิดชอบการตัดสินใจนี้
                      </label>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
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
