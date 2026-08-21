import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { RefreshCw, PackageCheck, AlertTriangle, MapPin } from "lucide-react";
import { SimpleDepartmentSelect } from "@/components/equipment/SimpleDepartmentSelect";
import { WarehouseLocationSelect } from "@/components/location/WarehouseLocationSelect";
import { SymptomSelect } from "@/components/media-player/SymptomSelect";
import BillboardSelect from "@/components/billboard/BillboardSelect";
import { logStockMovement } from "@/lib/stockMovement";
import { useAuth } from "@/hooks/useAuth";
import { formatBillboardLabel } from "@/lib/billboardUtils";

export interface ReturnItemLine {
  id: string;
  pending_id: string;
  equipment_id: string | null;
  media_player_id?: string | null;
  is_media_player?: boolean | null;
  equipment_code: string | null;
  equipment_name: string | null;
  serial_number: string | null;
  quantity: number;
  issued_quantity: number | null;
  unit: string;
  billboard_id: string | null;
  returned_good_qty?: number | null;
  returned_defective_qty?: number | null;
  notes: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  documentNo: string;
  pendingId: string;
  requesterName?: string | null;
  requesterDepartment?: string | null;
  item: ReturnItemLine | null;
  onSaved: () => void;
}

const genDocNo = () =>
  `DR-${format(new Date(), "yyyyMMdd")}-${Math.floor(Math.random() * 9999 + 1).toString().padStart(4, "0")}`;

export function ReturnItemDialog({
  open,
  onOpenChange,
  documentNo,
  pendingId,
  requesterName,
  requesterDepartment,
  item,
  onSaved,
}: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const [goodQty, setGoodQty] = useState("0");
  const [department, setDepartment] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [locationId, setLocationId] = useState("");

  const [defectiveQty, setDefectiveQty] = useState("0");
  const [extraDefectiveQty, setExtraDefectiveQty] = useState("0");
  const [symptomId, setSymptomId] = useState("");
  const [symptomOther, setSymptomOther] = useState("");
  const [billboardId, setBillboardId] = useState("");
  const [autoBillboardLabel, setAutoBillboardLabel] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const isMP = !!(item?.media_player_id || item?.is_media_player);
  const issuedQty = item ? item.issued_quantity ?? item.quantity : 0;
  const alreadyReturned = (item?.returned_good_qty || 0) + (item?.returned_defective_qty || 0);
  const installedQty = item?.billboard_id ? issuedQty : 0;
  const outstanding = Math.max(0, issuedQty - alreadyReturned - installedQty);

  useEffect(() => {
    if (!open || !item) return;
    setGoodQty(String(outstanding));
    setDefectiveQty("0");
    setExtraDefectiveQty("0");
    setSymptomId("");
    setSymptomOther("");
    setNotes("");
    setDepartment(requesterDepartment || "");
    setWarehouseId("");
    setLocationId("");
    setBillboardId(item.billboard_id || "");
    setAutoBillboardLabel(null);

    // MP / Monitor: auto-resolve the billboard it is currently installed on
    (async () => {
      if (!item.media_player_id) return;
      const { data: mp } = await supabase
        .from("media_players")
        .select("billboard_id")
        .eq("id", item.media_player_id)
        .maybeSingle();
      const bbId = (mp as any)?.billboard_id || item.billboard_id;
      if (!bbId) return;
      setBillboardId(bbId);
      const { data: bb } = await supabase
        .from("billboards")
        .select("old_code, location_name, equipment_id")
        .eq("id", bbId)
        .maybeSingle();
      if (bb) setAutoBillboardLabel(formatBillboardLabel(bb.old_code, bb.location_name, bb.equipment_id));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id]);

  const good = Math.max(0, parseInt(goodQty || "0") || 0);
  const defective = Math.max(0, parseInt(defectiveQty || "0") || 0);
  const extraDefective = Math.max(0, parseInt(extraDefectiveQty || "0") || 0);

  const error = useMemo(() => {
    if (!item) return "ไม่พบรายการ";
    if (good + defective + extraDefective === 0) return "กรุณาระบุจำนวนที่รับคืนอย่างน้อย 1 ชิ้น";
    if (good + defective > outstanding) return `ของดี + ของเสีย ต้องไม่เกินยอดค้าง (${outstanding})`;
    if (good > 0 && !locationId) return "กรุณาเลือกตำแหน่งจัดเก็บสำหรับของดี";
    if ((defective > 0 || extraDefective > 0) && !symptomId && !symptomOther.trim())
      return "กรุณาระบุอาการเสีย";
    if (isMP && (defective > 0 || extraDefective > 0) && !billboardId)
      return "กรุณาระบุป้ายที่ถอดอุปกรณ์ออกมา";
    return null;
  }, [item, good, defective, extraDefective, outstanding, locationId, symptomId, symptomOther, isMP, billboardId]);

  const buildReason = async () => {
    let symptomName = "";
    if (symptomId) {
      const { data } = await supabase.from("mp_symptoms").select("name").eq("id", symptomId).maybeSingle();
      symptomName = data?.name || "";
    }
    return [symptomName, symptomOther.trim()].filter(Boolean).join(" - ") || "ของเสียจากหน้างาน";
  };

  const createDefectiveTicket = async (qty: number, reasonText: string, extra: boolean) => {
    const docNo = genDocNo();
    const { error: insErr } = await supabase.from("defective_returns").insert({
      document_no: docNo,
      equipment_id: isMP ? null : item!.equipment_id,
      media_player_id: isMP ? item!.media_player_id : null,
      is_media_player: isMP,
      quantity: qty,
      billboard_id: billboardId || null,
      item_condition: "defective",
      reason: `${extra ? "[ถอดจากป้าย นอกยอดเบิก] " : "[คืนจากหน้างาน] "}${reasonText}${item!.serial_number ? ` | S/N: ${item!.serial_number}` : ""}`,
      status: "pending_warehouse_entry",
      source_type: "from_issue",
      symptom_id: symptomId || null,
      symptom_other: symptomOther.trim() || null,
      source_issue_item_id: item!.id,
      source_document: documentNo,
      dispose_status: "pending_disposal_review",
      reporter_name: requesterName || null,
      reporter_department: requesterDepartment || null,
      notes: notes.trim() || null,
      created_by: user?.id,
    } as any);
    if (insErr) throw insErr;
  };

  const handleSave = async () => {
    if (!item || error) {
      if (error) toast.error(error);
      return;
    }
    setSaving(true);
    try {
      // 1) Good stock back to inventory
      if (good > 0) {
        if (item.media_player_id) {
          const { data: mp } = await supabase
            .from("media_players")
            .select("code, name, quantity")
            .eq("id", item.media_player_id)
            .maybeSingle();
          const before = mp?.quantity || 0;
          await supabase
            .from("media_players")
            .update({ quantity: 1, status: "active", billboard_id: null, location_id: locationId })
            .eq("id", item.media_player_id);
          await logStockMovement({
            equipment_id: item.media_player_id,
            equipment_code: mp?.code || item.equipment_code || "",
            equipment_name: mp?.name || item.equipment_name || "",
            movement_type: "receive",
            quantity: good,
            stock_before: before,
            stock_after: 1,
            reference_type: "route_return",
            reference_document: documentNo,
            location_id: locationId,
            notes: notes.trim() || "คืนของดีจากหน้างาน",
            item_condition: "good",
          });
        } else if (item.equipment_id) {
          const { data: eq } = await supabase
            .from("equipment")
            .select("quantity_in_stock")
            .eq("id", item.equipment_id)
            .maybeSingle();
          const before = eq?.quantity_in_stock || 0;
          const after = before + good;
          const { error: upErr } = await supabase
            .from("equipment")
            .update({ quantity_in_stock: after })
            .eq("id", item.equipment_id);
          if (upErr) throw upErr;
          await logStockMovement({
            equipment_id: item.equipment_id,
            equipment_code: item.equipment_code || "",
            equipment_name: item.equipment_name || "",
            movement_type: "receive",
            quantity: good,
            stock_before: before,
            stock_after: after,
            reference_type: "route_return",
            reference_document: documentNo,
            location_id: locationId,
            notes: notes.trim() || "คืนของดีจากหน้างาน",
            item_condition: "good",
          });
        }
      }

      // 2) Defective tickets — warehouse must confirm before stock lands in WH-DEFECT
      if (defective > 0 || extraDefective > 0) {
        const reasonText = await buildReason();
        if (defective > 0) await createDefectiveTicket(defective, reasonText, false);
        if (extraDefective > 0) await createDefectiveTicket(extraDefective, reasonText, true);
      }

      // 3) Update the issue line
      const newGood = (item.returned_good_qty || 0) + good;
      const newDefective = (item.returned_defective_qty || 0) + defective;
      const { error: lineErr } = await supabase
        .from("goods_issue_pending_items")
        .update({
          returned_good_qty: newGood,
          returned_defective_qty: newDefective,
          returned_at: new Date().toISOString(),
          returned_by: user?.id || null,
          return_location_id: locationId || null,
          notes: `${item.notes || ""} | รับคืน ดี ${good} / เสีย ${defective}${extraDefective ? ` (+นอกยอด ${extraDefective})` : ""}`,
        } as any)
        .eq("id", item.id);
      if (lineErr) throw lineErr;

      // 4) Roll up to the header
      const { data: lines } = await supabase
        .from("goods_issue_pending_items")
        .select("issued_quantity, quantity, billboard_id, returned_good_qty, returned_defective_qty")
        .eq("pending_id", pendingId);
      const totalReturned = (lines || []).reduce(
        (s: number, l: any) => s + (l.returned_good_qty || 0) + (l.returned_defective_qty || 0),
        0,
      );
      const allSettled = (lines || []).every((l: any) => {
        const iq = l.issued_quantity ?? l.quantity ?? 0;
        const inst = l.billboard_id ? iq : 0;
        return (l.returned_good_qty || 0) + (l.returned_defective_qty || 0) + inst >= iq;
      });
      await supabase
        .from("goods_issue_pending")
        .update({
          return_quantity: totalReturned,
          returned_at: new Date().toISOString(),
          returned_by: user?.id || null,
          ...(allSettled ? { status: "returned", is_complete: true } : { status: "partial_return" }),
        } as any)
        .eq("id", pendingId);

      toast.success(
        `บันทึกการรับคืนสำเร็จ — ของดี ${good} เข้าคลังแล้ว${defective + extraDefective > 0 ? `, ของเสีย ${defective + extraDefective} รอคลังกดรับเข้า` : ""}`,
      );
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("เกิดข้อผิดพลาด: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            รับคืนสินค้า (แยกของดี / ของเสีย)
          </DialogTitle>
          <DialogDescription>
            เอกสาร {documentNo} · {item?.equipment_code} {item?.equipment_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 rounded-lg bg-muted/50 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">เบิก</div>
              <div className="font-semibold">{issuedQty} {item?.unit}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">ติดตั้งแล้ว</div>
              <div className="font-semibold text-blue-600">{installedQty}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">คืนแล้ว</div>
              <div className="font-semibold text-green-600">{alreadyReturned}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">ค้าง</div>
              <div className="font-semibold text-orange-600">{outstanding}</div>
            </div>
          </div>

          {item?.serial_number && (
            <Badge variant="outline" className="font-mono text-xs">S/N: {item.serial_number}</Badge>
          )}

          {/* GOOD */}
          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center gap-2 font-medium text-green-700">
              <PackageCheck className="w-4 h-4" /> คืนของดี (เข้าสต็อกทันที)
            </div>
            <div className="space-y-2">
              <Label>จำนวน</Label>
              <Input
                type="number"
                min={0}
                max={outstanding}
                value={goodQty}
                onChange={(e) => setGoodQty(e.target.value)}
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
              />
            </div>
            {good > 0 && (
              <>
                <div className="space-y-2">
                  <Label>ฝ่าย</Label>
                  <SimpleDepartmentSelect
                    value={department}
                    onChange={(val) => {
                      setDepartment(val);
                      setWarehouseId("");
                      setLocationId("");
                    }}
                  />
                </div>
                <WarehouseLocationSelect
                  department={department}
                  warehouseId={warehouseId}
                  onWarehouseChange={setWarehouseId}
                  locationId={locationId}
                  onLocationChange={setLocationId}
                />
              </>
            )}
          </div>

          {/* DEFECTIVE */}
          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center gap-2 font-medium text-destructive">
              <AlertTriangle className="w-4 h-4" /> คืนของเสีย (รอคลังกดรับเข้า)
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>จำนวน (จากยอดเบิก)</Label>
                <Input
                  type="number"
                  min={0}
                  max={outstanding}
                  value={defectiveQty}
                  onChange={(e) => setDefectiveQty(e.target.value)}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                />
              </div>
              <div className="space-y-2">
                <Label>ถอดจากป้าย (นอกยอดเบิก)</Label>
                <Input
                  type="number"
                  min={0}
                  value={extraDefectiveQty}
                  onChange={(e) => setExtraDefectiveQty(e.target.value)}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                />
              </div>
            </div>

            {(defective > 0 || extraDefective > 0) && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>อาการเสีย {isMP && <span className="text-destructive">*</span>}</Label>
                  <SymptomSelect value={symptomId} onChange={setSymptomId} />
                  <Textarea
                    placeholder="รายละเอียดอาการเพิ่มเติม..."
                    value={symptomOther}
                    onChange={(e) => setSymptomOther(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> ป้ายที่ถอดออกมา
                  </Label>
                  {autoBillboardLabel && (
                    <p className="text-xs text-muted-foreground">
                      ดึงอัตโนมัติจากป้ายที่ติดตั้งอยู่: <span className="font-medium">{autoBillboardLabel}</span>
                    </p>
                  )}
                  <BillboardSelect value={billboardId} onChange={setBillboardId} />
                  {isMP && (
                    <p className="text-xs text-muted-foreground">
                      ระบบจะสร้างคำขอ Swap ให้อัตโนมัติเมื่อคลังกดรับเข้าของเสียใบนี้
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label>หมายเหตุ</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button onClick={handleSave} disabled={saving || !!error}>
            {saving ? "กำลังบันทึก..." : "บันทึกการรับคืน"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
