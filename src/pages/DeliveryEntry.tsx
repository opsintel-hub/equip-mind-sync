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
import {
  Truck,
  Search,
  Package,
  Clock,
  CheckCircle2,
  Upload,
  FileText,
  X,
  Loader2,
  Info,
  Plus,
  ShoppingCart,
  Send,
  PlusCircle,
  Monitor,
  ImagePlus,
  Eye,
  AlertTriangle,
  ScanLine,
} from "lucide-react";
import { EquipmentImageViewer } from "@/components/equipment/EquipmentImageViewer";
import { EquipmentImageUpload } from "@/components/equipment/EquipmentImageUpload";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

import { DeliveryImport } from "@/components/delivery/DeliveryImport";
import { POUploadOCR, POImportResult } from "@/components/delivery/POUploadOCR";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { DeliveryCart, DeliveryCartItem } from "@/components/delivery/DeliveryCart";
import { DeliveryCartItemEditDialog } from "@/components/delivery/DeliveryCartItemEditDialog";
import { DeliveryDetailDialog } from "@/components/delivery/DeliveryDetailDialog";
import { DocumentUploadField } from "@/components/media-player/DocumentUploadField";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useAllowedDepartments } from "@/hooks/useAllowedDepartments";
import { dedupeMediaPlayersByCode } from "@/lib/mediaPlayerOptions";
interface Equipment {
  id: string;
  code: string;
  name: string;
  unit: string;
  category: string | null;
  subcategory_id: string | null;
  quantity_in_stock: number;
  unit_price: number;
  width_cm: number | null;
  height_cm: number | null;
  depth_cm: number | null;
  volume_cm3: number | null;
}
interface Category {
  id: string;
  name: string;
}
interface Subcategory {
  id: string;
  name: string;
  category_id: string;
}
interface Company {
  id: string;
  code: string;
  name: string;
  department_id: string | null;
}
interface Supplier {
  id: string;
  code: string;
  name: string;
  vendor_code: string | null;
}
// CMSType removed - no longer used
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
  const [snSearchTerm, setSnSearchTerm] = useState("");
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  // cmsTypes removed - no longer used
  const { allowedDepartments, isSingleDepartment, loading: deptLoading } = useAllowedDepartments("create");
  const [mediaPlayers, setMediaPlayers] = useState<
    {
      id: string;
      code: string;
      name: string;
      unit_price: number | null;
    }[]
  >([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [receiptPurposes, setReceiptPurposes] = useState<ReceiptPurpose[]>([]);
  const [pendingReceipts, setPendingReceipts] = useState<PendingReceipt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cart items
  const [cartItems, setCartItems] = useState<DeliveryCartItem[]>([]);
  const [selectedCartIds, setSelectedCartIds] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<DeliveryCartItem | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedDetailReceipt, setSelectedDetailReceipt] = useState<any | null>(null);
  const [showPOUpload, setShowPOUpload] = useState(false);

  // Header data (shared across all items)
  const [selectedReceiptPurposeId, setSelectedReceiptPurposeId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [deliveryPersonName, setDeliveryPersonName] = useState("");
  const [deliveryPersonPhone, setDeliveryPersonPhone] = useState("");

  // PO/PR/Invoice/ใบส่งของ fields for "นำเข้าจากการซื้อ"
  const [poNumber, setPoNumber] = useState("");
  const [prNumber, setPrNumber] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState("");
  const [poDocumentUrl, setPoDocumentUrl] = useState("");
  const [prDocumentUrl, setPrDocumentUrl] = useState("");
  const [invoiceDocumentUrl, setInvoiceDocumentUrl] = useState("");
  const [deliveryNoteDocumentUrl, setDeliveryNoteDocumentUrl] = useState("");
  const [orderForProject, setOrderForProject] = useState("");
  const [purchaseDocumentFile, setPurchaseDocumentFile] = useState<File | null>(null);
  const purchaseFileInputRef = useRef<HTMLInputElement>(null);

  // Document upload (shared) - 2 categories
  const [additionalDocumentFile, setAdditionalDocumentFile] = useState<File | null>(null);
  const [additionalImageFile, setAdditionalImageFile] = useState<File | null>(null);
  const [headerNotes, setHeaderNotes] = useState("");

  // File input refs for document uploads
  const additionalDocFileInputRef = useRef<HTMLInputElement>(null);
  const additionalImageFileInputRef = useRef<HTMLInputElement>(null);

  // Item type toggle - Equipment or Media Player
  const [isMediaPlayerEntry, setIsMediaPlayerEntry] = useState(false);

  // Current item form state
  const [selectedEquipmentId, setSelectedEquipmentId] = useState("");
  const [selectedMediaPlayerId, setSelectedMediaPlayerId] = useState("");
  const [equipmentCode, setEquipmentCode] = useState("");
  const [equipmentName, setEquipmentName] = useState("");
  const [manualEquipmentName, setManualEquipmentName] = useState("");
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

  // Media Player specific fields - dynamic device entries
  interface MediaPlayerDeviceEntry {
    id: string;
    serial_number_1: string;
    serial_number_2: string;
    device_name: string;
    activate_windows: string;
    image_file: File | null;
    image_preview: string | null;
    asset_code: string;
    equipment_id_code: string;
    waiting_asset_code: boolean;
    waiting_equipment_id: boolean;
  }
  const [mediaPlayerDevices, setMediaPlayerDevices] = useState<MediaPlayerDeviceEntry[]>([
    {
      id: crypto.randomUUID(),
      serial_number_1: "",
      serial_number_2: "",
      device_name: "",
      activate_windows: "",
      image_file: null,
      image_preview: null,
      asset_code: "",
      equipment_id_code: "",
      waiting_asset_code: false,
      waiting_equipment_id: false,
    },
  ]);

  // Per-unit equipment entries (similar to Media Player dynamic list)
  interface EquipmentUnitEntry {
    id: string;
    serial_number: string;
    device_name: string;
    image_file: File | null;
    image_preview: string | null;
    asset_code: string;
    equipment_id_code: string;
    waiting_asset_code: boolean;
    waiting_equipment_id: boolean;
  }
  const [perUnitMode, setPerUnitMode] = useState(false);
  const [equipmentUnits, setEquipmentUnits] = useState<EquipmentUnitEntry[]>([
    { id: crypto.randomUUID(), serial_number: "", device_name: "", image_file: null, image_preview: null, asset_code: "", equipment_id_code: "", waiting_asset_code: false, waiting_equipment_id: false },
  ]);

  // Storage dimensions
  const [storageWidthCm, setStorageWidthCm] = useState("");
  const [storageHeightCm, setStorageHeightCm] = useState("");
  const [storageDepthCm, setStorageDepthCm] = useState("");

  // Category and subcategory for new products
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("");

  // Product images for new products
  const [newProductImages, setNewProductImages] = useState<string[]>([]);

  // Min stock level for new products
  const [minStockLevel, setMinStockLevel] = useState("");

  // Asset fields
  const [isAsset, setIsAsset] = useState(false);
  const [assetCode, setAssetCode] = useState("");
  const [equipmentIdCode, setEquipmentIdCode] = useState("");
  const [waitingAssetCode, setWaitingAssetCode] = useState(false);
  const [waitingEquipmentId, setWaitingEquipmentId] = useState(false);
  const [depreciationMonths, setDepreciationMonths] = useState("");

  // Calculated volume (per unit)
  const volumePerUnit = (() => {
    const w = parseFloat(storageWidthCm) || 0;
    const h = parseFloat(storageHeightCm) || 0;
    const d = parseFloat(storageDepthCm) || 0;
    if (w > 0 && h > 0 && d > 0) {
      return w * h * d;
    }
    return 0;
  })();

  // Total volume = per unit volume × quantity
  const calculatedVolume = (() => {
    if (volumePerUnit > 0) {
      const qty = parseInt(quantity) || 1;
      return (volumePerUnit * qty).toFixed(2).replace(/^0+/, "");
    }
    return "";
  })();
  // Auto-select department if only one allowed
  useEffect(() => {
    if (!deptLoading && isSingleDepartment && allowedDepartments.length === 1 && !selectedDepartmentId) {
      setSelectedDepartmentId(allowedDepartments[0].id);
    }
  }, [deptLoading, isSingleDepartment, allowedDepartments, selectedDepartmentId]);

  useEffect(() => {
    fetchEquipment();
    fetchCompanies();
    fetchSuppliers();
    fetchReceiptPurposes();
    fetchPendingReceipts();
    // fetchCmsTypes removed
    fetchMediaPlayers();
    fetchCategories();
    fetchSubcategories();
  }, []);
  const fetchEquipment = async () => {
    const { data, error } = await supabase
      .from("equipment")
      .select(
        "id, code, name, unit, category, subcategory_id, quantity_in_stock, unit_price, width_cm, height_cm, depth_cm, volume_cm3",
      )
      .eq("is_active", true)
      .order("code");
    if (!error && data) {
      setEquipment(data as Equipment[]);
    }
  };
  const fetchCategories = async () => {
    const { data, error } = await supabase.from("categories").select("id, name").eq("is_active", true).order("name");
    if (!error && data) {
      setCategories(data);
    }
  };
  const fetchSubcategories = async () => {
    const { data, error } = await supabase
      .from("subcategories")
      .select("id, name, category_id")
      .eq("is_active", true)
      .order("name");
    if (!error && data) {
      setSubcategories(data);
    }
  };
  const fetchCompanies = async () => {
    const { data, error } = await supabase
      .from("companies")
      .select("id, code, name, department_id")
      .eq("is_active", true)
      .order("code");
    if (!error && data) {
      setCompanies(data);
    }
  };
  const fetchSuppliers = async () => {
    const { data, error } = await supabase
      .from("suppliers")
      .select("id, code, name, vendor_code")
      .eq("is_active", true)
      .order("code");
    if (!error && data) {
      setSuppliers(data);
    }
  };
  // Department name lookup from allowedDepartments
  const getDepartmentName = (id: string) => allowedDepartments.find((d) => d.id === id)?.name || "";
  const fetchReceiptPurposes = async () => {
    const { data, error } = await supabase
      .from("receipt_purposes")
      .select("id, name, description, purpose_type, requires_location, max_storage_days")
      .eq("is_active", true)
      .order("purpose_type", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      });
    if (!error && data) {
      setReceiptPurposes(data);
    }
  };
  const fetchPendingReceipts = async () => {
    const { data, error } = await supabase.from("goods_receipt_pending").select("*").order("created_at", {
      ascending: false,
    });
    if (!error && data) {
      setPendingReceipts(data as PendingReceipt[]);
    }
  };
  // fetchCmsTypes removed - CMS type field no longer used
  const fetchMediaPlayers = async () => {
    const { data, error } = await supabase
      .from("media_players")
      .select("id, code, name, unit_price")
      .eq("is_active", true)
      .order("code");
    if (!error && data) {
      setMediaPlayers(data);
    }
  };
  const selectedEquipment = equipment.find((e) => e.id === selectedEquipmentId);
  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);
  const selectedReceiptPurpose = receiptPurposes.find((p) => p.id === selectedReceiptPurposeId);
  const isPurchaseReceipt = selectedReceiptPurpose?.name === "นำเข้าจากการซื้อ";

  // Update unit and category when equipment is selected
  useEffect(() => {
    if (selectedEquipment) {
      setUnit(selectedEquipment.unit);
      setEquipmentCode(selectedEquipment.code);
      setEquipmentName(selectedEquipment.name);
      // Auto-fill unit price from existing equipment when NOT a purchase receipt
      if (!isPurchaseReceipt && selectedEquipment.unit_price > 0) {
        setUnitPrice(String(selectedEquipment.unit_price));
      }
      // Auto-fill category and subcategory from existing equipment
      if (selectedEquipment.category) {
        const matchingCategory = categories.find((c) => c.name === selectedEquipment.category);
        if (matchingCategory) {
          setSelectedCategoryId(matchingCategory.id);
        }
      }
      if (selectedEquipment.subcategory_id) {
        setSelectedSubcategoryId(selectedEquipment.subcategory_id);
      }
      // Auto-fill dimensions from existing equipment
      if (selectedEquipment.width_cm !== null) {
        setStorageWidthCm(String(selectedEquipment.width_cm));
      }
      if (selectedEquipment.height_cm !== null) {
        setStorageHeightCm(String(selectedEquipment.height_cm));
      }
      if (selectedEquipment.depth_cm !== null) {
        setStorageDepthCm(String(selectedEquipment.depth_cm));
      }
    } else {
      // Clear category/subcategory and dimensions when no equipment selected
      setSelectedCategoryId("");
      setSelectedSubcategoryId("");
      setStorageWidthCm("");
      setStorageHeightCm("");
      setStorageDepthCm("");
    }
  }, [selectedEquipment, categories, isPurchaseReceipt]);

  // Auto-fill unit price from media player when NOT a purchase receipt
  useEffect(() => {
    if (!isPurchaseReceipt && selectedMediaPlayerId) {
      const mp = mediaPlayers.find((m) => m.id === selectedMediaPlayerId);
      if (mp && mp.unit_price && mp.unit_price > 0) {
        setUnitPrice(String(mp.unit_price));
      }
    }
  }, [selectedMediaPlayerId, mediaPlayers, isPurchaseReceipt]);

  // Update supplier name when selected
  useEffect(() => {
    if (selectedSupplier) {
      setSupplierName(selectedSupplier.name);
    }
  }, [selectedSupplier]);
  const generateDocumentNo = () => {
    const date = new Date();
    const dateStr = format(date, "yyyyMMdd");
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `PD-${dateStr}-${random}`;
  };

  // Document file upload handlers
  const handleAdditionalDocFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)");
        return;
      }
      setAdditionalDocumentFile(file);
    }
  };
  const handleAdditionalImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
        return;
      }
      setAdditionalImageFile(file);
    }
  };
  const uploadDocumentFile = async (file: File, prefix: string, documentNo: string): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${prefix}-${documentNo}-${Date.now()}.${fileExt}`;
    const filePath = `deliveries/${fileName}`;
    const { error: uploadError } = await supabase.storage.from("delivery-documents").upload(filePath, file);
    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("ไม่สามารถอัปโหลดเอกสารได้");
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("delivery-documents").getPublicUrl(filePath);
    return publicUrl;
  };
  const handlePurchaseFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)");
        return;
      }
      const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
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
    const fileExt = purchaseDocumentFile.name.split(".").pop();
    const fileName = `PO-PR-${documentNo}-${Date.now()}.${fileExt}`;
    const filePath = `purchase-documents/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from("delivery-documents")
      .upload(filePath, purchaseDocumentFile);
    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("ไม่สามารถอัปโหลดเอกสารได้");
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("delivery-documents").getPublicUrl(filePath);
    return publicUrl;
  };

  const generateTempCode = () => {
    const dateStr = format(new Date(), "yyyyMMdd");
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `TEMP-${dateStr}-${random}`;
  };

  // Add item to cart
  const handleAddToCart = () => {
    // Validate header fields first
    if (!selectedReceiptPurposeId) {
      toast.error("กรุณาเลือกวัตถุประสงค์การนำเข้าก่อนเพิ่มสินค้า");
      return;
    }
    if (!selectedDepartmentId) {
      toast.error("กรุณาเลือกฝ่ายก่อนเพิ่มสินค้า");
      return;
    }
    if (!deliveryPersonName.trim()) {
      toast.error("กรุณากรอกชื่อผู้นำส่งก่อนเพิ่มสินค้า");
      return;
    }
    if (!isMediaPlayerEntry && (!quantity || parseInt(quantity) < 1)) {
      toast.error("กรุณาระบุจำนวน");
      return;
    }
    if (isMediaPlayerEntry) {
      // Media Player validation
      if (!selectedMediaPlayerId) {
        toast.error("กรุณาเลือก Media Player");
        return;
      }
      if (!unitPrice) {
        toast.error("กรุณาระบุราคาต่อชิ้น");
        return;
      }
      // Validate each device entry has at least S/N
      const validDevices = mediaPlayerDevices.filter((d) => d.serial_number_1.trim());
      if (validDevices.length === 0) {
        toast.error("กรุณากรอก Serial Number อย่างน้อย 1 เครื่อง");
        return;
      }

      const selectedMP = mediaPlayers.find((mp) => mp.id === selectedMediaPlayerId);

      // Create one cart item per device entry
      const newItems: DeliveryCartItem[] = validDevices.map((device) => ({
        id: crypto.randomUUID(),
        equipment_id: null,
        equipment_code: selectedMP?.code || equipmentCode,
        equipment_name: selectedMP?.name || equipmentName,
        quantity: 1, // Each device = 1 unit
        unit: unit || "เครื่อง",
        lot_number_1: lotNumber1,
        lot_number_2: lotNumber2,
        serial_number: device.serial_number_1,
        serial_number_2: device.serial_number_2,
        unit_price: unitPrice ? parseFloat(unitPrice) : null,
        supplier_id: selectedSupplierId || null,
        supplier_name: supplierName || selectedSupplier?.name || "",
        expiry_date: expiryDate,
        warranty_expiry_date: warrantyExpiryDate,
        storage_width_cm: storageWidthCm,
        storage_height_cm: storageHeightCm,
        storage_depth_cm: storageDepthCm,
        storage_volume_cm3: calculatedVolume,
        is_asset: true,
        asset_code: device.asset_code,
        equipment_id_code: device.equipment_id_code,
        waiting_asset_code: device.waiting_asset_code,
        waiting_equipment_id: device.waiting_equipment_id,
        depreciation_months: depreciationMonths,
        notes: itemNotes,
        is_media_player: true,
        media_player_id: selectedMediaPlayerId || null,
        activate_windows: device.activate_windows,
        media_player_image_file: device.image_file || undefined,
      }));

      setCartItems([...cartItems, ...newItems]);
      setSelectedCartIds((prev) => {
        const next = new Set(prev);
        newItems.forEach((item) => next.add(item.id));
        return next;
      });
      toast.success(`เพิ่ม ${validDevices.length} เครื่องลงตะกร้าแล้ว`);
    } else {
      // Regular equipment validation
      if (perUnitMode) {
        // Per-unit mode: validate each unit has at least S/N
        const validUnits = equipmentUnits.filter((u) => u.serial_number.trim());
        if (validUnits.length === 0) {
          toast.error("กรุณากรอก Serial Number อย่างน้อย 1 ชิ้น");
          return;
        }
        if (!unitPrice) {
          toast.error("กรุณาระบุราคาต่อชิ้น");
          return;
        }
        if (!selectedEquipmentId) {
          if (!manualEquipmentName.trim()) {
            toast.error("กรุณาเลือกสินค้าจากระบบ หรือกรอกชื่อสินค้า/อะไหล่ใหม่");
            return;
          }
          if (!selectedCategoryId || !selectedSubcategoryId) {
            toast.error("กรุณาเลือกหมวดหมู่และหมวดหมู่ย่อย");
            return;
          }
          if (newProductImages.length === 0) {
            toast.error("กรุณาอัปโหลดรูปภาพสินค้าอย่างน้อย 1 รูป");
            return;
          }
        }

        // Create one cart item per unit
        const newItems: DeliveryCartItem[] = validUnits.map((unitEntry) => ({
          id: crypto.randomUUID(),
          equipment_id: selectedEquipmentId || null,
          equipment_code: selectedEquipmentId ? equipmentCode : generateTempCode(),
          equipment_name: selectedEquipmentId
            ? equipmentName || selectedEquipment?.name || ""
            : manualEquipmentName.trim(),
          quantity: 1,
          unit: unit,
          lot_number_1: lotNumber1,
          lot_number_2: lotNumber2,
          serial_number: unitEntry.serial_number,
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
          asset_code: isAsset ? unitEntry.asset_code : assetCode,
          equipment_id_code: isAsset ? unitEntry.equipment_id_code : equipmentIdCode,
          waiting_asset_code: isAsset ? unitEntry.waiting_asset_code : waitingAssetCode,
          waiting_equipment_id: isAsset ? unitEntry.waiting_equipment_id : waitingEquipmentId,
          depreciation_months: depreciationMonths,
          notes: itemNotes,
          is_media_player: false,
          temp_category_id: !selectedEquipmentId ? selectedCategoryId || null : null,
          temp_subcategory_id: !selectedEquipmentId ? selectedSubcategoryId || null : null,
          temp_product_images: !selectedEquipmentId ? newProductImages : undefined,
          temp_min_stock_level: !selectedEquipmentId ? parseInt(minStockLevel) || 0 : undefined,
          media_player_image_file: unitEntry.image_file || undefined,
        }));

        setCartItems([...cartItems, ...newItems]);
        setSelectedCartIds((prev) => {
          const next = new Set(prev);
          newItems.forEach((item) => next.add(item.id));
          return next;
        });
        toast.success(`เพิ่ม ${validUnits.length} ชิ้นลงตะกร้าแล้ว`);
      } else {
        // Standard single entry mode
        if (!selectedEquipmentId) {
          if (!manualEquipmentName.trim()) {
            toast.error("กรุณาเลือกสินค้าจากระบบ หรือกรอกชื่อสินค้า/อะไหล่ใหม่");
            return;
          }
          if (!selectedCategoryId) {
            toast.error("กรุณาเลือกหมวดหมู่");
            return;
          }
          if (!selectedSubcategoryId) {
            toast.error("กรุณาเลือกหมวดหมู่ย่อย");
            return;
          }
          if (newProductImages.length === 0) {
            toast.error("กรุณาอัปโหลดรูปภาพสินค้าอย่างน้อย 1 รูป");
            return;
          }
        }
        if (!unitPrice) {
          toast.error("กรุณาระบุราคาต่อชิ้น");
          return;
        }
        const newItem: DeliveryCartItem = {
          id: crypto.randomUUID(),
          equipment_id: selectedEquipmentId || null,
          equipment_code: selectedEquipmentId ? equipmentCode : generateTempCode(),
          equipment_name: selectedEquipmentId
            ? equipmentName || selectedEquipment?.name || ""
            : manualEquipmentName.trim(),
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
          temp_category_id: !selectedEquipmentId ? selectedCategoryId || null : null,
          temp_subcategory_id: !selectedEquipmentId ? selectedSubcategoryId || null : null,
          temp_product_images: !selectedEquipmentId ? newProductImages : undefined,
          temp_min_stock_level: !selectedEquipmentId ? parseInt(minStockLevel) || 0 : undefined,
        };
        setCartItems([...cartItems, newItem]);
        setSelectedCartIds((prev) => new Set([...prev, newItem.id]));
      }
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
    setManualEquipmentName("");
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
    // Media Player specific - reset device entries
    setMediaPlayerDevices([
      {
        id: crypto.randomUUID(),
        serial_number_1: "",
        serial_number_2: "",
        device_name: "",
        activate_windows: "",
        image_file: null,
        image_preview: null,
        asset_code: "",
        equipment_id_code: "",
        waiting_asset_code: false,
        waiting_equipment_id: false,
      },
    ]);
    // Per-unit equipment entries
    setPerUnitMode(false);
    setEquipmentUnits([
      { id: crypto.randomUUID(), serial_number: "", device_name: "", image_file: null, image_preview: null, asset_code: "", equipment_id_code: "", waiting_asset_code: false, waiting_equipment_id: false },
    ]);
    // Category/Subcategory
    setSelectedCategoryId("");
    setSelectedSubcategoryId("");
    // New product images
    setNewProductImages([]);
    // Min stock level
    setMinStockLevel("");
  };
  const handleRemoveFromCart = (itemId: string) => {
    setCartItems(cartItems.filter((item) => item.id !== itemId));
    setSelectedCartIds((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
    toast.success("ลบรายการออกจากตะกร้าแล้ว");
  };
  const handleEditItem = (item: DeliveryCartItem) => {
    setEditingItem(item);
    setShowEditDialog(true);
  };
  const handleSaveEditItem = (updatedItem: DeliveryCartItem) => {
    setCartItems(cartItems.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
  };
  const handleClearCart = () => {
    setCartItems([]);
    setSelectedCartIds(new Set());
    toast.success("ล้างตะกร้าแล้ว");
  };
  const handleSubmitAll = async () => {
    const itemsToSubmit =
      selectedCartIds.size > 0 ? cartItems.filter((item) => selectedCartIds.has(item.id)) : cartItems;

    if (itemsToSubmit.length === 0) {
      toast.error("กรุณาเลือกรายการที่ต้องการส่งเข้าระบบ");
      return;
    }
    if (!deliveryPersonName || !selectedCompanyId || !selectedDepartmentId) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน (ฝ่าย, บริษัทที่สั่งซื้อ, ชื่อผู้ส่ง)");
      return;
    }

    // Validate receipt purpose (required)
    if (!selectedReceiptPurposeId) {
      toast.error("กรุณาเลือกวัตถุประสงค์การนำสินค้าเข้า");
      return;
    }

    // Validate PO/PR/Invoice for "นำเข้าจากการซื้อ"
    if (isPurchaseReceipt && !poNumber && !prNumber && !invoiceNumber && !deliveryNoteNumber) {
      toast.error("กรุณากรอกเลข PO, PR, Invoice หรือ ใบส่งของ อย่างน้อย 1 รายการ");
      return;
    }
    setIsLoading(true);
    try {
      const docNo = generateDocumentNo();
      let additionalDocUrl: string | null = null;
      let additionalImageUrl: string | null = null;
      let purchaseDocumentUrl: string | null = null;

      // Upload documents if exists
      setIsUploadingFile(true);
      if (additionalDocumentFile) {
        additionalDocUrl = await uploadDocumentFile(additionalDocumentFile, "DOC", docNo);
      }
      if (additionalImageFile) {
        additionalImageUrl = await uploadDocumentFile(additionalImageFile, "IMG", docNo);
      }
      if (purchaseDocumentFile) {
        purchaseDocumentUrl = await uploadPurchaseDocument(docNo);
      }

      // Upload media player images for items that have them
      for (const item of itemsToSubmit) {
        if (item.media_player_image_file) {
          try {
            const file = item.media_player_image_file;
            const fileExt = file.name.split(".").pop();
            const fileName = `mp-${docNo}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `media-player-entry/${fileName}`;
            const { error: uploadError } = await supabase.storage.from("media-player-images").upload(filePath, file);
            if (!uploadError) {
              const {
                data: { publicUrl },
              } = supabase.storage.from("media-player-images").getPublicUrl(filePath);
              item.media_player_image_url = publicUrl;
            }
          } catch (err) {
            console.error("Error uploading media player image:", err);
          }
        }
      }
      setIsUploadingFile(false);

      // Combine all document URLs (including PO/PR/Invoice uploaded URLs)
      const allDocumentUrls = [additionalDocUrl, additionalImageUrl, poDocumentUrl, prDocumentUrl, invoiceDocumentUrl]
        .filter(Boolean)
        .join(", ");

      // Clone media_players records for items that share the same media_player_id
      // Each physical device must have its own media_players record
      const mpIdUsed = new Set<string>();
      for (const item of itemsToSubmit) {
        if (!item.is_media_player || !item.media_player_id) continue;
        if (!mpIdUsed.has(item.media_player_id)) {
          mpIdUsed.add(item.media_player_id);
          continue; // first device keeps original
        }
        // Clone: fetch original, create new record with new code
        try {
          const { data: original } = await supabase
            .from("media_players")
            .select("*")
            .eq("id", item.media_player_id)
            .single();
          if (original) {
            // Extract prefix from code (e.g. "MMM 0001" → "MMM")
            // Reuse the same code as the original (same model/spec = same code)
            const originalCode = (original as any).code;
            if (originalCode) {
              const cloneData: Record<string, any> = {
                code: originalCode,
                name: (original as any).name,
                description: (original as any).description,
                cms_type_id: (original as any).cms_type_id,
                specification: (original as any).specification,
                company_id: (original as any).company_id,
                department: (original as any).department,
                brand: (original as any).brand,
                quantity: 0,
                unit: (original as any).unit || "เครื่อง",
                unit_price: (original as any).unit_price || 0,
                is_asset: true,
                is_active: true,
                status: (original as any).status || "active",
                model_id: (original as any).model_id,
                image_url: (original as any).image_url,
                supplier_id: (original as any).supplier_id,
                usage_lifespan_months: (original as any).usage_lifespan_months,
                item_condition: "normal",
              };
              const { data: newMp, error: cloneError } = await supabase
                .from("media_players")
                .insert(cloneData as any)
                .select("id")
                .single();
              if (!cloneError && newMp) {
                // Clone images too
                const { data: imgs } = await supabase
                  .from("media_player_images" as any)
                  .select("image_url, display_order")
                  .eq("media_player_id", item.media_player_id);
                if (imgs && imgs.length > 0) {
                  await supabase.from("media_player_images" as any).insert(
                    (imgs as any[]).map((img: any) => ({
                      media_player_id: (newMp as any).id,
                      image_url: img.image_url,
                      display_order: img.display_order,
                    }))
                  );
                }
                item.media_player_id = (newMp as any).id;
                item.equipment_code = originalCode;
              }
            }
          }
        } catch (cloneErr) {
          console.error("Error cloning media player:", cloneErr);
        }
      }

      // Insert all items with the same document number
      const itemsToInsert = itemsToSubmit.map((item, index) => ({
        document_no: `${docNo}-${(index + 1).toString().padStart(2, "0")}`,
        department_id: selectedDepartmentId,
        company_id: selectedCompanyId || null,
        warehouse_id: null,
        receipt_purpose_id: selectedReceiptPurposeId || null,
        equipment_id: item.is_media_player ? null : item.equipment_id,
        equipment_code: item.equipment_code || null,
        equipment_name: item.equipment_name || null,
        quantity: item.quantity,
        unit: item.unit,
        supplier_id: item.supplier_id || null,
        supplier_name:
          item.supplier_name ||
          (selectedCompanyId ? companies.find((c) => c.id === selectedCompanyId)?.name : null) ||
          null,
        lot_number: item.lot_number_1 || null,
        lot_number_2: item.lot_number_2 || null,
        serial_number: item.serial_number || null,
        serial_number_2: item.serial_number_2 || null,
        unit_price: item.unit_price,
        expiry_date: item.expiry_date || null,
        warranty_expiry_date: item.warranty_expiry_date || null,
        delivery_person_name: deliveryPersonName,
        delivery_person_phone: deliveryPersonPhone || null,
        notes: item.notes || headerNotes || null,
        document_url: allDocumentUrls || null,
        document_file_name: null,
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
        invoice_number: invoiceNumber || null,
        delivery_note_number: deliveryNoteNumber || null,
        invoice_document_url: invoiceDocumentUrl || null,
        delivery_note_document_url: deliveryNoteDocumentUrl || null,
        order_for_project: orderForProject || null,
        purchase_document_url:
          purchaseDocumentUrl ||
          (poDocumentUrl || prDocumentUrl || invoiceDocumentUrl || deliveryNoteDocumentUrl
            ? [poDocumentUrl, prDocumentUrl, invoiceDocumentUrl, deliveryNoteDocumentUrl].filter(Boolean).join(", ")
            : null),
        // Media Player specific fields
        is_media_player: item.is_media_player || false,
        media_player_id: item.media_player_id || null,
        activate_windows: item.activate_windows || null,
        media_player_image_url: item.media_player_image_url || null,
        // Temp fields for new products
        temp_category_id: item.temp_category_id || null,
        temp_subcategory_id: item.temp_subcategory_id || null,
        temp_product_images: item.temp_product_images || null,
        temp_min_stock_level: item.temp_min_stock_level ?? 0,
      }));
      const { error } = await supabase.from("goods_receipt_pending").insert(itemsToInsert as any);
      if (error) throw error;

      // Register serial numbers in equipment_serial_numbers table
      const snInserts = itemsToInsert
        .filter(
          (item: any) => item.serial_number && item.serial_number.trim() && !item.is_media_player && item.equipment_id,
        )
        .map((item: any) => ({
          equipment_id: item.equipment_id,
          serial_number: item.serial_number.trim(),
          status: "pending",
          receipt_document_no: item.document_no,
          notes: item.notes || null,
          created_by: null,
        }));
      if (snInserts.length > 0) {
        await supabase.from("equipment_serial_numbers").insert(snInserts as any);
      }

      toast.success(`บันทึกข้อมูลสินค้าสำเร็จ ${itemsToSubmit.length} รายการ รอเจ้าหน้าที่คลังรับเข้า`);

      // Remove submitted items from cart, keep unsubmitted
      const submittedIds = new Set(itemsToSubmit.map((i) => i.id));
      const remainingItems = cartItems.filter((i) => !submittedIds.has(i.id));
      setCartItems(remainingItems);
      setSelectedCartIds(new Set());

      // Only reset header fields if all items were submitted (cart is now empty)
      if (remainingItems.length === 0) {
        setSelectedReceiptPurposeId("");
        setSelectedDepartmentId("");
        setSelectedCompanyId("");
        setDeliveryPersonName("");
        setDeliveryPersonPhone("");
        setPoNumber("");
        setPrNumber("");
        setInvoiceNumber("");
        setDeliveryNoteNumber("");
        setPoDocumentUrl("");
        setPrDocumentUrl("");
        setInvoiceDocumentUrl("");
        setDeliveryNoteDocumentUrl("");
        setOrderForProject("");
        setPurchaseDocumentFile(null);
        setAdditionalDocumentFile(null);
        setAdditionalImageFile(null);
        setHeaderNotes("");
        if (additionalDocFileInputRef.current) additionalDocFileInputRef.current.value = "";
        if (additionalImageFileInputRef.current) additionalImageFileInputRef.current.value = "";
        if (purchaseFileInputRef.current) purchaseFileInputRef.current.value = "";
      }
      resetItemForm();
      fetchPendingReceipts();
    } catch (error: any) {
      console.error("Error:", error);
      const errMsg = error?.message || error?.details || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
      toast.error(`เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${errMsg}`);
    } finally {
      setIsLoading(false);
      setIsUploadingFile(false);
    }
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-warning/10 text-warning">
            <Clock className="w-3 h-3 mr-1" />
            รอรับเข้า
          </Badge>
        );
      case "received":
        return (
          <Badge variant="secondary" className="bg-success/10 text-success">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            รับเข้าแล้ว
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };
  const filteredReceipts = pendingReceipts.filter((receipt) => {
    // Dedicated S/N search
    if (snSearchTerm) {
      const snTerm = snSearchTerm.toLowerCase();
      if (!(receipt as any).serial_number?.toLowerCase().includes(snTerm)) return false;
    }
    // General search
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    return (
      receipt.document_no.toLowerCase().includes(term) ||
      receipt.equipment_name?.toLowerCase().includes(term) ||
      receipt.delivery_person_name.toLowerCase().includes(term) ||
      receipt.equipment_code?.toLowerCase().includes(term) ||
      (receipt as any).lot_number?.toLowerCase().includes(term)
    );
  });
  const {
    paginatedData: paginatedReceipts,
    currentPage: historyPage,
    pageSize: historyPageSize,
    totalPages: historyTotalPages,
    totalItems: historyTotalItems,
    handlePageChange: handleHistoryPageChange,
    handlePageSizeChange: handleHistoryPageSizeChange,
  } = useTablePagination(filteredReceipts, 20);

  // ─── PO OCR Import Handler ───────────────────────────────
  const handlePOImport = async (data: POImportResult) => {
    // Auto-fill header fields
    setPoNumber(data.poNumber);
    setPrNumber(data.prNumber);
    if (data.supplierId) setSelectedSupplierId(data.supplierId);
    if (data.notes) setHeaderNotes(data.notes);

    // Match department
    if (data.departmentName) {
      const dept = allowedDepartments.find(
        (d) => d.name.toLowerCase().includes(data.departmentName.toLowerCase()) ||
          data.departmentName.toLowerCase().includes(d.name.toLowerCase())
      );
      if (dept) setSelectedDepartmentId(dept.id);
    }

    // Set receipt purpose to "ซื้อ" (purchase)
    const purchasePurpose = receiptPurposes.find(
      (p) => p.purpose_type === "purchase" || p.name === "ซื้อ" || p.name.includes("ซื้อ")
    );
    if (purchasePurpose) setSelectedReceiptPurposeId(purchasePurpose.id);

    // Add items to cart
    const newCartItems: DeliveryCartItem[] = [];
    for (const item of data.items) {
      if (item.matched_equipment_id) {
        const eq = equipment.find((e) => e.id === item.matched_equipment_id);
        if (eq) {
          newCartItems.push({
            id: crypto.randomUUID(),
            equipment_id: eq.id,
            equipment_code: eq.code,
            equipment_name: eq.name,
            quantity: item.quantity,
            unit: eq.unit || item.unit,
            supplier_name: data.supplierName,
            supplier_id: data.supplierId,
            lot_number_1: "",
            lot_number_2: "",
            serial_number: "",
            unit_price: item.unit_price ?? eq.unit_price,
            notes: item.description,
            expiry_date: "",
            warranty_expiry_date: "",
            storage_width_cm: "",
            storage_height_cm: "",
            storage_depth_cm: "",
            storage_volume_cm3: "",
            is_asset: false,
            asset_code: "",
            equipment_id_code: "",
            waiting_asset_code: false,
            waiting_equipment_id: false,
            depreciation_months: "",
          });
        }
      } else {
        newCartItems.push({
          id: crypto.randomUUID(),
          equipment_id: null,
          equipment_code: item.item_no || "",
          equipment_name: item.description,
          quantity: item.quantity,
          unit: item.unit,
          supplier_name: data.supplierName,
          supplier_id: data.supplierId,
          lot_number_1: "",
          lot_number_2: "",
          serial_number: "",
          unit_price: item.unit_price ?? 0,
          notes: `[จาก PO] ${item.description}`,
          expiry_date: "",
          warranty_expiry_date: "",
          storage_width_cm: "",
          storage_height_cm: "",
          storage_depth_cm: "",
          storage_volume_cm3: "",
          is_asset: false,
          asset_code: "",
          equipment_id_code: "",
          waiting_asset_code: false,
          waiting_equipment_id: false,
          depreciation_months: "",
        });
      }
    }

    if (newCartItems.length > 0) {
      setCartItems((prev) => [...prev, ...newCartItems]);
    }

    // Upload PO PDF to storage (ตั้งชื่อตามมาตรฐานเดียวกับ flow กรอกเลขก่อน)
    try {
      const safePoNo = (data.poNumber || "UNKNOWN").replace(/[^a-zA-Z0-9-_]/g, "_");
      const filePath = `purchase-documents/PO-PR-${safePoNo}-${Date.now()}.pdf`;
      const { error: uploadErr } = await supabase.storage
        .from("delivery-documents")
        .upload(filePath, data.pdfFile, { contentType: "application/pdf" });
      if (uploadErr) {
        console.error("Upload PO PDF error:", uploadErr);
      } else {
        const { data: urlData } = supabase.storage
          .from("delivery-documents")
          .getPublicUrl(filePath);
        if (urlData?.publicUrl) {
          setPoDocumentUrl(urlData.publicUrl);
        }
      }
    } catch (err) {
      console.error("Upload error:", err);
    }

    toast.success(`นำเข้าจาก PO สำเร็จ: ${newCartItems.length} รายการ`);
  };

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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowPOUpload(true)}>
            <ScanLine className="w-4 h-4" />
            นำเข้าจาก PO
          </Button>
          <DeliveryImport onSuccess={fetchPendingReceipts} />
        </div>
      </div>

      {/* PO OCR Upload Dialog */}
      <POUploadOCR
        open={showPOUpload}
        onOpenChange={setShowPOUpload}
        onImport={handlePOImport}
        suppliers={suppliers}
        equipment={equipment}
        departments={allowedDepartments.map((d) => ({ id: d.id, name: d.name }))}
        companies={companies}
      />

      {/* Edit Item Dialog */}
      <DeliveryCartItemEditDialog
        item={editingItem}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSave={handleSaveEditItem}
        equipment={equipment}
        suppliers={suppliers}
      />

      {/* Cart Display - moved to just above submit button */}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            บันทึกข้อมูลสินค้า
          </CardTitle>
          <CardDescription>กรอกข้อมูลสินค้าแล้วกด "เพิ่มลงตะกร้า" เมื่อครบทุกรายการแล้วกด "ส่งทั้งหมด"</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Header Section - Shared Data */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-4">
              <h3 className="font-medium text-sm text-primary">ข้อมูลหลัก (ใช้ร่วมกันทุกรายการ) *</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">ฝ่าย *</Label>
                  <Select
                    value={selectedDepartmentId}
                    onValueChange={setSelectedDepartmentId}
                    disabled={isSingleDepartment}
                  >
                    <SelectTrigger id="department">
                      <SelectValue placeholder={deptLoading ? "กำลังโหลด..." : "เลือกฝ่าย..."} />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4} className="pointer-events-auto">
                      {allowedDepartments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">ชื่อบริษัทที่สั่งซื้อ(ตาม Budget) *</Label>
                  <SearchableSelect
                    options={(selectedDepartmentId
                      ? companies.filter(
                          (c) => c.department_id === selectedDepartmentId || c.department_id === null
                        )
                      : companies
                    ).map((c) => ({
                      value: c.id,
                      label: `${c.code} - ${c.name}${c.department_id === null ? " 🌐" : ""}`,
                    }))}
                    value={selectedCompanyId}
                    onValueChange={setSelectedCompanyId}
                    placeholder="เลือกบริษัทที่สั่งซื้อ..."
                    searchPlaceholder="ค้นหาด้วยรหัสหรือชื่อบริษัท..."
                    emptyMessage="ไม่พบบริษัท"
                  />
                </div>
              </div>

              {/* Delivery Person Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-primary/20">
                <div className="space-y-2">
                  <Label htmlFor="deliveryPerson">ชื่อผู้ดำเนินการนำเข้าข้อมูล *</Label>
                  <Input
                    id="deliveryPerson"
                    placeholder="ระบุชื่อผู้ดำเนินการนำเข้าข้อมูล"
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
                วัตถุประสงค์การนำสินค้าเข้า <span className="text-destructive">*</span>
              </h3>
              <div className="space-y-2">
                <Label htmlFor="receiptPurpose">
                  วัตถุประสงค์ <span className="text-destructive">*</span>
                </Label>
                <Select value={selectedReceiptPurposeId} onValueChange={setSelectedReceiptPurposeId}>
                  <SelectTrigger
                    id="receiptPurpose"
                    className={!selectedReceiptPurposeId ? "border-destructive/50" : ""}
                  >
                    <SelectValue placeholder="กรุณาเลือกวัตถุประสงค์..." />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="pointer-events-auto">
                    {receiptPurposes.filter((p) => p.purpose_type === "regular").length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">รับเข้าปกติ</div>
                        {receiptPurposes
                          .filter((p) => p.purpose_type === "regular")
                          .map((purpose) => (
                            <SelectItem key={purpose.id} value={purpose.id}>
                              {purpose.name}
                            </SelectItem>
                          ))}
                      </>
                    )}
                    {receiptPurposes.filter((p) => p.purpose_type === "storage").length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1">
                          ฝากเก็บชั่วคราว
                        </div>
                        {receiptPurposes
                          .filter((p) => p.purpose_type === "storage")
                          .map((purpose) => (
                            <SelectItem key={purpose.id} value={purpose.id}>
                              {purpose.name} {purpose.max_storage_days ? `(${purpose.max_storage_days} วัน)` : ""}
                            </SelectItem>
                          ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
                {!selectedReceiptPurposeId && (
                  <p className="text-xs text-destructive">กรุณาเลือกวัตถุประสงค์การนำสินค้าเข้า</p>
                )}
              </div>

              {/* PO/PR/Invoice fields for "นำเข้าจากการซื้อ" */}
              {isPurchaseReceipt && (
                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg space-y-4">
                  <h4 className="font-medium text-sm text-amber-700 dark:text-amber-400">
                    PO / PR / Invoice / ใบส่งของ (กรอกอย่างน้อย 1 รายการ) *
                  </h4>
                  <p className="text-xs text-amber-600/80 dark:text-amber-500/80">
                    💡 กรอกเลขที่เอกสารก่อนแล้วค่อยอัปโหลดไฟล์ ระบบจะตั้งชื่อไฟล์ตามเลขที่กรอกโดยอัตโนมัติ
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <DocumentUploadField
                      label="เลข PO"
                      numberValue={poNumber}
                      onNumberChange={setPoNumber}
                      documentUrl={poDocumentUrl}
                      onDocumentUploaded={setPoDocumentUrl}
                      onDocumentRemoved={() => setPoDocumentUrl("")}
                      placeholder="PO Number"
                    />
                    <DocumentUploadField
                      label="เลข PR"
                      numberValue={prNumber}
                      onNumberChange={setPrNumber}
                      documentUrl={prDocumentUrl}
                      onDocumentUploaded={setPrDocumentUrl}
                      onDocumentRemoved={() => setPrDocumentUrl("")}
                      placeholder="PR Number"
                    />
                    <DocumentUploadField
                      label="Invoice No."
                      numberValue={invoiceNumber}
                      onNumberChange={setInvoiceNumber}
                      documentUrl={invoiceDocumentUrl}
                      onDocumentUploaded={setInvoiceDocumentUrl}
                      onDocumentRemoved={() => setInvoiceDocumentUrl("")}
                      placeholder="Invoice Number"
                    />
                    <DocumentUploadField
                      label="ใบส่งของ"
                      numberValue={deliveryNoteNumber}
                      onNumberChange={setDeliveryNoteNumber}
                      documentUrl={deliveryNoteDocumentUrl}
                      onDocumentUploaded={setDeliveryNoteDocumentUrl}
                      onDocumentRemoved={() => setDeliveryNoteDocumentUrl("")}
                      placeholder="เลขที่ใบส่งของ"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Order For Project</Label>
                      <Input
                        value={orderForProject}
                        onChange={(e) => setOrderForProject(e.target.value)}
                        placeholder="ชื่อโปรเจค"
                      />
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
                          setDepreciationMonths("60");
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
                        options={dedupeMediaPlayersByCode(mediaPlayers)}
                        value={selectedMediaPlayerId}
                        onValueChange={(val) => {
                          setSelectedMediaPlayerId(val);
                          const mp = mediaPlayers.find((m) => m.id === val);
                          if (mp) {
                            setEquipmentCode(mp.code);
                            setEquipmentName(mp.name);
                            // Auto-fill unit price from media player when NOT a purchase receipt
                            if (!isPurchaseReceipt && mp.unit_price && mp.unit_price > 0) {
                              setUnitPrice(String(mp.unit_price));
                            }
                          }
                        }}
                        placeholder="เลือก Media Player..."
                        searchPlaceholder="พิมพ์รหัสหรือชื่อ Media Player..."
                        emptyMessage="ไม่พบ Media Player"
                      />
                    </div>
                  </div>

                  {/* Media Player Device Entries - Dynamic List */}
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm text-blue-700 dark:text-blue-400 flex items-center gap-2">
                        <Monitor className="w-4 h-4" />
                        ข้อมูลเฉพาะ Media Player ({mediaPlayerDevices.length} เครื่อง)
                      </h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setMediaPlayerDevices((prev) => [
                            ...prev,
                            {
                              id: crypto.randomUUID(),
                              serial_number_1: "",
                              serial_number_2: "",
                              device_name: "",
                              activate_windows: "",
                              image_file: null,
                              image_preview: null,
                              asset_code: "",
                              equipment_id_code: "",
                              waiting_asset_code: false,
                              waiting_equipment_id: false,
                            },
                          ]);
                        }}
                        className="gap-1 text-blue-700 border-blue-300 hover:bg-blue-100 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-900/30"
                      >
                        <PlusCircle className="w-4 h-4" />
                        เพิ่มเครื่อง
                      </Button>
                    </div>
                    <p className="text-xs text-blue-600/80 dark:text-blue-500/80">
                      💡 กรอก S/N แต่ละเครื่อง — ระบบจะสร้างรายการในตะกร้าอัตโนมัติ 1 รายการต่อ 1 เครื่อง
                    </p>

                    <div className="space-y-3">
                      {mediaPlayerDevices.map((device, idx) => (
                        <div key={device.id} className="p-3 bg-background border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">เครื่องที่ {idx + 1}</span>
                            {mediaPlayerDevices.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-destructive hover:text-destructive"
                                onClick={() => {
                                  // Clean up preview URL
                                  if (device.image_preview) URL.revokeObjectURL(device.image_preview);
                                  setMediaPlayerDevices((prev) => prev.filter((d) => d.id !== device.id));
                                }}
                              >
                                <X className="w-3 h-3 mr-1" />
                                ลบ
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                            {/* Serial Number 1 */}
                            <div className="space-y-1">
                              <Label className="text-xs">Serial Number 1 *</Label>
                              <Input
                                placeholder="กรอก S/N 1..."
                                value={device.serial_number_1}
                                onChange={(e) => {
                                  setMediaPlayerDevices((prev) =>
                                    prev.map((d) =>
                                      d.id === device.id ? { ...d, serial_number_1: e.target.value } : d,
                                    ),
                                  );
                                }}
                              />
                            </div>
                            {/* Serial Number 2 */}
                            <div className="space-y-1">
                              <Label className="text-xs">Serial Number 2</Label>
                              <Input
                                placeholder="กรอก S/N 2..."
                                value={device.serial_number_2}
                                onChange={(e) => {
                                  setMediaPlayerDevices((prev) =>
                                    prev.map((d) =>
                                      d.id === device.id ? { ...d, serial_number_2: e.target.value } : d,
                                    ),
                                  );
                                }}
                              />
                            </div>
                            {/* Active Windows */}
                            <div className="space-y-1">
                              <Label className="text-xs">Active Windows</Label>
                              <Input
                                placeholder="Active Windows..."
                                value={device.activate_windows}
                                onChange={(e) => {
                                  setMediaPlayerDevices((prev) =>
                                    prev.map((d) =>
                                      d.id === device.id ? { ...d, activate_windows: e.target.value } : d,
                                    ),
                                  );
                                }}
                              />
                            </div>
                            {/* Name */}
                            <div className="space-y-1">
                              <Label className="text-xs">Name</Label>
                              <Input
                                placeholder="ชื่อเครื่อง..."
                                value={device.device_name}
                                onChange={(e) => {
                                  setMediaPlayerDevices((prev) =>
                                    prev.map((d) => (d.id === device.id ? { ...d, device_name: e.target.value } : d)),
                                  );
                                }}
                              />
                            </div>
                            {/* Upload Image */}
                            <div className="space-y-1">
                              <Label className="text-xs">รูป Media Player</Label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  id={`mp-image-${device.id}`}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      if (file.size > 10 * 1024 * 1024) {
                                        toast.error("ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)");
                                        return;
                                      }
                                      if (device.image_preview) URL.revokeObjectURL(device.image_preview);
                                      const preview = URL.createObjectURL(file);
                                      setMediaPlayerDevices((prev) =>
                                        prev.map((d) =>
                                          d.id === device.id ? { ...d, image_file: file, image_preview: preview } : d,
                                        ),
                                      );
                                    }
                                  }}
                                />
                                {device.image_preview ? (
                                  <div className="flex items-center gap-2">
                                    <img
                                      src={device.image_preview}
                                      alt="Preview"
                                      className="w-10 h-10 rounded object-cover border"
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7"
                                      onClick={() => {
                                        if (device.image_preview) URL.revokeObjectURL(device.image_preview);
                                        setMediaPlayerDevices((prev) =>
                                          prev.map((d) =>
                                            d.id === device.id ? { ...d, image_file: null, image_preview: null } : d,
                                          ),
                                        );
                                      }}
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-9 w-full"
                                    onClick={() => document.getElementById(`mp-image-${device.id}`)?.click()}
                                  >
                                    <ImagePlus className="w-4 h-4 mr-1" />
                                    เลือกรูป
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* Per-device Asset Code & Equipment ID */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs">รหัสทรัพย์สิน</Label>
                                <div className="flex items-center gap-1">
                                  <Checkbox
                                    id={`mp-wait-asset-${device.id}`}
                                    checked={device.waiting_asset_code}
                                    onCheckedChange={(checked) => {
                                      setMediaPlayerDevices((prev) =>
                                        prev.map((d) =>
                                          d.id === device.id ? { ...d, waiting_asset_code: checked === true, asset_code: checked ? "" : d.asset_code } : d,
                                        ),
                                      );
                                    }}
                                  />
                                  <Label htmlFor={`mp-wait-asset-${device.id}`} className="text-xs text-muted-foreground">รอรหัส</Label>
                                </div>
                              </div>
                              <Input
                                placeholder="รหัสทรัพย์สิน..."
                                value={device.asset_code}
                                disabled={device.waiting_asset_code}
                                onChange={(e) => {
                                  setMediaPlayerDevices((prev) =>
                                    prev.map((d) =>
                                      d.id === device.id ? { ...d, asset_code: e.target.value } : d,
                                    ),
                                  );
                                }}
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs">Equipment ID</Label>
                                <div className="flex items-center gap-1">
                                  <Checkbox
                                    id={`mp-wait-eqid-${device.id}`}
                                    checked={device.waiting_equipment_id}
                                    onCheckedChange={(checked) => {
                                      setMediaPlayerDevices((prev) =>
                                        prev.map((d) =>
                                          d.id === device.id ? { ...d, waiting_equipment_id: checked === true, equipment_id_code: checked ? "" : d.equipment_id_code } : d,
                                        ),
                                      );
                                    }}
                                  />
                                  <Label htmlFor={`mp-wait-eqid-${device.id}`} className="text-xs text-muted-foreground">รอ ID</Label>
                                </div>
                              </div>
                              <Input
                                placeholder="Equipment ID..."
                                value={device.equipment_id_code}
                                disabled={device.waiting_equipment_id}
                                onChange={(e) => {
                                  setMediaPlayerDevices((prev) =>
                                    prev.map((d) =>
                                      d.id === device.id ? { ...d, equipment_id_code: e.target.value } : d,
                                    ),
                                  );
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Equipment Selection */}
                  <div className="space-y-4">
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

                      {/* Current Stock Display */}
                      {selectedEquipmentId && selectedEquipment && (
                        <div className="space-y-2">
                          <Label>จำนวนสินค้าที่มีเหลืออยู่ในคลัง</Label>
                          <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted">
                            <Package className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-foreground">
                              {selectedEquipment.quantity_in_stock.toLocaleString()} {selectedEquipment.unit}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Manual Equipment Name - New Product Entry */}
                    {!selectedEquipmentId && (
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg space-y-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                            ไม่พบสินค้าในระบบ? ต้องกรอกชื่อสินค้าลงในข้อมูลด้านล่างเพื่อนำเข้าสินค้าใหม่
                          </span>
                        </div>
                        <p className="text-xs text-amber-600/80 dark:text-amber-500/80">
                          ระบบจะสร้างรหัสชั่วคราว (TEMP-XXXXXXXX-XXX)
                          และรอเจ้าหน้าที่คลังสร้างรหัสสินค้าถาวรในขั้นตอนรับเข้าคลัง
                        </p>
                        <div className="space-y-2">
                          <Label htmlFor="manualName">
                            ชื่อสินค้า/อะไหล่ <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="manualName"
                            placeholder="กรอกชื่อสินค้าหรืออะไหล่..."
                            value={manualEquipmentName}
                            onChange={(e) => setManualEquipmentName(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {/* Category & Subcategory */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category">
                          หมวดหมู่ {!selectedEquipmentId && <span className="text-destructive">*</span>}
                        </Label>
                        {selectedEquipmentId && selectedEquipment?.category ? (
                          <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted">
                            <span className="text-foreground">{selectedEquipment.category}</span>
                          </div>
                        ) : (
                          <Select
                            value={selectedCategoryId}
                            onValueChange={(val) => {
                              setSelectedCategoryId(val);
                              setSelectedSubcategoryId(""); // Reset subcategory when category changes
                            }}
                          >
                            <SelectTrigger id="category">
                              <SelectValue placeholder="เลือกหมวดหมู่..." />
                            </SelectTrigger>
                            <SelectContent position="popper" sideOffset={4} className="pointer-events-auto">
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="subcategory">
                          หมวดหมู่ย่อย {!selectedEquipmentId && <span className="text-destructive">*</span>}
                        </Label>
                        {selectedEquipmentId && selectedEquipment?.subcategory_id ? (
                          <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted">
                            <span className="text-foreground">
                              {subcategories.find((s) => s.id === selectedEquipment.subcategory_id)?.name || "-"}
                            </span>
                          </div>
                        ) : (
                          <Select
                            value={selectedSubcategoryId}
                            onValueChange={setSelectedSubcategoryId}
                            disabled={!selectedCategoryId}
                          >
                            <SelectTrigger id="subcategory">
                              <SelectValue
                                placeholder={selectedCategoryId ? "เลือกหมวดหมู่ย่อย..." : "เลือกหมวดหมู่ก่อน"}
                              />
                            </SelectTrigger>
                            <SelectContent position="popper" sideOffset={4} className="pointer-events-auto">
                              {subcategories
                                .filter((sub) => {
                                  const selectedCat = categories.find((c) => c.id === selectedCategoryId);
                                  return selectedCat && sub.category_id === selectedCategoryId;
                                })
                                .map((sub) => (
                                  <SelectItem key={sub.id} value={sub.id}>
                                    {sub.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>

                    {/* Image Upload for New Products */}
                    {!selectedEquipmentId && (
                      <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg space-y-3">
                        <Label className="text-orange-700 dark:text-orange-400 text-sm font-medium">
                          รูปภาพสินค้า/อะไหล่ <span className="text-destructive">*</span> (บังคับอย่างน้อย 1 รูป)
                        </Label>
                        <p className="text-xs text-orange-600/80 dark:text-orange-500/80">
                          ใส่รูปภาพสินค้าเพื่อให้เจ้าหน้าที่คลังสามารถระบุตัวสินค้าได้
                        </p>
                        <EquipmentImageUpload images={newProductImages} onChange={setNewProductImages} maxImages={5} />
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Asset Information — moved here for continuity after image upload */}
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm text-amber-700 dark:text-amber-400">ข้อมูลทรัพย์สิน</h3>
                  {/* Hide toggle for Media Player (always asset) */}
                  {!isMediaPlayerEntry && (
                    <div className="flex items-center gap-2">
                      <Label htmlFor="isAsset" className="text-sm text-amber-700 dark:text-amber-400">
                        สินค้านี้เป็นทรัพย์สิน?
                      </Label>
                      <Switch id="isAsset" checked={isAsset} onCheckedChange={setIsAsset} />
                    </div>
                  )}
                  {isMediaPlayerEntry && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      เป็นทรัพย์สินทุกเครื่อง
                    </Badge>
                  )}
                </div>

                {(isAsset || isMediaPlayerEntry) && (
                  <div className="space-y-4 pt-2 border-t border-amber-200 dark:border-amber-800">
                    {/* Show asset code/equipment ID fields only when NOT per-device/per-unit */}
                    {!isMediaPlayerEntry && !perUnitMode && (
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
                              <Label htmlFor="waitingAssetCode" className="text-xs text-muted-foreground">
                                รอรหัสทรัพย์สิน
                              </Label>
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
                              <Label htmlFor="waitingEquipmentId" className="text-xs text-muted-foreground">
                                รอ Equipment ID
                              </Label>
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
                    )}

                    {/* Info for per-device/per-unit mode */}
                    {(isMediaPlayerEntry || perUnitMode) && (
                      <p className="text-xs text-amber-600/80 dark:text-amber-500/80">
                        💡 รหัสทรัพย์สินและ Equipment ID กรอกในแต่ละรายการด้านบน
                      </p>
                    )}

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

              {/* Per-Unit Equipment Entry (when not Media Player) */}
              {!isMediaPlayerEntry && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="perUnitMode"
                        checked={perUnitMode}
                        onCheckedChange={(checked) => {
                          setPerUnitMode(checked === true);
                          if (checked) {
                            setSerialNumber("");
                            setQuantity("");
                          } else {
                            setEquipmentUnits([
                              {
                                id: crypto.randomUUID(),
                                serial_number: "",
                                device_name: "",
                                image_file: null,
                                image_preview: null,
                                asset_code: "",
                                equipment_id_code: "",
                                waiting_asset_code: false,
                                waiting_equipment_id: false,
                              },
                            ]);
                          }
                        }}
                      />
                      <Label
                        htmlFor="perUnitMode"
                        className="text-sm font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-2"
                      >
                        <Package className="w-4 h-4" />
                        ระบุข้อมูลรายชิ้น (Serial Number, ชื่อ, รูปภาพ)
                      </Label>
                    </div>
                    {perUnitMode && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEquipmentUnits((prev) => [
                            ...prev,
                            {
                              id: crypto.randomUUID(),
                              serial_number: "",
                              device_name: "",
                              image_file: null,
                              image_preview: null,
                              asset_code: "",
                              equipment_id_code: "",
                              waiting_asset_code: false,
                              waiting_equipment_id: false,
                            },
                          ]);
                        }}
                        className="gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-100 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-900/30"
                      >
                        <PlusCircle className="w-4 h-4" />
                        เพิ่มชิ้น
                      </Button>
                    )}
                  </div>

                  {perUnitMode && (
                    <>
                      <p className="text-xs text-emerald-600/80 dark:text-emerald-500/80">
                        💡 กรอก S/N แต่ละชิ้น — ระบบจะสร้างรายการในตะกร้าอัตโนมัติ 1 รายการต่อ 1 ชิ้น (
                        {equipmentUnits.length} ชิ้น)
                      </p>
                      <div className="space-y-3">
                        {equipmentUnits.map((unitEntry, idx) => (
                          <div key={unitEntry.id} className="p-3 bg-background border rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-foreground">ชิ้นที่ {idx + 1}</span>
                              {equipmentUnits.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-destructive hover:text-destructive"
                                  onClick={() => {
                                    if (unitEntry.image_preview) URL.revokeObjectURL(unitEntry.image_preview);
                                    setEquipmentUnits((prev) => prev.filter((u) => u.id !== unitEntry.id));
                                  }}
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  ลบ
                                </Button>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {/* Serial Number */}
                              <div className="space-y-1">
                                <Label className="text-xs">Serial Number</Label>
                                <Input
                                  placeholder="กรอก S/N..."
                                  value={unitEntry.serial_number}
                                  onChange={(e) => {
                                    setEquipmentUnits((prev) =>
                                      prev.map((u) =>
                                        u.id === unitEntry.id ? { ...u, serial_number: e.target.value } : u,
                                      ),
                                    );
                                  }}
                                />
                              </div>
                              {/* Name */}
                              <div className="space-y-1">
                                <Label className="text-xs">ชื่อ/รายละเอียดชิ้น</Label>
                                <Input
                                  placeholder="ชื่อเฉพาะชิ้น..."
                                  value={unitEntry.device_name}
                                  onChange={(e) => {
                                    setEquipmentUnits((prev) =>
                                      prev.map((u) =>
                                        u.id === unitEntry.id ? { ...u, device_name: e.target.value } : u,
                                      ),
                                    );
                                  }}
                                />
                              </div>
                              {/* Upload Image */}
                              <div className="space-y-1">
                                <Label className="text-xs">รูปภาพ</Label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    id={`eq-unit-image-${unitEntry.id}`}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        if (file.size > 10 * 1024 * 1024) {
                                          toast.error("ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)");
                                          return;
                                        }
                                        if (unitEntry.image_preview) URL.revokeObjectURL(unitEntry.image_preview);
                                        const preview = URL.createObjectURL(file);
                                        setEquipmentUnits((prev) =>
                                          prev.map((u) =>
                                            u.id === unitEntry.id
                                              ? { ...u, image_file: file, image_preview: preview }
                                              : u,
                                          ),
                                        );
                                      }
                                    }}
                                  />
                                  {unitEntry.image_preview ? (
                                    <div className="flex items-center gap-2">
                                      <img
                                        src={unitEntry.image_preview}
                                        alt="Preview"
                                        className="w-10 h-10 rounded object-cover border"
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-destructive"
                                        onClick={() => {
                                          if (unitEntry.image_preview) URL.revokeObjectURL(unitEntry.image_preview);
                                          setEquipmentUnits((prev) =>
                                            prev.map((u) =>
                                              u.id === unitEntry.id
                                                ? { ...u, image_file: null, image_preview: null }
                                                : u,
                                            ),
                                          );
                                        }}
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-9 w-full"
                                      onClick={() => document.getElementById(`eq-unit-image-${unitEntry.id}`)?.click()}
                                    >
                                      <ImagePlus className="w-4 h-4 mr-1" />
                                      เลือกรูป
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                            {/* Per-unit Asset Code & Equipment ID (when isAsset) */}
                            {isAsset && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs">รหัสทรัพย์สิน</Label>
                                    <div className="flex items-center gap-1">
                                      <Checkbox
                                        id={`eq-wait-asset-${unitEntry.id}`}
                                        checked={unitEntry.waiting_asset_code}
                                        onCheckedChange={(checked) => {
                                          setEquipmentUnits((prev) =>
                                            prev.map((u) =>
                                              u.id === unitEntry.id ? { ...u, waiting_asset_code: checked === true, asset_code: checked ? "" : u.asset_code } : u,
                                            ),
                                          );
                                        }}
                                      />
                                      <Label htmlFor={`eq-wait-asset-${unitEntry.id}`} className="text-xs text-muted-foreground">รอรหัส</Label>
                                    </div>
                                  </div>
                                  <Input
                                    placeholder="รหัสทรัพย์สิน..."
                                    value={unitEntry.asset_code}
                                    disabled={unitEntry.waiting_asset_code}
                                    onChange={(e) => {
                                      setEquipmentUnits((prev) =>
                                        prev.map((u) =>
                                          u.id === unitEntry.id ? { ...u, asset_code: e.target.value } : u,
                                        ),
                                      );
                                    }}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs">Equipment ID</Label>
                                    <div className="flex items-center gap-1">
                                      <Checkbox
                                        id={`eq-wait-eqid-${unitEntry.id}`}
                                        checked={unitEntry.waiting_equipment_id}
                                        onCheckedChange={(checked) => {
                                          setEquipmentUnits((prev) =>
                                            prev.map((u) =>
                                              u.id === unitEntry.id ? { ...u, waiting_equipment_id: checked === true, equipment_id_code: checked ? "" : u.equipment_id_code } : u,
                                            ),
                                          );
                                        }}
                                      />
                                      <Label htmlFor={`eq-wait-eqid-${unitEntry.id}`} className="text-xs text-muted-foreground">รอ ID</Label>
                                    </div>
                                  </div>
                                  <Input
                                    placeholder="Equipment ID..."
                                    value={unitEntry.equipment_id_code}
                                    disabled={unitEntry.waiting_equipment_id}
                                    onChange={(e) => {
                                      setEquipmentUnits((prev) =>
                                        prev.map((u) =>
                                          u.id === unitEntry.id ? { ...u, equipment_id_code: e.target.value } : u,
                                        ),
                                      );
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Quantity, Unit, Min Stock Level & Lot Numbers */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">จำนวน *</Label>
                  {isMediaPlayerEntry ? (
                    <Input
                      id="quantity"
                      type="number"
                      value={
                        mediaPlayerDevices.filter((d) => d.serial_number_1.trim()).length || mediaPlayerDevices.length
                      }
                      readOnly
                      className="bg-muted font-medium"
                    />
                  ) : perUnitMode ? (
                    <Input
                      id="quantity"
                      type="number"
                      value={equipmentUnits.filter((u) => u.serial_number.trim()).length || equipmentUnits.length}
                      readOnly
                      className="bg-muted font-medium"
                    />
                  ) : (
                    <Input
                      id="quantity"
                      type="number"
                      placeholder="กรอกจำนวน"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                    />
                  )}
                  {(isMediaPlayerEntry || perUnitMode) && (
                    <p className="text-xs text-muted-foreground">คำนวณจากจำนวนชิ้นที่เพิ่ม</p>
                  )}
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
                {!selectedEquipmentId && !isMediaPlayerEntry && (
                  <div className="space-y-2">
                    <Label htmlFor="minStockLevel">จำนวนขั้นต่ำ</Label>
                    <Input
                      id="minStockLevel"
                      type="number"
                      placeholder="0"
                      value={minStockLevel}
                      onChange={(e) => setMinStockLevel(e.target.value)}
                      min="0"
                    />
                    <p className="text-xs text-muted-foreground">ระบบจะแจ้งเตือนเมื่อสินค้าต่ำกว่าค่านี้</p>
                  </div>
                )}
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

              {/* Serial Number (only for non-Media Player) & Unit Price & Total Amount */}
              <div
                className={`grid grid-cols-1 ${isMediaPlayerEntry || perUnitMode ? "md:grid-cols-2" : "md:grid-cols-3"} gap-4`}
              >
                {!isMediaPlayerEntry && !perUnitMode && (
                  <div className="space-y-2">
                    <Label htmlFor="serialNumber">Serial Number</Label>
                    <Input
                      id="serialNumber"
                      placeholder="SN-xxxxx"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="unitPrice">ราคาต่อชิ้น (บาท) {isPurchaseReceipt ? "*" : ""}</Label>
                  {!isPurchaseReceipt && (selectedEquipmentId || selectedMediaPlayerId) ? (
                    <Input
                      id="unitPrice"
                      type="number"
                      step="0.01"
                      value={unitPrice}
                      readOnly
                      className="bg-muted font-medium"
                      title="ราคาดึงจากข้อมูลสินค้าในระบบ"
                    />
                  ) : (
                    <Input
                      id="unitPrice"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      required={isPurchaseReceipt}
                    />
                  )}
                  {!isPurchaseReceipt && selectedEquipmentId && (
                    <p className="text-xs text-muted-foreground">ดึงราคาจากข้อมูลสินค้าในระบบ</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>จำนวนเงินทั้งหมด (บาท)</Label>
                  {(() => {
                    const effectiveQty = isMediaPlayerEntry
                      ? mediaPlayerDevices.filter((d) => d.serial_number_1.trim()).length || mediaPlayerDevices.length
                      : perUnitMode
                        ? equipmentUnits.filter((u) => u.serial_number.trim()).length || equipmentUnits.length
                        : parseInt(quantity) || 0;
                    return (
                      <>
                        <Input
                          readOnly
                          value={
                            (parseFloat(unitPrice) || 0) > 0 && effectiveQty > 0
                              ? `฿${((parseFloat(unitPrice) || 0) * effectiveQty).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : "-"
                          }
                          className="bg-muted font-medium text-primary"
                        />
                        {effectiveQty > 1 && (parseFloat(unitPrice) || 0) > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {effectiveQty} ชิ้น × ฿{parseFloat(unitPrice).toLocaleString()} = ฿
                            {((parseFloat(unitPrice) || 0) * effectiveQty).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Storage Dimensions */}
              <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg space-y-4">
                <h3 className="font-medium text-sm text-green-700 dark:text-green-400">ขนาดพื้นที่ๆต้องการใช้</h3>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1 flex-1 min-w-[100px]">
                    <Label htmlFor="storageWidth" className="text-xs">
                      กว้าง (ซ้าย-ขวา)
                    </Label>
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
                    <Label htmlFor="storageHeight" className="text-xs">
                      สูง (บน-ล่าง)
                    </Label>
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
                    <Label htmlFor="storageDepth" className="text-xs">
                      ลึก (หน้า-หลัง)
                    </Label>
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
                      <Input readOnly value={calculatedVolume || "-"} className="h-9 bg-muted font-medium" />
                      <span className="text-xs text-muted-foreground">m³</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Supplier */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier">เลือกผู้จัดจำหน่าย</Label>
                  <SearchableSelect
                    options={suppliers.map((supplier) => ({
                      value: supplier.id,
                      label: `${supplier.code} - ${supplier.name}`,
                      searchableText: `${supplier.code} ${supplier.name} ${supplier.vendor_code || ""}`,
                    }))}
                    value={selectedSupplierId}
                    onValueChange={setSelectedSupplierId}
                    placeholder="เลือกผู้จัดจำหน่าย..."
                    searchPlaceholder="พิมพ์รหัสหรือชื่อผู้จัดจำหน่าย..."
                    emptyMessage="ไม่พบผู้จัดจำหน่าย"
                  />
                </div>
              </div>


              {/* Expiry Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry">วันหมดอายุ</Label>
                  <Input id="expiry" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
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
              <Button type="button" variant="secondary" className="w-full" onClick={handleAddToCart}>
                <Plus className="w-4 h-4 mr-2" />
                เพิ่มลงตะกร้า
              </Button>
            </div>

            {/* Document Upload (Shared) */}
            <div className="p-4 bg-muted/30 rounded-lg space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                เอกสารแนบ (ใช้ร่วมกันทุกรายการ) กรุณาตั้งชื่อไฟล์ให้สะดวกต่อการค้นหาเอกสารแนบ{" "}
                <FileText className="w-4 h-4" />
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Additional Document */}
                <div className="space-y-2">
                  <Label>อัปโหลดเอกสารแนบเพิ่มเติม</Label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={additionalDocFileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={handleAdditionalDocFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => additionalDocFileInputRef.current?.click()}
                      className="flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      เลือกเอกสาร
                    </Button>
                    {additionalDocumentFile && (
                      <div className="flex items-center gap-2 bg-background px-2 py-1 rounded-md border text-xs">
                        <FileText className="w-3 h-3 text-primary" />
                        <span className="truncate max-w-[100px]">{additionalDocumentFile.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAdditionalDocumentFile(null);
                            if (additionalDocFileInputRef.current) additionalDocFileInputRef.current.value = "";
                          }}
                          className="h-5 w-5 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Image */}
                <div className="space-y-2">
                  <Label>อัปโหลดรูปภาพเพิ่มเติม</Label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={additionalImageFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAdditionalImageFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => additionalImageFileInputRef.current?.click()}
                      className="flex items-center gap-2"
                    >
                      <ImagePlus className="w-4 h-4" />
                      เลือกรูปภาพ
                    </Button>
                    {additionalImageFile && (
                      <div className="flex items-center gap-2 bg-background px-2 py-1 rounded-md border text-xs">
                        <ImagePlus className="w-3 h-3 text-primary" />
                        <span className="truncate max-w-[100px]">{additionalImageFile.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAdditionalImageFile(null);
                            if (additionalImageFileInputRef.current) additionalImageFileInputRef.current.value = "";
                          }}
                          className="h-5 w-5 p-0"
                        >
                          <X className="w-3 h-3" />
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

            {/* Cart Display - just above submit */}
            <DeliveryCart
              items={cartItems}
              onRemoveItem={handleRemoveFromCart}
              onClearCart={handleClearCart}
              onEditItem={handleEditItem}
              selectedIds={selectedCartIds}
              onSelectedIdsChange={setSelectedCartIds}
            />

            {/* Submit Button */}
            <Button
              type="button"
              className="w-full"
              disabled={
                isLoading ||
                isUploadingFile ||
                cartItems.length === 0 ||
                (selectedCartIds.size === 0 && cartItems.length > 0)
              }
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
                  {selectedCartIds.size > 0
                    ? `ส่งรายการที่เลือก (${selectedCartIds.size} รายการ)`
                    : `กรุณาเลือกรายการในตะกร้า`}
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
                placeholder="ค้นหา S/N..."
                className="pl-10"
                value={snSearchTerm}
                onChange={(e) => setSnSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาเลขที่เอกสาร, ชื่อสินค้า, ผู้ส่ง..."
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
                  <TableHead>รหัสสินค้า</TableHead>
                  <TableHead>วันที่</TableHead>
                  <TableHead>ชื่อสินค้า</TableHead>
                  <TableHead>จำนวน</TableHead>
                  <TableHead>บริษัทที่สั่งซื้อ</TableHead>
                  <TableHead>ผู้ส่ง</TableHead>
                  <TableHead>เอกสาร</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedReceipts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      ยังไม่มีรายการ
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedReceipts.map((receipt) => (
                    <TableRow key={receipt.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{receipt.document_no}</TableCell>
                      <TableCell>
                        {receipt.equipment_code ? (
                          <span
                            className={
                              receipt.equipment_code.startsWith("TEMP-")
                                ? "text-amber-600 dark:text-amber-400 font-mono text-xs"
                                : "font-mono text-xs"
                            }
                          >
                            {receipt.equipment_code}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{format(new Date(receipt.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                      <TableCell>{receipt.equipment_name || "-"}</TableCell>
                      <TableCell>
                        {receipt.quantity} {receipt.unit}
                      </TableCell>
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
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSelectedDetailReceipt(receipt)}
                          title="ดูรายละเอียด"
                        >
                          <Eye className="w-4 h-4 text-primary" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            currentPage={historyPage}
            totalPages={historyTotalPages}
            totalItems={historyTotalItems}
            pageSize={historyPageSize}
            onPageChange={handleHistoryPageChange}
            onPageSizeChange={handleHistoryPageSizeChange}
          />
        </CardContent>
      </Card>

      <DeliveryDetailDialog
        open={!!selectedDetailReceipt}
        onOpenChange={(open) => { if (!open) setSelectedDetailReceipt(null); }}
        receipt={selectedDetailReceipt}
      />
    </div>
  );
};
export default DeliveryEntry;
