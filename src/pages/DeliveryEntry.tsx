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
import { Truck, Search, Package, Clock, CheckCircle2, Upload, FileText, X, Loader2, Info, Plus, ShoppingCart, Send, PlusCircle, Monitor } from "lucide-react";
import { EquipmentImageViewer } from "@/components/equipment/EquipmentImageViewer";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { CompanySelect } from "@/components/company/CompanySelect";
import { DeliveryImport } from "@/components/delivery/DeliveryImport";
import { DeliveryCart, DeliveryCartItem } from "@/components/delivery/DeliveryCart";
import { DeliveryCartItemEditDialog } from "@/components/delivery/DeliveryCartItemEditDialog";
import { SearchableSelect } from "@/components/ui/searchable-select";


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

interface CMSType {
  id: string;
  name: string;
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
  is_media_player?: boolean;
}

const DeliveryEntry = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cmsTypes, setCmsTypes] = useState<CMSType[]>([]);
  const [mediaPlayers, setMediaPlayers] = useState<{ id: string; code: string; name: string; }[]>([]);
  
  const [receiptPurposes, setReceiptPurposes] = useState<ReceiptPurpose[]>([]);
  const [pendingReceipts, setPendingReceipts] = useState<PendingReceipt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Cart items
  const [cartItems, setCartItems] = useState<DeliveryCartItem[]>([]);
  const [editingItem, setEditingItem] = useState<DeliveryCartItem | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  // Header data (shared across all items)
  const [selectedReceiptPurposeId, setSelectedReceiptPurposeId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [deliveryPersonName, setDeliveryPersonName] = useState("");
  const [deliveryPersonPhone, setDeliveryPersonPhone] = useState("");
  
  // PO/PR fields for "นำเข้าจากการซื้อ"
  const [poNumber, setPoNumber] = useState("");
  const [prNumber, setPrNumber] = useState("");
  const [purchaseDocumentFile, setPurchaseDocumentFile] = useState<File | null>(null);
  const purchaseFileInputRef = useRef<HTMLInputElement>(null);
  
  // Document upload (shared)
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentFileName, setDocumentFileName] = useState("");
  const [headerNotes, setHeaderNotes] = useState("");
  
  // Item type toggle - Equipment or Media Player
  const [isMediaPlayerEntry, setIsMediaPlayerEntry] = useState(false);
  
  // Current item form state
  const [selectedEquipmentId, setSelectedEquipmentId] = useState("");
  const [selectedMediaPlayerId, setSelectedMediaPlayerId] = useState("");
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
  const [itemNotes, setItemNotes] = useState("");
  
  // Media Player specific fields
  const [selectedCmsTypeId, setSelectedCmsTypeId] = useState("");
  const [idDisplay, setIdDisplay] = useState("");
  const [groupLed, setGroupLed] = useState("");
  const [serialNumber2, setSerialNumber2] = useState("");
  const [ledControl, setLedControl] = useState("");
  
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

  useEffect(() => {
    fetchEquipment();
    fetchSuppliers();
    fetchDepartments();
    fetchReceiptPurposes();
    fetchPendingReceipts();
    fetchCmsTypes();
    fetchMediaPlayers();
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

  const fetchCmsTypes = async () => {
    const { data, error } = await supabase
      .from("cms_types")
      .select("id, name")
      .eq("is_active", true)
      .order("name");
    
    if (!error && data) {
      setCmsTypes(data);
    }
  };

  const fetchMediaPlayers = async () => {
    const { data, error } = await supabase
      .from("media_players")
      .select("id, code, name")
      .eq("is_active", true)
      .order("code");
    
    if (!error && data) {
      setMediaPlayers(data);
    }
  };

  const selectedEquipment = equipment.find(e => e.id === selectedEquipmentId);
  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);
  const selectedReceiptPurpose = receiptPurposes.find(p => p.id === selectedReceiptPurposeId);
  const isPurchaseReceipt = selectedReceiptPurpose?.name === "นำเข้าจากการซื้อ";

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
      if (file.size > 10 * 1024 * 1024) {
        toast.error("ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)");
        return;
      }
      
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

  const handlePurchaseFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)");
        return;
      }
      
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        toast.error("รองรับเฉพาะไฟล์ PDF และรูปภาพ (JPG, PNG) เท่านั้น");
        return;
      }
      
      setPurchaseDocumentFile(file);
    }
  };

  const removePurchaseFile = () => {
    setPurchaseDocumentFile(null);
    if (purchaseFileInputRef.current) {
      purchaseFileInputRef.current.value = "";
    }
  };

  const uploadPurchaseDocument = async (documentNo: string): Promise<string | null> => {
    if (!purchaseDocumentFile) return null;

    const fileExt = purchaseDocumentFile.name.split('.').pop();
    const fileName = `PO-PR-${documentNo}-${Date.now()}.${fileExt}`;
    const filePath = `purchase-documents/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('delivery-documents')
      .upload(filePath, purchaseDocumentFile);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('ไม่สามารถอัปโหลดเอกสารได้');
    }

    const { data: { publicUrl } } = supabase.storage
      .from('delivery-documents')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  // Add item to cart
  const handleAddToCart = () => {
    if (!quantity || parseInt(quantity) < 1) {
      toast.error("กรุณาระบุจำนวน");
      return;
    }
    
    if (isMediaPlayerEntry) {
      // Media Player validation
      if (!selectedMediaPlayerId && !equipmentName) {
        toast.error("กรุณาเลือก Media Player หรือระบุชื่อ");
        return;
      }
      if (!unitPrice) {
        toast.error("กรุณาระบุราคาต่อชิ้น");
        return;
      }
      
      const selectedMP = mediaPlayers.find(mp => mp.id === selectedMediaPlayerId);
      
      const newItem: DeliveryCartItem = {
        id: crypto.randomUUID(),
        equipment_id: null,
        equipment_code: selectedMP?.code || equipmentCode,
        equipment_name: selectedMP?.name || equipmentName,
        quantity: parseInt(quantity),
        unit: unit || "เครื่อง",
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
        // Media Player specific
        is_media_player: true,
        media_player_id: selectedMediaPlayerId || null,
        cms_type_id: selectedCmsTypeId,
        id_display: idDisplay,
        group_led: groupLed,
        serial_number_2: serialNumber2,
        led_control: ledControl,
      };
      
      setCartItems([...cartItems, newItem]);
    } else {
      // Regular equipment validation
      if (!selectedEquipmentId && !equipmentName) {
        toast.error("กรุณาเลือกสินค้า หรือระบุชื่อสินค้า");
        return;
      }
      
      if (!unitPrice) {
        toast.error("กรุณาระบุราคาต่อชิ้น");
        return;
      }

      const newItem: DeliveryCartItem = {
        id: crypto.randomUUID(),
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
        is_media_player: false,
      };

      setCartItems([...cartItems, newItem]);
    }
    
    // Reset item form
    resetItemForm();
    
    toast.success("เพิ่มรายการลงตะกร้าแล้ว");
  };

  const resetItemForm = () => {
    setSelectedEquipmentId("");
    setSelectedMediaPlayerId("");
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
    setStorageWidthCm("");
    setStorageHeightCm("");
    setStorageDepthCm("");
    setIsAsset(false);
    setAssetCode("");
    setEquipmentIdCode("");
    setWaitingAssetCode(false);
    setWaitingEquipmentId(false);
    setDepreciationMonths("");
    setItemNotes("");
    // Media Player specific
    setSelectedCmsTypeId("");
    setIdDisplay("");
    setGroupLed("");
    setSerialNumber2("");
    setLedControl("");
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCartItems(cartItems.filter(item => item.id !== itemId));
    toast.success("ลบรายการออกจากตะกร้าแล้ว");
  };

  const handleEditItem = (item: DeliveryCartItem) => {
    setEditingItem(item);
    setShowEditDialog(true);
  };

  const handleSaveEditItem = (updatedItem: DeliveryCartItem) => {
    setCartItems(cartItems.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    ));
  };

  const handleClearCart = () => {
    setCartItems([]);
    toast.success("ล้างตะกร้าแล้ว");
  };

  const handleSubmitAll = async () => {
    if (cartItems.length === 0) {
      toast.error("กรุณาเพิ่มสินค้าลงตะกร้าอย่างน้อย 1 รายการ");
      return;
    }
    
    if (!deliveryPersonName || !selectedCompanyId || !selectedDepartmentId) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน (ฝ่าย, บริษัท, ชื่อผู้ส่ง)");
      return;
    }
    
    // Validate PO/PR for "นำเข้าจากการซื้อ"
    if (isPurchaseReceipt && !poNumber && !prNumber) {
      toast.error("กรุณากรอกเลข PO หรือเลข PR อย่างน้อย 1 รายการ");
      return;
    }

    setIsLoading(true);

    try {
      const docNo = generateDocumentNo();
      let documentUrl: string | null = null;
      let purchaseDocumentUrl: string | null = null;

      // Upload documents if exists
      if (documentFile) {
        setIsUploadingFile(true);
        documentUrl = await uploadDocument(docNo);
        setIsUploadingFile(false);
      }
      
      if (purchaseDocumentFile) {
        setIsUploadingFile(true);
        purchaseDocumentUrl = await uploadPurchaseDocument(docNo);
        setIsUploadingFile(false);
      }

      // Insert all items with the same document number
      const itemsToInsert = cartItems.map((item, index) => ({
        document_no: `${docNo}-${(index + 1).toString().padStart(2, "0")}`,
        department_id: selectedDepartmentId,
        company_id: selectedCompanyId,
        warehouse_id: null,
        receipt_purpose_id: selectedReceiptPurposeId || null,
        equipment_id: item.is_media_player ? null : item.equipment_id,
        equipment_code: item.equipment_code || null,
        equipment_name: item.equipment_name || null,
        quantity: item.quantity,
        unit: item.unit,
        supplier_id: item.supplier_id,
        supplier_name: item.supplier_name || null,
        lot_number: item.lot_number_1 || null,
        lot_number_2: item.lot_number_2 || null,
        serial_number: item.serial_number || null,
        unit_price: item.unit_price,
        expiry_date: item.expiry_date || null,
        warranty_expiry_date: item.warranty_expiry_date || null,
        delivery_person_name: deliveryPersonName,
        delivery_person_phone: deliveryPersonPhone || null,
        notes: item.notes || headerNotes || null,
        document_url: documentUrl,
        document_file_name: documentFileName || null,
        storage_width_cm: item.storage_width_cm ? parseFloat(item.storage_width_cm) : null,
        storage_height_cm: item.storage_height_cm ? parseFloat(item.storage_height_cm) : null,
        storage_depth_cm: item.storage_depth_cm ? parseFloat(item.storage_depth_cm) : null,
        storage_volume_cm3: item.storage_volume_cm3 ? parseFloat(item.storage_volume_cm3) : null,
        status: "pending",
        is_asset: item.is_asset,
        asset_code: item.asset_code || null,
        equipment_id_code: item.equipment_id_code || null,
        waiting_asset_code: item.waiting_asset_code,
        waiting_equipment_id: item.waiting_equipment_id,
        depreciation_months: item.depreciation_months ? parseInt(item.depreciation_months) : null,
        po_number: poNumber || null,
        pr_number: prNumber || null,
        purchase_document_url: purchaseDocumentUrl,
        // Media Player specific fields
        is_media_player: item.is_media_player || false,
        media_player_id: item.media_player_id || null,
      }));

      const { error } = await supabase
        .from("goods_receipt_pending")
        .insert(itemsToInsert as any);

      if (error) throw error;

      toast.success(`บันทึกข้อมูลสินค้าสำเร็จ ${cartItems.length} รายการ รอเจ้าหน้าที่คลังรับเข้า`);
      
      // Reset all forms
      setCartItems([]);
      setSelectedReceiptPurposeId("");
      setSelectedDepartmentId("");
      setSelectedCompanyId("");
      setDeliveryPersonName("");
      setDeliveryPersonPhone("");
      setPoNumber("");
      setPrNumber("");
      setPurchaseDocumentFile(null);
      setDocumentFile(null);
      setDocumentFileName("");
      setHeaderNotes("");
      resetItemForm();
      
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (purchaseFileInputRef.current) {
        purchaseFileInputRef.current.value = "";
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
          <p className="text-muted-foreground">สำหรับผู้นำสินค้า/อะไหล่เข้าคลัง - รองรับหลายรายการต่อ 1 เอกสาร</p>
        </div>
        <DeliveryImport onSuccess={fetchPendingReceipts} />
      </div>

      {/* Edit Item Dialog */}
      <DeliveryCartItemEditDialog
        item={editingItem}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSave={handleSaveEditItem}
        equipment={equipment}
        suppliers={suppliers}
      />

      {/* Cart Display */}
      <DeliveryCart
        items={cartItems}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={handleClearCart}
        onEditItem={handleEditItem}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            บันทึกข้อมูลสินค้า
          </CardTitle>
          <CardDescription>
            กรอกข้อมูลสินค้าแล้วกด "เพิ่มลงตะกร้า" เมื่อครบทุกรายการแล้วกด "ส่งทั้งหมด"
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Header Section - Shared Data */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-4">
              <h3 className="font-medium text-sm text-primary">ข้อมูลหลัก (ใช้ร่วมกันทุกรายการ) *</h3>
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">บริษัทที่สั่งซื้อ *</Label>
                  <CompanySelect
                    value={selectedCompanyId}
                    onChange={setSelectedCompanyId}
                    placeholder="เลือกบริษัท..."
                    required
                  />
                </div>
              </div>
              
              {/* Delivery Person Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-primary/20">
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
              </div>
              
              {/* PO/PR fields for "นำเข้าจากการซื้อ" */}
              {isPurchaseReceipt && (
                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg space-y-4">
                  <h4 className="font-medium text-sm text-amber-700 dark:text-amber-400">
                    ข้อมูล PO/PR (กรอกอย่างน้อย 1 รายการ) *
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="poNumber">เลข PO (Purchase Order)</Label>
                      <Input 
                        id="poNumber" 
                        placeholder="กรอกเลข PO..."
                        value={poNumber}
                        onChange={(e) => setPoNumber(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prNumber">เลข PR (Purchase Request)</Label>
                      <Input 
                        id="prNumber" 
                        placeholder="กรอกเลข PR..."
                        value={prNumber}
                        onChange={(e) => setPrNumber(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>เอกสาร PO/PR (รองรับ PDF และรูปภาพ)</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={purchaseFileInputRef}
                        onChange={handlePurchaseFileSelect}
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => purchaseFileInputRef.current?.click()}
                        className="flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        เลือกไฟล์เอกสาร
                      </Button>
                      {purchaseDocumentFile && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm truncate max-w-[200px]">
                            {purchaseDocumentFile.name}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={removePurchaseFile}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Item Form Section */}
            <div className="p-4 bg-muted/30 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm text-foreground flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  ข้อมูลสินค้า (รายการที่ {cartItems.length + 1})
                </h3>
                <div className="flex items-center gap-4">
                  {cartItems.length > 0 && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      <ShoppingCart className="w-3 h-3 mr-1" />
                      {cartItems.length} รายการในตะกร้า
                    </Badge>
                  )}
                  {/* Toggle Media Player */}
                  <div className="flex items-center gap-2">
                    <Label htmlFor="mediaPlayerToggle" className="text-sm flex items-center gap-1.5">
                      <Monitor className="w-4 h-4" />
                      Media Player
                    </Label>
                    <Switch
                      id="mediaPlayerToggle"
                      checked={isMediaPlayerEntry}
                      onCheckedChange={(checked) => {
                        setIsMediaPlayerEntry(checked);
                        resetItemForm();
                        if (checked) {
                          setUnit("เครื่อง");
                          setIsAsset(true);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Media Player Selection (when toggle is on) */}
              {isMediaPlayerEntry ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mediaPlayer">เลือก Media Player (ถ้ามีในระบบ)</Label>
                      <SearchableSelect
                        options={mediaPlayers.map((mp) => ({
                          value: mp.id,
                          label: `${mp.code} - ${mp.name}`,
                          searchableText: `${mp.code} ${mp.name}`,
                        }))}
                        value={selectedMediaPlayerId}
                        onValueChange={(val) => {
                          setSelectedMediaPlayerId(val);
                          const mp = mediaPlayers.find(m => m.id === val);
                          if (mp) {
                            setEquipmentCode(mp.code);
                            setEquipmentName(mp.name);
                          }
                        }}
                        placeholder="เลือก Media Player..."
                        searchPlaceholder="พิมพ์รหัสหรือชื่อ Media Player..."
                        emptyMessage="ไม่พบ Media Player"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mediaPlayerName">หรือ ระบุชื่อ Media Player ใหม่</Label>
                      <Input 
                        id="mediaPlayerName" 
                        placeholder="ชื่อ Media Player ที่ยังไม่มีในระบบ"
                        value={equipmentName}
                        onChange={(e) => setEquipmentName(e.target.value)}
                        disabled={!!selectedMediaPlayerId}
                      />
                    </div>
                  </div>
                  
                  {/* Media Player Specific Fields */}
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-4">
                    <h4 className="font-medium text-sm text-blue-700 dark:text-blue-400 flex items-center gap-2">
                      <Monitor className="w-4 h-4" />
                      ข้อมูลเฉพาะ Media Player
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cmsType">ประเภท CMS</Label>
                        <Select value={selectedCmsTypeId} onValueChange={setSelectedCmsTypeId}>
                          <SelectTrigger id="cmsType">
                            <SelectValue placeholder="เลือก CMS..." />
                          </SelectTrigger>
                          <SelectContent>
                            {cmsTypes.map((cms) => (
                              <SelectItem key={cms.id} value={cms.id}>{cms.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="idDisplay">ID Display</Label>
                        <Input 
                          id="idDisplay" 
                          placeholder="ID Display"
                          value={idDisplay}
                          onChange={(e) => setIdDisplay(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="groupLed">Group LED</Label>
                        <Input 
                          id="groupLed" 
                          placeholder="Group LED"
                          value={groupLed}
                          onChange={(e) => setGroupLed(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ledControl">LED Control</Label>
                        <Input 
                          id="ledControl" 
                          placeholder="LED Control"
                          value={ledControl}
                          onChange={(e) => setLedControl(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="serialNumber1">Serial Number 1</Label>
                        <Input 
                          id="serialNumber1" 
                          placeholder="SN-1"
                          value={serialNumber}
                          onChange={(e) => setSerialNumber(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="serialNumber2">Serial Number 2</Label>
                        <Input 
                          id="serialNumber2" 
                          placeholder="SN-2"
                          value={serialNumber2}
                          onChange={(e) => setSerialNumber2(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Equipment Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="equipment">เลือกสินค้า (ถ้ารู้รหัส)</Label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <SearchableSelect
                            options={equipment.map((item) => ({
                              value: item.id,
                              label: `${item.code} - ${item.name}`,
                              searchableText: `${item.code} ${item.name}`,
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
                    <div className="space-y-2">
                      <Label htmlFor="equipmentName">หรือ ระบุชื่อสินค้า (สินค้าใหม่)</Label>
                      <Input 
                        id="equipmentName" 
                        placeholder="ชื่อสินค้า/อะไหล่ ที่ยังไม่มีในระบบ"
                        value={equipmentName}
                        onChange={(e) => setEquipmentName(e.target.value)}
                        disabled={!!selectedEquipmentId}
                      />
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        สินค้าใหม่จะต้องสร้างในระบบตอนรับเข้าคลัง
                      </p>
                    </div>
                  </div>
                </>
              )}

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
                      <span className="text-xs text-muted-foreground">m</span>
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
                      <span className="text-xs text-muted-foreground">m</span>
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
                      <span className="text-xs text-muted-foreground">m</span>
                    </div>
                  </div>
                  <span className="text-muted-foreground pb-2">=</span>
                  <div className="space-y-1 min-w-[140px]">
                    <Label className="text-xs">ลูกบาศก์เมตร</Label>
                    <div className="flex items-center gap-1">
                      <Input 
                        readOnly
                        value={calculatedVolume || "-"}
                        className="h-9 bg-muted font-medium"
                      />
                      <span className="text-xs text-muted-foreground">m³</span>
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
                  <h3 className="font-medium text-sm text-amber-700 dark:text-amber-400">ข้อมูลทรัพย์สิน</h3>
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
                      />
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

              {/* Item Notes */}
              <div className="space-y-2">
                <Label htmlFor="itemNotes">หมายเหตุรายการ</Label>
                <Textarea 
                  id="itemNotes" 
                  placeholder="รายละเอียดเพิ่มเติมสำหรับรายการนี้..."
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Add to Cart Button */}
              <Button 
                type="button" 
                variant="secondary"
                className="w-full"
                onClick={handleAddToCart}
              >
                <Plus className="w-4 h-4 mr-2" />
                เพิ่มลงตะกร้า
              </Button>
            </div>

            {/* Document Upload (Shared) */}
            <div className="p-4 bg-muted/30 rounded-lg space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" />
                เอกสารแนบ (ใช้ร่วมกันทุกรายการ)
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
                </div>
              </div>
            </div>

            {/* Header Notes */}
            <div className="space-y-2">
              <Label htmlFor="headerNotes">หมายเหตุเอกสาร</Label>
              <Textarea 
                id="headerNotes" 
                placeholder="รายละเอียดเพิ่มเติมสำหรับเอกสารนี้..."
                value={headerNotes}
                onChange={(e) => setHeaderNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Submit All Button */}
            <Button 
              type="button"
              className="w-full" 
              disabled={isLoading || isUploadingFile || cartItems.length === 0}
              onClick={handleSubmitAll}
            >
              {isUploadingFile ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  กำลังอัปโหลดเอกสาร...
                </>
              ) : isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  ส่งทั้งหมด ({cartItems.length} รายการ)
                </>
              )}
            </Button>
          </div>
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
