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
import { PackageCheck, Search, Clock, CheckCircle2, Edit, Package } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { HierarchicalStorageSelect } from "@/components/location/HierarchicalStorageSelect";
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
  expiry_date: string | null;
  delivery_person_name: string;
  delivery_person_phone: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

const ReceiveGoods = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("pending");
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [pendingReceipts, setPendingReceipts] = useState<PendingReceipt[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Dialog state
  const [selectedReceipt, setSelectedReceipt] = useState<PendingReceipt | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state for editing
  const [editEquipmentId, setEditEquipmentId] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editSupplierId, setEditSupplierId] = useState("");
  const [editLotNumber, setEditLotNumber] = useState("");
  const [editExpiryDate, setEditExpiryDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [storageLocation, setStorageLocation] = useState<{
    locationId: string;
    storageSlotId?: string;
    subStorageSlotId?: string;
  }>({ locationId: "" });

  useEffect(() => {
    fetchEquipment();
    fetchSuppliers();
    fetchPendingReceipts();
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
      setPendingReceipts(data as PendingReceipt[]);
    }
  };

  const openReceiveDialog = (receipt: PendingReceipt) => {
    setSelectedReceipt(receipt);
    setEditEquipmentId(receipt.equipment_id || "");
    setEditQuantity(receipt.quantity.toString());
    setEditUnit(receipt.unit);
    setEditSupplierId(receipt.supplier_id || "");
    setEditLotNumber(receipt.lot_number || "");
    setEditExpiryDate(receipt.expiry_date || "");
    setEditNotes(receipt.notes || "");
    setStorageLocation({ locationId: "" });
    setIsDialogOpen(true);
  };

  const generateGRDocumentNo = () => {
    const date = new Date();
    const dateStr = format(date, "yyyyMMdd");
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    return `GR-${dateStr}-${random}`;
  };

  const handleReceive = async () => {
    if (!selectedReceipt) return;
    
    if (!editEquipmentId) {
      toast.error("กรุณาเลือกสินค้าจากระบบ");
      return;
    }

    if (!storageLocation.locationId) {
      toast.error("กรุณาเลือกตำแหน่งจัดเก็บ");
      return;
    }

    setIsLoading(true);

    try {
      // Get selected supplier
      const selectedSupp = suppliers.find(s => s.id === editSupplierId);

      // Fetch current equipment stock FIRST
      const { data: currentEquipment, error: fetchError } = await supabase
        .from("equipment")
        .select("quantity_in_stock")
        .eq("id", editEquipmentId)
        .single();

      if (fetchError) throw fetchError;

      const currentStock = currentEquipment?.quantity_in_stock || 0;
      const receivedQuantity = parseInt(editQuantity);
      const newStock = currentStock + receivedQuantity;

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
          equipment_id: editEquipmentId,
          quantity: receivedQuantity,
          unit: editUnit,
          supplier_id: editSupplierId || null,
          lot_number: editLotNumber || null,
          expiry_date: editExpiryDate || null,
          notes: editNotes || null
        })
        .eq("id", selectedReceipt.id);

      if (updateError) throw updateError;

      // Create goods receipt record
      const { error: grError } = await supabase
        .from("goods_receipt")
        .insert({
          document_no: generateGRDocumentNo(),
          equipment_id: editEquipmentId,
          quantity: receivedQuantity,
          supplier: selectedSupp?.name || selectedReceipt.supplier_name || "ไม่ระบุ",
          location_id: storageLocation.locationId,
          receipt_date: new Date().toISOString().split("T")[0],
          created_by: user?.id || "",
          notes: `นำเข้าจากเอกสาร ${selectedReceipt.document_no}. ${editNotes || ""}`.trim(),
          status: "completed"
        });

      if (grError) throw grError;

      // Update equipment stock - ADD to existing stock
      const { error: stockError } = await supabase
        .from("equipment")
        .update({
          quantity_in_stock: newStock,
          location_id: storageLocation.locationId,
          expiry_date: editExpiryDate || null
        })
        .eq("id", editEquipmentId);

      if (stockError) {
        console.error("Stock update error:", stockError);
        toast.warning("รับสินค้าสำเร็จแต่ไม่สามารถอัปเดต Stock ได้");
      } else {
        // Log stock movement
        const selectedEquipment = equipment.find(e => e.id === editEquipmentId);
        await logStockMovement({
          equipment_id: editEquipmentId,
          equipment_code: selectedEquipment?.code || "",
          equipment_name: selectedEquipment?.name || "",
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
              {/* Delivery Info */}
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">ข้อมูลจากผู้ส่ง</p>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  <p><span className="text-muted-foreground">ชื่อผู้ส่ง:</span> {selectedReceipt.delivery_person_name}</p>
                  <p><span className="text-muted-foreground">เบอร์โทร:</span> {selectedReceipt.delivery_person_phone || "-"}</p>
                  <p><span className="text-muted-foreground">ชื่อสินค้า (ที่ระบุ):</span> {selectedReceipt.equipment_name || "-"}</p>
                  <p><span className="text-muted-foreground">Lot No.:</span> {selectedReceipt.lot_number || "-"}</p>
                </div>
              </div>

              {/* Equipment Selection */}
              <div className="space-y-2">
                <Label>เลือกสินค้าจากระบบ *</Label>
                <Select value={editEquipmentId} onValueChange={setEditEquipmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกสินค้า..." />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
                    {equipment.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.code} - {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity & Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>จำนวน</Label>
                  <Input 
                    type="number" 
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>หน่วย</Label>
                  <Input 
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                  />
                </div>
              </div>

              {/* Supplier */}
              <div className="space-y-2">
                <Label>ผู้จัดจำหน่าย</Label>
                <Select value={editSupplierId} onValueChange={setEditSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกผู้จัดจำหน่าย..." />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.code} - {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lot & Expiry */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Lot Number</Label>
                  <Input 
                    value={editLotNumber}
                    onChange={(e) => setEditLotNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>วันหมดอายุ</Label>
                  <Input 
                    type="date"
                    value={editExpiryDate}
                    onChange={(e) => setEditExpiryDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Storage Location */}
              <HierarchicalStorageSelect
                value={storageLocation}
                onChange={setStorageLocation}
              />

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
