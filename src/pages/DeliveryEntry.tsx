import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Truck, Search, Package, Clock, CheckCircle2, Upload, FileText, X, Loader2, Info, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { CompanySelect } from "@/components/company/CompanySelect";
import { DeliveryImport } from "@/components/delivery/DeliveryImport";

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

interface Department {
  id: string;
  name: string;
}

interface WarehouseData {
  id: string;
  code: string;
  name: string;
  total_volume_cm3: number;
  remaining_volume_cm3: number;
}

interface ReceiptPurpose {
  id: string;
  name: string;
  description: string | null;
  purpose_type: string;
  requires_location: boolean;
  max_storage_days: number | null;
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
  is_asset?: boolean;
  asset_code?: string | null;
  equipment_id_code?: string | null;
  waiting_asset_code?: boolean;
  waiting_equipment_id?: boolean;
}

const DeliveryEntry = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [receiptPurposes, setReceiptPurposes] = useState<ReceiptPurpose[]>([]);
  const [pendingReceipts, setPendingReceipts] = useState<PendingReceipt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Receipt Purpose
  const [selectedReceiptPurposeId, setSelectedReceiptPurposeId] = useState("");

  // Form state
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
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
  const [unitPrice, setUnitPrice] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [warrantyExpiryDate, setWarrantyExpiryDate] = useState("");
  const [deliveryPersonName, setDeliveryPersonName] = useState("");
  const [deliveryPersonPhone, setDeliveryPersonPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentFileName, setDocumentFileName] = useState("");
  
  // Storage dimensions
  const [storageWidthCm, setStorageWidthCm] = useState("");
  const [storageHeightCm, setStorageHeightCm] = useState("");
  const [storageDepthCm, setStorageDepthCm] = useState("");
  
  // Asset fields
  const [isAsset, setIsAsset] = useState(false);
  const [assetCode, setAssetCode] = useState("");
  const [equipmentIdCode, setEquipmentIdCode] = useState("");
  const [waitingAssetCode, setWaitingAssetCode] = useState(false);
  const [waitingEquipmentId, setWaitingEquipmentId] = useState(false);
  const [depreciationMonths, setDepreciationMonths] = useState("");

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

  // Selected warehouse info
  const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId);

  useEffect(() => {
    fetchEquipment();
    fetchSuppliers();
    fetchDepartments();
    fetchWarehouses();
    fetchReceiptPurposes();
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

  const fetchDepartments = async () => {
    const { data, error } = await supabase
      .from("departments")
      .select("id, name")
      .eq("is_active", true)
      .order("name");
    
    if (!error && data) {
      setDepartments(data);
    }
  };

  const fetchWarehouses = async () => {
    const { data: warehousesData, error } = await supabase
      .from("warehouses")
      .select("id, code, name")
      .eq("is_active", true)
      .order("code");
    
    if (!error && warehousesData) {
      // Get locations for each warehouse to calculate volume
      const warehousesWithVolume = await Promise.all(
        warehousesData.map(async (warehouse) => {
          const { data: locationsData } = await supabase
            .from("locations")
            .select("volume_cm3, used_volume_cm3")
            .eq("warehouse_id", warehouse.id)
            .eq("is_active", true);

          const totalVolume = (locationsData || []).reduce((sum, loc) => sum + (loc.volume_cm3 || 0), 0);
          const usedVolume = (locationsData || []).reduce((sum, loc) => sum + (loc.used_volume_cm3 || 0), 0);

          return {
            ...warehouse,
            total_volume_cm3: totalVolume,
            remaining_volume_cm3: totalVolume - usedVolume
          };
        })
      );

      setWarehouses(warehousesWithVolume);
    }
  };

  const fetchReceiptPurposes = async () => {
    const { data, error } = await supabase
      .from("receipt_purposes")
      .select("id, name, description, purpose_type, requires_location, max_storage_days")
      .eq("is_active", true)
      .order("purpose_type", { ascending: true })
      .order("name", { ascending: true });
    
    if (!error && data) {
      setReceiptPurposes(data);
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
    setDocumentFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadDocument = async (documentNo: string): Promise<string | null> => {
    if (!documentFile) return null;

    const fileExt = documentFile.name.split('.').pop();
    const customName = documentFileName.trim() || documentNo;
    const fileName = `${customName}-${Date.now()}.${fileExt}`;
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
    
    if (!quantity || !deliveryPersonName || !unitPrice || !selectedCompanyId || !selectedDepartmentId) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน (ฝ่าย, บริษัท, จำนวน, ชื่อผู้ส่ง, และราคาต่อชิ้น)");
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
          department_id: selectedDepartmentId,
          company_id: selectedCompanyId,
          warehouse_id: selectedWarehouseId || null,
          receipt_purpose_id: selectedReceiptPurposeId || null,
          equipment_id: selectedEquipmentId || null,
          equipment_code: equipmentCode || null,
          equipment_name: equipmentName || (selectedEquipment?.name || null),
          quantity: parseInt(quantity),
          unit: unit,
          supplier_id: selectedSupplierId || null,
          supplier_name: supplierName || (selectedSupplier?.name || null),
          lot_number: lotNumber1 || null,
          lot_number_2: lotNumber2 || null,
          serial_number: serialNumber || null,
          unit_price: unitPrice ? parseFloat(unitPrice) : null,
          expiry_date: expiryDate || null,
          warranty_expiry_date: warrantyExpiryDate || null,
          delivery_person_name: deliveryPersonName,
          delivery_person_phone: deliveryPersonPhone || null,
          notes: notes || null,
          document_url: documentUrl,
          document_file_name: documentFileName || null,
          storage_width_cm: storageWidthCm ? parseFloat(storageWidthCm) : null,
          storage_height_cm: storageHeightCm ? parseFloat(storageHeightCm) : null,
          storage_depth_cm: storageDepthCm ? parseFloat(storageDepthCm) : null,
          storage_volume_cm3: calculatedVolume ? parseFloat(calculatedVolume) : null,
          status: "pending",
          is_asset: isAsset,
          asset_code: assetCode || null,
          equipment_id_code: equipmentIdCode || null,
          waiting_asset_code: waitingAssetCode,
          waiting_equipment_id: waitingEquipmentId,
          depreciation_months: depreciationMonths ? parseInt(depreciationMonths) : null,
        });

      if (error) throw error;

      toast.success("บันทึกข้อมูลสินค้าสำเร็จ รอเจ้าหน้าที่คลังรับเข้า");
      
      // Reset form
      setSelectedReceiptPurposeId("");
      setSelectedDepartmentId("");
      setSelectedCompanyId("");
      setSelectedWarehouseId("");
      setSelectedEquipmentId("");
      setEquipmentCode("");
      setEquipmentName("");
      setQuantity("");
      setUnit("ชิ้น");
      setSelectedSupplierId("");
      setSupplierName("");
      setLotNumber1("");
      setLotNumber2("");
      setSerialNumber("");
      setUnitPrice("");
      setExpiryDate("");
      setWarrantyExpiryDate("");
      setDeliveryPersonName("");
      setDeliveryPersonPhone("");
      setNotes("");
      setDocumentFile(null);
      setDocumentFileName("");
      setStorageWidthCm("");
      setStorageHeightCm("");
      setStorageDepthCm("");
      setIsAsset(false);
      setAssetCode("");
      setEquipmentIdCode("");
      setWaitingAssetCode(false);
      setWaitingEquipmentId(false);
      setDepreciationMonths("");
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-2 flex items-center gap-2">
            <Truck className="w-8 h-8" />
            นำสินค้าเข้า
          </h1>
          <p className="text-muted-foreground">สำหรับผู้นำสินค้า/อะไหล่เข้าคลัง คีย์ข้อมูลก่อนส่งให้เจ้าหน้าที่คลัง</p>
        </div>
        <DeliveryImport onSuccess={fetchPendingReceipts} />
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
            {/* Department & Company Selection */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-4">
              <h3 className="font-medium text-sm text-primary">เลือกฝ่ายและบริษัท *</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">ฝ่าย *</Label>
                  <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                    <SelectTrigger id="department">
                      <SelectValue placeholder="เลือกฝ่าย..." />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4} className="pointer-events-auto">
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    เลือกฝ่ายที่รับผิดชอบสินค้านี้
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">บริษัทที่สั่งซื้อ *</Label>
                  <CompanySelect
                    value={selectedCompanyId}
                    onChange={setSelectedCompanyId}
                    placeholder="เลือกบริษัท..."
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    กรุณาเลือกบริษัทที่เป็นเจ้าของงบประมาณ
                  </p>
                </div>
              </div>
            </div>

            {/* Receipt Purpose Selection */}
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg space-y-4">
              <h3 className="font-medium text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                วัตถุประสงค์การนำสินค้าเข้า
              </h3>
              <div className="space-y-2">
                <Label htmlFor="receiptPurpose">วัตถุประสงค์</Label>
                <Select value={selectedReceiptPurposeId} onValueChange={setSelectedReceiptPurposeId}>
                  <SelectTrigger id="receiptPurpose">
                    <SelectValue placeholder="เลือกวัตถุประสงค์..." />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="pointer-events-auto">
                    {receiptPurposes.filter(p => p.purpose_type === 'regular').length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">รับเข้าปกติ</div>
                        {receiptPurposes.filter(p => p.purpose_type === 'regular').map((purpose) => (
                          <SelectItem key={purpose.id} value={purpose.id}>
                            {purpose.name}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {receiptPurposes.filter(p => p.purpose_type === 'storage').length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1">ฝากเก็บชั่วคราว</div>
                        {receiptPurposes.filter(p => p.purpose_type === 'storage').map((purpose) => (
                          <SelectItem key={purpose.id} value={purpose.id}>
                            {purpose.name} {purpose.max_storage_days ? `(${purpose.max_storage_days} วัน)` : ''}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  เลือกวัตถุประสงค์ในการนำสินค้าเข้าคลัง
                </p>
              </div>
            </div>

            {/* Warehouse Selection */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-4">
              <h3 className="font-medium text-sm text-blue-700 dark:text-blue-400 flex items-center gap-2">
                <Warehouse className="w-4 h-4" />
                เลือกคลังสินค้าที่จัดเก็บ
              </h3>
              <div className="space-y-2">
                <Label htmlFor="warehouse">คลังสินค้า</Label>
                <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                  <SelectTrigger id="warehouse">
                    <SelectValue placeholder="เลือกคลังสินค้า..." />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="pointer-events-auto">
                    {warehouses.map((wh) => (
                      <SelectItem key={wh.id} value={wh.id}>
                        {wh.code} - {wh.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedWarehouse && (
                  <div className="flex items-center gap-2 text-sm">
                    <Info className="w-4 h-4 text-blue-500" />
                    <span className="text-muted-foreground">พื้นที่จัดเก็บที่เหลือ:</span>
                    <span className={selectedWarehouse.remaining_volume_cm3 < 0 ? "text-destructive font-medium" : "text-green-600 font-medium"}>
                      {selectedWarehouse.remaining_volume_cm3.toLocaleString()} cm³
                    </span>
                  </div>
                )}
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
                  <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto pointer-events-auto">
                    {equipment.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.code} - {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  ค้นหาจากรหัสและชื่อสินค้าในข้อมูลหลัก
                </p>
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
                <p className="text-xs text-muted-foreground">
                  หากไม่พบสินค้าในระบบ สามารถพิมพ์ชื่อได้เอง
                </p>
              </div>
            </div>

            {/* Quantity, Unit & Lot Numbers */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <Label htmlFor="lotNumber1">Lot Number 1</Label>
                <Input 
                  id="lotNumber1" 
                  placeholder="Lot No. 1"
                  value={lotNumber1}
                  onChange={(e) => setLotNumber1(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lotNumber2">Lot Number 2</Label>
                <Input 
                  id="lotNumber2" 
                  placeholder="Lot No. 2"
                  value={lotNumber2}
                  onChange={(e) => setLotNumber2(e.target.value)}
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

            {/* Storage Dimensions */}
            <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg space-y-4">
              <h3 className="font-medium text-sm text-green-700 dark:text-green-400">ขนาดพื้นที่ๆต้องการใช้</h3>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1 flex-1 min-w-[100px]">
                  <Label htmlFor="storageWidth" className="text-xs">กว้าง (ซ้าย-ขวา)</Label>
                  <div className="flex items-center gap-1">
                    <Input 
                      id="storageWidth" 
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={storageWidthCm}
                      onChange={(e) => setStorageWidthCm(e.target.value)}
                      className="h-9"
                    />
                    <span className="text-xs text-muted-foreground">cm</span>
                  </div>
                </div>
                <span className="text-muted-foreground pb-2">×</span>
                <div className="space-y-1 flex-1 min-w-[100px]">
                  <Label htmlFor="storageHeight" className="text-xs">สูง (บน-ล่าง)</Label>
                  <div className="flex items-center gap-1">
                    <Input 
                      id="storageHeight" 
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={storageHeightCm}
                      onChange={(e) => setStorageHeightCm(e.target.value)}
                      className="h-9"
                    />
                    <span className="text-xs text-muted-foreground">cm</span>
                  </div>
                </div>
                <span className="text-muted-foreground pb-2">×</span>
                <div className="space-y-1 flex-1 min-w-[100px]">
                  <Label htmlFor="storageDepth" className="text-xs">ลึก (หน้า-หลัง)</Label>
                  <div className="flex items-center gap-1">
                    <Input 
                      id="storageDepth" 
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={storageDepthCm}
                      onChange={(e) => setStorageDepthCm(e.target.value)}
                      className="h-9"
                    />
                    <span className="text-xs text-muted-foreground">cm</span>
                  </div>
                </div>
                <span className="text-muted-foreground pb-2">=</span>
                <div className="space-y-1 min-w-[140px]">
                  <Label className="text-xs">ลูกบาศก์เซนติเมตร</Label>
                  <div className="flex items-center gap-1">
                    <Input 
                      readOnly
                      value={calculatedVolume || "-"}
                      className="h-9 bg-muted font-medium"
                    />
                    <span className="text-xs text-muted-foreground">cm³</span>
                  </div>
                </div>
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
                  <SelectContent position="popper" sideOffset={4} className="pointer-events-auto">
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

            {/* Asset Information */}
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-sm text-amber-700 dark:text-amber-400">ข้อมูลทรัพย์สิน</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="isAsset" className="text-sm text-amber-700 dark:text-amber-400">สินค้านี้เป็นทรัพย์สิน?</Label>
                  <Switch
                    id="isAsset"
                    checked={isAsset}
                    onCheckedChange={setIsAsset}
                  />
                </div>
              </div>

              {isAsset && (
                <div className="space-y-4 pt-2 border-t border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-600 dark:text-amber-500">
                    สินค้าที่เป็นทรัพย์สินต้องระบุรหัสทรัพย์สินและ Equipment ID หากยังไม่มีรหัส สามารถเลือก "รอรหัส" ได้
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="assetCode">รหัสทรัพย์สิน *</Label>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="waitingAssetCode"
                            checked={waitingAssetCode}
                            onCheckedChange={(checked) => {
                              setWaitingAssetCode(checked === true);
                              if (checked) setAssetCode("");
                            }}
                          />
                          <Label htmlFor="waitingAssetCode" className="text-xs text-muted-foreground">รอรหัสทรัพย์สิน</Label>
                        </div>
                      </div>
                      <Input 
                        id="assetCode" 
                        placeholder="รหัสทรัพย์สิน"
                        value={assetCode}
                        onChange={(e) => setAssetCode(e.target.value)}
                        disabled={waitingAssetCode}
                        required={isAsset && !waitingAssetCode}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="equipmentIdCode">Equipment ID *</Label>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="waitingEquipmentId"
                            checked={waitingEquipmentId}
                            onCheckedChange={(checked) => {
                              setWaitingEquipmentId(checked === true);
                              if (checked) setEquipmentIdCode("");
                            }}
                          />
                          <Label htmlFor="waitingEquipmentId" className="text-xs text-muted-foreground">รอ Equipment ID</Label>
                        </div>
                      </div>
                      <Input 
                        id="equipmentIdCode" 
                        placeholder="Equipment ID"
                        value={equipmentIdCode}
                        onChange={(e) => setEquipmentIdCode(e.target.value)}
                        disabled={waitingEquipmentId}
                        required={isAsset && !waitingEquipmentId}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="depreciationMonths">ระยะเวลาค่าเสื่อม (เดือน) *</Label>
                    <Input 
                      id="depreciationMonths" 
                      type="number"
                      placeholder="จำนวนเดือน เช่น 60"
                      value={depreciationMonths}
                      onChange={(e) => setDepreciationMonths(e.target.value)}
                      required={isAsset}
                    />
                    <p className="text-xs text-muted-foreground">
                      ระบุระยะเวลาในการคิดค่าเสื่อมราคาของทรัพย์สิน (เช่น 60 เดือน = 5 ปี)
                    </p>
                  </div>
                </div>
              )}
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
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="documentFileName">ตั้งชื่อไฟล์ (ไม่เกิน 30 ตัวอักษร)</Label>
                  <Input 
                    id="documentFileName" 
                    placeholder="ชื่อสำหรับค้นหาเอกสาร..."
                    value={documentFileName}
                    onChange={(e) => setDocumentFileName(e.target.value.slice(0, 30))}
                    maxLength={30}
                  />
                  <p className="text-xs text-muted-foreground">
                    ชื่อนี้จะใช้ในการค้นหาเอกสารย้อนหลังที่หน้า "ค้นหาเอกสาร" (ค้นหาได้จากชื่อไฟล์, เลขที่เอกสาร, ชื่อสินค้า)
                  </p>
                </div>
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
