import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Truck, Search, Package, Clock, CheckCircle2, Upload, FileText, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { CompanySelect } from "@/components/company/CompanySelect";

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
  quantity: number;
  unit: string;
  supplier_name: string | null;
  lot_number: string | null;
  delivery_person_name: string;
  status: string;
  created_at: string;
  document_url: string | null;
}

const DeliveryEntry = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [pendingReceipts, setPendingReceipts] = useState<PendingReceipt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [selectedEquipmentId, setSelectedEquipmentId] = useState("");
  const [equipmentCode, setEquipmentCode] = useState("");
  const [equipmentName, setEquipmentName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("ชิ้น");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [warrantyExpiryDate, setWarrantyExpiryDate] = useState("");
  const [deliveryPersonName, setDeliveryPersonName] = useState("");
  const [deliveryPersonPhone, setDeliveryPersonPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");

  useEffect(() => {
    fetchEquipment();
    fetchSuppliers();
    fetchPendingReceipts();
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

  const fetchPendingReceipts = async () => {
    const { data, error } = await supabase
      .from("goods_receipt_pending")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      setPendingReceipts(data as PendingReceipt[]);
    }
  };

  const selectedEquipment = equipment.find(e => e.id === selectedEquipmentId);
  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);

  // Update unit when equipment is selected
  useEffect(() => {
    if (selectedEquipment) {
      setUnit(selectedEquipment.unit);
      setEquipmentCode(selectedEquipment.code);
      setEquipmentName(selectedEquipment.name);
    }
  }, [selectedEquipment]);

  // Update supplier name when selected
  useEffect(() => {
    if (selectedSupplier) {
      setSupplierName(selectedSupplier.name);
    }
  }, [selectedSupplier]);

  const generateDocumentNo = () => {
    const date = new Date();
    const dateStr = format(date, "yyyyMMdd");
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    return `PD-${dateStr}-${random}`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)");
        return;
      }
      
      // Check file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast.error("รองรับเฉพาะไฟล์ PDF, รูปภาพ (JPG, PNG) และ Word");
        return;
      }
      
      setDocumentFile(file);
    }
  };

  const removeFile = () => {
    setDocumentFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadDocument = async (documentNo: string): Promise<string | null> => {
    if (!documentFile) return null;

    const fileExt = documentFile.name.split('.').pop();
    const fileName = `${documentNo}-${Date.now()}.${fileExt}`;
    const filePath = `deliveries/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('delivery-documents')
      .upload(filePath, documentFile);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('ไม่สามารถอัปโหลดเอกสารได้');
    }

    const { data: { publicUrl } } = supabase.storage
      .from('delivery-documents')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!quantity || !deliveryPersonName || !unitPrice || !selectedCompanyId) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน (บริษัท, จำนวน, ชื่อผู้ส่ง, และราคาต่อชิ้น)");
      return;
    }

    if (!selectedEquipmentId && !equipmentName) {
      toast.error("กรุณาเลือกสินค้า หรือระบุชื่อสินค้า");
      return;
    }

    setIsLoading(true);

    try {
      const docNo = generateDocumentNo();
      let documentUrl: string | null = null;

      // Upload document if exists
      if (documentFile) {
        setIsUploadingFile(true);
        documentUrl = await uploadDocument(docNo);
        setIsUploadingFile(false);
      }

      const { error } = await supabase
        .from("goods_receipt_pending")
        .insert({
          document_no: docNo,
          equipment_id: selectedEquipmentId || null,
          equipment_code: equipmentCode || null,
          equipment_name: equipmentName || (selectedEquipment?.name || null),
          quantity: parseInt(quantity),
          unit: unit,
          supplier_id: selectedSupplierId || null,
          supplier_name: supplierName || (selectedSupplier?.name || null),
          lot_number: lotNumber || null,
          serial_number: serialNumber || null,
          unit_price: unitPrice ? parseFloat(unitPrice) : null,
          expiry_date: expiryDate || null,
          warranty_expiry_date: warrantyExpiryDate || null,
          delivery_person_name: deliveryPersonName,
          delivery_person_phone: deliveryPersonPhone || null,
          notes: notes || null,
          document_url: documentUrl,
          company_id: selectedCompanyId,
          status: "pending"
        });

      if (error) throw error;

      toast.success("บันทึกข้อมูลสินค้าสำเร็จ รอเจ้าหน้าที่คลังรับเข้า");
      
      // Reset form
      setSelectedEquipmentId("");
      setEquipmentCode("");
      setEquipmentName("");
      setQuantity("");
      setUnit("ชิ้น");
      setSelectedSupplierId("");
      setSupplierName("");
      setLotNumber("");
      setSerialNumber("");
      setUnitPrice("");
      setExpiryDate("");
      setWarrantyExpiryDate("");
      setDeliveryPersonName("");
      setDeliveryPersonPhone("");
      setNotes("");
      setDocumentFile(null);
      setSelectedCompanyId("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      fetchPendingReceipts();
    } catch (error) {
      console.error("Error:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsLoading(false);
      setIsUploadingFile(false);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2 flex items-center gap-2">
          <Truck className="w-8 h-8" />
          นำสินค้าเข้า
        </h1>
        <p className="text-muted-foreground">สำหรับผู้นำสินค้า/อะไหล่เข้าคลัง คีย์ข้อมูลก่อนส่งให้เจ้าหน้าที่คลัง</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            บันทึกข้อมูลสินค้า
          </CardTitle>
          <CardDescription>
            กรอกข้อมูลสินค้าที่ต้องการนำเข้าคลัง (ถ้าไม่รู้รหัสสินค้า สามารถระบุชื่อสินค้าได้)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Selection - Required */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-4">
              <h3 className="font-medium text-sm text-primary">เลือกบริษัท *</h3>
              <div className="space-y-2">
                <Label htmlFor="company">บริษัทที่สั่งซื้อ *</Label>
                <CompanySelect
                  value={selectedCompanyId}
                  onChange={setSelectedCompanyId}
                  placeholder="เลือกบริษัท..."
                  required
                />
                <p className="text-xs text-muted-foreground">
                  กรุณาเลือกบริษัทที่เป็นเจ้าของงบประมาณในการสั่งซื้อสินค้านี้
                </p>
              </div>
            </div>

            {/* Delivery Person Info */}
            <div className="p-4 bg-muted/30 rounded-lg space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">ข้อมูลผู้ส่ง</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deliveryPerson">ชื่อผู้ส่ง *</Label>
                  <Input 
                    id="deliveryPerson" 
                    placeholder="ระบุชื่อผู้ส่งสินค้า"
                    value={deliveryPersonName}
                    onChange={(e) => setDeliveryPersonName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">เบอร์โทรติดต่อ</Label>
                  <Input 
                    id="phone" 
                    placeholder="เบอร์โทรศัพท์"
                    value={deliveryPersonPhone}
                    onChange={(e) => setDeliveryPersonPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Equipment Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="equipment">เลือกสินค้า (ถ้ารู้รหัส)</Label>
                <Select value={selectedEquipmentId} onValueChange={setSelectedEquipmentId}>
                  <SelectTrigger id="equipment">
                    <SelectValue placeholder="เลือกสินค้าจากระบบ..." />
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
                <Label htmlFor="equipmentName">หรือ ระบุชื่อสินค้า</Label>
                <Input 
                  id="equipmentName" 
                  placeholder="ชื่อสินค้า/อะไหล่"
                  value={equipmentName}
                  onChange={(e) => setEquipmentName(e.target.value)}
                  disabled={!!selectedEquipmentId}
                />
              </div>
            </div>

            {/* Quantity & Unit */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">จำนวน *</Label>
                <Input 
                  id="quantity" 
                  type="number" 
                  placeholder="กรอกจำนวน"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">หน่วย</Label>
                <Input 
                  id="unit" 
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="ชิ้น, กล่อง, ..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lotNumber">Lot Number</Label>
                <Input 
                  id="lotNumber" 
                  placeholder="Lot No."
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                />
              </div>
            </div>

            {/* Serial Number & Unit Price */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input 
                  id="serialNumber" 
                  placeholder="SN-xxxxx"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitPrice">ราคาต่อชิ้น (บาท) *</Label>
                <Input 
                  id="unitPrice" 
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Supplier */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">เลือกผู้จัดจำหน่าย</Label>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger id="supplier">
                    <SelectValue placeholder="เลือกผู้จัดจำหน่าย..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.code} - {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplierName">หรือ ระบุชื่อผู้จัดจำหน่าย</Label>
                <Input 
                  id="supplierName" 
                  placeholder="ชื่อผู้จัดจำหน่าย"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  disabled={!!selectedSupplierId}
                />
              </div>
            </div>

            {/* Expiry Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiry">วันหมดอายุ</Label>
                <Input 
                  id="expiry" 
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="warrantyExpiry">วันสิ้นสุดการรับประกัน</Label>
                <Input 
                  id="warrantyExpiry" 
                  type="date"
                  value={warrantyExpiryDate}
                  onChange={(e) => setWarrantyExpiryDate(e.target.value)}
                />
              </div>
            </div>

            {/* Document Upload */}
            <div className="p-4 bg-muted/30 rounded-lg space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" />
                เอกสารแนบ
              </h3>
              <div className="space-y-2">
                <Label htmlFor="document">อัปโหลดเอกสาร (PDF, รูปภาพ, Word)</Label>
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    id="document"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    เลือกไฟล์
                  </Button>
                  {documentFile && (
                    <div className="flex items-center gap-2 bg-background px-3 py-2 rounded-md border">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-sm truncate max-w-[200px]">{documentFile.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeFile}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">รองรับไฟล์ PDF, JPG, PNG, DOC, DOCX (สูงสุด 10MB)</p>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">หมายเหตุ</Label>
              <Textarea 
                id="notes" 
                placeholder="รายละเอียดเพิ่มเติม..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || isUploadingFile}>
              {isUploadingFile ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  กำลังอัปโหลดเอกสาร...
                </>
              ) : isLoading ? "กำลังบันทึก..." : "บันทึกข้อมูลสินค้า"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>ประวัติการนำสินค้าเข้า</CardTitle>
              <CardDescription>รายการที่ส่งเข้ามาแล้ว</CardDescription>
            </div>
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
                  <TableHead>ชื่อสินค้า</TableHead>
                  <TableHead>จำนวน</TableHead>
                  <TableHead>ผู้จัดจำหน่าย</TableHead>
                  <TableHead>ผู้ส่ง</TableHead>
                  <TableHead>เอกสาร</TableHead>
                  <TableHead>สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceipts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      ยังไม่มีรายการ
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReceipts.map((receipt) => (
                    <TableRow key={receipt.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{receipt.document_no}</TableCell>
                      <TableCell>{format(new Date(receipt.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                      <TableCell>{receipt.equipment_name || "-"}</TableCell>
                      <TableCell>{receipt.quantity} {receipt.unit}</TableCell>
                      <TableCell>{receipt.supplier_name || "-"}</TableCell>
                      <TableCell>{receipt.delivery_person_name}</TableCell>
                      <TableCell>
                        {receipt.document_url ? (
                          <a
                            href={receipt.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <FileText className="w-4 h-4" />
                            ดูเอกสาร
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryEntry;
