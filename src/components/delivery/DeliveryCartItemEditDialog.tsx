import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { EquipmentImageViewer } from "@/components/equipment/EquipmentImageViewer";
import { DeliveryCartItem } from "./DeliveryCart";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Equipment {
  id: string;
  code: string;
  name: string;
  unit: string;
}

interface Supplier {
  id: string;
  code: string;
  name: string;
}

interface DeliveryCartItemEditDialogProps {
  item: DeliveryCartItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (item: DeliveryCartItem) => void;
  equipment: Equipment[];
  suppliers: Supplier[];
}

export function DeliveryCartItemEditDialog({
  item,
  open,
  onOpenChange,
  onSave,
  equipment,
  suppliers,
}: DeliveryCartItemEditDialogProps) {
  // Form state
  const [selectedEquipmentId, setSelectedEquipmentId] = useState("");
  const [equipmentCode, setEquipmentCode] = useState("");
  const [equipmentName, setEquipmentName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("ชิ้น");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [lotNumber1, setLotNumber1] = useState("");
  const [lotNumber2, setLotNumber2] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [serialNumber2, setSerialNumber2] = useState("");
  const [remoteName, setRemoteName] = useState("");
  const [specification, setSpecification] = useState("");
  const [usageLifespanMonths, setUsageLifespanMonths] = useState("");
  const [activateWindows, setActivateWindows] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [warrantyExpiryDate, setWarrantyExpiryDate] = useState("");
  const [storageWidthCm, setStorageWidthCm] = useState("");
  const [storageHeightCm, setStorageHeightCm] = useState("");
  const [storageDepthCm, setStorageDepthCm] = useState("");
  const [isAsset, setIsAsset] = useState(false);
  const [assetCode, setAssetCode] = useState("");
  const [equipmentIdCode, setEquipmentIdCode] = useState("");
  const [waitingAssetCode, setWaitingAssetCode] = useState(false);
  const [waitingEquipmentId, setWaitingEquipmentId] = useState(false);
  const [depreciationMonths, setDepreciationMonths] = useState("");
  const [itemNotes, setItemNotes] = useState("");

  // Load item data when dialog opens
  useEffect(() => {
    if (item && open) {
      setSelectedEquipmentId(item.equipment_id || "");
      setEquipmentCode(item.equipment_code);
      setEquipmentName(item.equipment_name);
      setQuantity(item.quantity.toString());
      setUnit(item.unit);
      setSelectedSupplierId(item.supplier_id || "");
      setSupplierName(item.supplier_name);
      setLotNumber1(item.lot_number_1);
      setLotNumber2(item.lot_number_2);
      setSerialNumber(item.serial_number);
      setSerialNumber2(item.serial_number_2 || "");
      setRemoteName(item.remote_name || "");
      setSpecification(item.specification || "");
      setUsageLifespanMonths(item.usage_lifespan_months || "");
      setActivateWindows(item.activate_windows || "");
      setUnitPrice(item.unit_price?.toString() || "");
      setExpiryDate(item.expiry_date);
      setWarrantyExpiryDate(item.warranty_expiry_date);
      setStorageWidthCm(item.storage_width_cm);
      setStorageHeightCm(item.storage_height_cm);
      setStorageDepthCm(item.storage_depth_cm);
      setIsAsset(item.is_asset);
      setAssetCode(item.asset_code);
      setEquipmentIdCode(item.equipment_id_code);
      setWaitingAssetCode(item.waiting_asset_code);
      setWaitingEquipmentId(item.waiting_equipment_id);
      setDepreciationMonths(item.depreciation_months);
      setItemNotes(item.notes);
    }
  }, [item, open]);

  const selectedEquipment = equipment.find(e => e.id === selectedEquipmentId);
  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);

  // Update unit and name when equipment is selected
  useEffect(() => {
    if (selectedEquipment) {
      setUnit(selectedEquipment.unit);
      setEquipmentCode(selectedEquipment.code);
      setEquipmentName(selectedEquipment.name);
    }
  }, [selectedEquipment]);

  // Calculated volume
  const calculatedVolume = (() => {
    const w = parseFloat(storageWidthCm) || 0;
    const h = parseFloat(storageHeightCm) || 0;
    const d = parseFloat(storageDepthCm) || 0;
    if (w > 0 && h > 0 && d > 0) {
      return (w * h * d).toFixed(2).replace(/^0+/, '');
    }
    return "";
  })();

  const handleSave = () => {
    if (!quantity || parseInt(quantity) < 1) {
      toast.error("กรุณาระบุจำนวน");
      return;
    }
    
    if (!selectedEquipmentId && !equipmentName) {
      toast.error("กรุณาเลือกสินค้า");
      return;
    }
    
    if (!unitPrice) {
      toast.error("กรุณาระบุราคาต่อชิ้น");
      return;
    }

    const updatedItem: DeliveryCartItem = {
      id: item!.id,
      equipment_id: selectedEquipmentId || null,
      equipment_code: equipmentCode,
      equipment_name: equipmentName || selectedEquipment?.name || "",
      quantity: parseInt(quantity),
      unit: unit,
      lot_number_1: lotNumber1,
      lot_number_2: lotNumber2,
      serial_number: serialNumber,
      unit_price: unitPrice ? parseFloat(unitPrice) : null,
      supplier_id: selectedSupplierId || null,
      supplier_name: supplierName || selectedSupplier?.name || "",
      expiry_date: expiryDate,
      warranty_expiry_date: warrantyExpiryDate,
      storage_width_cm: storageWidthCm,
      storage_height_cm: storageHeightCm,
      storage_depth_cm: storageDepthCm,
      storage_volume_cm3: calculatedVolume,
      is_asset: isAsset,
      asset_code: assetCode,
      equipment_id_code: equipmentIdCode,
      waiting_asset_code: waitingAssetCode,
      waiting_equipment_id: waitingEquipmentId,
      depreciation_months: depreciationMonths,
      notes: itemNotes,
      temp_category_id: item!.temp_category_id,
      temp_subcategory_id: item!.temp_subcategory_id,
      temp_product_images: item!.temp_product_images,
      temp_min_stock_level: item!.temp_min_stock_level,
      is_media_player: item!.is_media_player,
      media_player_id: item!.media_player_id,
      cms_type_id: item!.cms_type_id,
      serial_number_2: serialNumber2,
      remote_name: remoteName,
      specification,
      usage_lifespan_months: usageLifespanMonths,
      activate_windows: activateWindows,
      media_player_image_url: item!.media_player_image_url,
      media_player_image_file: item!.media_player_image_file,
    };

    onSave(updatedItem);
    onOpenChange(false);
    toast.success("อัปเดตรายการเรียบร้อยแล้ว");
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>แก้ไขรายการสินค้า</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Equipment Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>เลือกสินค้า</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <SearchableSelect
                    options={equipment.map((eq) => ({
                      value: eq.id,
                      label: `${eq.code} - ${eq.name}`,
                      searchableText: `${eq.code} ${eq.name}`,
                    }))}
                    value={selectedEquipmentId}
                    onValueChange={setSelectedEquipmentId}
                    placeholder="เลือกสินค้าจากระบบ..."
                    searchPlaceholder="พิมพ์รหัสหรือชื่อสินค้า..."
                    emptyMessage="ไม่พบสินค้า"
                  />
                </div>
                {selectedEquipmentId && (
                  <EquipmentImageViewer 
                    equipmentId={selectedEquipmentId} 
                    equipmentName={selectedEquipment?.name}
                    variant="button"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Quantity, Unit & Lot Numbers */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>จำนวน *</Label>
              <Input 
                type="number" 
                placeholder="กรอกจำนวน"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>หน่วย</Label>
              <Input 
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="ชิ้น, กล่อง, ..."
              />
            </div>
            <div className="space-y-2">
              <Label>Lot Number 1</Label>
              <Input 
                placeholder="Lot No. 1"
                value={lotNumber1}
                onChange={(e) => setLotNumber1(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Lot Number 2</Label>
              <Input 
                placeholder="Lot No. 2"
                value={lotNumber2}
                onChange={(e) => setLotNumber2(e.target.value)}
              />
            </div>
          </div>

          {/* Serial Number & Price */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Serial Number</Label>
              <Input 
                placeholder="Serial Number"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>ราคาต่อชิ้น (฿) *</Label>
              <Input 
                type="number"
                step="0.01"
                placeholder="0.00"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>วันหมดอายุ</Label>
              <Input 
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>วันหมดประกัน</Label>
              <Input 
                type="date"
                value={warrantyExpiryDate}
                onChange={(e) => setWarrantyExpiryDate(e.target.value)}
              />
            </div>
          </div>

          {/* Supplier */}
          <div className="space-y-2">
            <Label>ผู้จัดจำหน่าย</Label>
            <SearchableSelect
              options={suppliers.map((sup) => ({
                value: sup.id,
                label: `${sup.code} - ${sup.name}`,
                searchableText: `${sup.code} ${sup.name}`,
              }))}
              value={selectedSupplierId}
              onValueChange={setSelectedSupplierId}
              placeholder="เลือกผู้จัดจำหน่าย..."
              searchPlaceholder="พิมพ์รหัสหรือชื่อผู้จัดจำหน่าย..."
              emptyMessage="ไม่พบผู้จัดจำหน่าย"
            />
          </div>

          {/* Storage Dimensions */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>กว้าง (m)</Label>
              <Input 
                type="number"
                step="0.01"
                placeholder="0.00"
                value={storageWidthCm}
                onChange={(e) => setStorageWidthCm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>สูง (m)</Label>
              <Input 
                type="number"
                step="0.01"
                placeholder="0.00"
                value={storageHeightCm}
                onChange={(e) => setStorageHeightCm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>ลึก (m)</Label>
              <Input 
                type="number"
                step="0.01"
                placeholder="0.00"
                value={storageDepthCm}
                onChange={(e) => setStorageDepthCm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>ปริมาตร (m³)</Label>
              <Input 
                value={calculatedVolume}
                readOnly
                className="bg-muted"
              />
            </div>
          </div>

          {/* Asset Section */}
          <div className="p-4 bg-muted/30 border rounded-lg space-y-4">
            <div className="flex items-center gap-4">
              <Switch
                checked={isAsset}
                onCheckedChange={setIsAsset}
              />
              <Label>เป็นทรัพย์สินบริษัท</Label>
            </div>

            {isAsset && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Asset Code</Label>
                    <Input 
                      placeholder="Asset Code"
                      value={assetCode}
                      onChange={(e) => setAssetCode(e.target.value)}
                      disabled={waitingAssetCode}
                    />
                    <div className="flex items-center gap-2 pt-1">
                      <Checkbox
                        id="waitingAssetCode"
                        checked={waitingAssetCode}
                        onCheckedChange={(checked) => {
                          setWaitingAssetCode(!!checked);
                          if (checked) setAssetCode("");
                        }}
                      />
                      <Label htmlFor="waitingAssetCode" className="text-xs text-muted-foreground">
                        รอรหัสทรัพย์สิน
                      </Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Equipment ID Code</Label>
                    <Input 
                      placeholder="Equipment ID"
                      value={equipmentIdCode}
                      onChange={(e) => setEquipmentIdCode(e.target.value)}
                      disabled={waitingEquipmentId}
                    />
                    <div className="flex items-center gap-2 pt-1">
                      <Checkbox
                        id="waitingEquipmentId"
                        checked={waitingEquipmentId}
                        onCheckedChange={(checked) => {
                          setWaitingEquipmentId(!!checked);
                          if (checked) setEquipmentIdCode("");
                        }}
                      />
                      <Label htmlFor="waitingEquipmentId" className="text-xs text-muted-foreground">
                        รอรหัสอุปกรณ์
                      </Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>ระยะเวลาค่าเสื่อมราคา (เดือน)</Label>
                    <Input 
                      type="number"
                      placeholder="จำนวนเดือน"
                      value={depreciationMonths}
                      onChange={(e) => setDepreciationMonths(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>หมายเหตุ</Label>
            <Textarea 
              placeholder="หมายเหตุเพิ่มเติม..."
              value={itemNotes}
              onChange={(e) => setItemNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button onClick={handleSave}>
            บันทึกการแก้ไข
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
