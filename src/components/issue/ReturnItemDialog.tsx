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
import { RefreshCw, PackageCheck, AlertTriangle, MapPin, Plus, Trash2 } from "lucide-react";
import { SymptomSelect } from "@/components/media-player/SymptomSelect";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { formatBillboardLabel } from "@/lib/billboardUtils";
import { ReturnPhotoDropzone } from "./ReturnPhotoDropzone";
import { balanceIssueReturn, validateDefectiveAllocations, type DefectiveAllocation, type ReturnBillboard } from "@/lib/issueReturnForm";

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
  const [saving, setSaving] = useState(false);

  const [goodQty, setGoodQty] = useState("0");

  const [defectiveQty, setDefectiveQty] = useState("0");
  const [symptomId, setSymptomId] = useState("");
  const [symptomOther, setSymptomOther] = useState("");
  const [allocations, setAllocations] = useState<DefectiveAllocation[]>([]);
  const [loadingBillboards, setLoadingBillboards] = useState(false);
  const [billboardLoadError, setBillboardLoadError] = useState(false);
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
    setAllocations([]);
    setLoadingBillboards(true);
    setBillboardLoadError(false);
    setDocBillboards([]);

    let cancelled = false;
    // Only assignments belonging to this issue item/document are return choices.
    (async () => {
      const { data, error: loadError } = await supabase.rpc("issue_return_billboards", { _item_id: item.id });
      if (cancelled) return;
      setLoadingBillboards(false);
      if (loadError) {
        setBillboardLoadError(true);
        toast.error("โหลดป้ายของใบเบิกไม่สำเร็จ");
        return;
      }
      const list: ReturnBillboard[] = (data || []).map((b) => ({
        id: b.id,
        label: formatBillboardLabel(b.old_code, b.location_name, b.equipment_code),
        qty: Number(b.qty),
      }));
      setDocBillboards(list);
      setAllocations(list.length === 1 ? [{ billboardId: list[0].id, quantity: "0" }] : []);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id]);

  // Good + defective (from issued qty) can never exceed what is still outstanding
  const good = Math.min(outstanding, Math.max(0, parseInt(goodQty || "0") || 0));
  const defective = Math.min(outstanding - good, Math.max(0, parseInt(defectiveQty || "0") || 0));

  useEffect(() => {
    if (docBillboards.length !== 1) return;
    setAllocations([{ billboardId: docBillboards[0].id, quantity: String(defective) }]);
  }, [defective, docBillboards]);

  const error = useMemo(() => {
    if (!item) return "ไม่พบรายการ";
    if (loadingBillboards) return "กำลังโหลดป้ายของใบเบิก...";
    if (billboardLoadError) return "โหลดป้ายไม่สำเร็จ กรุณาปิดแล้วเปิดหน้าต่างใหม่";
    if (good + defective === 0) return "กรุณาระบุจำนวนที่ส่งคืนอย่างน้อย 1 ชิ้น";
    if ((defective > 0) && !symptomId && !symptomOther.trim())
      return "กรุณาระบุอาการเสีย";
    if (good > 0 && goodPhotos.length < 1) return "กรุณาแนบรูปของดีอย่างน้อย 1 รูป";
    if ((defective > 0) && defPhotos.length < 1) return "กรุณาแนบรูปของเสียอย่างน้อย 1 รูป";
    return validateDefectiveAllocations(docBillboards, allocations, defective);
  }, [item, good, defective, symptomId, symptomOther, allocations, docBillboards, goodPhotos, defPhotos, loadingBillboards, billboardLoadError]);

  const handleSave = async () => {
    if (!item || error) {
      if (error) toast.error(error);
      return;
    }
    setSaving(true);
    try {
      const { error: saveError } = await supabase.rpc("submit_issue_return", {
        _item_id: item.id,
        _good: good,
        _defective: defective,
        _allocations: defective > 0 && docBillboards.length > 0
          ? allocations.map((a) => ({ billboard_id: a.billboardId, quantity: Number(a.quantity) })) : [],
        _symptom_id: symptomId || null,
        _symptom_other: symptomOther.trim(),
        _notes: notes.trim(),
        _good_photos: goodPhotos,
        _defective_photos: defPhotos,
      });
      if (saveError) throw saveError;

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
            <Badge variant="outline" className="font-mono text-xs whitespace-pre-line">S/N: {item.serial_number}</Badge>
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
                    <div className="space-y-2">
                      {allocations.map((allocation, index) => {
                        const selected = docBillboards.find((b) => b.id === allocation.billboardId);
                        return (
                          <div key={index} className="grid grid-cols-[minmax(0,1fr)_5rem_2rem] items-start gap-2">
                            <div className="min-w-0 space-y-1">
                              <SearchableSelect
                                value={allocation.billboardId}
                                placeholder="เลือกป้ายจากใบเบิก"
                                searchPlaceholder="ค้นหาป้าย..."
                                options={docBillboards.map((b) => ({
                                  value: b.id, label: b.label,
                                  description: `ติดตั้งคงเหลือ ${b.qty} ${item?.unit || ""}`,
                                  disabled: allocations.some((a, i) => i !== index && a.billboardId === b.id),
                                }))}
                                onValueChange={(value) => setAllocations((rows) => rows.map((a, i) => i === index ? { ...a, billboardId: value } : a))}
                              />
                              {selected && <p className="text-xs text-muted-foreground">ติดตั้งคงเหลือ {selected.qty} {item?.unit}</p>}
                            </div>
                            <Input
                              type="number" min={1} max={selected?.qty || 0} step={1}
                              aria-label={`จำนวนของเสียป้าย ${index + 1}`}
                              value={allocation.quantity}
                              onChange={(e) => setAllocations((rows) => rows.map((a, i) => i === index ? { ...a, quantity: e.target.value } : a))}
                              onWheel={(e) => e.currentTarget.blur()}
                            />
                            <Button type="button" size="icon" variant="ghost" className="h-9 w-8"
                              disabled={docBillboards.length === 1}
                              title="ลบแถวป้าย" aria-label={`ลบแถวป้าย ${index + 1}`}
                              onClick={() => setAllocations((rows) => rows.filter((_, i) => i !== index))}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                      {docBillboards.length > 1 && (
                        <Button type="button" variant="outline" size="sm"
                          disabled={allocations.length >= docBillboards.length}
                          onClick={() => setAllocations((rows) => [...rows, { billboardId: "", quantity: "1" }])}>
                          <Plus className="mr-1 h-4 w-4" /> เพิ่มป้าย
                        </Button>
                      )}
                      <p className="text-sm">ยอดแยกป้าย {allocations.reduce((sum, a) => sum + (Number(a.quantity) || 0), 0)} / ของเสีย {defective} {item?.unit}</p>
                    </div>
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
