import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { PackageCheck, Search, Clock, CheckCircle2, Edit, Package, Box } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { logStockMovement } from "@/lib/stockMovement";

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

interface PendingReceipt {
  id: string;
  document_no: string;
  equipment_code: string | null;
  equipment_name: string | null;
  equipment_id: string | null;
  quantity: number;
  unit: string;
  supplier_id: string | null;
  supplier_name: string | null;
  lot_number: string | null;
  lot_number_2: string | null;
  expiry_date: string | null;
  delivery_person_name: string;
  delivery_person_phone: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  storage_volume_cm3?: number | null;
  storage_width_cm?: number | null;
  storage_height_cm?: number | null;
  storage_depth_cm?: number | null;
  warranty_expiry_date: string | null;
  unit_price: number | null;
}

interface LocationCapacity {
  volume_cm3: number | null;
  used_volume_cm3: number | null;
  remaining_volume_cm3: number | null;
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
  total_volume_cm3: number;
  remaining_volume_cm3: number;
}

interface Location {
  id: string;
  code: string;
  name: string;
  warehouse_id: string | null;
  volume_cm3: number | null;
  used_volume_cm3: number | null;
}

const ReceiveGoods = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("pending");
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [pendingReceipts, setPendingReceipts] = useState<PendingReceipt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Dialog state
  const [selectedReceipt, setSelectedReceipt] = useState<PendingReceipt | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state for editing - only editable fields
  const [editNotes, setEditNotes] = useState("");
  const [storageVolumeCm3, setStorageVolumeCm3] = useState<string>("");
  const [locationCapacity, setLocationCapacity] = useState<LocationCapacity | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [storageLocation, setStorageLocation] = useState<{
    locationId: string;
    storageSlotId?: string;
    subStorageSlotId?: string;
  }>({ locationId: "" });

  useEffect(() => {
    fetchEquipment();
    fetchSuppliers();
    fetchPendingReceipts();
    fetchWarehouses();
    fetchLocations();
  }, [filterStatus]);

  const fetchEquipment = async () => {
    const { data, error } = await supabase
      .from("equipment")
      .select("id, code, name, unit")
      .eq("is_active", true)
      .order("code");
    
    if (!error && data) {
      setEquipment(data);
    }
  };

  const fetchSuppliers = async () => {
    const { data, error } = await supabase
      .from("suppliers")
      .select("id, code, name")
      .eq("is_active", true)
      .order("code");
    
    if (!error && data) {
      setSuppliers(data);
    }
  };

  const fetchPendingReceipts = async () => {
    let query = supabase
      .from("goods_receipt_pending")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (filterStatus !== "all") {
      query = query.eq("status", filterStatus);
    }

    const { data, error } = await query;
    
    if (!error && data) {
      setPendingReceipts(data as unknown as PendingReceipt[]);
    }
  };

  const fetchWarehouses = async () => {
    const { data: warehouseData, error: warehouseError } = await supabase
      .from("warehouses")
      .select("id, code, name")
      .eq("is_active", true)
      .order("code");

    if (warehouseError) {
      console.error("Error fetching warehouses:", warehouseError);
      return;
    }

    // Fetch locations for each warehouse to calculate volumes
    const { data: locData } = await supabase
      .from("locations")
      .select("warehouse_id, volume_cm3, used_volume_cm3")
      .eq("is_active", true);

    const warehousesWithVolume = (warehouseData || []).map(wh => {
      const whLocations = (locData || []).filter(loc => loc.warehouse_id === wh.id);
      const totalVolume = whLocations.reduce((sum, loc) => sum + (loc.volume_cm3 || 0), 0);
      const usedVolume = whLocations.reduce((sum, loc) => sum + (loc.used_volume_cm3 || 0), 0);
      return {
        ...wh,
        total_volume_cm3: totalVolume,
        remaining_volume_cm3: totalVolume - usedVolume
      };
    });

    setWarehouses(warehousesWithVolume);
  };

  const fetchLocations = async () => {
    const { data, error } = await supabase
      .from("locations")
      .select("id, code, name, warehouse_id, volume_cm3, used_volume_cm3")
      .eq("is_active", true)
      .order("code");

    if (!error && data) {
      setLocations(data);
    }
  };

  const openReceiveDialog = (receipt: PendingReceipt) => {
    setSelectedReceipt(receipt);
    setEditNotes(receipt.notes || "");
    setStorageVolumeCm3(receipt.storage_volume_cm3?.toString() || "");
    setLocationCapacity(null);
    setSelectedWarehouseId("");
    setStorageLocation({ locationId: "" });
    setIsDialogOpen(true);
  };

  // Get filtered locations by selected warehouse
  const filteredLocations = selectedWarehouseId 
    ? locations.filter(loc => loc.warehouse_id === selectedWarehouseId)
    : [];

  // Handle warehouse change
  const handleWarehouseChange = (warehouseId: string) => {
    setSelectedWarehouseId(warehouseId);
    setStorageLocation({ locationId: "" });
    setLocationCapacity(null);
  };

  // Handle location change within warehouse
  const handleLocationChange = (locationId: string) => {
    setStorageLocation({ locationId });
    fetchLocationCapacity(locationId);
  };

  // Fetch location capacity when location is selected
  const fetchLocationCapacity = async (locationId: string) => {
    if (!locationId) {
      setLocationCapacity(null);
      return;
    }

    const { data, error } = await supabase
      .from("locations")
      .select("volume_cm3, used_volume_cm3")
      .eq("id", locationId)
      .single();

    if (!error && data) {
      const remaining = data.volume_cm3 
        ? (data.volume_cm3 - (data.used_volume_cm3 || 0)) 
        : null;
      setLocationCapacity({
        volume_cm3: data.volume_cm3,
        used_volume_cm3: data.used_volume_cm3,
        remaining_volume_cm3: remaining
      });
    }
  };


  const generateGRDocumentNo = () => {
    const date = new Date();
    const dateStr = format(date, "yyyyMMdd");
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    return `GR-${dateStr}-${random}`;
  };

  const handleReceive = async () => {
    if (!selectedReceipt) return;
    
    if (!selectedReceipt.equipment_id) {
      toast.error("ไม่พบสินค้าในระบบ");
      return;
    }

    if (!storageLocation.locationId) {
      toast.error("กรุณาเลือกตำแหน่งจัดเก็บ");
      return;
    }

    setIsLoading(true);

    try {
      // Get supplier from receipt
      const selectedSupp = suppliers.find(s => s.id === selectedReceipt.supplier_id);

      // Fetch current equipment stock FIRST
      const { data: currentEquipment, error: fetchError } = await supabase
        .from("equipment")
        .select("quantity_in_stock")
        .eq("id", selectedReceipt.equipment_id)
        .single();

      if (fetchError) throw fetchError;

      const currentStock = currentEquipment?.quantity_in_stock || 0;
      const receivedQuantity = selectedReceipt.quantity;
      const newStock = currentStock + receivedQuantity;

      const storageVolumeValue = storageVolumeCm3 ? parseFloat(storageVolumeCm3) : null;

      // Update pending receipt status
      const { error: updateError } = await supabase
        .from("goods_receipt_pending")
        .update({
          status: "received",
          received_by: user?.id,
          received_at: new Date().toISOString(),
          received_location_id: storageLocation.locationId,
          received_storage_slot_id: storageLocation.storageSlotId || null,
          received_sub_storage_slot_id: storageLocation.subStorageSlotId || null,
          notes: editNotes || null,
          storage_volume_cm3: storageVolumeValue
        })
        .eq("id", selectedReceipt.id);

      if (updateError) throw updateError;

      // Update location used_volume_cm3 if storage volume is provided
      if (storageVolumeValue && storageVolumeValue > 0) {
        const { data: locationData } = await supabase
          .from("locations")
          .select("used_volume_cm3")
          .eq("id", storageLocation.locationId)
          .single();

        const currentUsed = locationData?.used_volume_cm3 || 0;
        const newUsed = currentUsed + storageVolumeValue;

        await supabase
          .from("locations")
          .update({ used_volume_cm3: newUsed })
          .eq("id", storageLocation.locationId);
      }

      // Create goods receipt record
      const { error: grError } = await supabase
        .from("goods_receipt")
        .insert({
          document_no: generateGRDocumentNo(),
          equipment_id: selectedReceipt.equipment_id,
          quantity: receivedQuantity,
          supplier: selectedSupp?.name || selectedReceipt.supplier_name || "ไม่ระบุ",
          location_id: storageLocation.locationId,
          receipt_date: new Date().toISOString().split("T")[0],
          created_by: user?.id || "",
          notes: `นำเข้าจากเอกสาร ${selectedReceipt.document_no}. ${editNotes || ""}`.trim(),
          status: "completed",
          unit_price: selectedReceipt.unit_price || null
        });

      if (grError) throw grError;

      // Update equipment stock - ADD to existing stock
      const { error: stockError } = await supabase
        .from("equipment")
        .update({
          quantity_in_stock: newStock,
          location_id: storageLocation.locationId,
          expiry_date: selectedReceipt.expiry_date || null
        })
        .eq("id", selectedReceipt.equipment_id);

      if (stockError) {
        console.error("Stock update error:", stockError);
        toast.warning("รับสินค้าสำเร็จแต่ไม่สามารถอัปเดต Stock ได้");
      } else {
        // Log stock movement
        const selectedEquipment = equipment.find(e => e.id === selectedReceipt.equipment_id);
        await logStockMovement({
          equipment_id: selectedReceipt.equipment_id!,
          equipment_code: selectedEquipment?.code || selectedReceipt.equipment_code || "",
          equipment_name: selectedEquipment?.name || selectedReceipt.equipment_name || "",
          movement_type: "receive",
          quantity: receivedQuantity,
          stock_before: currentStock,
          stock_after: newStock,
          reference_type: "goods_receipt",
          reference_document: selectedReceipt.document_no,
          location_id: storageLocation.locationId,
          notes: editNotes || undefined,
        });
        toast.success(`รับสินค้าเข้าคลังสำเร็จ (Stock: ${currentStock} → ${newStock})`);
      }

      setIsDialogOpen(false);
      fetchPendingReceipts();
    } catch (error) {
      console.error("Error:", error);
      toast.error("เกิดข้อผิดพลาดในการรับสินค้า");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-warning/10 text-warning"><Clock className="w-3 h-3 mr-1" />รอรับเข้า</Badge>;
      case "received":
        return <Badge variant="secondary" className="bg-success/10 text-success"><CheckCircle2 className="w-3 h-3 mr-1" />รับเข้าแล้ว</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredReceipts = pendingReceipts.filter(receipt =>
    receipt.document_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    receipt.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    receipt.delivery_person_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingCount = pendingReceipts.filter(r => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2 flex items-center gap-2">
          <PackageCheck className="w-8 h-8" />
          รับสินค้าเข้าคลัง
        </h1>
        <p className="text-muted-foreground">สำหรับเจ้าหน้าที่คลัง ตรวจสอบและรับสินค้าเข้าระบบ</p>
      </div>

      {/* Summary */}
      {pendingCount > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="w-12 h-12 bg-warning/20 rounded-full flex items-center justify-center">
              <Package className="w-6 h-6 text-warning" />
            </div>
            <div>
              <p className="font-medium text-foreground">มีสินค้ารอรับเข้าคลัง {pendingCount} รายการ</p>
              <p className="text-sm text-muted-foreground">กรุณาตรวจสอบและรับสินค้าเข้าระบบ</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter & Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>รายการสินค้ารอรับเข้า</CardTitle>
              <CardDescription>รายการที่ผู้นำสินค้าคีย์เข้ามา รอเจ้าหน้าที่คลังตรวจสอบ</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
                  <SelectItem value="pending">รอรับเข้า</SelectItem>
                  <SelectItem value="received">รับเข้าแล้ว</SelectItem>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหา..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>เลขที่เอกสาร</TableHead>
                  <TableHead>วันที่</TableHead>
                  <TableHead>ชื่อสินค้า</TableHead>
                  <TableHead>จำนวน</TableHead>
                  <TableHead>ผู้จัดจำหน่าย</TableHead>
                  <TableHead>ผู้ส่ง</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="w-24">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceipts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      ไม่มีรายการ
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReceipts.map((receipt) => (
                    <TableRow key={receipt.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{receipt.document_no}</TableCell>
                      <TableCell>{format(new Date(receipt.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                      <TableCell>{receipt.equipment_name || receipt.equipment_code || "-"}</TableCell>
                      <TableCell>{receipt.quantity} {receipt.unit}</TableCell>
                      <TableCell>{receipt.supplier_name || "-"}</TableCell>
                      <TableCell>
                        <div>
                          <p>{receipt.delivery_person_name}</p>
                          {receipt.delivery_person_phone && (
                            <p className="text-xs text-muted-foreground">{receipt.delivery_person_phone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                      <TableCell>
                        {receipt.status === "pending" && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => openReceiveDialog(receipt)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            รับเข้า
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Receive Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>รับสินค้าเข้าคลัง</DialogTitle>
            <DialogDescription>
              ตรวจสอบและแก้ไขข้อมูลก่อนรับสินค้าเข้าระบบ (เอกสาร: {selectedReceipt?.document_no})
            </DialogDescription>
          </DialogHeader>

          {selectedReceipt && (
            <div className="space-y-4 py-4">
              {/* Delivery Info - Read Only */}
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium text-foreground mb-2">ข้อมูลจากการนำสินค้าเข้า</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="text-muted-foreground">ชื่อผู้ส่ง:</span> {selectedReceipt.delivery_person_name}</p>
                  <p><span className="text-muted-foreground">เบอร์โทร:</span> {selectedReceipt.delivery_person_phone || "-"}</p>
                </div>
              </div>

              {/* Equipment Name - Read Only */}
              <div className="space-y-2">
                <Label>ชื่อสินค้า</Label>
                <Input 
                  value={selectedReceipt.equipment_code ? `${selectedReceipt.equipment_code} - ${selectedReceipt.equipment_name || ""}` : selectedReceipt.equipment_name || "-"}
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* Quantity & Unit - Read Only */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>จำนวน</Label>
                  <Input 
                    value={selectedReceipt.quantity.toString()}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label>หน่วย</Label>
                  <Input 
                    value={selectedReceipt.unit}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              {/* Lot Number 1, Lot Number 2 & Unit Price - Read Only */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Lot Number 1</Label>
                  <Input 
                    value={selectedReceipt.lot_number || "-"}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lot Number 2</Label>
                  <Input 
                    value={selectedReceipt.lot_number_2 || "-"}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ราคาต่อชิ้น</Label>
                  <Input 
                    value={selectedReceipt.unit_price ? selectedReceipt.unit_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              {/* Supplier - Read Only */}
              <div className="space-y-2">
                <Label>ผู้จัดจำหน่าย</Label>
                <Input 
                  value={selectedReceipt.supplier_name || "-"}
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* Expiry Date & Warranty Expiry Date - Read Only */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>วันหมดอายุ</Label>
                  <Input 
                    value={selectedReceipt.expiry_date ? format(new Date(selectedReceipt.expiry_date), "dd/MM/yyyy") : "-"}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label>วันสิ้นสุดการรับประกัน</Label>
                  <Input 
                    value={selectedReceipt.warranty_expiry_date ? format(new Date(selectedReceipt.warranty_expiry_date), "dd/MM/yyyy") : "-"}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              {/* Storage Dimensions Display */}
              {selectedReceipt && (selectedReceipt.storage_width_cm || selectedReceipt.storage_height_cm || selectedReceipt.storage_depth_cm) && (
                <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                  <Label className="flex items-center gap-2">
                    <Box className="h-4 w-4" />
                    ขนาดพื้นที่ๆต้องการใช้ (จากการนำเข้า)
                  </Label>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">กว้าง: </span>
                      <span className="font-medium">{selectedReceipt.storage_width_cm || 0} cm</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">สูง: </span>
                      <span className="font-medium">{selectedReceipt.storage_height_cm || 0} cm</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ลึก: </span>
                      <span className="font-medium">{selectedReceipt.storage_depth_cm || 0} cm</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ปริมาตร: </span>
                      <span className="font-medium text-primary">
                        {selectedReceipt.storage_volume_cm3?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 0} cm³
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Warehouse Selection */}
              <div className="space-y-2">
                <Label>คลังสินค้า *</Label>
                <Select value={selectedWarehouseId} onValueChange={handleWarehouseChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกคลังสินค้า..." />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
                    {warehouses.map((wh) => (
                      <SelectItem key={wh.id} value={wh.id}>
                        {wh.code} - {wh.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedWarehouseId && (
                  <div className="text-xs text-muted-foreground">
                    {(() => {
                      const wh = warehouses.find(w => w.id === selectedWarehouseId);
                      if (wh) {
                        return (
                          <span>
                            พื้นที่คงเหลือของคลัง: <span className="font-medium text-success">{wh.remaining_volume_cm3.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cm³</span>
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>

              {/* Location Selection (filtered by warehouse) */}
              {selectedWarehouseId && (
                <div className="space-y-2">
                  <Label>ตำแหน่งจัดเก็บ *</Label>
                  <Select value={storageLocation.locationId} onValueChange={handleLocationChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกตำแหน่งจัดเก็บ..." />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
                      {filteredLocations.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          ไม่มีตำแหน่งจัดเก็บในคลังนี้
                        </div>
                      ) : (
                        filteredLocations.map((loc) => {
                          const remaining = (loc.volume_cm3 || 0) - (loc.used_volume_cm3 || 0);
                          return (
                            <SelectItem key={loc.id} value={loc.id}>
                              {loc.code} - {loc.name} (คงเหลือ: {remaining.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} cm³)
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                  {locationCapacity && locationCapacity.volume_cm3 && (
                    <div className="p-2 bg-muted/20 rounded text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">พื้นที่คงเหลือของตำแหน่ง:</span>
                        <span className={`font-medium ${
                          locationCapacity.remaining_volume_cm3 !== null && 
                          storageVolumeCm3 && 
                          parseFloat(storageVolumeCm3) > locationCapacity.remaining_volume_cm3 
                            ? 'text-destructive' 
                            : 'text-success'
                        }`}>
                          {locationCapacity.remaining_volume_cm3?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cm³
                        </span>
                      </div>
                      {storageVolumeCm3 && parseFloat(storageVolumeCm3) > (locationCapacity.remaining_volume_cm3 || 0) && (
                        <div className="text-destructive text-xs mt-1">⚠️ พื้นที่ไม่เพียงพอ กรุณาเลือกตำแหน่งอื่น</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Storage Volume Input */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Box className="h-4 w-4" />
                  ขนาดพื้นที่ที่ต้องการใช้ (cm³)
                </Label>
                <Input 
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="เช่น 1000"
                  value={storageVolumeCm3}
                  onChange={(e) => setStorageVolumeCm3(e.target.value)}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>หมายเหตุ</Label>
                <Textarea 
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleReceive} disabled={isLoading}>
              {isLoading ? "กำลังบันทึก..." : "รับเข้าคลัง"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReceiveGoods;
