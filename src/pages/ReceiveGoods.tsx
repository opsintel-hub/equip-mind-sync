import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PackageCheck, Search, Clock, CheckCircle2, Package, Box, Layers, AlertTriangle, Plus, Eye, MapPin } from "lucide-react";
import { EquipmentImageViewer } from "@/components/equipment/EquipmentImageViewer";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { EquipmentForm, EquipmentPrefillData } from "@/components/equipment/EquipmentForm";
import { ReceiveGroupedItems, PendingReceipt } from "@/components/receive/ReceiveGroupedItems";

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

interface ReceiptPurpose {
  id: string;
  name: string;
  purpose_type: string;
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

interface Department {
  id: string;
  name: string;
}

interface Company {
  id: string;
  code: string;
  name: string;
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
  const [snSearchTerm, setSnSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("pending");
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [pendingReceipts, setPendingReceipts] = useState<PendingReceipt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [receiptPurposes, setReceiptPurposes] = useState<ReceiptPurpose[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  // Single item dialog state
  const [selectedReceipt, setSelectedReceipt] = useState<PendingReceipt | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Batch receive dialog state
  const [batchReceipts, setBatchReceipts] = useState<PendingReceipt[]>([]);
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);

  // Reject dialog state
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReceipt, setRejectReceipt] = useState<PendingReceipt | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Received detail dialog state
  const [isReceiptDetailOpen, setIsReceiptDetailOpen] = useState(false);
  const [receiptDetail, setReceiptDetail] = useState<any | null>(null);
  const [isReceiptDetailLoading, setIsReceiptDetailLoading] = useState(false);

  // Form state for editing - only editable fields
  const [editNotes, setEditNotes] = useState("");
  const [storageVolumeCm3, setStorageVolumeCm3] = useState<string>("");
  const [itemCondition, setItemCondition] = useState("normal");
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
    fetchReceiptPurposes();
    fetchDepartments();
    fetchCompanies();
  }, [filterStatus]);

  const fetchReceiptPurposes = async () => {
    const { data, error } = await supabase
      .from("receipt_purposes")
      .select("id, name, purpose_type")
      .eq("is_active", true)
      .order("name");
    
    if (!error && data) {
      setReceiptPurposes(data);
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

  const fetchCompanies = async () => {
    const { data, error } = await supabase
      .from("companies")
      .select("id, code, name")
      .eq("is_active", true)
      .order("code");
    
    if (!error && data) {
      setCompanies(data);
    }
  };

  const getReceiptPurposeName = (purposeId: string | null | undefined) => {
    if (!purposeId) return "-";
    const purpose = receiptPurposes.find(p => p.id === purposeId);
    return purpose?.name || "-";
  };

  const getDepartmentName = (departmentId: string | null | undefined) => {
    if (!departmentId) return null;
    const dept = departments.find(d => d.id === departmentId);
    return dept?.name || null;
  };

  const getCompanyName = (companyId: string | null | undefined) => {
    if (!companyId) return null;
    const company = companies.find(c => c.id === companyId);
    return company ? `${company.code} - ${company.name}` : null;
  };

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
    setItemCondition("normal");
    setIsDialogOpen(true);
  };

  const openBatchReceiveDialog = (receipts: PendingReceipt[]) => {
    setBatchReceipts(receipts);
    setEditNotes("");
    setStorageVolumeCm3("");
    setLocationCapacity(null);
    setSelectedWarehouseId("");
    setStorageLocation({ locationId: "" });
    setItemCondition("normal");
    setIsBatchDialogOpen(true);
  };

  const openRejectDialog = (receipt: PendingReceipt) => {
    setRejectReceipt(receipt);
    setRejectReason("");
    setIsRejectDialogOpen(true);
  };

  const openReceiptDetailDialog = async (receipt: PendingReceipt) => {
    setReceiptDetail(receipt);
    setIsReceiptDetailOpen(true);
    setIsReceiptDetailLoading(true);

    const { data, error } = await supabase
      .from("goods_receipt_pending")
      .select(`
        *,
        departments:department_id(name),
        companies:company_id(code, name),
        warehouses:warehouse_id(code, name),
        received_location:locations!goods_receipt_pending_received_location_id_fkey(code, name, warehouses:warehouse_id(code, name)),
        received_slot:storage_slots!goods_receipt_pending_received_storage_slot_id_fkey(name),
        received_sub_slot:sub_storage_slots!goods_receipt_pending_received_sub_storage_slot_id_fkey(name),
        receipt_purposes:receipt_purpose_id(name)
      `)
      .eq("id", receipt.id)
      .maybeSingle();

    if (error) {
      console.error("Error loading receipt detail:", error);
      toast.error("โหลดรายละเอียดการรับเข้าไม่สำเร็จ");
    } else if (data) {
      setReceiptDetail(data);
    }
    setIsReceiptDetailLoading(false);
  };

  const handleReject = async () => {
    if (!rejectReceipt) return;
    
    if (!rejectReason.trim()) {
      toast.error("กรุณาระบุเหตุผลในการปฏิเสธ");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("goods_receipt_pending")
        .update({
          status: "rejected",
          notes: `ปฏิเสธ: ${rejectReason}${rejectReceipt.notes ? ` | หมายเหตุเดิม: ${rejectReceipt.notes}` : ""}`,
        })
        .eq("id", rejectReceipt.id);

      if (error) throw error;

      toast.success("ปฏิเสธรายการสำเร็จ");
      setIsRejectDialogOpen(false);
      fetchPendingReceipts();
    } catch (error) {
      console.error("Error rejecting:", error);
      toast.error("เกิดข้อผิดพลาดในการปฏิเสธรายการ");
    } finally {
      setIsLoading(false);
    }
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
    
    // Check if it's a Media Player or regular equipment
    const isMediaPlayer = (selectedReceipt as any).is_media_player;
    
    if (!isMediaPlayer && !selectedReceipt.equipment_id) {
      toast.error("ไม่พบสินค้าในระบบ กรุณาสร้างสินค้าก่อน");
      return;
    }
    
    if (isMediaPlayer && !(selectedReceipt as any).media_player_id) {
      toast.error("ไม่พบ Media Player ในระบบ กรุณาสร้าง Media Player ก่อน");
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
      const storageVolumeValue = storageVolumeCm3 ? parseFloat(storageVolumeCm3) : null;
      const receivedQuantity = selectedReceipt.quantity;

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

      // Handle differently based on whether it's Media Player or Equipment
      if (isMediaPlayer) {
        // Fetch current Media Player stock FIRST
        const { data: currentMediaPlayer, error: fetchMpError } = await supabase
          .from("media_players")
          .select("quantity, code, name, department, serial_number_1, serial_number_2")
          .eq("id", (selectedReceipt as any).media_player_id)
          .single();

        if (fetchMpError) throw fetchMpError;

        const currentStock = currentMediaPlayer?.quantity || 0;
        const newStock = currentStock + receivedQuantity;

        // Update Media Player stock and location (same as equipment)
        const mpDeptName = getDepartmentName(selectedReceipt.department_id);
        const mpUpdatePayload: Record<string, any> = {
                quantity: newStock,
                location_id: storageLocation.locationId,
                item_condition: itemCondition,
              };

        // Receipt S/N is authoritative — always overwrite serial_number_1 and serial_number_2
        const singleReceiptSerial = selectedReceipt.serial_number?.trim();
        if (singleReceiptSerial) {
          mpUpdatePayload.serial_number_1 = singleReceiptSerial;
        }
        const singleReceiptSerial2 = (selectedReceipt as any).serial_number_2?.trim();
        if (singleReceiptSerial2) {
          mpUpdatePayload.serial_number_2 = singleReceiptSerial2;
        }

        // Always update department from receipt (authoritative source)
        if (mpDeptName) {
          mpUpdatePayload.department = mpDeptName;
        }

        // Propagate purchase / financial / document fields from receipt → master
        // Receipt is the authoritative source for these (overwrite if provided)
        const sr: any = selectedReceipt;
        if (sr.supplier_id) mpUpdatePayload.supplier_id = sr.supplier_id;
        if (sr.company_id) mpUpdatePayload.company_id = sr.company_id;
        if (sr.unit_price != null) mpUpdatePayload.unit_price = sr.unit_price;
        if (sr.received_at) mpUpdatePayload.date_of_receipt = String(sr.received_at).slice(0, 10);
        if (sr.po_number) mpUpdatePayload.po_number = sr.po_number;
        if (sr.pr_number) mpUpdatePayload.pr_number = sr.pr_number;
        if (sr.invoice_number) mpUpdatePayload.invoice_number = sr.invoice_number;
        if (sr.depreciation_months != null) mpUpdatePayload.depreciation_months = sr.depreciation_months;
        if (sr.warranty_expiry_date) mpUpdatePayload.warranty_expiry_date = sr.warranty_expiry_date;
        if (sr.purchase_document_url) mpUpdatePayload.po_document_url = sr.purchase_document_url;
        if (sr.invoice_document_url) mpUpdatePayload.invoice_document_url = sr.invoice_document_url;
        if (sr.delivery_note_number) mpUpdatePayload.delivery_note_number = sr.delivery_note_number;
        if (sr.delivery_note_document_url) mpUpdatePayload.delivery_note_document_url = sr.delivery_note_document_url;
        if (sr.order_for_project) mpUpdatePayload.order_for_project = sr.order_for_project;
        if (sr.activate_windows) mpUpdatePayload.activate_windows = sr.activate_windows;
        if (sr.asset_code) mpUpdatePayload.asset_code = sr.asset_code;
        if (sr.equipment_id_code) mpUpdatePayload.equipment_id_code = sr.equipment_id_code;

        const { error: mpError } = await supabase
              .from("media_players")
              .update(mpUpdatePayload)
              .eq("id", (selectedReceipt as any).media_player_id);

        if (mpError) {
          console.error("Media Player update error:", mpError);
          toast.warning("รับสินค้าสำเร็จแต่ไม่สามารถอัปเดต Stock Media Player ได้");
        } else {
          // Log stock movement for Media Player
              await logStockMovement({
                equipment_id: (selectedReceipt as any).media_player_id!,
                equipment_code: currentMediaPlayer?.code || selectedReceipt.equipment_code || "",
                equipment_name: currentMediaPlayer?.name || selectedReceipt.equipment_name || "",
                movement_type: "receive",
                quantity: receivedQuantity,
                stock_before: currentStock,
                stock_after: newStock,
                reference_type: "goods_receipt",
                reference_document: selectedReceipt.document_no,
                location_id: storageLocation.locationId,
                notes: `Media Player - ${editNotes || ""}`.trim(),
                item_condition: itemCondition,
              });
          toast.success(`รับ Media Player เข้าคลังสำเร็จ (Stock: ${currentStock} → ${newStock})`);
        }
      } else {
        // Fetch current equipment stock FIRST
        const { data: currentEquipment, error: fetchError } = await supabase
          .from("equipment")
          .select("quantity_in_stock, department, serial_number")
          .eq("id", selectedReceipt.equipment_id)
          .single();

        if (fetchError) throw fetchError;

        const currentStock = currentEquipment?.quantity_in_stock || 0;
        const newStock = currentStock + receivedQuantity;

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
        const eqDeptName = getDepartmentName(selectedReceipt.department_id);
        const eqUpdatePayload: Record<string, any> = {
            quantity_in_stock: newStock,
            location_id: storageLocation.locationId,
            expiry_date: selectedReceipt.expiry_date || null,
            item_condition: itemCondition,
          };

        const singleEqSerial = selectedReceipt.serial_number?.trim();
        if (singleEqSerial && !currentEquipment?.serial_number?.trim()) {
          eqUpdatePayload.serial_number = singleEqSerial;
        }

        if (eqDeptName) {
          eqUpdatePayload.department = eqDeptName;
        }
        const { error: stockError } = await supabase
          .from("equipment")
          .update(eqUpdatePayload)
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
            item_condition: itemCondition,
          });

          // Update equipment_serial_numbers status to in_stock
          const receiptSerial = selectedReceipt.serial_number?.trim();
          if (receiptSerial && selectedReceipt.equipment_id) {
            // Try to update existing pending S/N record
            const { data: existingSN } = await supabase
              .from("equipment_serial_numbers")
              .select("id")
              .eq("equipment_id", selectedReceipt.equipment_id)
              .eq("serial_number", receiptSerial)
              .eq("status", "pending")
              .maybeSingle();

            if (existingSN) {
              await supabase.from("equipment_serial_numbers").update({
                status: "in_stock",
                location_id: storageLocation.locationId,
                received_at: new Date().toISOString(),
              } as any).eq("id", existingSN.id);
            } else {
              // Insert new S/N record if not found (e.g., legacy data)
              await supabase.from("equipment_serial_numbers").insert({
                equipment_id: selectedReceipt.equipment_id,
                serial_number: receiptSerial,
                status: "in_stock",
                receipt_document_no: selectedReceipt.document_no,
                location_id: storageLocation.locationId,
                received_at: new Date().toISOString(),
              } as any);
            }
          }

          toast.success(`รับสินค้าเข้าคลังสำเร็จ (Stock: ${currentStock} → ${newStock})`);
        }
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

  const handleBatchReceive = async () => {
    if (batchReceipts.length === 0) return;
    
    // Check all items have equipment_id or media_player_id
    const itemsWithoutEquipment = batchReceipts.filter(r => {
      const isMediaPlayer = (r as any).is_media_player;
      if (isMediaPlayer) {
        return !(r as any).media_player_id;
      }
      return !r.equipment_id;
    });
    
    if (itemsWithoutEquipment.length > 0) {
      toast.error(`มี ${itemsWithoutEquipment.length} รายการที่ยังไม่มีสินค้า/Media Player ในระบบ กรุณาสร้างก่อน`);
      return;
    }

    if (!storageLocation.locationId) {
      toast.error("กรุณาเลือกตำแหน่งจัดเก็บ");
      return;
    }

    setIsLoading(true);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const receipt of batchReceipts) {
        try {
          const selectedSupp = suppliers.find(s => s.id === receipt.supplier_id);
          const isMediaPlayer = (receipt as any).is_media_player;
          const receivedQuantity = receipt.quantity;

          // Update pending receipt status
          const { error: updateError } = await supabase
            .from("goods_receipt_pending")
            .update({
              status: "received",
              received_by: user?.id,
              received_at: new Date().toISOString(),
              received_location_id: storageLocation.locationId,
              notes: editNotes || null,
            })
            .eq("id", receipt.id);

          if (updateError) throw updateError;

          if (isMediaPlayer) {
            // Fetch current Media Player stock
            const { data: currentMediaPlayer, error: fetchMpError } = await supabase
              .from("media_players")
              .select("quantity, code, name, department, serial_number_1, serial_number_2")
              .eq("id", (receipt as any).media_player_id)
              .single();

            if (fetchMpError) throw fetchMpError;

            const currentMpStock = currentMediaPlayer?.quantity || 0;
            const newMpStock = currentMpStock + receivedQuantity;

            const batchMpDept = getDepartmentName(receipt.department_id);
            const batchMpPayload: Record<string, any> = {
                quantity: newMpStock,
                location_id: storageLocation.locationId,
                item_condition: itemCondition,
              };

            // Receipt S/N is authoritative — always overwrite serial_number_1 and serial_number_2
            const batchReceiptSerial = receipt.serial_number?.trim();
            if (batchReceiptSerial) {
              batchMpPayload.serial_number_1 = batchReceiptSerial;
            }
            const batchReceiptSerial2 = (receipt as any).serial_number_2?.trim();
            if (batchReceiptSerial2) {
              batchMpPayload.serial_number_2 = batchReceiptSerial2;
            }
            if (batchMpDept) {
              batchMpPayload.department = batchMpDept;
            }
            const { error: mpError } = await supabase
              .from("media_players")
              .update(batchMpPayload)
              .eq("id", (receipt as any).media_player_id);

            if (!mpError) {
              // Log stock movement for Media Player
              await logStockMovement({
                equipment_id: (receipt as any).media_player_id!,
                equipment_code: currentMediaPlayer?.code || receipt.equipment_code || "",
                equipment_name: currentMediaPlayer?.name || receipt.equipment_name || "",
                movement_type: "receive",
                quantity: receivedQuantity,
                stock_before: currentMpStock,
                stock_after: newMpStock,
                reference_type: "goods_receipt",
                reference_document: receipt.document_no,
                location_id: storageLocation.locationId,
                notes: `Media Player - ${editNotes || ""}`.trim(),
                item_condition: itemCondition,
              });
            }
          } else {
            // Fetch current equipment stock
            const { data: currentEquipment, error: fetchError } = await supabase
              .from("equipment")
              .select("quantity_in_stock, department, serial_number")
              .eq("id", receipt.equipment_id!)
              .single();

            if (fetchError) throw fetchError;

            const currentStock = currentEquipment?.quantity_in_stock || 0;
            const newStock = currentStock + receivedQuantity;

            // Create goods receipt record
            const { error: grError } = await supabase
              .from("goods_receipt")
              .insert({
                document_no: generateGRDocumentNo(),
                equipment_id: receipt.equipment_id,
                quantity: receivedQuantity,
                supplier: selectedSupp?.name || receipt.supplier_name || "ไม่ระบุ",
                location_id: storageLocation.locationId,
                receipt_date: new Date().toISOString().split("T")[0],
                created_by: user?.id || "",
                notes: `นำเข้าจากเอกสาร ${receipt.document_no}. ${editNotes || ""}`.trim(),
                status: "completed",
                unit_price: receipt.unit_price || null
              });

            if (grError) throw grError;

            const batchEqDept = getDepartmentName(receipt.department_id);
            const batchEqPayload: Record<string, any> = {
                quantity_in_stock: newStock,
                location_id: storageLocation.locationId,
                expiry_date: receipt.expiry_date || null,
                item_condition: itemCondition,
              };
            const batchEqSerial = receipt.serial_number?.trim();
            if (batchEqSerial && !currentEquipment?.serial_number?.trim()) {
              batchEqPayload.serial_number = batchEqSerial;
            }
            if (batchEqDept) {
              batchEqPayload.department = batchEqDept;
            }
            const { error: stockError } = await supabase
              .from("equipment")
              .update(batchEqPayload)
              .eq("id", receipt.equipment_id!);

            if (!stockError) {
              const selectedEquipment = equipment.find(e => e.id === receipt.equipment_id);
              await logStockMovement({
                equipment_id: receipt.equipment_id!,
                equipment_code: selectedEquipment?.code || receipt.equipment_code || "",
                equipment_name: selectedEquipment?.name || receipt.equipment_name || "",
                movement_type: "receive",
                quantity: receivedQuantity,
                stock_before: currentStock,
                stock_after: newStock,
                reference_type: "goods_receipt",
                reference_document: receipt.document_no,
                location_id: storageLocation.locationId,
                notes: editNotes || undefined,
                item_condition: itemCondition,
              });

              // Update equipment_serial_numbers for batch receive
              if (batchEqSerial && receipt.equipment_id) {
                const { data: existingSN } = await supabase
                  .from("equipment_serial_numbers")
                  .select("id")
                  .eq("equipment_id", receipt.equipment_id)
                  .eq("serial_number", batchEqSerial)
                  .eq("status", "pending")
                  .maybeSingle();
                if (existingSN) {
                  await supabase.from("equipment_serial_numbers").update({
                    status: "in_stock", location_id: storageLocation.locationId, received_at: new Date().toISOString(),
                  } as any).eq("id", existingSN.id);
                } else {
                  await supabase.from("equipment_serial_numbers").insert({
                    equipment_id: receipt.equipment_id, serial_number: batchEqSerial, status: "in_stock",
                    receipt_document_no: receipt.document_no, location_id: storageLocation.locationId, received_at: new Date().toISOString(),
                  } as any);
                }
              }
            }
          }

          successCount++;
        } catch (error) {
          console.error("Error receiving item:", receipt.document_no, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`รับสินค้าเข้าคลังสำเร็จ ${successCount} รายการ`);
      }
      if (errorCount > 0) {
        toast.warning(`ไม่สามารถรับสินค้าได้ ${errorCount} รายการ`);
      }

      setIsBatchDialogOpen(false);
      setBatchReceipts([]);
      fetchPendingReceipts();
    } catch (error) {
      console.error("Error:", error);
      toast.error("เกิดข้อผิดพลาดในการรับสินค้า");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredReceipts = pendingReceipts.filter(receipt => {
    // Dedicated S/N search
    if (snSearchTerm) {
      const snTerm = snSearchTerm.toLowerCase();
      if (!(receipt as any).serial_number?.toLowerCase().includes(snTerm)) return false;
    }
    // General search
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    return receipt.document_no.toLowerCase().includes(term) ||
      receipt.equipment_name?.toLowerCase().includes(term) ||
      receipt.delivery_person_name.toLowerCase().includes(term) ||
      (receipt as any).equipment_code?.toLowerCase().includes(term);
  });

  const pendingCount = pendingReceipts.filter(r => r.status === "pending").length;

  const formatReceiptDateTime = (value?: string | null) => value ? format(new Date(value), "dd/MM/yyyy HH:mm") : "-";
  const formatLocationLabel = (detail: any) => {
    const loc = detail?.received_location;
    if (!loc) return "-";
    return [loc.code, loc.name].filter(Boolean).join(" - ");
  };
  const formatWarehouseLabel = (detail: any) => {
    const wh = detail?.received_location?.warehouses || detail?.warehouses;
    if (!wh) return "-";
    return [wh.code, wh.name].filter(Boolean).join(" - ");
  };
  const formatStoragePath = (detail: any) => {
    const parts = [formatWarehouseLabel(detail), formatLocationLabel(detail), detail?.received_slot?.name, detail?.received_sub_slot?.name]
      .filter((part) => part && part !== "-");
    return parts.length ? parts.join(" / ") : "-";
  };

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
              <p className="text-sm text-muted-foreground">รายการจัดกลุ่มตามเอกสาร สามารถเลือกรับพร้อมกันได้</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter & Grouped Items */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5" />
                รายการสินค้ารอรับเข้า (จัดกลุ่มตามเอกสาร)
              </CardTitle>
              <CardDescription>คลิกที่กลุ่มเพื่อดูรายละเอียด สามารถเลือกรับหลายรายการพร้อมกันได้</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
                  <SelectItem value="pending">รอรับเข้า</SelectItem>
                  <SelectItem value="received">รับเข้าแล้ว</SelectItem>
                  <SelectItem value="rejected">ปฏิเสธแล้ว</SelectItem>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-48">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหา S/N..."
                  className="pl-10"
                  value={snSearchTerm}
                  onChange={(e) => setSnSearchTerm(e.target.value)}
                />
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาเลขที่เอกสาร, ชื่อสินค้า, ผู้ส่ง..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ReceiveGroupedItems
            receipts={filteredReceipts}
            onReceiveSingle={openReceiveDialog}
            onReceiveBatch={openBatchReceiveDialog}
            onRejectSingle={openRejectDialog}
            onViewReceipt={openReceiptDetailDialog}
            getReceiptPurposeName={getReceiptPurposeName}
          />
        </CardContent>
      </Card>

      {/* Received Detail Dialog */}
      <Dialog open={isReceiptDetailOpen} onOpenChange={setIsReceiptDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              รายละเอียดการรับเข้า {receiptDetail?.document_no ? `— ${receiptDetail.document_no}` : ""}
            </DialogTitle>
            <DialogDescription>ตรวจสอบวิธีรับเข้า คลัง และตำแหน่งจัดเก็บของรายการนี้</DialogDescription>
          </DialogHeader>

          {isReceiptDetailLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">กำลังโหลด...</div>
          ) : receiptDetail ? (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                <p className="font-medium text-foreground">{receiptDetail.equipment_name || receiptDetail.equipment_code || "-"}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="text-muted-foreground">จำนวน:</span> {receiptDetail.quantity} {receiptDetail.unit}</p>
                  <p><span className="text-muted-foreground">S/N:</span> {receiptDetail.serial_number || "-"}</p>
                  <p><span className="text-muted-foreground">วัตถุประสงค์:</span> {receiptDetail.receipt_purposes?.name || getReceiptPurposeName(receiptDetail.receipt_purpose_id)}</p>
                  <p><span className="text-muted-foreground">สถานะ:</span> {receiptDetail.status === "received" ? "รับเข้าแล้ว" : receiptDetail.status}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>วันที่รับเข้า</Label>
                  <Input value={formatReceiptDateTime(receiptDetail.received_at)} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>ผู้ส่ง</Label>
                  <Input value={receiptDetail.delivery_person_name || "-"} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>ฝ่าย</Label>
                  <Input value={receiptDetail.departments?.name || getDepartmentName(receiptDetail.department_id) || "-"} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>บริษัท</Label>
                  <Input value={receiptDetail.companies ? `${receiptDetail.companies.code || ""} - ${receiptDetail.companies.name}` : getCompanyName(receiptDetail.company_id) || "-"} disabled className="bg-muted" />
                </div>
              </div>

              <div className="p-3 border rounded-lg space-y-3">
                <p className="text-sm font-medium text-foreground flex items-center gap-2"><MapPin className="w-4 h-4" />ข้อมูลคลังและที่เก็บ</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>คลังสินค้า</Label>
                    <Input value={formatWarehouseLabel(receiptDetail)} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>ตำแหน่งจัดเก็บ</Label>
                    <Input value={formatLocationLabel(receiptDetail)} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>เส้นทางที่เก็บ</Label>
                    <Input value={formatStoragePath(receiptDetail)} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>พื้นที่ที่ใช้</Label>
                    <Input value={receiptDetail.storage_volume_cm3 ? `${receiptDetail.storage_volume_cm3.toLocaleString("th-TH")} m³` : "-"} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>ผู้จัดจำหน่าย</Label>
                    <Input value={receiptDetail.supplier_name || "-"} disabled className="bg-muted" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>PO Number</Label>
                  <Input value={receiptDetail.po_number || "-"} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>PR Number</Label>
                  <Input value={receiptDetail.pr_number || "-"} disabled className="bg-muted" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>หมายเหตุ</Label>
                <Textarea value={receiptDetail.notes || "-"} disabled rows={2} className="bg-muted" />
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">ไม่พบข้อมูลการรับเข้า</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Single Receive Dialog */}
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
              {/* Department & Company - First Row (Most Important) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ฝ่าย</Label>
                  <Input 
                    value={getDepartmentName(selectedReceipt.department_id) || "-"}
                    disabled
                    className={`bg-muted ${!selectedReceipt.department_id ? 'text-muted-foreground' : ''}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label>บริษัท</Label>
                  <Input 
                    value={getCompanyName(selectedReceipt.company_id) || "-"}
                    disabled
                    className={`bg-muted ${!selectedReceipt.company_id ? 'text-muted-foreground' : ''}`}
                  />
                </div>
              </div>

              {/* Delivery Info - Read Only */}
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium text-foreground mb-2">ข้อมูลจากการนำสินค้าเข้า</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="text-muted-foreground">ชื่อผู้ส่ง:</span> {selectedReceipt.delivery_person_name}</p>
                  <p><span className="text-muted-foreground">เบอร์โทร:</span> {selectedReceipt.delivery_person_phone || <span className="text-destructive/70">ไม่ได้กรอก</span>}</p>
                </div>
              </div>

              {/* Receipt Purpose - Read Only */}
              <div className="space-y-2">
                <Label>วัตถุประสงค์การนำสินค้าเข้า</Label>
                <Input 
                  value={getReceiptPurposeName(selectedReceipt.receipt_purpose_id) || "-"}
                  disabled
                  className={`bg-muted ${!selectedReceipt.receipt_purpose_id ? 'text-muted-foreground' : ''}`}
                />
              </div>

              {/* PO/PR Numbers - Read Only */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>เลข PO</Label>
                  <Input 
                    value={selectedReceipt.po_number || "-"}
                    disabled
                    className={`bg-muted ${!selectedReceipt.po_number ? 'text-muted-foreground' : ''}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label>เลข PR</Label>
                  <Input 
                    value={selectedReceipt.pr_number || "-"}
                    disabled
                    className={`bg-muted ${!selectedReceipt.pr_number ? 'text-muted-foreground' : ''}`}
                  />
                </div>
              </div>

              {/* Equipment Name - Read Only with Image Viewer and Quick Create */}
              <div className="space-y-2">
                <Label>ชื่อสินค้า</Label>
                <div className="flex gap-2">
                  <Input 
                    value={selectedReceipt.equipment_code ? `${selectedReceipt.equipment_code} - ${selectedReceipt.equipment_name || ""}` : selectedReceipt.equipment_name || "-"}
                    disabled
                    className="bg-muted flex-1"
                  />
                  {selectedReceipt.equipment_id && (
                    <EquipmentImageViewer 
                      equipmentId={selectedReceipt.equipment_id} 
                      equipmentName={selectedReceipt.equipment_name || undefined}
                      variant="button"
                    />
                  )}
                </div>

                {/* Alert when no equipment_id - New Equipment */}
                {!selectedReceipt.equipment_id && !(selectedReceipt as any).is_media_player && (
                  <Alert className="border-warning bg-warning/10">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertDescription className="text-sm">
                      <span className="font-medium">สินค้าใหม่ยังไม่มีในระบบ</span>
                      <p className="text-muted-foreground mt-1">
                        กรุณาสร้างอุปกรณ์ใหม่ก่อนจึงจะรับเข้าคลังได้
                      </p>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Quick Create Equipment Button - Inline */}
                {!selectedReceipt.equipment_id && !(selectedReceipt as any).is_media_player && (
                  <EquipmentForm
                    prefillData={{
                      name: selectedReceipt.equipment_name || undefined,
                      unit: selectedReceipt.unit || undefined,
                      serial_number: selectedReceipt.serial_number || undefined,
                      expiry_date: selectedReceipt.expiry_date || undefined,
                      warranty_expiry_date: selectedReceipt.warranty_expiry_date || undefined,
                      notes: selectedReceipt.notes || undefined,
                      quantity: selectedReceipt.quantity || 0,
                      department: getDepartmentName(selectedReceipt.department_id) || undefined,
                      company_id: selectedReceipt.company_id || undefined,
                      unit_price: selectedReceipt.unit_price || undefined,
                      lot_number: selectedReceipt.lot_number || undefined,
                      category_id: selectedReceipt.temp_category_id || undefined,
                      subcategory_id: selectedReceipt.temp_subcategory_id || undefined,
                      min_stock_level: (selectedReceipt as any).temp_min_stock_level || undefined,
                      // Pass images: prioritize temp_product_images, fallback to document_url
                      images: (selectedReceipt.temp_product_images && selectedReceipt.temp_product_images.length > 0)
                        ? selectedReceipt.temp_product_images
                        : selectedReceipt.document_url 
                          ? selectedReceipt.document_url.split(',')
                              .map(url => url.trim())
                              .filter(url => url.match(/\.(jpg|jpeg|png|gif|webp)/i)) 
                          : undefined,
                    } as EquipmentPrefillData}
                    onSuccess={async (newEquipmentId) => {
                      if (newEquipmentId) {
                        // Fetch the newly created equipment to get its real code and name
                        const { data: newEquip } = await supabase
                          .from("equipment")
                          .select("code, name")
                          .eq("id", newEquipmentId)
                          .single();

                        // Update the pending receipt to link with new equipment AND update code/name
                        const updatePayload: Record<string, any> = { equipment_id: newEquipmentId };
                        if (newEquip) {
                          updatePayload.equipment_code = newEquip.code;
                          updatePayload.equipment_name = newEquip.name;
                        }

                        const { error } = await supabase
                          .from("goods_receipt_pending")
                          .update(updatePayload)
                          .eq("id", selectedReceipt.id);

                        if (error) {
                          console.error("Error linking equipment:", error);
                          toast.error("สร้างอุปกรณ์สำเร็จแต่ไม่สามารถเชื่อมต่อกับรายการรอรับได้");
                        } else {
                          toast.success("สร้างอุปกรณ์และเชื่อมต่อกับรายการสำเร็จ พร้อมรับเข้าคลังได้ทันที");
                          // Update local state
                          setSelectedReceipt({
                            ...selectedReceipt,
                            equipment_id: newEquipmentId,
                            equipment_code: newEquip?.code || selectedReceipt.equipment_code,
                            equipment_name: newEquip?.name || selectedReceipt.equipment_name,
                          });
                        }
                        
                        // Refresh equipment and pending receipts
                        fetchEquipment();
                        fetchPendingReceipts();
                      }
                    }}
                    triggerButton={
                      <Button variant="outline" className="w-full border-primary/50 text-primary hover:bg-primary/10">
                        <Plus className="w-4 h-4 mr-2" />
                        สร้างอุปกรณ์ใหม่ (Auto-fill จากข้อมูลนำเข้า)
                      </Button>
                    }
                  />
                )}
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

              {/* Lot Number 1, Lot Number 2, Serial Number & Unit Price - Read Only */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Lot Number 1</Label>
                  <Input 
                    value={selectedReceipt.lot_number || "-"}
                    disabled
                    className={`bg-muted ${!selectedReceipt.lot_number ? 'text-muted-foreground' : ''}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lot Number 2</Label>
                  <Input 
                    value={selectedReceipt.lot_number_2 || "-"}
                    disabled
                    className={`bg-muted ${!selectedReceipt.lot_number_2 ? 'text-muted-foreground' : ''}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Serial Number</Label>
                  <Input 
                    value={selectedReceipt.serial_number || "-"}
                    disabled
                    className={`bg-muted ${!selectedReceipt.serial_number ? 'text-muted-foreground' : ''}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ราคาต่อชิ้น</Label>
                  <Input 
                    value={selectedReceipt.unit_price ? selectedReceipt.unit_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}
                    disabled
                    className={`bg-muted ${!selectedReceipt.unit_price ? 'text-muted-foreground' : ''}`}
                  />
                </div>
              </div>

              {/* Supplier & Is Asset - Read Only */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ผู้จัดจำหน่าย</Label>
                  <Input 
                    value={selectedReceipt.supplier_name || "-"}
                    disabled
                    className={`bg-muted ${!selectedReceipt.supplier_name ? 'text-muted-foreground' : ''}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ประเภทสินค้า</Label>
                  <Input 
                    value={selectedReceipt.is_asset ? "ทรัพย์สิน (Asset)" : "ไม่ใช่ทรัพย์สิน"}
                    disabled
                    className={`bg-muted ${selectedReceipt.is_asset ? 'text-primary font-medium' : ''}`}
                  />
                </div>
              </div>

              {/* Asset Details - Show when is_asset is true */}
              {selectedReceipt.is_asset && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
                  <p className="text-sm font-medium text-primary">ข้อมูลทรัพย์สิน</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>รหัสทรัพย์สิน</Label>
                      <Input 
                        value={selectedReceipt.asset_code || (selectedReceipt.waiting_asset_code ? "รอรหัส" : "-")}
                        disabled
                        className={`bg-muted ${selectedReceipt.waiting_asset_code ? 'text-warning' : !selectedReceipt.asset_code ? 'text-muted-foreground' : ''}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>รหัสอุปกรณ์</Label>
                      <Input 
                        value={selectedReceipt.equipment_id_code || (selectedReceipt.waiting_equipment_id ? "รอรหัส" : "-")}
                        disabled
                        className={`bg-muted ${selectedReceipt.waiting_equipment_id ? 'text-warning' : !selectedReceipt.equipment_id_code ? 'text-muted-foreground' : ''}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>ค่าเสื่อมราคา (เดือน)</Label>
                      <Input 
                        value={selectedReceipt.depreciation_months?.toString() || "-"}
                        disabled
                        className={`bg-muted ${!selectedReceipt.depreciation_months ? 'text-muted-foreground' : ''}`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Expiry Date & Warranty Expiry Date - Read Only */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>วันหมดอายุ</Label>
                  <Input 
                    value={selectedReceipt.expiry_date ? format(new Date(selectedReceipt.expiry_date), "dd/MM/yyyy") : "-"}
                    disabled
                    className={`bg-muted ${!selectedReceipt.expiry_date ? 'text-muted-foreground' : ''}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label>วันสิ้นสุดการรับประกัน</Label>
                  <Input 
                    value={selectedReceipt.warranty_expiry_date ? format(new Date(selectedReceipt.warranty_expiry_date), "dd/MM/yyyy") : "-"}
                    disabled
                    className={`bg-muted ${!selectedReceipt.warranty_expiry_date ? 'text-muted-foreground' : ''}`}
                  />
                </div>
              </div>

              {/* Notes from Delivery - Read Only (Always Show) */}
              <div className="space-y-2">
                <Label>หมายเหตุจากผู้นำเข้า</Label>
                <Textarea 
                  value={selectedReceipt.notes || "-"}
                  disabled
                  className={`bg-muted ${!selectedReceipt.notes ? 'text-muted-foreground' : ''}`}
                  rows={2}
                />
              </div>

              {/* Document Links */}
              {(selectedReceipt.document_url || selectedReceipt.purchase_document_url) && (
                <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                  <p className="text-sm font-medium text-foreground">เอกสารแนบ</p>
                  <div className="flex gap-4 text-sm">
                    {selectedReceipt.document_url && (
                      <a 
                        href={selectedReceipt.document_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        📎 เอกสารนำส่ง
                      </a>
                    )}
                    {selectedReceipt.purchase_document_url && (
                      <a 
                        href={selectedReceipt.purchase_document_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        📎 เอกสาร PO/PR
                      </a>
                    )}
                  </div>
                </div>
              )}

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
                      <span className="font-medium">{selectedReceipt.storage_width_cm || 0} m</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">สูง: </span>
                      <span className="font-medium">{selectedReceipt.storage_height_cm || 0} m</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ลึก: </span>
                      <span className="font-medium">{selectedReceipt.storage_depth_cm || 0} m</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ปริมาตร: </span>
                      <span className="font-medium text-primary">
                        {selectedReceipt.storage_volume_cm3?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 0} m³
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Warehouse Selection */}
              <div className="space-y-2">
                <Label>คลังสินค้า *</Label>
                <SearchableSelect
                  options={warehouses.map((wh) => ({
                    value: wh.id,
                    label: `${wh.code} - ${wh.name}`,
                    description: `คงเหลือ: ${wh.remaining_volume_cm3.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m³`,
                  }))}
                  value={selectedWarehouseId}
                  onValueChange={handleWarehouseChange}
                  placeholder="ค้นหาคลังสินค้า..."
                  searchPlaceholder="พิมพ์ค้นหา..."
                  emptyMessage="ไม่พบคลังสินค้า"
                />
                {selectedWarehouseId && (
                  <div className="text-xs text-muted-foreground">
                    {(() => {
                      const wh = warehouses.find(w => w.id === selectedWarehouseId);
                      if (wh) {
                        return (
                          <span>
                            พื้นที่คงเหลือของคลัง: <span className="font-medium text-success">{wh.remaining_volume_cm3.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m³</span>
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
                  <SearchableSelect
                    options={filteredLocations.map((loc) => {
                      const remaining = (loc.volume_cm3 || 0) - (loc.used_volume_cm3 || 0);
                      return {
                        value: loc.id,
                        label: `${loc.code} - ${loc.name}`,
                        description: `คงเหลือ: ${remaining.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} m³`,
                      };
                    })}
                    value={storageLocation.locationId}
                    onValueChange={handleLocationChange}
                    placeholder="ค้นหาตำแหน่งจัดเก็บ..."
                    searchPlaceholder="พิมพ์ค้นหา..."
                    emptyMessage="ไม่มีตำแหน่งจัดเก็บในคลังนี้"
                  />
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
                          {locationCapacity.remaining_volume_cm3?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m³
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
                  ขนาดพื้นที่ที่ต้องการใช้ (m³)
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

              {/* Item Condition */}
              <div className="space-y-2">
                <Label>สถานะการใช้งาน *</Label>
                <Select value={itemCondition} onValueChange={setItemCondition}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">ใช้งานปกติ</SelectItem>
                    <SelectItem value="defective">เสีย/ชำรุด</SelectItem>
                    <SelectItem value="pending_inspection">รอตรวจสอบการใช้งาน</SelectItem>
                  </SelectContent>
                </Select>
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

      {/* Batch Receive Dialog */}
      <Dialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              รับสินค้าเข้าคลังพร้อมกัน ({batchReceipts.length} รายการ)
            </DialogTitle>
            <DialogDescription>
              เลือกตำแหน่งจัดเก็บสำหรับสินค้าทั้งหมดที่เลือก
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Items Summary */}
            <div className="p-3 bg-muted/30 rounded-lg space-y-2">
              <p className="text-sm font-medium text-foreground">รายการที่เลือก:</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {batchReceipts.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">#{index + 1}</span>
                    <span className="flex-1 ml-2 truncate">{item.equipment_name || item.equipment_code || "-"}</span>
                    <span className="font-medium">{item.quantity} {item.unit}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t flex justify-between">
                <span className="font-medium">รวมทั้งหมด:</span>
                <span className="font-semibold text-primary">
                  {batchReceipts.reduce((sum, item) => sum + item.quantity, 0)} รายการ
                </span>
              </div>
            </div>

            {/* Warehouse Selection */}
            <div className="space-y-2">
              <Label>คลังสินค้า *</Label>
              <SearchableSelect
                options={warehouses.map((wh) => ({
                  value: wh.id,
                  label: `${wh.code} - ${wh.name}`,
                  description: `คงเหลือ: ${wh.remaining_volume_cm3.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m³`,
                }))}
                value={selectedWarehouseId}
                onValueChange={handleWarehouseChange}
                placeholder="ค้นหาคลังสินค้า..."
                searchPlaceholder="พิมพ์ค้นหา..."
                emptyMessage="ไม่พบคลังสินค้า"
              />
            </div>

            {/* Location Selection (filtered by warehouse) */}
            {selectedWarehouseId && (
              <div className="space-y-2">
                <Label>ตำแหน่งจัดเก็บ *</Label>
                <SearchableSelect
                  options={filteredLocations.map((loc) => {
                    const remaining = (loc.volume_cm3 || 0) - (loc.used_volume_cm3 || 0);
                    return {
                      value: loc.id,
                      label: `${loc.code} - ${loc.name}`,
                      description: `คงเหลือ: ${remaining.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} m³`,
                    };
                  })}
                  value={storageLocation.locationId}
                  onValueChange={handleLocationChange}
                  placeholder="ค้นหาตำแหน่งจัดเก็บ..."
                  searchPlaceholder="พิมพ์ค้นหา..."
                  emptyMessage="ไม่มีตำแหน่งจัดเก็บในคลังนี้"
                />
              </div>
            )}

            {/* Item Condition */}
            <div className="space-y-2">
              <Label>สถานะการใช้งาน *</Label>
              <Select value={itemCondition} onValueChange={setItemCondition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">ใช้งานปกติ</SelectItem>
                  <SelectItem value="defective">เสีย/ชำรุด</SelectItem>
                  <SelectItem value="pending_inspection">รอตรวจสอบการใช้งาน</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>หมายเหตุ (สำหรับทุกรายการ)</Label>
              <Textarea 
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={2}
                placeholder="หมายเหตุจะถูกบันทึกให้กับทุกรายการที่เลือก"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBatchDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleBatchReceive} disabled={isLoading}>
              {isLoading ? "กำลังบันทึก..." : `รับเข้าคลัง ${batchReceipts.length} รายการ`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">ปฏิเสธรายการสินค้า</DialogTitle>
            <DialogDescription>
              กรุณาระบุเหตุผลในการปฏิเสธรายการนี้
            </DialogDescription>
          </DialogHeader>

          {rejectReceipt && (
            <div className="space-y-4 py-4">
              {/* Item Info */}
              <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                <p className="font-medium">{rejectReceipt.equipment_name || rejectReceipt.equipment_code || "-"}</p>
                <div className="text-sm text-muted-foreground">
                  <span>จำนวน: {rejectReceipt.quantity} {rejectReceipt.unit}</span>
                  <span className="mx-2">•</span>
                  <span>เอกสาร: {rejectReceipt.document_no}</span>
                </div>
              </div>

              {/* Reject Reason */}
              <div className="space-y-2">
                <Label>เหตุผลในการปฏิเสธ *</Label>
                <Textarea 
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="ระบุเหตุผล เช่น สินค้าไม่ตรงตาม PO, สินค้าชำรุด, จำนวนไม่ตรง..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject} 
              disabled={isLoading}
            >
              {isLoading ? "กำลังบันทึก..." : "ยืนยันปฏิเสธ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReceiveGoods;
