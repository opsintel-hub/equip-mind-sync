import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, Package, MapPin, Send, Loader2, Info, PlusCircle, X, ImagePlus, ClipboardCheck, FileCheck2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

interface EquipmentItem {
  id: string; code: string; name: string; unit: string; category: string;
  brand: string | null; serial_number: string | null; department: string | null;
  quantity_in_stock: number; location_id: string | null;
}
interface MediaPlayerItem {
  id: string; code: string; name: string; unit: string; brand: string | null;
  serial_number_1: string | null; department: string | null; quantity: number;
  location_id: string | null; billboard_id: string | null;
}
interface BillboardEquipmentRecord {
  id: string; billboard_id: string; equipment_id: string; quantity: number;
  installation_date: string | null; notes: string | null;
  billboard_old_code?: string; billboard_location?: string;
}
interface DefectiveUnitEntry {
  id: string; serial_number: string; reason: string; item_condition: string;
  image_file: File | null; image_preview: string | null;
}

const DefectiveReturnEntry = () => {
  const { user } = useAuth();
  const [isMediaPlayer, setIsMediaPlayer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
  const [mediaPlayerList, setMediaPlayerList] = useState<MediaPlayerItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [detectedBillboards, setDetectedBillboards] = useState<BillboardEquipmentRecord[]>([]);
  const [selectedBillboardEquipmentId, setSelectedBillboardEquipmentId] = useState("");
  const [isLoadingBillboard, setIsLoadingBillboard] = useState(false);
  const [perUnitMode, setPerUnitMode] = useState(false);
  const [defectiveUnits, setDefectiveUnits] = useState<DefectiveUnitEntry[]>([
    { id: crypto.randomUUID(), serial_number: "", reason: "", item_condition: "defective", image_file: null, image_preview: null }
  ]);
  const [quantity, setQuantity] = useState("1");
  const [itemCondition, setItemCondition] = useState("defective");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const selectedEquipment = useMemo(() => equipmentList.find(e => e.id === selectedItemId), [equipmentList, selectedItemId]);
  const selectedMediaPlayer = useMemo(() => mediaPlayerList.find(m => m.id === selectedItemId), [mediaPlayerList, selectedItemId]);
  const selectedBillboardRecord = useMemo(() => detectedBillboards.find(b => b.id === selectedBillboardEquipmentId), [detectedBillboards, selectedBillboardEquipmentId]);

  useEffect(() => { fetchEquipment(); fetchMediaPlayers(); }, []);
  useEffect(() => {
    if (selectedItemId && !isMediaPlayer) detectBillboardForEquipment(selectedItemId);
    else if (selectedItemId && isMediaPlayer) detectBillboardForMediaPlayer(selectedItemId);
    else { setDetectedBillboards([]); setSelectedBillboardEquipmentId(""); }
  }, [selectedItemId, isMediaPlayer]);

  const fetchEquipment = async () => {
    const { data } = await supabase.from("equipment").select("id, code, name, unit, category, brand, serial_number, department, quantity_in_stock, location_id").eq("is_active", true).order("code");
    if (data) setEquipmentList(data);
  };
  const fetchMediaPlayers = async () => {
    const { data } = await supabase.from("media_players").select("id, code, name, unit, brand, serial_number_1, department, quantity, location_id, billboard_id").eq("is_active", true).order("code");
    if (data) setMediaPlayerList(data as MediaPlayerItem[]);
  };
  const detectBillboardForEquipment = async (equipmentId: string) => {
    setIsLoadingBillboard(true);
    try {
      const { data } = await supabase.from("billboard_equipment").select("id, billboard_id, equipment_id, quantity, installation_date, notes").eq("equipment_id", equipmentId);
      if (data && data.length > 0) {
        const billboardIds = data.map(d => d.billboard_id);
        const { data: billboards } = await supabase.from("billboards").select("id, old_code, location_name").in("id", billboardIds);
        const enriched = data.map(be => {
          const bb = billboards?.find(b => b.id === be.billboard_id);
          return { ...be, billboard_old_code: bb?.old_code || "-", billboard_location: bb?.location_name || "-" };
        });
        setDetectedBillboards(enriched);
        if (enriched.length === 1) setSelectedBillboardEquipmentId(enriched[0].id);
      } else { setDetectedBillboards([]); setSelectedBillboardEquipmentId(""); }
    } catch { setDetectedBillboards([]); } finally { setIsLoadingBillboard(false); }
  };
  const detectBillboardForMediaPlayer = async (mediaPlayerId: string) => {
    const mp = mediaPlayerList.find(m => m.id === mediaPlayerId);
    if (mp?.billboard_id) {
      setIsLoadingBillboard(true);
      try {
        const { data: bb } = await supabase.from("billboards").select("id, old_code, location_name").eq("id", mp.billboard_id).single();
        if (bb) {
          const record: BillboardEquipmentRecord = { id: `mp-${mp.id}`, billboard_id: bb.id, equipment_id: mp.id, quantity: mp.quantity, installation_date: null, notes: null, billboard_old_code: bb.old_code || "-", billboard_location: bb.location_name || "-" };
          setDetectedBillboards([record]); setSelectedBillboardEquipmentId(record.id);
        }
      } catch { setDetectedBillboards([]); } finally { setIsLoadingBillboard(false); }
    } else { setDetectedBillboards([]); setSelectedBillboardEquipmentId(""); }
  };

  const equipmentOptions = useMemo(() => {
    if (isMediaPlayer) return mediaPlayerList.map(mp => ({ value: mp.id, label: `${mp.code} - ${mp.name}` }));
    return equipmentList.map(e => ({ value: e.id, label: `${e.code} - ${e.name}` }));
  }, [isMediaPlayer, mediaPlayerList, equipmentList]);

  const maxQuantity = useMemo(() => {
    if (selectedBillboardRecord && !isMediaPlayer) return selectedBillboardRecord.quantity;
    if (isMediaPlayer && selectedMediaPlayer) return selectedMediaPlayer.quantity;
    if (selectedEquipment) return selectedEquipment.quantity_in_stock;
    return 999;
  }, [selectedBillboardRecord, isMediaPlayer, selectedMediaPlayer, selectedEquipment]);

  const isFromBillboard = selectedBillboardEquipmentId !== "" && detectedBillboards.length > 0;
  const generateDocNo = () => `DR-${format(new Date(), "yyyyMMdd")}-${Math.floor(Math.random() * 9999 + 1).toString().padStart(4, "0")}`;

  const handleReset = () => {
    setSelectedItemId(""); setSelectedBillboardEquipmentId(""); setDetectedBillboards([]);
    setQuantity("1"); setItemCondition("defective"); setReason(""); setNotes("");
    setPerUnitMode(false);
    setDefectiveUnits([{ id: crypto.randomUUID(), serial_number: "", reason: "", item_condition: "defective", image_file: null, image_preview: null }]);
  };

  const handleSubmit = async () => {
    if (!selectedItemId) { toast.error("กรุณาเลือกสินค้า"); return; }

    if (perUnitMode) {
      const validUnits = defectiveUnits.filter(u => u.serial_number.trim() && u.reason.trim());
      if (validUnits.length === 0) { toast.error("กรุณากรอก Serial Number และเหตุผล อย่างน้อย 1 ชิ้น"); return; }
      setIsSubmitting(true);
      try {
        let successCount = 0;
        for (const unitEntry of validUnits) {
          const docNo = generateDocNo();
          const { error } = await supabase.from("defective_returns").insert({
            document_no: docNo, equipment_id: isMediaPlayer ? null : selectedItemId,
            media_player_id: isMediaPlayer ? selectedItemId : null, is_media_player: isMediaPlayer,
            quantity: 1, billboard_id: selectedBillboardRecord?.billboard_id || null,
            item_condition: unitEntry.item_condition, reason: `S/N: ${unitEntry.serial_number} - ${unitEntry.reason}`,
            status: "pending_warehouse_entry", source_type: isFromBillboard ? "billboard" : "warehouse", created_by: user?.id,
          });
          if (!error) {
            successCount++;
            // Update equipment_serial_numbers status to defective
            if (!isMediaPlayer && unitEntry.serial_number.trim()) {
              await supabase.from("equipment_serial_numbers").update({ status: "defective" })
                .eq("equipment_id", selectedItemId)
                .eq("serial_number", unitEntry.serial_number.trim())
                .eq("status", "in_stock");
            }
          }
        }
        if (isFromBillboard && !isMediaPlayer) {
          const be = detectedBillboards.find(b => b.id === selectedBillboardEquipmentId);
          if (be) {
            const totalQty = validUnits.length;
            await supabase.from("billboard_equipment_history").insert({ billboard_id: be.billboard_id, equipment_id: selectedItemId, quantity: totalQty, installation_date: be.installation_date, uninstall_date: new Date().toISOString().split("T")[0], uninstalled_by: user?.id, uninstall_reason: `ของเสีย: ${validUnits.map(u => u.serial_number).join(", ")}`, installation_notes: be.notes });
            if (totalQty >= be.quantity) await supabase.from("billboard_equipment").delete().eq("id", be.id);
            else await supabase.from("billboard_equipment").update({ quantity: be.quantity - totalQty }).eq("id", be.id);
          }
        }
        if (isFromBillboard && isMediaPlayer) await supabase.from("media_players").update({ billboard_id: null, status: "defective" }).eq("id", selectedItemId);
        toast.success(`บันทึกของเสีย/ชำรุดสำเร็จ ${successCount} รายการ`);
        handleReset();
      } catch (error: any) { toast.error("เกิดข้อผิดพลาด: " + error.message); } finally { setIsSubmitting(false); }
    } else {
      if (!reason.trim()) { toast.error("กรุณาระบุเหตุผล/สาเหตุ"); return; }
      const qty = parseInt(quantity);
      if (!qty || qty < 1) { toast.error("กรุณาระบุจำนวนที่ถูกต้อง"); return; }
      if (qty > maxQuantity) { toast.error(`จำนวนเกินกว่าที่มีอยู่ (สูงสุด ${maxQuantity})`); return; }
      setIsSubmitting(true);
      try {
        const docNo = generateDocNo();
        const billboardId = selectedBillboardRecord?.billboard_id || null;
        const { error: insertError } = await supabase.from("defective_returns").insert({ document_no: docNo, equipment_id: isMediaPlayer ? null : selectedItemId, media_player_id: isMediaPlayer ? selectedItemId : null, is_media_player: isMediaPlayer, quantity: qty, billboard_id: billboardId, item_condition: itemCondition, reason: reason.trim(), status: "pending_warehouse_entry", source_type: isFromBillboard ? "billboard" : "warehouse", created_by: user?.id });
        if (insertError) throw insertError;
        if (isFromBillboard && billboardId && !isMediaPlayer) {
          const be = detectedBillboards.find(b => b.id === selectedBillboardEquipmentId);
          if (be) {
            await supabase.from("billboard_equipment_history").insert({ billboard_id: billboardId, equipment_id: selectedItemId, quantity: qty, installation_date: be.installation_date, uninstall_date: new Date().toISOString().split("T")[0], uninstalled_by: user?.id, uninstall_reason: `ของเสีย/ชำรุด: ${reason}`, installation_notes: be.notes });
            if (qty >= be.quantity) await supabase.from("billboard_equipment").delete().eq("id", be.id);
            else await supabase.from("billboard_equipment").update({ quantity: be.quantity - qty }).eq("id", be.id);
          }
        }
        if (isFromBillboard && isMediaPlayer && billboardId) await supabase.from("media_players").update({ billboard_id: null, status: "defective" }).eq("id", selectedItemId);
        toast.success(`บันทึกของเสีย/ชำรุดสำเร็จ (${docNo})`); handleReset();
      } catch (error: any) { toast.error("เกิดข้อผิดพลาด: " + error.message); } finally { setIsSubmitting(false); }
    }
  };

  const displayItem = isMediaPlayer ? selectedMediaPlayer : selectedEquipment;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-destructive" />
          นำของเสีย/ชำรุดเข้าระบบ
        </h1>
        <p className="text-muted-foreground">บันทึกสินค้าหรืออุปกรณ์ที่เสียหรือชำรุดเพื่อรอนำเข้าคลัง</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>ข้อมูลสินค้าเสีย/ชำรุด</CardTitle>
            <CardDescription>เลือกสินค้า ระบบจะดึงข้อมูลเดิมมาให้อัตโนมัติ รวมถึงตรวจสอบว่าติดตั้งบนป้ายโฆษณาหรือไม่</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Label className="text-sm font-medium">ประเภท:</Label>
              <span className={`text-sm ${!isMediaPlayer ? "font-semibold text-primary" : "text-muted-foreground"}`}>สินค้า/อะไหล่</span>
              <Switch checked={isMediaPlayer} onCheckedChange={(v) => { setIsMediaPlayer(v); setSelectedItemId(""); setDetectedBillboards([]); setSelectedBillboardEquipmentId(""); }} />
              <span className={`text-sm ${isMediaPlayer ? "font-semibold text-primary" : "text-muted-foreground"}`}>Media Player</span>
            </div>

            <div className="space-y-2">
              <Label>เลือกสินค้า *</Label>
              <SearchableSelect options={equipmentOptions} value={selectedItemId} onValueChange={setSelectedItemId} placeholder="พิมพ์รหัสหรือชื่อสินค้าเพื่อค้นหา..." />
            </div>

            {isLoadingBillboard && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> กำลังตรวจสอบข้อมูลป้ายโฆษณา...
              </div>
            )}

            {!isLoadingBillboard && detectedBillboards.length > 0 && (
              <div className="p-4 rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                  <MapPin className="w-4 h-4" /> ตรวจพบว่าสินค้านี้ติดตั้งอยู่บนป้ายโฆษณา
                </div>
                {detectedBillboards.length === 1 ? (
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">ป้าย:</span> {detectedBillboards[0].billboard_old_code} - {detectedBillboards[0].billboard_location}</p>
                    <p><span className="font-medium">จำนวนติดตั้ง:</span> {detectedBillboards[0].quantity}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Info className="w-3 h-3" /> ระบบจะถอดสินค้าออกจากป้ายนี้อัตโนมัติเมื่อบันทึก</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-sm">เลือกป้ายที่ต้องการถอดออก:</Label>
                    <Select value={selectedBillboardEquipmentId} onValueChange={setSelectedBillboardEquipmentId}>
                      <SelectTrigger><SelectValue placeholder="เลือกป้ายโฆษณา..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">ไม่ระบุป้าย (จากคลัง)</SelectItem>
                        {detectedBillboards.map(be => (<SelectItem key={be.id} value={be.id}>{be.billboard_old_code} - {be.billboard_location} (จำนวน {be.quantity})</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {!isLoadingBillboard && selectedItemId && detectedBillboards.length === 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 text-sm text-muted-foreground">
                <Info className="w-4 h-4" /> สินค้านี้ไม่ได้ติดตั้งบนป้ายโฆษณา (จากคลัง/ภาคสนาม)
              </div>
            )}

            {/* Per-unit mode */}
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch id="perUnitDefective" checked={perUnitMode} onCheckedChange={(checked) => {
                    setPerUnitMode(checked);
                    if (!checked) setDefectiveUnits([{ id: crypto.randomUUID(), serial_number: "", reason: "", item_condition: "defective", image_file: null, image_preview: null }]);
                  }} />
                  <Label htmlFor="perUnitDefective" className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-2">
                    <Package className="w-4 h-4" /> ระบุข้อมูลรายชิ้น (S/N, เหตุผล, สภาพ, รูปภาพ)
                  </Label>
                </div>
                {perUnitMode && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setDefectiveUnits(prev => [...prev, { id: crypto.randomUUID(), serial_number: "", reason: "", item_condition: "defective", image_file: null, image_preview: null }])} className="gap-1 text-red-700 border-red-300 hover:bg-red-100 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/30">
                    <PlusCircle className="w-4 h-4" /> เพิ่มชิ้น
                  </Button>
                )}
              </div>
              {perUnitMode && (
                <>
                  <p className="text-xs text-red-600/80 dark:text-red-500/80">💡 กรอก S/N และเหตุผลของแต่ละชิ้น — ระบบจะสร้างรายการอัตโนมัติ ({defectiveUnits.length} ชิ้น)</p>
                  <div className="space-y-3">
                    {defectiveUnits.map((unitEntry, idx) => (
                      <div key={unitEntry.id} className="p-3 bg-background border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">ชิ้นที่ {idx + 1}</span>
                          {defectiveUnits.length > 1 && (
                            <Button type="button" variant="ghost" size="sm" className="h-7 text-destructive hover:text-destructive" onClick={() => { if (unitEntry.image_preview) URL.revokeObjectURL(unitEntry.image_preview); setDefectiveUnits(prev => prev.filter(u => u.id !== unitEntry.id)); }}>
                              <X className="w-3 h-3 mr-1" /> ลบ
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Serial Number *</Label>
                            <Input placeholder="กรอก S/N..." value={unitEntry.serial_number} onChange={e => setDefectiveUnits(prev => prev.map(u => u.id === unitEntry.id ? { ...u, serial_number: e.target.value } : u))} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">สภาพ *</Label>
                            <Select value={unitEntry.item_condition} onValueChange={(v) => setDefectiveUnits(prev => prev.map(u => u.id === unitEntry.id ? { ...u, item_condition: v } : u))}>
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="defective">เสีย/ชำรุด</SelectItem>
                                <SelectItem value="pending_inspection">รอตรวจสอบ</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">เหตุผล *</Label>
                            <Input placeholder="สาเหตุ..." value={unitEntry.reason} onChange={e => setDefectiveUnits(prev => prev.map(u => u.id === unitEntry.id ? { ...u, reason: e.target.value } : u))} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">รูปภาพ</Label>
                            <div className="flex items-center gap-2">
                              <input type="file" accept="image/*" className="hidden" id={`defect-image-${unitEntry.id}`} onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 10 * 1024 * 1024) { toast.error("ไฟล์ใหญ่เกินไป (สูงสุด 10MB)"); return; }
                                  if (unitEntry.image_preview) URL.revokeObjectURL(unitEntry.image_preview);
                                  const preview = URL.createObjectURL(file);
                                  setDefectiveUnits(prev => prev.map(u => u.id === unitEntry.id ? { ...u, image_file: file, image_preview: preview } : u));
                                }
                              }} />
                              {unitEntry.image_preview ? (
                                <div className="flex items-center gap-2">
                                  <img src={unitEntry.image_preview} alt="Preview" className="w-10 h-10 rounded object-cover border" />
                                  <Button type="button" variant="ghost" size="sm" className="h-7 text-destructive" onClick={() => { if (unitEntry.image_preview) URL.revokeObjectURL(unitEntry.image_preview); setDefectiveUnits(prev => prev.map(u => u.id === unitEntry.id ? { ...u, image_file: null, image_preview: null } : u)); }}><X className="w-3 h-3" /></Button>
                                </div>
                              ) : (
                                <Button type="button" variant="outline" size="sm" className="h-9 w-full" onClick={() => document.getElementById(`defect-image-${unitEntry.id}`)?.click()}>
                                  <ImagePlus className="w-4 h-4 mr-1" /> เลือกรูป
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {!perUnitMode && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>จำนวน *</Label>
                    <Input type="number" min="1" max={maxQuantity} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                    {maxQuantity < 999 && <p className="text-xs text-muted-foreground">สูงสุด: {maxQuantity}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>สถานะการใช้งาน *</Label>
                    <Select value={itemCondition} onValueChange={setItemCondition}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="defective">เสีย/ชำรุด</SelectItem>
                        <SelectItem value="pending_inspection">รอตรวจสอบการใช้งาน</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>เหตุผล/สาเหตุ *</Label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="ระบุสาเหตุที่เสียหรือชำรุด..." rows={3} />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>หมายเหตุเพิ่มเติม</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="หมายเหตุอื่นๆ (ถ้ามี)" rows={2} />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={handleSubmit} disabled={isSubmitting || !selectedItemId} className="flex-1">
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {perUnitMode ? `บันทึกของเสีย (${defectiveUnits.filter(u => u.serial_number.trim() && u.reason.trim()).length} ชิ้น)` : "บันทึกของเสีย/ชำรุด"}
              </Button>
              <Button variant="outline" onClick={handleReset}>ล้างข้อมูล</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4" /> ข้อมูลสินค้า</CardTitle></CardHeader>
          <CardContent>
            {displayItem ? (
              <div className="space-y-3 text-sm">
                <InfoRow label="รหัส" value={(displayItem as any).code} />
                <InfoRow label="ชื่อ" value={(displayItem as any).name} />
                <InfoRow label="หน่วย" value={(displayItem as any).unit} />
                {!isMediaPlayer && selectedEquipment && (<>
                  <InfoRow label="หมวดหมู่" value={selectedEquipment.category} />
                  <InfoRow label="ยี่ห้อ" value={selectedEquipment.brand || "-"} />
                  <InfoRow label="Serial No." value={selectedEquipment.serial_number || "-"} />
                  <InfoRow label="ฝ่าย" value={selectedEquipment.department || "-"} />
                  <InfoRow label="คงเหลือในคลัง" value={String(selectedEquipment.quantity_in_stock)} />
                </>)}
                {isMediaPlayer && selectedMediaPlayer && (<>
                  <InfoRow label="ยี่ห้อ" value={selectedMediaPlayer.brand || "-"} />
                  <InfoRow label="Serial No." value={selectedMediaPlayer.serial_number_1 || "-"} />
                  <InfoRow label="ฝ่าย" value={selectedMediaPlayer.department || "-"} />
                  <InfoRow label="จำนวน" value={String(selectedMediaPlayer.quantity)} />
                </>)}
                {isFromBillboard && selectedBillboardRecord && (
                  <div className="pt-2 border-t"><Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600"><MapPin className="w-3 h-3 mr-1" /> ติดตั้งบนป้าย: {selectedBillboardRecord.billboard_old_code}</Badge></div>
                )}
                <div className="pt-2 border-t">
                  {perUnitMode ? (
                    <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600">ระบุรายชิ้น: {defectiveUnits.length} ชิ้น</Badge>
                  ) : (
                    <Badge variant="outline" className={`text-xs ${itemCondition === "defective" ? "bg-destructive/10 text-destructive" : "bg-yellow-500/10 text-yellow-600"}`}>
                      {itemCondition === "defective" ? "เสีย/ชำรุด" : "รอตรวจสอบ"}
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">เลือกสินค้าเพื่อดูข้อมูล</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (<div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-medium text-right">{value || "-"}</span></div>);
}

export default DefectiveReturnEntry;
