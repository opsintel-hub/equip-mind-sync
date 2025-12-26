import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { HierarchicalStorageSelect } from "@/components/location/HierarchicalStorageSelect";
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

const GoodsReceipt = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [storageLocation, setStorageLocation] = useState<{
    locationId: string;
    storageSlotId?: string;
    subStorageSlotId?: string;
  }>({ locationId: "" });

  useEffect(() => {
    fetchEquipment();
    fetchSuppliers();
  }, []);

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

  const selectedEquipment = equipment.find(e => e.id === selectedEquipmentId);

  const mockReceipts = [
    { id: "GR-001", date: "2025-01-15", sku: "SKU-001", name: "อะไหล่ A", quantity: 100, supplier: "Supplier A", status: "รับเข้าแล้ว" },
    { id: "GR-002", date: "2025-01-14", sku: "SKU-102", name: "เครื่องมือ B", quantity: 50, supplier: "Supplier B", status: "รับเข้าแล้ว" },
    { id: "GR-003", date: "2025-01-14", sku: "SKU-203", name: "อุปกรณ์ C", quantity: 75, supplier: "Supplier C", status: "รับเข้าแล้ว" },
    { id: "GR-004", date: "2025-01-13", sku: "SKU-305", name: "อะไหล่ D", quantity: 200, supplier: "Supplier A", status: "รับเข้าแล้ว" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEquipmentId || !quantity || !selectedSupplierId || !storageLocation.locationId) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    toast.success("บันทึกการรับสินค้าเข้าสำเร็จ");
    // Reset form
    setSelectedEquipmentId("");
    setSelectedSupplierId("");
    setQuantity("");
    setLotNumber("");
    setExpiryDate("");
    setStorageLocation({ locationId: "" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2">รับสินค้าเข้า (GR)</h1>
        <p className="text-muted-foreground">บันทึกการรับสินค้าเข้าคลัง</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            สร้างเอกสารรับสินค้าใหม่
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">รหัสสินค้า (SKU)</Label>
                <Select value={selectedEquipmentId} onValueChange={setSelectedEquipmentId}>
                  <SelectTrigger id="sku">
                    <SelectValue placeholder="เลือก SKU" />
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
              <div className="space-y-2">
                <Label htmlFor="quantity">จำนวน</Label>
                <Input 
                  id="quantity" 
                  type="number" 
                  placeholder="กรอกจำนวน"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">หน่วย</Label>
                <Input 
                  id="unit" 
                  value={selectedEquipment?.unit || ""} 
                  disabled 
                  placeholder="เลือกสินค้าก่อน"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">ผู้จัดจำหน่าย</Label>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger id="supplier">
                    <SelectValue placeholder="เลือกผู้จัดจำหน่าย" />
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
              <div className="space-y-2">
                <Label htmlFor="lot">Lot Number</Label>
                <Input 
                  id="lot" 
                  type="text" 
                  placeholder="กรอก Lot No."
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <HierarchicalStorageSelect
                value={storageLocation}
                onChange={setStorageLocation}
              />
              <div className="space-y-2">
                <Label htmlFor="expiry">วันหมดอายุ</Label>
                <Input 
                  id="expiry" 
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" className="w-full md:w-auto">
              บันทึกการรับสินค้า
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>ประวัติการรับสินค้า</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหา..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
                  <TableHead>SKU</TableHead>
                  <TableHead>ชื่อสินค้า</TableHead>
                  <TableHead>ฝ่าย</TableHead>
                  <TableHead>จำนวน</TableHead>
                  <TableHead>ผู้จัดจำหน่าย</TableHead>
                  <TableHead>สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockReceipts.map((receipt) => (
                  <TableRow key={receipt.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{receipt.id}</TableCell>
                    <TableCell>{receipt.date}</TableCell>
                    <TableCell>{receipt.sku}</TableCell>
                    <TableCell>{receipt.name}</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>{receipt.quantity}</TableCell>
                    <TableCell>{receipt.supplier}</TableCell>
                    <TableCell>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                        {receipt.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoodsReceipt;
