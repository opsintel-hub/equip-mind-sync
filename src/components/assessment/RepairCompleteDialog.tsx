import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { LocationSelect } from "@/components/location/LocationSelect";
import { RepairActionsMultiSelect, RepairActionOption } from "./RepairActionsMultiSelect";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { ExternalLink, ShieldCheck, ShieldX, ShieldAlert } from "lucide-react";

interface RepairCompleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessmentLog: {
    id: string;
    document_no: string;
    media_player_id: string | null;
    serial_number: string | null;
    device_type?: string | null;
  } | null;
  onCompleted: () => void;
}

type RepairResult = "repaired" | "failed_defective" | "failed_claim";

export function RepairCompleteDialog({ open, onOpenChange, assessmentLog, onCompleted }: RepairCompleteDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [result, setResult] = useState<RepairResult>("repaired");
  const [locationId, setLocationId] = useState("");
  const [cost, setCost] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Repair scope + actions
  const [scopeHW, setScopeHW] = useState(false);
  const [scopeSW, setScopeSW] = useState(false);
  const [actionIds, setActionIds] = useState<string[]>([]);
  const [actionSnapshot, setActionSnapshot] = useState<RepairActionOption[]>([]);

  // Warranty check
  const [warrantyDate, setWarrantyDate] = useState<string | null>(null);
  const [warrantyLoading, setWarrantyLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setResult("repaired");
      setLocationId("");
      setCost("");
      setDescription("");
      setScopeHW(false);
      setScopeSW(false);
      setActionIds([]);
      setActionSnapshot([]);
      setWarrantyDate(null);
      if (assessmentLog?.media_player_id) {
        setWarrantyLoading(true);
        supabase
          .from("media_players")
          .select("warranty_expiry_date")
          .eq("id", assessmentLog.media_player_id)
          .maybeSingle()
          .then(({ data }) => {
            setWarrantyDate((data?.warranty_expiry_date as string) || null);
            setWarrantyLoading(false);
          });
      }
    }
  }, [open, assessmentLog?.media_player_id]);

  const warrantyStatus: "in_warranty" | "expired" | "unknown" = warrantyDate
    ? new Date(warrantyDate) >= new Date()
      ? "in_warranty"
      : "expired"
    : "unknown";

  const canDefective = warrantyStatus === "expired";
  const canClaim = warrantyStatus === "in_warranty";

  const scopeFilter = [
    ...(scopeHW ? (["hardware"] as const) : []),
    ...(scopeSW ? (["software"] as const) : []),
  ];

  const actionsSummary = actionSnapshot.map((a) => a.name).join(", ");

  const handleSubmit = async () => {
    if (!assessmentLog) return;
    if (result === "repaired" && !locationId) { toast.error("กรุณาเลือกคลังปลายทาง"); return; }
    if (result === "failed_defective" && !canDefective) { toast.error("เครื่องยังอยู่ในประกัน — ต้องส่งเคลม Vendor ก่อน"); return; }
    if (result === "failed_claim" && !canClaim) { toast.error("เครื่องหมดประกันแล้ว — ส่งเคลมไม่ได้ ให้ส่งเข้าระบบของเสียแทน"); return; }
    if (!scopeHW && !scopeSW) { toast.error("กรุณาเลือกประเภทงานซ่อม (Hardware/Software)"); return; }
    if (actionIds.length === 0) { toast.error("กรุณาเลือกรายการที่ซ่อม/เปลี่ยน อย่างน้อย 1 รายการ"); return; }
    if (!description.trim()) { toast.error("กรุณาบันทึกรายละเอียดการซ่อม"); return; }

    setSubmitting(true);
    try {
      const scopeArr = [scopeHW ? "hardware" : null, scopeSW ? "software" : null].filter(Boolean) as string[];
      const enrichedDescription = `[${scopeArr.join("+")}] ${actionsSummary ? actionsSummary + " — " : ""}${description.trim()}`;

      // 1) Update assessment_logs
      const repairStatus = result === "repaired" ? "repaired" : "failed";
      await supabase
        .from("assessment_logs")
        .update({
          repair_status: repairStatus,
          repair_result: result,
          repair_completed_at: new Date().toISOString(),
          repair_completed_by: user?.id ?? null,
          repair_cost: cost ? parseFloat(cost) : null,
          return_location_id: result === "repaired" ? locationId : null,
          repair_description: description.trim(),
          repair_scope: scopeArr,
          repair_action_ids: actionIds,
          repair_actions_snapshot: actionSnapshot as any,
        })
        .eq("id", assessmentLog.id);

      // 2) Flip MP based on result
      if (assessmentLog.media_player_id) {
        if (result === "repaired") {
          const { data: mpRow } = await supabase
            .from("media_players")
            .select("id, code, name, company_id")
            .eq("id", assessmentLog.media_player_id)
            .maybeSingle();

          await supabase
            .from("media_players")
            .update({
              status: "in_stock",
              quantity: 1,
              location_id: locationId,
              billboard_id: null,
              is_refurbished: true,
              refurbished_at: new Date().toISOString(),
            })
            .eq("id", assessmentLog.media_player_id);

          if (mpRow) {
            await supabase.from("stock_movements").insert({
              equipment_id: assessmentLog.media_player_id,
              equipment_code: mpRow.code,
              equipment_name: mpRow.name,
              movement_type: "repair_return_in",
              quantity: 1,
              stock_before: 0,
              stock_after: 1,
              reference_type: "assessment_log",
              reference_id: assessmentLog.id,
              reference_document: assessmentLog.document_no,
              location_id: locationId,
              company_id: mpRow.company_id,
              item_condition: "refurbished",
              created_by: user?.id ?? null,
              notes: `ซ่อมเองสำเร็จ — คืนคลังพร้อมเบิก (refurbished). ${enrichedDescription}`,
            });
          }
          toast.success("บันทึกการซ่อมและคืนคลังเรียบร้อย — เครื่องพร้อมเบิก");
        } else if (result === "failed_defective") {
          toast.info("กำลังนำทางไปนำเข้าระบบของเสีย...");
          onCompleted();
          onOpenChange(false);
          navigate("/defective-return-entry", {
            state: {
              prefill: {
                isMediaPlayer: true,
                itemId: assessmentLog.media_player_id,
                serial: assessmentLog.serial_number,
                symptomDescription: `ซ่อมเองไม่ได้: ${enrichedDescription}`,
              },
            },
          });
          return;
        } else if (result === "failed_claim") {
          toast.info("กำลังนำทางไปสร้างคำเคลม...");
          onCompleted();
          onOpenChange(false);
          navigate("/claims", {
            state: {
              prefill: {
                isMediaPlayer: true,
                itemId: assessmentLog.media_player_id,
                serial: assessmentLog.serial_number,
                symptomDescription: `ซ่อมเองไม่ได้ ส่งเคลม: ${enrichedDescription}`,
              },
            },
          });
          return;
        }
      } else {
        toast.success("บันทึกผลการซ่อมแล้ว");
      }

      onCompleted();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("บันทึกไม่สำเร็จ: " + (e.message || e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>บันทึกผลการซ่อมเอง</DialogTitle>
          <DialogDescription>
            {assessmentLog?.document_no} • S/N: {assessmentLog?.serial_number || "—"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Warranty Banner */}
          <div
            className={`rounded-lg border p-4 text-sm flex items-start gap-3 ${
              warrantyStatus === "in_warranty"
                ? "border-success/50 bg-success/10 text-foreground"
                : warrantyStatus === "expired"
                ? "border-destructive/50 bg-destructive/10 text-foreground"
                : "border-warning/50 bg-warning/10 text-foreground"
            }`}
          >
            {warrantyStatus === "in_warranty" ? (
              <ShieldCheck className="h-5 w-5 mt-0.5 text-success shrink-0" />
            ) : warrantyStatus === "expired" ? (
              <ShieldX className="h-5 w-5 mt-0.5 text-destructive shrink-0" />
            ) : (
              <ShieldAlert className="h-5 w-5 mt-0.5 text-warning shrink-0" />
            )}
            <div className="flex-1">
              <div className="font-semibold text-foreground">
                {warrantyLoading
                  ? "กำลังตรวจสอบประกัน..."
                  : warrantyStatus === "in_warranty"
                  ? `อยู่ในประกัน (ถึง ${warrantyDate})`
                  : warrantyStatus === "expired"
                  ? `หมดประกันแล้ว (${warrantyDate})`
                  : "ไม่พบวันหมดประกัน — กรุณาตรวจสอบ/บันทึกที่ Media Player Profile"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {warrantyStatus === "in_warranty" && "เลือกได้เฉพาะ 'ส่งเคลม Vendor'"}
                {warrantyStatus === "expired" && "เลือกได้เฉพาะ 'ส่งเข้าระบบของเสีย'"}
              </div>
            </div>
            {assessmentLog?.media_player_id && (
              <Button asChild variant="outline" size="sm" type="button">
                <Link to={`/media-player/${assessmentLog.media_player_id}`} target="_blank">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Profile
                </Link>
              </Button>
            )}
          </div>

          {/* Section: ผลการซ่อม */}
          <section className="rounded-lg border bg-card">
            <div className="border-b px-4 py-2 bg-muted/40">
              <h3 className="text-sm font-semibold">1. ผลการซ่อม *</h3>
            </div>
            <div className="p-4">
              <RadioGroup value={result} onValueChange={(v) => setResult(v as RepairResult)} className="grid gap-3 md:grid-cols-3">
                <label
                  htmlFor="rep-ok"
                  className="flex items-start gap-2 rounded-md border p-3 cursor-pointer hover:bg-accent/50 has-[[data-state=checked]]:border-success has-[[data-state=checked]]:bg-success/5"
                >
                  <RadioGroupItem value="repaired" id="rep-ok" className="mt-1" />
                  <div className="text-sm">
                    <div className="font-medium text-success">✅ ซ่อมสำเร็จ</div>
                    <div className="text-xs text-muted-foreground mt-0.5">คืนคลัง — ตั้งเป็น in_stock + refurbished</div>
                  </div>
                </label>
                <label
                  htmlFor="rep-def"
                  className={`flex items-start gap-2 rounded-md border p-3 hover:bg-accent/50 has-[[data-state=checked]]:border-destructive has-[[data-state=checked]]:bg-destructive/5 ${
                    canDefective ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                  }`}
                >
                  <RadioGroupItem value="failed_defective" id="rep-def" className="mt-1" disabled={!canDefective} />
                  <div className="text-sm">
                    <div className="font-medium text-destructive">❌ ส่งเข้าระบบของเสีย</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {canDefective ? "เครื่องหมดประกันแล้ว" : "🔒 เฉพาะเครื่องหมดประกัน"}
                    </div>
                  </div>
                </label>
                <label
                  htmlFor="rep-clm"
                  className={`flex items-start gap-2 rounded-md border p-3 hover:bg-accent/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 ${
                    canClaim ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                  }`}
                >
                  <RadioGroupItem value="failed_claim" id="rep-clm" className="mt-1" disabled={!canClaim} />
                  <div className="text-sm">
                    <div className="font-medium text-primary">🔁 เปลี่ยนเป็นส่งเคลม</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {canClaim ? "เครื่องยังอยู่ในประกัน" : "🔒 เฉพาะเครื่องยังในประกัน"}
                    </div>
                  </div>
                </label>
              </RadioGroup>
            </div>
          </section>

          {/* Section: ขอบเขต & รายการงาน */}
          <section className="rounded-lg border bg-card">
            <div className="border-b px-4 py-2 bg-muted/40">
              <h3 className="text-sm font-semibold">2. ขอบเขตงานซ่อม *</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">ประเภท <span className="text-muted-foreground font-normal">(เลือกได้หลายรายการ)</span></Label>
                <div className="flex gap-6 rounded-md border p-3 bg-muted/20">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={scopeHW} onCheckedChange={(v) => setScopeHW(!!v)} />
                    <span>🔧 Hardware</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={scopeSW} onCheckedChange={(v) => setScopeSW(!!v)} />
                    <span>💻 Software</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">รายการที่ซ่อม/เปลี่ยน * <span className="text-muted-foreground font-normal">(เลือกได้หลายรายการ / เพิ่มใหม่ได้)</span></Label>
                <RepairActionsMultiSelect
                  deviceType={assessmentLog?.device_type}
                  scopeFilter={scopeFilter as ("hardware" | "software")[]}
                  selectedIds={actionIds}
                  onChange={(ids, snap) => { setActionIds(ids); setActionSnapshot(snap); }}
                />
              </div>
            </div>
          </section>

          {/* Section: รายละเอียดเพิ่มเติม */}
          <section className="rounded-lg border bg-card">
            <div className="border-b px-4 py-2 bg-muted/40">
              <h3 className="text-sm font-semibold">3. รายละเอียด & ค่าใช้จ่าย</h3>
            </div>
            <div className="p-4 grid gap-4 md:grid-cols-2">
              {result === "repaired" && (
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs">คลังปลายทาง *</Label>
                  <LocationSelect value={locationId} onChange={setLocationId} />
                </div>
              )}
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs">รายละเอียดการซ่อม *</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="รายละเอียดเพิ่มเติม / วิธีซ่อม / สาเหตุที่ซ่อมไม่ได้"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">ค่าใช้จ่ายในการซ่อม (บาท)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            ยกเลิก
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "กำลังบันทึก..." : "บันทึกผลการซ่อม"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
