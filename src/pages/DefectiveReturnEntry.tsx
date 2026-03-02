import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { SearchableSelect } from "@/components/ui/searchable-select";
import BillboardSelect from "@/components/billboard/BillboardSelect";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, Package, MapPin, Send, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

interface EquipmentItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  category: string;
  brand: string | null;
  serial_number: string | null;
  department: string | null;
  quantity_in_stock: number;
  location_id: string | null;
}

interface MediaPlayerItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  brand: string | null;
  serial_number_1: string | null;
  department: string | null;
  quantity: number;
  location_id: string | null;
  billboard_id: string | null;
}

interface BillboardEquipment {
  id: string;
  billboard_id: string;
  equipment_id: string;
  quantity: number;
  installation_date: string | null;
  notes: string | null;
}

const DefectiveReturnEntry = () => {
  const { user } = useAuth();
  const [isMediaPlayer, setIsMediaPlayer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Equipment data
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
  const [mediaPlayerList, setMediaPlayerList] = useState<MediaPlayerItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");

  // Billboard source
  const [isFromBillboard, setIsFromBillboard] = useState(false);
  const [selectedBillboardId, setSelectedBillboardId] = useState("");
  const [billboardEquipment, setBillboardEquipment] = useState<BillboardEquipment[]>([]);

  // Form fields
  const [quantity, setQuantity] = useState("1");
  const [itemCondition, setItemCondition] = useState("defective");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  // Auto-filled info
  const selectedEquipment = useMemo(() => equipmentList.find(e => e.id === selectedItemId), [equipmentList, selectedItemId]);
  const selectedMediaPlayer = useMemo(() => mediaPlayerList.find(m => m.id === selectedItemId), [mediaPlayerList, selectedItemId]);

  useEffect(() => {
    fetchEquipment();
    fetchMediaPlayers();
  }, []);

  // Fetch billboard equipment when billboard selected
  useEffect(() => {
    if (selectedBillboardId && !isMediaPlayer) {
      fetchBillboardEquipment(selectedBillboardId);
    }
  }, [selectedBillboardId, isMediaPlayer]);

  const fetchEquipment = async () => {
    const { data } = await supabase
      .from("equipment")
      .select("id, code, name, unit, category, brand, serial_number, department, quantity_in_stock, location_id")
      .eq("is_active", true)
      .order("code");
    if (data) setEquipmentList(data);
  };

  const fetchMediaPlayers = async () => {
    const { data } = await supabase
      .from("media_players")
      .select("id, code, name, unit, brand, serial_number_1, department, quantity, location_id, billboard_id")
      .eq("is_active", true)
      .order("code");
    if (data) setMediaPlayerList(data as MediaPlayerItem[]);
  };

  const fetchBillboardEquipment = async (billboardId: string) => {
    const { data } = await supabase
      .from("billboard_equipment")
      .select("*")
      .eq("billboard_id", billboardId);
    if (data) setBillboardEquipment(data);
  };

  // Equipment options for searchable select
  const equipmentOptions = useMemo(() => {
    if (isMediaPlayer) {
      return mediaPlayerList.map(mp => ({
        value: mp.id,
        label: `${mp.code} - ${mp.name}`,
      }));
    }
    
    // If from billboard, filter to equipment installed on that billboard
    if (isFromBillboard && selectedBillboardId) {
      const installedIds = new Set(billboardEquipment.map(be => be.equipment_id));
      return equipmentList
        .filter(e => installedIds.has(e.id))
        .map(e => ({ value: e.id, label: `${e.code} - ${e.name}` }));
    }
    
    return equipmentList.map(e => ({
      value: e.id,
      label: `${e.code} - ${e.name}`,
    }));
  }, [isMediaPlayer, mediaPlayerList, equipmentList, isFromBillboard, selectedBillboardId, billboardEquipment]);

  // Max quantity from billboard
  const maxQuantity = useMemo(() => {
    if (isFromBillboard && selectedBillboardId && selectedItemId) {
      const be = billboardEquipment.find(b => b.equipment_id === selectedItemId);
      return be?.quantity || 1;
    }
    if (isMediaPlayer && selectedMediaPlayer) return selectedMediaPlayer.quantity;
    if (selectedEquipment) return selectedEquipment.quantity_in_stock;
    return 999;
  }, [isFromBillboard, selectedBillboardId, selectedItemId, billboardEquipment, isMediaPlayer, selectedMediaPlayer, selectedEquipment]);

  const generateDocNo = () => {
    const dateStr = format(new Date(), "yyyyMMdd");
    const random = Math.floor(Math.random() * 9999 + 1).toString().padStart(4, "0");
    return `DR-${dateStr}-${random}`;
  };

  const handleReset = () => {
    setSelectedItemId("");
    setSelectedBillboardId("");
    setIsFromBillboard(false);
    setQuantity("1");
    setItemCondition("defective");
    setReason("");
    setNotes("");
    setBillboardEquipment([]);
  };

  const handleSubmit = async () => {
    if (!selectedItemId) {
      toast.error("กรุณาเลือกสินค้า");
      return;
    }
    if (!reason.trim()) {
      toast.error("กรุณาระบุเหตุผล/สาเหตุ");
      return;
    }
    const qty = parseInt(quantity);
    if (!qty || qty < 1) {
      toast.error("กรุณาระบุจำนวนที่ถูกต้อง");
      return;
    }
    if (qty > maxQuantity) {
      toast.error(`จำนวนเกินกว่าที่มีอยู่ (สูงสุด ${maxQuantity})`);
      return;
    }

    setIsSubmitting(true);

    try {
      const docNo = generateDocNo();

      // 1. Create defective_returns record
      const { error: insertError } = await supabase.from("defective_returns").insert({
        document_no: docNo,
        equipment_id: isMediaPlayer ? null : selectedItemId,
        media_player_id: isMediaPlayer ? selectedItemId : null,
        is_media_player: isMediaPlayer,
        quantity: qty,
        billboard_id: isFromBillboard ? selectedBillboardId : null,
        item_condition: itemCondition,
        reason: reason.trim(),
        status: "pending_warehouse_entry",
        source_type: isFromBillboard ? "billboard" : "warehouse",
        created_by: user?.id,
      });

      if (insertError) throw insertError;

      // 2. If from billboard, remove from billboard_equipment + create history
      if (isFromBillboard && selectedBillboardId && !isMediaPlayer) {
        const be = billboardEquipment.find(b => b.equipment_id === selectedItemId);
        if (be) {
          // Insert into history
          await supabase.from("billboard_equipment_history").insert({
            billboard_id: selectedBillboardId,
            equipment_id: selectedItemId,
            quantity: qty,
            installation_date: be.installation_date,
            uninstall_date: new Date().toISOString().split("T")[0],
            uninstalled_by: user?.id,
            uninstall_reason: `ของเสีย/ชำรุด: ${reason}`,
            installation_notes: be.notes,
          });

          // Remove or reduce quantity from billboard_equipment
          if (qty >= be.quantity) {
            await supabase.from("billboard_equipment").delete().eq("id", be.id);
          } else {
            await supabase.from("billboard_equipment").update({
              quantity: be.quantity - qty,
            }).eq("id", be.id);
          }
        }
      }

      // 3. If media player from billboard, clear billboard_id
      if (isFromBillboard && isMediaPlayer && selectedBillboardId) {
        await supabase.from("media_players").update({
          billboard_id: null,
          status: "defective",
        }).eq("id", selectedItemId);
      }

      toast.success(`บันทึกของเสีย/ชำรุดสำเร็จ (${docNo})`);
      handleReset();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setIsSubmitting(false);
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
        {/* Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>ข้อมูลสินค้าเสีย/ชำรุด</CardTitle>
            <CardDescription>เลือกสินค้า ระบบจะดึงข้อมูลเดิมมาให้อัตโนมัติ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Item type toggle */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Label className="text-sm font-medium">ประเภท:</Label>
              <span className={`text-sm ${!isMediaPlayer ? "font-semibold text-primary" : "text-muted-foreground"}`}>สินค้า/อะไหล่</span>
              <Switch checked={isMediaPlayer} onCheckedChange={(v) => { setIsMediaPlayer(v); setSelectedItemId(""); setIsFromBillboard(false); setSelectedBillboardId(""); }} />
              <span className={`text-sm ${isMediaPlayer ? "font-semibold text-primary" : "text-muted-foreground"}`}>Media Player</span>
            </div>

            {/* Billboard source */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm font-medium">มาจากป้ายโฆษณา:</Label>
              <Switch checked={isFromBillboard} onCheckedChange={(v) => { setIsFromBillboard(v); setSelectedBillboardId(""); setSelectedItemId(""); }} />
              {isFromBillboard && (
                <div className="flex-1 max-w-sm">
                  <BillboardSelect value={selectedBillboardId} onChange={setSelectedBillboardId} />
                </div>
              )}
            </div>

            {/* Equipment selection */}
            <div className="space-y-2">
              <Label>เลือกสินค้า *</Label>
              <SearchableSelect
                options={equipmentOptions}
                value={selectedItemId}
                onValueChange={setSelectedItemId}
                placeholder="พิมพ์รหัสหรือชื่อสินค้าเพื่อค้นหา..."
              />
            </div>

            {/* Quantity & Condition */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>จำนวน *</Label>
                <Input
                  type="number"
                  min="1"
                  max={maxQuantity}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
                {maxQuantity < 999 && (
                  <p className="text-xs text-muted-foreground">สูงสุด: {maxQuantity}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>สถานะการใช้งาน *</Label>
                <Select value={itemCondition} onValueChange={setItemCondition}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="defective">เสีย/ชำรุด</SelectItem>
                    <SelectItem value="pending_inspection">รอตรวจสอบการใช้งาน</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label>เหตุผล/สาเหตุ *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ระบุสาเหตุที่เสียหรือชำรุด เช่น ใช้งานจนหมดอายุ, ถูกพายุ, ไฟฟ้าลัดวงจร..."
                rows={3}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>หมายเหตุเพิ่มเติม</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="หมายเหตุอื่นๆ (ถ้ามี)"
                rows={2}
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !selectedItemId}
                className="flex-1"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                บันทึกของเสีย/ชำรุด
              </Button>
              <Button variant="outline" onClick={handleReset}>
                ล้างข้อมูล
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Auto-filled info card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4" />
              ข้อมูลสินค้า
            </CardTitle>
          </CardHeader>
          <CardContent>
            {displayItem ? (
              <div className="space-y-3 text-sm">
                <InfoRow label="รหัส" value={(displayItem as any).code} />
                <InfoRow label="ชื่อ" value={(displayItem as any).name} />
                <InfoRow label="หน่วย" value={(displayItem as any).unit} />
                {!isMediaPlayer && selectedEquipment && (
                  <>
                    <InfoRow label="หมวดหมู่" value={selectedEquipment.category} />
                    <InfoRow label="ยี่ห้อ" value={selectedEquipment.brand || "-"} />
                    <InfoRow label="Serial No." value={selectedEquipment.serial_number || "-"} />
                    <InfoRow label="ฝ่าย" value={selectedEquipment.department || "-"} />
                    <InfoRow label="คงเหลือในคลัง" value={String(selectedEquipment.quantity_in_stock)} />
                  </>
                )}
                {isMediaPlayer && selectedMediaPlayer && (
                  <>
                    <InfoRow label="ยี่ห้อ" value={selectedMediaPlayer.brand || "-"} />
                    <InfoRow label="Serial No." value={selectedMediaPlayer.serial_number_1 || "-"} />
                    <InfoRow label="ฝ่าย" value={selectedMediaPlayer.department || "-"} />
                    <InfoRow label="จำนวน" value={String(selectedMediaPlayer.quantity)} />
                  </>
                )}
                {isFromBillboard && selectedBillboardId && (
                  <div className="pt-2 border-t">
                    <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600">
                      <MapPin className="w-3 h-3 mr-1" />
                      จากป้ายโฆษณา
                    </Badge>
                  </div>
                )}
                <div className="pt-2 border-t">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${itemCondition === "defective" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}
                  >
                    {itemCondition === "defective" ? "เสีย/ชำรุด" : "รอตรวจสอบ"}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                เลือกสินค้าเพื่อดูข้อมูล
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right max-w-[60%] truncate">{value}</span>
  </div>
);

export default DefectiveReturnEntry;
