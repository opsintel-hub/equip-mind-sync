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
import { SymptomSelect } from "@/components/media-player/SymptomSelect";
import { useAuth } from "@/hooks/useAuth";
import { formatBillboardLabel } from "@/lib/billboardUtils";
import { ReturnPhotoDropzone } from "./ReturnPhotoDropzone";
import { balanceIssueReturn, defaultReturnBillboard, validReturnBillboard, type ReturnBillboard } from "@/lib/issueReturnForm";

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
  installed_qty?: number | null;
  written_off_qty?: number | null;
  transferred_qty?: number | null;
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
  /** Purpose needs both billboard + return: installing does not reduce what must be returned */
  independentOfInstall?: boolean;
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
  independentOfInstall = false,
}: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const [goodQty, setGoodQty] = useState("0");

  const [defectiveQty, setDefectiveQty] = useState("0");
  const [symptomId, setSymptomId] = useState("");
  const [symptomOther, setSymptomOther] = useState("");
  const [billboardId, setBillboardId] = useState("");
  const [docBillboards, setDocBillboards] = useState<ReturnBillboard[]>([]);
  const [notes, setNotes] = useState("");
  const [goodPhotos, setGoodPhotos] = useState<string[]>([]);
  const [defPhotos, setDefPhotos] = useState<string[]>([]);

  const isMP = !!(item?.media_player_id || item?.is_media_player);
  const issuedQty = item ? item.issued_quantity ?? item.quantity : 0;
  const alreadyReturned = (item?.returned_good_qty || 0) + (item?.returned_defective_qty || 0);
  const installedQty = item ? (item.installed_qty != null ? Number(item.installed_qty) : item.billboard_id ? issuedQty : 0) : 0;
  const outstanding = Math.max(0, issuedQty - alreadyReturned - (independentOfInstall ? 0 : installedQty)
    - Number(item?.written_off_qty || 0) - Number(item?.transferred_qty || 0));

  useEffect(() => {
    if (!open || !item) return;
    setGoodQty(String(outstanding));
    setDefectiveQty("0");
    setSymptomId("");
    setSymptomOther("");
    setNotes("");
    setGoodPhotos([]);
    setDefPhotos([]);
    setBillboardId("");
    setDocBillboards([]);

    let cancelled = false;
    // Only assignments belonging to this issue item/document are return choices.
    (async () => {
      const map = new Map<string, ReturnBillboard>();
      if (item.equipment_id && !isMP && documentNo) {
        const { data: rows, error: loadError } = await supabase
          .from("billboard_equipment")
          .select("billboard_id, quantity, billboards(old_code, location_name, equipment_id)")
          .eq("equipment_id", item.equipment_id)
          .ilike("notes", `จากเอกสาร ${documentNo} - %`);
        if (cancelled) return;
        if (loadError) toast.error("โหลดป้ายของใบเบิกไม่สำเร็จ");
        (rows || []).forEach((r: any) => {
          const current = map.get(r.billboard_id);
          map.set(r.billboard_id, {
            id: r.billboard_id,
            label: formatBillboardLabel(r.billboards?.old_code, r.billboards?.location_name, r.billboards?.equipment_id),
            qty: (current?.qty || 0) + Number(r.quantity || 0),
          });
        });
      }
      // The line's saved assignment is authoritative; do not use an MP's unrelated current location.
      if (item.billboard_id && !map.has(item.billboard_id)) {
        const { data: bb, error: loadError } = await supabase
          .from("billboards")
          .select("old_code, location_name, equipment_id")
          .eq("id", item.billboard_id)
          .maybeSingle();
        if (cancelled) return;
        if (loadError) toast.error("โหลดป้ายของใบเบิกไม่สำเร็จ");
        if (bb) map.set(item.billboard_id, {
          id: item.billboard_id,
          label: formatBillboardLabel(bb.old_code, bb.location_name, bb.equipment_id),
          qty: installedQty,
        });
      }
      if (cancelled) return;
      const list = Array.from(map.values());
      setDocBillboards(list);
      setBillboardId(defaultReturnBillboard(list));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id]);

  // Good + defective (from issued qty) can never exceed what is still outstanding
  const good = Math.min(outstanding, Math.max(0, parseInt(goodQty || "0") || 0));
  const defective = Math.min(outstanding - good, Math.max(0, parseInt(defectiveQty || "0") || 0));

  const error = useMemo(() => {
    if (!item) return "ไม่พบรายการ";
    if (good + defective === 0) return "กรุณาระบุจำนวนที่ส่งคืนอย่างน้อย 1 ชิ้น";
    if ((defective > 0) && !symptomId && !symptomOther.trim())
      return "กรุณาระบุอาการเสีย";
    if (good > 0 && goodPhotos.length < 1) return "กรุณาแนบรูปของดีอย่างน้อย 1 รูป";
    if ((defective > 0) && defPhotos.length < 1) return "กรุณาแนบรูปของเสียอย่างน้อย 1 รูป";
    if (defective > 0 && docBillboards.length > 1 && !validReturnBillboard(docBillboards, billboardId))
      return "กรุณาระบุป้ายที่ถอดอุปกรณ์ออกมา";
    return null;
  }, [item, good, defective, symptomId, symptomOther, billboardId, docBillboards, goodPhotos, defPhotos]);

  const buildReason = async () => {
    let symptomName = "";
    if (symptomId) {
      const { data } = await supabase.from("mp_symptoms").select("name").eq("id", symptomId).maybeSingle();
      symptomName = data?.name || "";
    }
    return [symptomName, symptomOther.trim()].filter(Boolean).join(" - ") || "ของเสียจากหน้างาน";
  };

  const createDefectiveTicket = async (qty: number, reasonText: string) => {
    if (!item) throw new Error("ไม่พบรายการ");
    const docNo = genDocNo();
    const { error: insErr } = await supabase.from("defective_returns").insert({
      document_no: docNo,
      equipment_id: isMP ? null : item.equipment_id,
      media_player_id: isMP ? item.media_player_id : null,
      is_media_player: isMP,
      quantity: qty,
      billboard_id: validReturnBillboard(docBillboards, billboardId),
      item_condition: "defective",
      reason: `[คืนจากหน้างาน] ${reasonText}${item.serial_number ? ` | S/N: ${item.serial_number}` : ""}`,
      status: "pending_warehouse_entry",
      source_type: "from_issue",
      symptom_id: symptomId || null,
      symptom_other: symptomOther.trim() || null,
      source_issue_item_id: item.id,
      source_document: documentNo,
      dispose_status: "pending_disposal_review",
      reporter_name: requesterName || null,
      reporter_department: requesterDepartment || null,
      notes: notes.trim() || null,
      return_photos: defPhotos,
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
      // 1) Good items: submit to warehouse — stock lands only after warehouse confirms + picks location
      if (good > 0) {
        const { error: gErr } = await supabase.from("issue_good_returns").insert({
          pending_id: pendingId,
          pending_item_id: item.id,
          document_no: documentNo,
          equipment_id: isMP ? null : item.equipment_id,
          media_player_id: item.media_player_id || null,
          is_media_player: isMP,
          equipment_code: item.equipment_code,
          equipment_name: item.equipment_name,
          serial_number: item.serial_number,
          quantity: good,
          unit: item.unit,
          department: requesterDepartment || null,
          notes: notes.trim() || null,
          submitted_by: user?.id,
          submitted_by_name: requesterName || null,
          photos: goodPhotos,
        } as any);
        if (gErr) throw gErr;
      }

      // 2) Defective tickets — warehouse must confirm before stock lands in WH-DEFECT
      if (defective > 0) {
        const reasonText = await buildReason();
        if (defective > 0) await createDefectiveTicket(defective, reasonText);
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
          notes: `${item.notes || ""} | ส่งคืน ดี ${good} / เสีย ${defective}`,
        } as any)
        .eq("id", item.id);
      if (lineErr) throw lineErr;

      // 4) Roll up to the header
      const { data: lines } = await supabase
        .from("goods_issue_pending_items")
        .select("issued_quantity, quantity, billboard_id, installed_qty, returned_good_qty, returned_defective_qty")
        .eq("pending_id", pendingId);
      const totalReturned = (lines || []).reduce(
        (s: number, l: any) => s + (l.returned_good_qty || 0) + (l.returned_defective_qty || 0),
        0,
      );
      const allSettled = (lines || []).every((l: any) => {
        const iq = l.issued_quantity ?? l.quantity ?? 0;
        const inst = independentOfInstall ? 0 : l.installed_qty != null ? Number(l.installed_qty) : l.billboard_id ? iq : 0;
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
        `บันทึกการส่งคืนสำเร็จ — ${good > 0 ? `ของดี ${good} ส่งให้คลังแล้ว` : ""}${defective > 0 ? `, ของเสีย ${defective} รอคลังกดรับเข้า` : ""}`,
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
            ส่งคืนสินค้า (แยกของดี / ของเสีย)
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
              <PackageCheck className="w-4 h-4" /> คืนของดี (รอคลังกดรับเข้า)
            </div>
            <div className="space-y-2">
              <Label>จำนวน</Label>
              <Input
                type="number"
                min={0}
                max={outstanding}
                value={goodQty}
                onChange={(e) => {
                  const balance = balanceIssueReturn(outstanding, e.target.value);
                  setGoodQty(String(balance.selected));
                  setDefectiveQty(String(balance.remaining));
                }}
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
              />
            </div>
            {good > 0 && (
              <ReturnPhotoDropzone photos={goodPhotos} onChange={setGoodPhotos} folder="good" label="รูปของดี" />
            )}
            <p className="text-xs text-muted-foreground">ของดีจะถูกส่งให้เจ้าหน้าที่คลังเลือกคลังและตำแหน่งจัดเก็บ ก่อนเข้าสต็อก</p>
          </div>

          {/* DEFECTIVE */}
          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center gap-2 font-medium text-destructive">
              <AlertTriangle className="w-4 h-4" /> คืนของเสีย (รอคลังกดรับเข้า)
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>จำนวน (จากยอดเบิก)</Label>
                <Input
                  type="number"
                  min={0}
                  max={outstanding}
                  value={defectiveQty}
                  onChange={(e) => {
                    const balance = balanceIssueReturn(outstanding, e.target.value);
                    setDefectiveQty(String(balance.selected));
                    setGoodQty(String(balance.remaining));
                  }}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                />
              </div>
            </div>

            {(defective > 0) && (
              <>
                <Separator />
                <ReturnPhotoDropzone photos={defPhotos} onChange={setDefPhotos} folder="defective" label="รูปของเสีย" />
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
                {docBillboards.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> ป้ายที่ระบุไว้ในใบเบิก
                    </Label>
                    {docBillboards.length === 1 ? (
                      <p className="text-sm">{docBillboards[0].label}</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {docBillboards.map((b) => (
                          <Button
                            key={b.id}
                            type="button"
                            size="sm"
                            variant={billboardId === b.id ? "default" : "outline"}
                            className="h-auto min-h-7 whitespace-normal text-left text-xs"
                            onClick={() => setBillboardId(b.id)}
                          >
                            {b.label} ({b.qty})
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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
            {saving ? "กำลังบันทึก..." : "บันทึกการส่งคืน"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
