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
import { DocumentPreviewDialog, DocumentCategory } from "@/components/DocumentPreviewDialog";

const isImageUrl = (url: string) => /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url);
const splitUrls = (combined: string | null | undefined): string[] =>
  !combined ? [] : combined.split(",").map((s) => s.trim()).filter(Boolean);
const buildReceiptCategories = (r: any): DocumentCategory[] => {
  const poUrls = splitUrls(r?.po_document_url);
  const prUrls = splitUrls(r?.pr_document_url);
  const invoiceUrls = splitUrls(r?.invoice_document_url);
  const dnUrls = splitUrls(r?.delivery_note_document_url);
  const known = new Set([...poUrls, ...prUrls, ...invoiceUrls, ...dnUrls].map((u) => u.trim()).filter(Boolean));
  const all = splitUrls(r?.document_url).filter((u) => !known.has(u.trim()));
  const docs = all.filter((u) => !isImageUrl(u));
  const images = all.filter((u) => isImageUrl(u));

  const cats: DocumentCategory[] = [];
  if (poUrls.length > 0) cats.push({ label: "เลข PO", urls: poUrls });
  if (prUrls.length > 0) cats.push({ label: "เลข PR", urls: prUrls });
  if (invoiceUrls.length > 0) cats.push({ label: "Invoice No.", urls: invoiceUrls });
  if (dnUrls.length > 0) cats.push({ label: "ใบส่งของ", urls: dnUrls });
  if (docs.length > 0) cats.push({ label: "เอกสารแนบเพิ่มเติม", urls: docs });
  if (images.length > 0) cats.push({ label: "รูปภาพเพิ่มเติม", urls: images });
  return cats;
};

const getReceiptPoDocumentUrl = (r: any): string | null => {
  const poUrls = splitUrls(r?.po_document_url);
  if (poUrls.length > 0) return poUrls.join(", ");
  const invoiceUrls = new Set(splitUrls(r?.invoice_document_url));
  const prUrls = new Set(splitUrls(r?.pr_document_url));
  const dnUrls = new Set(splitUrls(r?.delivery_note_document_url));
  const legacyPo = splitUrls(r?.purchase_document_url).find((url) => !invoiceUrls.has(url) && !prUrls.has(url) && !dnUrls.has(url));
  return legacyPo || null;
};

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

/**
 * Resolve which media_players row this receipt should land in.
 * Rule (mem://data-model/media-player-unit-individualization):
 * 1 master code → many rows (1 per physical unit, each with its own S/N).
 *
 * - ถ้า master row ยังว่าง (quantity=0 และยังไม่มี serial_number_1) → ใช้ row เดิม (เคสรับครั้งแรก)
 * - ถ้า master row มีของอยู่แล้ว → CLONE row ใหม่ (copy ฟิลด์ identity) เพื่อให้ S/N ใหม่ไม่ทับของเดิม
 * แล้ว re-point goods_receipt_pending.media_player_id ให้ชี้ row ใหม่ เพื่อ trace ย้อนได้
 */
async function resolveMediaPlayerRowForReceipt(
  currentMpId: string,
  pendingReceiptId: string
): Promise<{ mpId: string; cloned: boolean; code: string; name: string }> {
  const { data: master, error } = await supabase
    .from("media_players")
    .select("*")
    .eq("id", currentMpId)
    .single();
  if (error || !master) throw error || new Error("media_player not found");

  const hasSN = !!((master as any).serial_number_1 && String((master as any).serial_number_1).trim());
  const qty = Number((master as any).quantity) || 0;

  if (qty === 0 && !hasSN) {
    return { mpId: currentMpId, cloned: false, code: (master as any).code, name: (master as any).name };
  }

  const m: any = master;
  const clonePayload: Record<string, any> = {
    code: m.code,
    name: m.name,
    description: m.description,
    cms_type_id: m.cms_type_id,
    specification: m.specification,
    brand: m.brand,
    model_id: m.model_id,
    unit: m.unit,
    is_asset: m.is_asset,
    is_active: true,
    status: "active",
    quantity: 0,
    image_url: m.image_url,
    notes: m.notes,
    created_by: m.created_by,
    device_type: m.device_type || "MEDIA_PLAYER",
    sub_media_type: m.sub_media_type,
    department: m.department,
  };
  const { data: inserted, error: insErr } = await supabase
    .from("media_players")
    .insert([clonePayload as any])
    .select("id, code, name")
    .single();
  if (insErr || !inserted) throw insErr || new Error("clone failed");

  await supabase
    .from("goods_receipt_pending")
    .update({ media_player_id: (inserted as any).id })
    .eq("id", pendingReceiptId);

  return {
    mpId: (inserted as any).id,
    cloned: true,
    code: (inserted as any).code,
    name: (inserted as any).name,
  };
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
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [previewCategories, setPreviewCategories] = useState<DocumentCategory[] | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>("ดูเอกสารแนบ");
  const [editAssetCode, setEditAssetCode] = useState("");
  const [editEquipmentIdCode, setEditEquipmentIdCode] = useState("");
  const [editCaretaker, setEditCaretaker] = useState("");
  const [editPlannedLocation, setEditPlannedLocation] = useState("");
  const [editSerial1, setEditSerial1] = useState("");
  const [editSerial2, setEditSerial2] = useState("");
  const [editLot1, setEditLot1] = useState("");
  const [editLot2, setEditLot2] = useState("");
  const [editUnitPrice, setEditUnitPrice] = useState("");

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
      // Auto-link by equipment_code: ถ้ารหัสตรงกับ MP หรือ Equipment ที่มีในระบบ
      // ให้เติม media_player_id / equipment_id และ flag is_media_player ให้ถูกต้อง
      // เพื่อป้องกันการแสดง "สินค้าใหม่" ผิดพลาดเมื่อรหัสซ้ำกับของในระบบ
      const codes = Array.from(
        new Set((data as any[]).map((r) => r.equipment_code).filter(Boolean))
      );
      const mpMap = new Map<string, string>();
      const eqMap = new Map<string, string>();
      if (codes.length > 0) {
        const [{ data: mps }, { data: eqs }] = await Promise.all([
          supabase.from("media_players").select("id, code").in("code", codes),
          supabase.from("equipment").select("id, code").in("code", codes),
        ]);
        (mps || []).forEach((m: any) => {
          if (!mpMap.has(m.code)) mpMap.set(m.code, m.id);
        });
        (eqs || []).forEach((e: any) => {
          if (!eqMap.has(e.code)) eqMap.set(e.code, e.id);
        });
      }
      const enriched = (data as any[]).map((r) => {
        const code = r.equipment_code;
        if (!code) return r;
        const mpId = mpMap.get(code);
        const eqId = eqMap.get(code);
        if (mpId && !r.media_player_id) {
          return { ...r, media_player_id: mpId, is_media_player: true };
        }
        if (eqId && !r.equipment_id) {
          return { ...r, equipment_id: eqId };
        }
        return r;
      });
      setPendingReceipts(enriched as unknown as PendingReceipt[]);
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
    setEditAssetCode(receipt.asset_code || "");
    setEditEquipmentIdCode(receipt.equipment_id_code || "");
    setEditCaretaker((receipt as any).asset_caretaker || "");
    setEditPlannedLocation((receipt as any).planned_install_location || "");
    setEditSerial1(receipt.serial_number || "");
    setEditSerial2((receipt as any).serial_number_2 || "");
    setEditLot1(receipt.lot_number || "");
    setEditLot2(receipt.lot_number_2 || "");
    setEditUnitPrice(receipt.unit_price != null ? String(receipt.unit_price) : "");
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
      .from("goods_receipt_pending" as any)
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

      // Update pending receipt status (และ persist รหัสทรัพย์สิน/อุปกรณ์ที่ผู้รับเข้ากรอก)
      const trimmedAssetCode = editAssetCode.trim();
      const trimmedEquipmentIdCode = editEquipmentIdCode.trim();
      const trimmedSerial1 = editSerial1.trim();
      const trimmedSerial2 = editSerial2.trim();
      const trimmedLot1 = editLot1.trim();
      const trimmedLot2 = editLot2.trim();
      const parsedUnitPrice = editUnitPrice.trim() === "" ? null : Number(editUnitPrice);
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
          storage_volume_cm3: storageVolumeValue,
          serial_number: trimmedSerial1 || null,
          serial_number_2: trimmedSerial2 || null,
          lot_number: trimmedLot1 || null,
          lot_number_2: trimmedLot2 || null,
          unit_price: parsedUnitPrice,
          asset_caretaker: editCaretaker.trim() || null,
          planned_install_location: editPlannedLocation.trim() || null,
          ...(selectedReceipt.is_asset
            ? {
                asset_code: trimmedAssetCode || null,
                equipment_id_code: trimmedEquipmentIdCode || null,
                waiting_asset_code: trimmedAssetCode ? false : selectedReceipt.waiting_asset_code,
                waiting_equipment_id: trimmedEquipmentIdCode ? false : selectedReceipt.waiting_equipment_id,
              }
            : {}),
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
        // Resolve target row: reuse empty master, otherwise clone a new unit row
        const resolved = await resolveMediaPlayerRowForReceipt(
          (selectedReceipt as any).media_player_id,
          selectedReceipt.id
        );
        const targetMpId = resolved.mpId;

        // Each MP receipt = 1 unit per row (One Code → Many Units rule)
        const mpDeptName = getDepartmentName(selectedReceipt.department_id);
        const mpUpdatePayload: Record<string, any> = {
                quantity: 1,
                location_id: storageLocation.locationId,
                item_condition: itemCondition,
                status: "active",
              };

        if (trimmedSerial1) {
          mpUpdatePayload.serial_number_1 = trimmedSerial1;
        }
        if (trimmedSerial2) {
          mpUpdatePayload.serial_number_2 = trimmedSerial2;
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
        if (parsedUnitPrice != null) mpUpdatePayload.unit_price = parsedUnitPrice;
        if (sr.received_at) mpUpdatePayload.date_of_receipt = String(sr.received_at).slice(0, 10);
        else mpUpdatePayload.date_of_receipt = new Date().toISOString().slice(0, 10);
        if (sr.po_number) mpUpdatePayload.po_number = sr.po_number;
        if (sr.pr_number) mpUpdatePayload.pr_number = sr.pr_number;
        if (sr.invoice_number) mpUpdatePayload.invoice_number = sr.invoice_number;
        if (sr.depreciation_months != null) mpUpdatePayload.depreciation_months = sr.depreciation_months;
        if (sr.warranty_expiry_date) mpUpdatePayload.warranty_expiry_date = sr.warranty_expiry_date;
        const singlePoDocumentUrl = getReceiptPoDocumentUrl(sr);
        if (singlePoDocumentUrl) mpUpdatePayload.po_document_url = singlePoDocumentUrl;
        if (sr.pr_document_url) mpUpdatePayload.pr_document_url = sr.pr_document_url;
        if (sr.invoice_document_url) mpUpdatePayload.invoice_document_url = sr.invoice_document_url;
        if (sr.delivery_note_number) mpUpdatePayload.delivery_note_number = sr.delivery_note_number;
        if (sr.delivery_note_document_url) mpUpdatePayload.delivery_note_document_url = sr.delivery_note_document_url;
        if (sr.order_for_project) mpUpdatePayload.order_for_project = sr.order_for_project;
        if (sr.activate_windows) mpUpdatePayload.activate_windows = sr.activate_windows;
        if (sr.remote_name) mpUpdatePayload.remote_name = sr.remote_name;
        if (sr.specification) mpUpdatePayload.specification = sr.specification;
        if (sr.usage_lifespan_months != null) mpUpdatePayload.usage_lifespan_months = sr.usage_lifespan_months;
        const finalAssetCode = trimmedAssetCode || sr.asset_code;
        const finalEquipmentIdCode = trimmedEquipmentIdCode || sr.equipment_id_code;
        if (finalAssetCode) mpUpdatePayload.asset_code = finalAssetCode;
        if (finalEquipmentIdCode) mpUpdatePayload.equipment_id_code = finalEquipmentIdCode;
        const finalCaretaker = editCaretaker.trim() || (sr as any).asset_caretaker;
        const finalPlannedLocation = editPlannedLocation.trim() || (sr as any).planned_install_location;
        if (finalCaretaker) mpUpdatePayload.asset_caretaker = finalCaretaker;
        if (finalPlannedLocation) mpUpdatePayload.planned_install_location = finalPlannedLocation;
        if ((sr as any).po_item_no) mpUpdatePayload.po_item_no = (sr as any).po_item_no;
        if ((sr as any).warranty_years != null) mpUpdatePayload.warranty_years = (sr as any).warranty_years;
        if ((sr as any).sub_media_type) mpUpdatePayload.sub_media_type = (sr as any).sub_media_type;

        const { error: mpError } = await supabase
              .from("media_players")
              .update(mpUpdatePayload as never)
              .eq("id", targetMpId);

        if (mpError) {
          console.error("Media Player update error:", mpError);
          toast.warning("รับสินค้าสำเร็จแต่ไม่สามารถอัปเดต Stock Media Player ได้");
        } else {
          // Log stock movement for Media Player (always 0 → 1 per unit row)
              await logStockMovement({
                equipment_id: targetMpId,
                equipment_code: resolved.code || selectedReceipt.equipment_code || "",
                equipment_name: resolved.name || selectedReceipt.equipment_name || "",
                movement_type: "receive",
                quantity: 1,
                stock_before: 0,
                stock_after: 1,
                reference_type: "goods_receipt",
                reference_document: selectedReceipt.document_no,
                location_id: storageLocation.locationId,
                notes: `Media Player${resolved.cloned ? " (clone per S/N)" : ""} - ${editNotes || ""}`.trim(),
                item_condition: itemCondition,
              });
          toast.success(
            resolved.cloned
              ? `รับ Media Player เข้าคลังสำเร็จ (สร้างแถวใหม่ 1 เครื่อง — S/N ${trimmedSerial1 || "-"})`
              : `รับ Media Player เข้าคลังสำเร็จ (S/N ${trimmedSerial1 || "-"})`
          );
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
            unit_price: parsedUnitPrice ?? selectedReceipt.unit_price ?? null
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

        if (trimmedSerial1) {
          eqUpdatePayload.serial_number = trimmedSerial1;
        }

        if (eqDeptName) {
          eqUpdatePayload.department = eqDeptName;
        }
        if ((selectedReceipt as any).po_item_no) eqUpdatePayload.po_item_no = (selectedReceipt as any).po_item_no;
        if ((selectedReceipt as any).warranty_years != null) eqUpdatePayload.warranty_years = (selectedReceipt as any).warranty_years;
        const { error: stockError } = await supabase
          .from("equipment")
          .update(eqUpdatePayload as never)
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
            // Resolve target row: reuse empty master, otherwise clone a new unit row
            const resolved = await resolveMediaPlayerRowForReceipt(
              (receipt as any).media_player_id,
              receipt.id
            );
            const targetMpId = resolved.mpId;

            const batchMpDept = getDepartmentName(receipt.department_id);
            const batchMpPayload: Record<string, any> = {
                quantity: 1,
                location_id: storageLocation.locationId,
                item_condition: itemCondition,
                status: "active",
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

            // Propagate purchase / financial / document fields from receipt → master
            // Receipt is the authoritative source for these (overwrite if provided)
            const br: any = receipt;
            if (br.supplier_id) batchMpPayload.supplier_id = br.supplier_id;
            if (br.company_id) batchMpPayload.company_id = br.company_id;
            if (br.unit_price != null) batchMpPayload.unit_price = br.unit_price;
            if (br.received_at) batchMpPayload.date_of_receipt = String(br.received_at).slice(0, 10);
            else batchMpPayload.date_of_receipt = new Date().toISOString().slice(0, 10);
            if (br.po_number) batchMpPayload.po_number = br.po_number;
            if (br.pr_number) batchMpPayload.pr_number = br.pr_number;
            if (br.invoice_number) batchMpPayload.invoice_number = br.invoice_number;
            if (br.depreciation_months != null) batchMpPayload.depreciation_months = br.depreciation_months;
            if (br.warranty_expiry_date) batchMpPayload.warranty_expiry_date = br.warranty_expiry_date;
            const batchPoDocumentUrl = getReceiptPoDocumentUrl(br);
            if (batchPoDocumentUrl) batchMpPayload.po_document_url = batchPoDocumentUrl;
            if (br.pr_document_url) batchMpPayload.pr_document_url = br.pr_document_url;
            if (br.invoice_document_url) batchMpPayload.invoice_document_url = br.invoice_document_url;
            if (br.delivery_note_number) batchMpPayload.delivery_note_number = br.delivery_note_number;
            if (br.delivery_note_document_url) batchMpPayload.delivery_note_document_url = br.delivery_note_document_url;
            if (br.order_for_project) batchMpPayload.order_for_project = br.order_for_project;
            if (br.activate_windows) batchMpPayload.activate_windows = br.activate_windows;
            if (br.remote_name) batchMpPayload.remote_name = br.remote_name;
            if (br.specification) batchMpPayload.specification = br.specification;
            if (br.usage_lifespan_months != null) batchMpPayload.usage_lifespan_months = br.usage_lifespan_months;
            if (br.asset_code) batchMpPayload.asset_code = br.asset_code;
            if (br.equipment_id_code) batchMpPayload.equipment_id_code = br.equipment_id_code;
            if (br.asset_caretaker) batchMpPayload.asset_caretaker = br.asset_caretaker;
            if (br.planned_install_location) batchMpPayload.planned_install_location = br.planned_install_location;
            if (br.po_item_no) batchMpPayload.po_item_no = br.po_item_no;
            if (br.warranty_years != null) batchMpPayload.warranty_years = br.warranty_years;
            if (br.sub_media_type) batchMpPayload.sub_media_type = br.sub_media_type;

            const { error: mpError } = await supabase
              .from("media_players")
              .update(batchMpPayload as never)
              .eq("id", targetMpId);

            if (!mpError) {
              // Log stock movement for Media Player (always 0 → 1 per unit row)
              await logStockMovement({
                equipment_id: targetMpId,
                equipment_code: resolved.code || receipt.equipment_code || "",
                equipment_name: resolved.name || receipt.equipment_name || "",
                movement_type: "receive",
                quantity: 1,
                stock_before: 0,
                stock_after: 1,
                reference_type: "goods_receipt",
                reference_document: receipt.document_no,
                location_id: storageLocation.locationId,
                notes: `Media Player${resolved.cloned ? " (clone per S/N)" : ""} - ${editNotes || ""}`.trim(),
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
              .update(batchEqPayload as never)
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
                  <p><span className="text-muted-foreground">จำนวน:</span> {receiptDetail.quantity} {(receiptDetail as any).is_media_player ? "เครื่อง" : receiptDetail.unit}</p>
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
                    value={(() => {
                      const baseName = selectedReceipt.equipment_code 
                        ? `${selectedReceipt.equipment_code} - ${selectedReceipt.equipment_name || ""}` 
                        : selectedReceipt.equipment_name || "-";
                      const poItem = (selectedReceipt as any).po_item_no;
                      return poItem ? `${baseName}  •  Item No.: ${poItem}` : baseName;
                    })()}
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
                {((selectedReceipt as any).po_item_no || (selectedReceipt as any).warranty_years != null) && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {(selectedReceipt as any).po_item_no && (
                      <Badge variant="outline" className="font-mono">Item No.: {(selectedReceipt as any).po_item_no}</Badge>
                    )}
                    {(selectedReceipt as any).warranty_years != null && (
                      <Badge variant="outline">ระยะรับประกัน: {(selectedReceipt as any).warranty_years} ปี</Badge>
                    )}
                  </div>
                )}

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
                          .update(updatePayload as never)
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

              {/* Lot Number 1, Lot Number 2, Serial Number 1/2 & Unit Price - Editable by warehouse */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Lot Number 1</Label>
                  <Input
                    value={editLot1}
                    onChange={(e) => setEditLot1(e.target.value)}
                    placeholder="-"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lot Number 2</Label>
                  <Input
                    value={editLot2}
                    onChange={(e) => setEditLot2(e.target.value)}
                    placeholder="-"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Serial Number 1</Label>
                  <Input
                    value={editSerial1}
                    onChange={(e) => setEditSerial1(e.target.value)}
                    placeholder="กรอก S/N 1..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Serial Number 2</Label>
                  <Input
                    value={editSerial2}
                    onChange={(e) => setEditSerial2(e.target.value)}
                    placeholder="กรอก S/N 2..."
                  />
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label>ราคาต่อชิ้น</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editUnitPrice}
                    onChange={(e) => setEditUnitPrice(e.target.value)}
                    placeholder="0.00"
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
                      <Label>รหัสทรัพย์สิน {selectedReceipt.waiting_asset_code && <span className="text-warning text-xs">(รอกรอก)</span>}</Label>
                      <Input
                        value={editAssetCode}
                        onChange={(e) => setEditAssetCode(e.target.value)}
                        placeholder={selectedReceipt.waiting_asset_code ? "กรอกรหัสทรัพย์สิน..." : "-"}
                        className={selectedReceipt.waiting_asset_code && !editAssetCode ? "border-warning" : ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>รหัสอุปกรณ์ {selectedReceipt.waiting_equipment_id && <span className="text-warning text-xs">(รอกรอก)</span>}</Label>
                      <Input
                        value={editEquipmentIdCode}
                        onChange={(e) => setEditEquipmentIdCode(e.target.value)}
                        placeholder={selectedReceipt.waiting_equipment_id ? "กรอกรหัสอุปกรณ์..." : "-"}
                        className={selectedReceipt.waiting_equipment_id && !editEquipmentIdCode ? "border-warning" : ""}
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>ผู้ดูแลทรัพย์สิน</Label>
                      <Input
                        value={editCaretaker}
                        onChange={(e) => setEditCaretaker(e.target.value)}
                        placeholder="ชื่อผู้ดูแล..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Location ตามแผน PO</Label>
                      <Input
                        value={editPlannedLocation}
                        onChange={(e) => setEditPlannedLocation(e.target.value)}
                        placeholder="ตำแหน่งติดตั้งตามแผน..."
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

              {/* Document Links - unified category preview */}
              <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                <p className="text-sm font-medium text-foreground">เอกสารแนบ</p>
                <div className="flex gap-3 text-sm flex-wrap">
                  {(() => {
                    const cats = buildReceiptCategories(selectedReceipt);
                    const totalFiles = cats.reduce((s, c) => s + (Array.isArray(c.urls) ? c.urls.length : (c.urls ? splitUrls(c.urls as string).length : 0)), 0);
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewCategories(cats);
                          setPreviewTitle("ดูเอกสารแนบ");
                        }}
                        className="text-primary hover:underline cursor-pointer flex items-center gap-1"
                      >
                        📎 ดูเอกสารทั้งหมด ({totalFiles}/{cats.length})
                      </button>
                    );
                  })()}
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
                    <SelectItem value="normal">ปกติ</SelectItem>
                    <SelectItem value="defective">เสีย/ชำรุด</SelectItem>
                    <SelectItem value="pending_inspection">รอตรวจสอบ</SelectItem>
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
                    <span className="font-medium">{item.quantity} {(item as any).is_media_player ? "เครื่อง" : item.unit}</span>
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
                  <SelectItem value="normal">ปกติ</SelectItem>
                  <SelectItem value="defective">เสีย/ชำรุด</SelectItem>
                  <SelectItem value="pending_inspection">รอตรวจสอบ</SelectItem>
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
                  <span>จำนวน: {rejectReceipt.quantity} {(rejectReceipt as any).is_media_player ? "เครื่อง" : rejectReceipt.unit}</span>
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

      <DocumentPreviewDialog
        open={!!previewDocUrl || !!previewCategories}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewDocUrl(null);
            setPreviewCategories(null);
          }
        }}
        publicUrl={previewCategories ? null : previewDocUrl}
        categories={previewCategories || undefined}
        title={previewTitle}
      />
    </div>
  );
};

export default ReceiveGoods;
