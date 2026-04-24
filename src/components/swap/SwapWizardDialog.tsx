import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Check, X, ChevronLeft, Package, MapPin } from "lucide-react";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SwapRejectReasonSelect } from "@/components/media-player/SwapRejectReasonSelect";

interface SwapRequest {
  id: string;
  document_no: string;
  billboard_id: string | null;
  description: string | null;
  symptom_other: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: SwapRequest | null;
  onCompleted: () => void;
}

interface SpareOption {
  value: string;
  label: string;
  description?: string;
  type: "media_player" | "equipment";
  serial_number?: string | null;
  location_id?: string | null;
}

interface OldOption {
  value: string;
  label: string;
  description?: string;
  type: "media_player" | "equipment";
  serial_number?: string | null;
  billboard_equipment_id: string;
}

export function SwapWizardDialog({ open, onOpenChange, request, onCompleted }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Spare selection
  const [spareOptions, setSpareOptions] = useState<SpareOption[]>([]);
  const [spareValue, setSpareValue] = useState("");

  // Step 2: Old unit selection
  const [oldOptions, setOldOptions] = useState<OldOption[]>([]);
  const [oldValue, setOldValue] = useState("");
  const [returnLocationId, setReturnLocationId] = useState("");
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);

  // Step 3: Confirm/Reject
  const [result, setResult] = useState<"approved" | "rejected">("approved");
  const [rejectReasonId, setRejectReasonId] = useState("");
  const [rejectReasonOther, setRejectReasonOther] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setStep(1);
      setSpareValue("");
      setOldValue("");
      setReturnLocationId("");
      setResult("approved");
      setRejectReasonId("");
      setRejectReasonOther("");
      setNotes("");
      loadSpares();
      loadLocations();
      if (request?.billboard_id) loadOldUnits(request.billboard_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, request?.id]);

  // Auto-select old unit when entering step 2 if there's only ONE matching unit on the billboard.
  // "Matching" = same equipment id (for equipment spares) or first available media player slot.
  useEffect(() => {
    if (step !== 2 || oldValue || oldOptions.length === 0) return;
    const spare = spareOptions.find((o) => o.value === spareValue);
    if (!spare) return;

    // Try to match by equipment id first (when spare is equipment)
    if (spare.type === "equipment") {
      const spareEqId = spare.value.split(":")[1];
      const matches = oldOptions.filter((o) => {
        // billboard_equipment row: equipment_id is in label/desc — we use billboard_equipment_id mapping via desc
        // The OldOption stores equipment id implicitly via the billboard_equipment record
        return (o as any).equipment_id === spareEqId;
      });
      if (matches.length === 1) {
        setOldValue(matches[0].value);
        return;
      }
    }

    // If only one unit installed total → auto select
    if (oldOptions.length === 1) {
      setOldValue(oldOptions[0].value);
    }
  }, [step, oldOptions, spareValue, spareOptions, oldValue]);

  const loadSpares = async () => {
    setLoading(true);
    // Media Players: status = active and not installed (treat all media_players as potential spare list)
    const { data: mps } = await supabase
      .from("media_players")
      .select("id, code, name, serial_number, status, location_id")
      .order("created_at", { ascending: false })
      .limit(300);

    // Equipment: pull serial numbers in_stock
    const { data: esns } = await supabase
      .from("equipment_serial_numbers")
      .select("id, equipment_id, serial_number, status, location_id, equipment:equipment_id(id, code, name)")
      .eq("status", "in_stock")
      .limit(300);

    const opts: SpareOption[] = [];
    (mps || []).forEach((m: any) => {
      opts.push({
        value: `mp:${m.id}`,
        label: `${m.code} ${m.name ? "- " + m.name : ""}`,
        description: `S/N: ${m.serial_number || "—"} • สถานะ: ${m.status || "—"}`,
        type: "media_player",
        serial_number: m.serial_number,
        location_id: m.location_id,
      });
    });
    (esns || []).forEach((s: any) => {
      opts.push({
        value: `eq:${s.equipment_id}:${s.id}`,
        label: `${s.equipment?.code || ""} ${s.equipment?.name ? "- " + s.equipment.name : ""}`,
        description: `S/N: ${s.serial_number} • สถานะ: ${s.status}`,
        type: "equipment",
        serial_number: s.serial_number,
        location_id: s.location_id,
      });
    });
    setSpareOptions(opts);
    setLoading(false);
  };

  const loadLocations = async () => {
    const { data } = await supabase.from("locations").select("id, name").eq("is_active", true).order("name");
    setLocations(data || []);
  };

  const loadOldUnits = async (billboardId: string) => {
    const { data: be } = await supabase
      .from("billboard_equipment")
      .select("id, equipment_id, serial_number, quantity, equipment:equipment_id(id, code, name)")
      .eq("billboard_id", billboardId);

    const opts: OldOption[] = (be || []).map((b: any) => ({
      value: `be:${b.id}`,
      label: `${b.equipment?.code || ""} ${b.equipment?.name ? "- " + b.equipment.name : ""}`,
      description: `S/N: ${b.serial_number || "—"} • จำนวน: ${b.quantity}`,
      type: "equipment",
      serial_number: b.serial_number,
      billboard_equipment_id: b.id,
    }));
    setOldOptions(opts);
  };

  const selectedSpare = spareOptions.find((o) => o.value === spareValue);
  const selectedOld = oldOptions.find((o) => o.value === oldValue);

  const canNext1 = !!spareValue;
  const canNext2 = !!oldValue;
  const canSubmit =
    result === "approved"
      ? true
      : !!rejectReasonId || !!rejectReasonOther.trim();

  const handleSubmit = async () => {
    if (!request) return;
    setSubmitting(true);

    // Parse spare
    let spareMpId: string | null = null;
    let spareEqId: string | null = null;
    if (selectedSpare?.type === "media_player") {
      spareMpId = selectedSpare.value.split(":")[1];
    } else if (selectedSpare?.type === "equipment") {
      spareEqId = selectedSpare.value.split(":")[1];
    }

    // Parse old
    let oldBeId: string | null = null;
    let oldEqId: string | null = null;
    if (selectedOld) {
      oldBeId = selectedOld.billboard_equipment_id;
      oldEqId = selectedOld.value.split(":")[1] === oldBeId ? null : null;
    }

    // Insert execution
    const { error: execError } = await supabase.from("swap_executions").insert({
      swap_request_id: request.id,
      spare_type: selectedSpare?.type || "equipment",
      spare_media_player_id: spareMpId,
      spare_equipment_id: spareEqId,
      spare_serial_number: selectedSpare?.serial_number || null,
      spare_source_location_id: selectedSpare?.location_id || null,
      old_billboard_equipment_id: oldBeId,
      old_equipment_id: oldEqId,
      old_serial_number: selectedOld?.serial_number || null,
      return_location_id: returnLocationId || null,
      result,
      reject_reason_id: result === "rejected" ? rejectReasonId || null : null,
      reject_reason_other: result === "rejected" ? rejectReasonOther.trim() || null : null,
      notes: notes.trim() || null,
      executed_by: user?.id ?? null,
    });

    if (execError) {
      setSubmitting(false);
      toast.error("บันทึก execution ไม่สำเร็จ: " + execError.message);
      return;
    }

    // Update request status
    const newStatus = result === "approved" ? "completed" : "rejected";
    await supabase.from("swap_requests").update({ status: newStatus }).eq("id", request.id);

    setSubmitting(false);
    toast.success(result === "approved" ? "บันทึก Swap สำเร็จ" : "บันทึก Reject สำเร็จ");
    onCompleted();
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Swap Wizard — {request.document_no}
          </DialogTitle>
          <DialogDescription>
            {request.description || request.symptom_other || "ดำเนินการ Swap เครื่อง"}
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 py-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : step > s
                    ? "bg-success text-success-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 3 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Package className="h-5 w-5" /> ขั้น 1: เลือก Spare ที่จะนำเข้าใช้
              </h3>
              <p className="text-sm text-muted-foreground">เลือกเครื่อง Media Player หรืออุปกรณ์ที่จะนำไปติดตั้งทดแทน</p>
            </div>
            <SearchableSelect
              options={spareOptions}
              value={spareValue}
              onValueChange={setSpareValue}
              placeholder="ค้นหาด้วยรหัส / ชื่อ / S/N"
              searchPlaceholder="พิมพ์เพื่อค้นหา..."
              isLoading={loading}
            />
            {selectedSpare && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default">{selectedSpare.type === "media_player" ? "Media Player" : "Equipment"}</Badge>
                    <span className="font-medium">{selectedSpare.label}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">{selectedSpare.description}</div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" /> ขั้น 2: เลือกเครื่องเก่าที่ต้องการถอด
              </h3>
              <p className="text-sm text-muted-foreground">รายการอุปกรณ์ที่ติดตั้งบนป้ายปัจจุบัน</p>
            </div>
            {oldOptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                ไม่พบอุปกรณ์ที่ติดตั้งบนป้ายนี้
              </div>
            ) : (
              <SearchableSelect
                options={oldOptions}
                value={oldValue}
                onValueChange={setOldValue}
                placeholder="เลือกเครื่องเก่า"
                searchPlaceholder="ค้นหา..."
              />
            )}
            {selectedOld && (
              <Card>
                <CardContent className="pt-4">
                  <div className="font-medium">{selectedOld.label}</div>
                  <div className="text-sm text-muted-foreground">{selectedOld.description}</div>
                </CardContent>
              </Card>
            )}
            <div className="space-y-2">
              <Label>คลังปลายทางสำหรับเครื่องเก่า (Incoming)</Label>
              <SearchableSelect
                options={locations.map((l) => ({ value: l.id, label: l.name }))}
                value={returnLocationId}
                onValueChange={setReturnLocationId}
                placeholder="เลือกคลังที่จะส่งเครื่องเก่ากลับ"
              />
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">ขั้น 3: ตรวจสอบและยืนยัน</h3>
              <p className="text-sm text-muted-foreground">เปรียบเทียบเครื่องและตัดสินใจ Approve / Reject</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4 space-y-1">
                  <Badge variant="secondary">Spare เข้าใหม่</Badge>
                  <div className="font-medium mt-2">{selectedSpare?.label}</div>
                  <div className="text-sm text-muted-foreground">{selectedSpare?.description}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 space-y-1">
                  <Badge variant="outline">เครื่องเก่าที่ถอด</Badge>
                  <div className="font-medium mt-2">{selectedOld?.label || "—"}</div>
                  <div className="text-sm text-muted-foreground">{selectedOld?.description || "—"}</div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={result === "approved" ? "default" : "outline"}
                onClick={() => setResult("approved")}
                className="h-auto py-4"
              >
                <Check className="h-5 w-5 mr-2" /> Approve — ดำเนินการ Swap
              </Button>
              <Button
                type="button"
                variant={result === "rejected" ? "destructive" : "outline"}
                onClick={() => setResult("rejected")}
                className="h-auto py-4"
              >
                <X className="h-5 w-5 mr-2" /> Reject — ไม่ Swap
              </Button>
            </div>

            {result === "rejected" && (
              <div className="space-y-3 p-4 bg-destructive/5 rounded-lg border border-destructive/20">
                <div className="space-y-2">
                  <Label>เหตุผลที่ Reject *</Label>
                  <SwapRejectReasonSelect value={rejectReasonId} onChange={setRejectReasonId} />
                </div>
                <div className="space-y-2">
                  <Label>เหตุผลอื่น ๆ</Label>
                  <Input
                    value={rejectReasonOther}
                    onChange={(e) => setRejectReasonOther(e.target.value)}
                    placeholder="ระบุเหตุผลถ้าไม่มีในรายการ"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>หมายเหตุ</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="บันทึกเพิ่มเติม..." />
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between sm:justify-between">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> ย้อนกลับ
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>ปิด</Button>
            {step < 3 && (
              <Button
                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                disabled={(step === 1 && !canNext1) || (step === 2 && !canNext2)}
              >
                ถัดไป <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 3 && (
              <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
                {submitting ? "กำลังบันทึก..." : "ยืนยัน"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
