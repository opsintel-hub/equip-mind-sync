import { useState } from "react";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";


import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Package, Clock, CheckCircle, XCircle, MapPin, AlertTriangle, Calendar, Image, Warehouse, ChevronDown, ChevronUp, ShoppingCart, Hash } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { th } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import BillboardDisplay from "@/components/billboard/BillboardDisplay";
import BillboardSelect from "@/components/billboard/BillboardSelect";
import { logStockMovement } from "@/lib/stockMovement";
import { SerialNumberSelect, SerialNumberItem } from "@/components/equipment/SerialNumberSelect";

interface EquipmentWithDetails {
  id: string;
  code: string;
  name: string;
  quantity_in_stock: number;
  serial_number: string | null;
  expiry_date: string | null;
  warranty_expiry_date: string | null;
  warehouse_entry_date: string;
}

interface PendingRequest {
  id: string;
  document_no: string;
  equipment_id: string | null;
  equipment_code: string | null;
  equipment_name: string | null;
  company_id: string | null;
  quantity: number;
  unit: string;
  purpose: string | null;
  destination: string | null;
  requester_name: string;
  requester_phone: string | null;
  requester_department: string | null;
  notes: string | null;
  status: string;
  issued_quantity: number | null;
  remaining_quantity: number | null;
  partial_issue_count: number | null;
  last_partial_issue_at: string | null;
  created_at: string;
  billboard_id: string | null;
  total_items: number | null;
}

interface PendingItem {
  id: string;
  pending_id: string;
  equipment_id: string | null;
  equipment_code: string | null;
  equipment_name: string | null;
  quantity: number;
  unit: string;
  serial_number: string | null;
  billboard_id: string | null;
  issued_quantity: number | null;
  remaining_quantity: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  is_media_player?: boolean | null;
  media_player_id?: string | null;
}

const IssueGoods = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [snSearchTerm, setSnSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [selectedItem, setSelectedItem] = useState<PendingItem | null>(null);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [itemIssueDialogOpen, setItemIssueDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  const [issueData, setIssueData] = useState({
    issued_quantity: "",
    notes: "",
    billboard_id: "",
    serial_number: "",
    serial_number_source: "",
  });
  // Per-unit S/N + Billboard assignments (non-Media Player items support multi-unit)
  const [unitAssignments, setUnitAssignments] = useState<Array<{
    serial_number: string;
    serial_number_source: string;
    billboard_id: string;
  }>>([]);
  // Per-unit MP assignments (one media_player_id + S/N + optional billboard per unit)
  const [mpUnitAssignments, setMpUnitAssignments] = useState<Array<{
    media_player_id: string;
    serial_number: string;
    billboard_id: string;
  }>>([]);
  const [rejectReason, setRejectReason] = useState("");
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedEquipmentImages, setSelectedEquipmentImages] = useState<string[]>([]);
  const [selectedEquipmentName, setSelectedEquipmentName] = useState("");

  // Fetch pending requests with company info
  const { data: pendingRequests, isLoading } = useQuery({
    queryKey: ["goods-issue-pending-staff"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_issue_pending")
        .select("*, companies(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Show all (including pending_approval) for visibility; the จ่าย button is gated by status === "pending"
      return (data as (PendingRequest & { companies: { name: string } | null })[]);
    },
  });

  // Fetch pending items
  const { data: pendingItems } = useQuery({
    queryKey: ["goods-issue-pending-items-staff"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_issue_pending_items")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PendingItem[];
    },
  });

  // Fetch equipment for validation with full details including location
  const { data: equipment } = useQuery({
    queryKey: ["equipment-active-details"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select(`
          id, code, name, quantity_in_stock, serial_number, expiry_date, warranty_expiry_date, warehouse_entry_date, location_id,
          locations(id, name, code, warehouse_id, warehouses(id, name, code))
        `)
        .eq("is_active", true)
        .order("warehouse_entry_date", { ascending: true });
      if (error) throw error;
      return data as (EquipmentWithDetails & { 
        location_id: string | null; 
        locations: { id: string; name: string; code: string; warehouse_id: string | null; warehouses: { id: string; name: string; code: string } | null } | null 
      })[];
    },
  });

  // Fetch available Media Player units (in stock) for multi-unit issuance
  const { data: availableMpUnits } = useQuery({
    queryKey: ["available-media-player-units"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_players")
        .select("id, code, name, serial_number_1, serial_number_2, quantity, billboard_id, location_id, locations(id, name, code, warehouses(id, name, code))")
        .eq("is_active", true)
        .gt("quantity", 0);
      if (error) throw error;
      return data as any[];
    },
  });

  // State for item rejection
  const [itemRejectDialogOpen, setItemRejectDialogOpen] = useState(false);
  const [selectedItemForReject, setSelectedItemForReject] = useState<PendingItem | null>(null);
  const [itemRejectReason, setItemRejectReason] = useState("");

  const getItemsForRequest = (requestId: string) => {
    return pendingItems?.filter(item => item.pending_id === requestId) || [];
  };

  // Get location info for an item's equipment
  const getLocationInfoForItem = (equipmentId: string | null) => {
    if (!equipmentId) return null;
    const eq = equipment?.find((e) => e.id === equipmentId);
    if (!eq?.locations) return null;
    return {
      warehouseName: eq.locations.warehouses?.name || "-",
      warehouseCode: eq.locations.warehouses?.code || "-",
      locationName: eq.locations.name,
      locationCode: eq.locations.code,
    };
  };

  const toggleRequestExpand = (requestId: string) => {
    const newExpanded = new Set(expandedRequests);
    if (newExpanded.has(requestId)) {
      newExpanded.delete(requestId);
    } else {
      newExpanded.add(requestId);
    }
    setExpandedRequests(newExpanded);
  };

  const getExpiryInfo = (equipmentId: string | null) => {
    if (!equipmentId) return null;
    const eq = equipment?.find((e) => e.id === equipmentId);
    if (!eq) return null;
    
    const today = new Date();
    const info: { 
      expiry?: { days: number; date: string }; 
      warranty?: { days: number; date: string }; 
      serialNumber?: string; 
      ageDays: number;
      locationInfo?: { warehouseName: string; warehouseCode: string; locationName: string; locationCode: string };
    } = {
      ageDays: differenceInDays(today, new Date(eq.warehouse_entry_date)),
      serialNumber: eq.serial_number || undefined,
    };
    
    if (eq.locations) {
      info.locationInfo = {
        warehouseName: eq.locations.warehouses?.name || "-",
        warehouseCode: eq.locations.warehouses?.code || "-",
        locationName: eq.locations.name,
        locationCode: eq.locations.code,
      };
    }
    
    if (eq.expiry_date) {
      const days = differenceInDays(new Date(eq.expiry_date), today);
      info.expiry = { days, date: eq.expiry_date };
    }
    if (eq.warranty_expiry_date) {
      const days = differenceInDays(new Date(eq.warranty_expiry_date), today);
      info.warranty = { days, date: eq.warranty_expiry_date };
    }
    
    return info;
  };

  const handleViewEquipmentImages = async (equipmentId: string, equipmentName: string) => {
    const { data, error } = await supabase
      .from("equipment_images")
      .select("image_url")
      .eq("equipment_id", equipmentId)
      .order("display_order");
    
    if (error) {
      toast.error("ไม่สามารถโหลดรูปภาพได้");
      return;
    }
    
    if (!data || data.length === 0) {
      toast.info("ไม่พบรูปภาพสินค้านี้");
      return;
    }
    
    setSelectedEquipmentImages(data.map(d => d.image_url));
    setSelectedEquipmentName(equipmentName);
    setImageDialogOpen(true);
  };

  // Issue item mutation
  const issueItem = useMutation({
    mutationFn: async () => {
      if (!selectedItem || !user) return;

      const issuedQty = parseInt(issueData.issued_quantity);
      const requestedQty = selectedItem.remaining_quantity && selectedItem.remaining_quantity > 0 
        ? selectedItem.remaining_quantity 
        : selectedItem.quantity;
      const remainingQty = requestedQty - issuedQty;
      const previousIssued = selectedItem.issued_quantity || 0;
      const totalIssued = previousIssued + issuedQty;
      const isMediaPlayer = selectedItem.is_media_player;

      // Per-unit assignment validation + combine values stored on the pending item row
      let combinedSerial: string | null = null;
      let combinedBillboardId: string | null = null;
      const activeAssignments = unitAssignments.slice(0, issuedQty);
      const activeMpAssignments = mpUnitAssignments.slice(0, issuedQty);

      if (isMediaPlayer && issuedQty > 0) {
        if (activeMpAssignments.length !== issuedQty) {
          throw new Error(`กรุณาระบุข้อมูลให้ครบ ${issuedQty} เครื่อง`);
        }
        const mpIds = new Set<string>();
        const mpSerials = new Set<string>();
        for (const a of activeMpAssignments) {
          if (!a.media_player_id || !a.serial_number) {
            throw new Error("กรุณาเลือก S/N ของ Media Player ทุกเครื่อง");
          }
          if (mpIds.has(a.media_player_id)) {
            throw new Error("เลือก Media Player ซ้ำเครื่องเดิม กรุณาเลือกเครื่องที่แตกต่างกัน");
          }
          mpIds.add(a.media_player_id);
          const sk = a.serial_number.trim().toLowerCase();
          if (mpSerials.has(sk)) throw new Error(`Serial Number ซ้ำ: ${a.serial_number}`);
          mpSerials.add(sk);
        }
        combinedSerial = activeMpAssignments.map(a => a.serial_number).join("\n").trim() || null;
        const bbSet = new Set(activeMpAssignments.map(a => a.billboard_id || ""));
        combinedBillboardId = bbSet.size === 1 ? (activeMpAssignments[0]?.billboard_id || null) : null;
      } else if (!isMediaPlayer && issuedQty > 0) {
        if (activeAssignments.length !== issuedQty) {
          throw new Error(`กรุณาระบุข้อมูลให้ครบ ${issuedQty} เครื่อง`);
        }
        const serials = activeAssignments.map(a => (a.serial_number || "").trim()).filter(Boolean);
        const seen = new Set<string>();
        for (const sn of serials) {
          const k = sn.toLowerCase();
          if (seen.has(k)) throw new Error(`Serial Number ซ้ำ: ${sn}`);
          seen.add(k);
        }
        if (serials.length > 0) {
          combinedSerial = activeAssignments.map(a => a.serial_number || "").join("\n").trim() || null;
        }
        const bbSet = new Set(activeAssignments.map(a => a.billboard_id || ""));
        combinedBillboardId = bbSet.size === 1 ? (activeAssignments[0]?.billboard_id || null) : null;
      }

      // Determine new status
      let newStatus: string;
      if (remainingQty <= 0) {
        newStatus = "issued";
      } else if (issuedQty > 0) {
        newStatus = "waiting_stock";
      } else {
        newStatus = selectedItem.status;
      }
      
      // Update item record (including serial_number selected by warehouse staff)
      const { error: updateError } = await supabase
        .from("goods_issue_pending_items")
        .update({
          status: newStatus,
          issued_quantity: totalIssued,
          remaining_quantity: Math.max(0, remainingQty),
          billboard_id: combinedBillboardId ?? selectedItem.billboard_id,
          notes: issueData.notes || selectedItem.notes,
          serial_number: combinedSerial ?? selectedItem.serial_number ?? null,
        })
        .eq("id", selectedItem.id);

      if (updateError) throw updateError;

      // Handle Media Player or Equipment stock update
      const parentRequest = pendingRequests?.find(r => r.id === selectedItem.pending_id);

      if (isMediaPlayer && issuedQty > 0) {
        // Loop each MP unit assignment
        for (const a of activeMpAssignments) {
          const { data: currentMp, error: fetchMpError } = await supabase
            .from("media_players")
            .select("quantity, code, name, location_id, serial_number_1, serial_number_2")
            .eq("id", a.media_player_id)
            .single();
          if (fetchMpError) throw fetchMpError;
          if ((currentMp?.quantity || 0) <= 0) {
            throw new Error(`S/N ${a.serial_number} ไม่อยู่ในคลังแล้ว`);
          }
          if (currentMp?.serial_number_1 !== a.serial_number && currentMp?.serial_number_2 !== a.serial_number) {
            throw new Error(`S/N ${a.serial_number} ไม่ตรงกับเครื่องที่จะจ่าย`);
          }

          const currentStock = currentMp?.quantity || 0;
          const newStock = Math.max(0, currentStock - 1);

          const { error: stockError } = await supabase
            .from("media_players")
            .update({ quantity: newStock })
            .eq("id", a.media_player_id);
          if (stockError) throw stockError;

          await logStockMovement({
            equipment_id: a.media_player_id,
            equipment_code: currentMp?.code || selectedItem.equipment_code || "",
            equipment_name: currentMp?.name || selectedItem.equipment_name || "",
            movement_type: "issue",
            quantity: 1,
            stock_before: currentStock,
            stock_after: newStock,
            reference_type: "goods_issue",
            reference_document: parentRequest?.document_no || "",
            location_id: currentMp?.location_id || undefined,
            notes: `Media Player S/N: ${a.serial_number} - ${issueData.notes || ""}`.trim(),
          });

          // Install to billboard (optional). If left blank, it will surface in the "รอระบุป้าย/รอคืน" workflow.
          if (a.billboard_id) {
            const { data: bbInfo } = await supabase
              .from("billboards")
              .select("old_code, location_name")
              .eq("id", a.billboard_id)
              .maybeSingle();
            const bbLabel = [bbInfo?.old_code, bbInfo?.location_name].filter(Boolean).join(" - ") || a.billboard_id;

            await supabase
              .from("media_players")
              .update({
                billboard_id: a.billboard_id,
                install_date: new Date().toISOString().split('T')[0],
              })
              .eq("id", a.media_player_id);

            const { error: billboardMpError } = await supabase
              .from("billboard_equipment")
              .insert({
                billboard_id: a.billboard_id,
                equipment_id: a.media_player_id,
                quantity: 1,
                installation_date: new Date().toISOString().split('T')[0],
                notes: issueData.notes || `Media Player เบิกจากเอกสาร ${parentRequest?.document_no}`,
                created_by: user.id,
                serial_number: a.serial_number,
              });
            if (billboardMpError) console.error("Error creating billboard_equipment for MP:", billboardMpError);

            const today = new Date().toISOString().split('T')[0];
            const { error: histError } = await supabase
              .from("media_player_billboard_history")
              .insert({
                media_player_id: a.media_player_id,
                billboard_id: a.billboard_id,
                installation_date: today,
                uninstall_date: null,
                installed_by: user.id,
                installation_notes: issueData.notes || `จากเอกสาร ${parentRequest?.document_no}`,
              } as any);
            if (histError) console.error("Error inserting MP history:", histError);

            await logStockMovement({
              equipment_id: a.media_player_id,
              equipment_code: currentMp?.code || selectedItem.equipment_code || "",
              equipment_name: currentMp?.name || selectedItem.equipment_name || "",
              movement_type: "install_to_billboard",
              quantity: 1,
              stock_before: currentStock,
              stock_after: newStock,
              reference_type: "billboard_equipment",
              reference_document: parentRequest?.document_no || "",
              location_id: currentMp?.location_id || undefined,
              notes: `Media Player ติดตั้งที่ป้าย ${bbLabel} S/N: ${a.serial_number}`,
            });
          }
        }
      } else if (selectedItem.equipment_id && issuedQty > 0) {
        // Regular Equipment: Update equipment table
        const { data: currentEquipmentData, error: fetchError } = await supabase
          .from("equipment")
          .select("quantity_in_stock")
          .eq("id", selectedItem.equipment_id)
          .single();

        if (fetchError) throw fetchError;

        const currentStock = currentEquipmentData?.quantity_in_stock || 0;
        const newStock = Math.max(0, currentStock - issuedQty);
        
        const { error: stockError } = await supabase
          .from("equipment")
          .update({ quantity_in_stock: newStock })
          .eq("id", selectedItem.equipment_id);
        if (stockError) throw stockError;

        // parentRequest already declared above

        // Log stock movement
        await logStockMovement({
          equipment_id: selectedItem.equipment_id,
          equipment_code: selectedItem.equipment_code || "",
          equipment_name: selectedItem.equipment_name || "",
          movement_type: "issue",
          quantity: issuedQty,
          stock_before: currentStock,
          stock_after: newStock,
          reference_type: "goods_issue",
          reference_document: parentRequest?.document_no || "",
          location_id: equipment?.find(e => e.id === selectedItem.equipment_id)?.location_id || undefined,
          notes: issueData.notes || undefined,
        });

        // Update equipment_serial_numbers status to issued/installed — per unit assignment
        for (const a of activeAssignments) {
          if (!a.serial_number) continue;
          const billboardIdForUnit = a.billboard_id || selectedItem.billboard_id || null;
          const newSnStatus = billboardIdForUnit ? "installed" : "issued";
          const { data: snRecord } = await supabase
            .from("equipment_serial_numbers")
            .select("id")
            .eq("equipment_id", selectedItem.equipment_id)
            .eq("serial_number", a.serial_number)
            .eq("status", "in_stock")
            .maybeSingle();

          if (snRecord) {
            await supabase.from("equipment_serial_numbers").update({
              status: newSnStatus,
              issue_document_no: parentRequest?.document_no || null,
              billboard_id: billboardIdForUnit,
              issued_at: new Date().toISOString(),
            } as any).eq("id", snRecord.id);
          }
        }

        // Create goods_issue record
        const { error: issueError } = await supabase
          .from("goods_issue")
          .insert({
            document_no: parentRequest?.document_no || "",
            equipment_id: selectedItem.equipment_id,
            quantity: issuedQty,
            location_id: equipment?.find(e => e.id === selectedItem.equipment_id)?.location_id || selectedItem.equipment_id,
            issue_date: new Date().toISOString().split('T')[0],
            requester: parentRequest?.requester_name || "",
            purpose: parentRequest?.purpose,
            notes: issueData.notes || `Stock: ${currentStock} → ${newStock}`,
            created_by: user.id,
          });
        if (issueError) console.error("Error creating goods_issue:", issueError);

        // Per-unit billboard installation — group rows by billboard_id, insert 1 record per unit
        const billboardLabelCache = new Map<string, string>();
        const getBbLabel = async (bbId: string) => {
          if (billboardLabelCache.has(bbId)) return billboardLabelCache.get(bbId)!;
          const { data: bbInfo } = await supabase
            .from("billboards")
            .select("old_code, location_name")
            .eq("id", bbId)
            .maybeSingle();
          const label = [bbInfo?.old_code, bbInfo?.location_name].filter(Boolean).join(" - ") || bbId;
          billboardLabelCache.set(bbId, label);
          return label;
        };

        // Build per-unit billboard list (fall back to existing item.billboard_id if a row left blank)
        const installRows = activeAssignments
          .map(a => ({ billboard_id: a.billboard_id || selectedItem.billboard_id || "", serial_number: a.serial_number || null }))
          .filter(r => r.billboard_id);

        for (const r of installRows) {
          const bbLabel = await getBbLabel(r.billboard_id);
          const { error: billboardError } = await supabase
            .from("billboard_equipment")
            .insert({
              billboard_id: r.billboard_id,
              equipment_id: selectedItem.equipment_id,
              quantity: 1,
              installation_date: new Date().toISOString().split('T')[0],
              notes: issueData.notes || `เบิกจากเอกสาร ${parentRequest?.document_no}`,
              created_by: user.id,
              serial_number: r.serial_number,
            });
          if (billboardError) throw billboardError;

          await logStockMovement({
            equipment_id: selectedItem.equipment_id,
            equipment_code: selectedItem.equipment_code || "",
            equipment_name: selectedItem.equipment_name || "",
            movement_type: "install_to_billboard",
            quantity: 1,
            stock_before: currentStock,
            stock_after: newStock,
            reference_type: "billboard_equipment",
            reference_document: parentRequest?.document_no || "",
            location_id: equipment?.find(e => e.id === selectedItem.equipment_id)?.location_id || undefined,
            notes: `ติดตั้งที่ป้าย ${bbLabel}${r.serial_number ? ` S/N: ${r.serial_number}` : ""}`,
          });
        }
      }

      // Recalculate header totals + status from latest item rows
      const { data: latestItems, error: latestItemsError } = await supabase
        .from("goods_issue_pending_items")
        .select("quantity, issued_quantity, remaining_quantity, status")
        .eq("pending_id", selectedItem.pending_id);

      if (latestItemsError) throw latestItemsError;

      const headerQuantity = (latestItems || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
      const headerIssued = (latestItems || []).reduce((sum, item) => sum + (item.issued_quantity || 0), 0);
      const headerRemaining = (latestItems || []).reduce(
        (sum, item) => sum + (item.remaining_quantity ?? Math.max(0, (item.quantity || 0) - (item.issued_quantity || 0))),
        0
      );

      const allRejected = (latestItems || []).length > 0 && (latestItems || []).every(item => item.status === "rejected");
      const allIssued = (latestItems || []).length > 0 && (latestItems || []).every(item => item.status === "issued");
      const anyIssued = (latestItems || []).some(item => (item.issued_quantity || 0) > 0);
      const anyWaiting = (latestItems || []).some(item => item.status === "waiting_stock");

      let parentStatus = "pending";
      if (allRejected) {
        parentStatus = "rejected";
      } else if (allIssued) {
        parentStatus = "issued";
      } else if (anyIssued || anyWaiting) {
        parentStatus = "waiting_stock";
      }

      await supabase
        .from("goods_issue_pending")
        .update({
          status: parentStatus,
          issued_at: anyIssued ? new Date().toISOString() : null,
          issued_by: anyIssued ? user.id : null,
          quantity: headerQuantity,
          issued_quantity: headerIssued,
          remaining_quantity: headerRemaining,
        })
        .eq("id", selectedItem.pending_id);

      return { remainingQty, newStatus };
    },
    onSuccess: (result) => {
      let successMessage = "";
      if (result?.newStatus === "waiting_stock") {
        successMessage = `จ่ายสินค้าบางส่วนสำเร็จ รอของเข้าอีก ${result.remainingQty} ชิ้น`;
      } else if (issueData.billboard_id || selectedItem?.billboard_id) {
        successMessage = "จ่ายสินค้าและบันทึกการติดตั้งที่ป้ายสำเร็จ";
      } else {
        successMessage = "จ่ายสินค้าสำเร็จ";
      }
      toast.success(successMessage);
      queryClient.invalidateQueries({ queryKey: ["goods-issue-pending-staff"] });
      queryClient.invalidateQueries({ queryKey: ["goods-issue-pending-items-staff"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-active"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-active-details"] });
      queryClient.invalidateQueries({ queryKey: ["billboard-equipment"] });
      setItemIssueDialogOpen(false);
      setSelectedItem(null);
      setIssueData({ issued_quantity: "", notes: "", billboard_id: "", serial_number: "", serial_number_source: "" });
      setUnitAssignments([]);
    },
    onError: (error) => {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    },
  });

  // Reject request mutation
  const rejectRequest = useMutation({
    mutationFn: async () => {
      if (!selectedRequest) return;

      const { error } = await supabase
        .from("goods_issue_pending")
        .update({
          status: "rejected",
          reject_reason: rejectReason,
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      // Also reject all items
      await supabase
        .from("goods_issue_pending_items")
        .update({ status: "rejected" })
        .eq("pending_id", selectedRequest.id);
    },
    onSuccess: () => {
      toast.success("ปฏิเสธคำขอสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["goods-issue-pending-staff"] });
      queryClient.invalidateQueries({ queryKey: ["goods-issue-pending-items-staff"] });
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectReason("");
    },
    onError: (error) => {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    },
  });

  // Reject single item mutation
  const rejectItem = useMutation({
    mutationFn: async () => {
      if (!selectedItemForReject) return;

      const { error } = await supabase
        .from("goods_issue_pending_items")
        .update({
          status: "rejected",
          notes: itemRejectReason || selectedItemForReject.notes,
        })
        .eq("id", selectedItemForReject.id);

      if (error) throw error;

      // Update parent request status if all items are rejected or issued
      const allItems = pendingItems?.filter(item => item.pending_id === selectedItemForReject.pending_id) || [];
      const allProcessed = allItems.every(item => 
        item.id === selectedItemForReject.id ? true : (item.status === "issued" || item.status === "rejected")
      );
      const anyPending = allItems.some(item => 
        item.id === selectedItemForReject.id ? false : (item.status === "pending" || item.status === "waiting_stock")
      );
      const allRejected = allItems.every(item => 
        item.id === selectedItemForReject.id ? true : item.status === "rejected"
      );

      if (allRejected) {
        await supabase
          .from("goods_issue_pending")
          .update({ status: "rejected", reject_reason: "ปฏิเสธทุกรายการ" })
          .eq("id", selectedItemForReject.pending_id);
      } else if (allProcessed && !anyPending) {
        // At least some items were issued
        await supabase
          .from("goods_issue_pending")
          .update({ status: "issued" })
          .eq("id", selectedItemForReject.pending_id);
      }
    },
    onSuccess: () => {
      toast.success("ปฏิเสธรายการนี้สำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["goods-issue-pending-staff"] });
      queryClient.invalidateQueries({ queryKey: ["goods-issue-pending-items-staff"] });
      setItemRejectDialogOpen(false);
      setSelectedItemForReject(null);
      setItemRejectReason("");
    },
    onError: (error) => {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    },
  });

  const handleIssueItem = (item: PendingItem) => {
    setSelectedItem(item);
    const qtyToIssue = item.remaining_quantity && item.remaining_quantity > 0 
      ? item.remaining_quantity 
      : item.quantity;
    setIssueData({
      issued_quantity: qtyToIssue.toString(),
      notes: item.notes || "",
      billboard_id: item.billboard_id || "",
      serial_number: item.serial_number || "",
      serial_number_source: item.is_media_player ? "media_player_sn1" : "equipment",
    });
    // Initialize per-unit assignments for non-Media Player items
    if (!item.is_media_player) {
      const initial = Array.from({ length: qtyToIssue }, () => ({
        serial_number: "",
        serial_number_source: "equipment",
        billboard_id: item.billboard_id || "",
      }));
      setUnitAssignments(initial);
      setMpUnitAssignments([]);
    } else {
      setUnitAssignments([]);
      // Initialize per-unit MP assignments. First slot pre-fills the originally requested MP id.
      const mpInitial = Array.from({ length: qtyToIssue }, (_, i) => ({
        media_player_id: i === 0 ? (item.media_player_id || "") : "",
        serial_number: i === 0 ? (item.serial_number || "") : "",
        billboard_id: item.billboard_id || "",
      }));
      setMpUnitAssignments(mpInitial);
    }
    setItemIssueDialogOpen(true);
  };

  const handleIssuedQuantityChange = (value: string) => {
    setIssueData((prev) => ({ ...prev, issued_quantity: value }));
    const n = Math.max(0, parseInt(value) || 0);
    if (selectedItem?.is_media_player) {
      setMpUnitAssignments((prev) => {
        const next = [...prev];
        const defaultBillboard = selectedItem?.billboard_id || "";
        if (n > next.length) {
          while (next.length < n) {
            next.push({ media_player_id: "", serial_number: "", billboard_id: defaultBillboard });
          }
        } else if (n < next.length) {
          next.length = n;
        }
        return next;
      });
      return;
    }
    setUnitAssignments((prev) => {
      const next = [...prev];
      const defaultBillboard = selectedItem?.billboard_id || "";
      if (n > next.length) {
        while (next.length < n) {
          next.push({ serial_number: "", serial_number_source: "equipment", billboard_id: defaultBillboard });
        }
      } else if (n < next.length) {
        next.length = n;
      }
      return next;
    });
  };

  const updateMpUnitAssignment = (index: number, patch: Partial<{ media_player_id: string; serial_number: string; billboard_id: string }>) => {
    setMpUnitAssignments((prev) => prev.map((u, i) => (i === index ? { ...u, ...patch } : u)));
  };

  const updateUnitAssignment = (index: number, patch: Partial<{ serial_number: string; serial_number_source: string; billboard_id: string }>) => {
    setUnitAssignments((prev) => prev.map((u, i) => (i === index ? { ...u, ...patch } : u)));
  };

  const handleReject = (request: PendingRequest) => {
    setSelectedRequest(request);
    setRejectDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />รอดำเนินการ</Badge>;
      case "pending_approval":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800"><AlertTriangle className="h-3 w-3 mr-1" />รออนุมัติ</Badge>;
      case "issued":
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />จ่ายครบแล้ว</Badge>;
      case "waiting_stock":
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800"><Clock className="h-3 w-3 mr-1" />รอสินค้า</Badge>;
      case "partial_issued":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Package className="h-3 w-3 mr-1" />จ่ายบางส่วน</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />ปฏิเสธ</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAvailableStock = (equipmentId: string | null) => {
    if (!equipmentId) return null;
    const eq = equipment?.find((e) => e.id === equipmentId);
    return eq?.quantity_in_stock ?? null;
  };

  const filteredRequests = pendingRequests?.filter(
    (req) => {
      // Dedicated S/N search
      if (snSearchTerm) {
        const snTerm = snSearchTerm.toLowerCase();
        const items = getItemsForRequest(req.id);
        if (!items.some(item => item.serial_number?.toLowerCase().includes(snTerm))) return false;
      }
      // General search
      const term = searchTerm.toLowerCase();
      if (!term) return true;
      if (req.document_no?.toLowerCase().includes(term) ||
          req.equipment_code?.toLowerCase().includes(term) ||
          req.equipment_name?.toLowerCase().includes(term) ||
          req.requester_name?.toLowerCase().includes(term)) return true;
      return false;
    }
  );

  const { paginatedData, currentPage, pageSize, totalPages, totalItems, handlePageChange, handlePageSizeChange } = useTablePagination(filteredRequests || [], 20);

  const pendingCount = pendingRequests?.filter((r) => r.status === "pending" || r.status === "waiting_stock").length || 0;
  const waitingStockCount = pendingRequests?.filter((r) => r.status === "waiting_stock").length || 0;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">จ่ายสินค้า</h1>
            <p className="text-muted-foreground">สำหรับเจ้าหน้าที่คลัง - ดำเนินการจ่ายสินค้าตามคำขอ (รองรับหลายรายการ)</p>
          </div>
          <div className="flex gap-2">
            {pendingCount > 0 && (
              <Badge variant="destructive" className="text-lg px-4 py-2">
                รอดำเนินการ: {pendingCount} รายการ
              </Badge>
            )}
            {waitingStockCount > 0 && (
              <Badge variant="secondary" className="text-lg px-4 py-2 bg-orange-100 text-orange-800">
                รอสินค้า: {waitingStockCount} รายการ
              </Badge>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              รายการคำขอเบิก
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1 max-w-[180px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหา S/N..."
                  value={snSearchTerm}
                  onChange={(e) => setSnSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาเลขที่เอกสาร, รหัส, ชื่อสินค้า..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>เลขที่เอกสาร</TableHead>
                    <TableHead>วันที่ขอ</TableHead>
                    <TableHead>บริษัท</TableHead>
                    <TableHead>รายการ</TableHead>
                    <TableHead>ผู้ขอเบิก</TableHead>
                    <TableHead>ส่งไปที่</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="text-center">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        กำลังโหลด...
                      </TableCell>
                    </TableRow>
                  ) : paginatedData?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        ไม่พบข้อมูล
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedData?.map((req) => {
                      const items = getItemsForRequest(req.id);
                      const isExpanded = expandedRequests.has(req.id);
                      const hasMultipleItems = items.length > 0;
                      
                      return (
                        <>
                          <TableRow 
                            key={req.id} 
                            className={`${req.status === "pending" ? "bg-yellow-50" : req.status === "waiting_stock" ? "bg-orange-50" : ""} cursor-pointer hover:bg-muted/50`}
                            onClick={() => hasMultipleItems && toggleRequestExpand(req.id)}
                          >
                            <TableCell>
                              {hasMultipleItems && (
                                <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{req.document_no}</TableCell>
                            <TableCell>
                              {format(new Date(req.created_at), "dd/MM/yyyy HH:mm", { locale: th })}
                            </TableCell>
                            <TableCell>{req.companies?.name || "-"}</TableCell>
                            <TableCell>
                              {hasMultipleItems ? (
                                <Badge variant="outline" className="gap-1">
                                  <ShoppingCart className="h-3 w-3" />
                                  {items.length} รายการ
                                </Badge>
                              ) : (
                                <div>
                                  {req.equipment_code && <div className="font-medium">{req.equipment_code}</div>}
                                  <div className="text-sm text-muted-foreground">{req.equipment_name || "-"}</div>
                                  <div className="text-xs text-muted-foreground">{req.quantity} {req.unit}</div>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div>{req.requester_name}</div>
                              {req.requester_department && (
                                <div className="text-sm text-muted-foreground">{req.requester_department}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              {req.destination || "-"}
                              {(req as any).pickup_type && (
                                <div className="mt-1">
                                  {(req as any).pickup_type === "wait_onsite" && (
                                    <Badge variant="outline" className="text-xs bg-red-100 text-red-700">🏪 รอรับที่คลัง</Badge>
                                  )}
                                  {(req as any).pickup_type === "scheduled" && (
                                    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">📅 นัดรับ{(req as any).pickup_date ? ` ${(req as any).pickup_date}` : ""}</Badge>
                                  )}
                                  {(req as any).pickup_type === "delivery" && (
                                    <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700">🚚 จัดส่ง</Badge>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{getStatusBadge(req.status)}</TableCell>
                            <TableCell>
                              {req.status === "pending" && (
                                <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); handleReject(req); }}>
                                  <XCircle className="h-4 w-4 mr-1" />
                                  ปฏิเสธทั้งหมด
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                          
                          {/* Expanded Items */}
                          {isExpanded && hasMultipleItems && (
                            <TableRow key={`${req.id}-items`}>
                              <TableCell colSpan={9} className="bg-muted/30 p-0">
                                <div className="p-4">
                                  <h4 className="font-medium mb-3 flex items-center gap-2">
                                    <ShoppingCart className="h-4 w-4" />
                                    รายการสินค้า ({items.length} รายการ)
                                  </h4>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-10">ภาพ</TableHead>
                                        <TableHead>รหัส/ชื่อสินค้า</TableHead>
                                        <TableHead>S/N</TableHead>
                                        <TableHead>คลังสินค้า</TableHead>
                                        <TableHead>ตำแหน่งจัดเก็บ</TableHead>
                                        <TableHead className="text-right">จำนวนขอ</TableHead>
                                        <TableHead className="text-right">คงเหลือ</TableHead>
                                        <TableHead>ป้ายโฆษณา</TableHead>
                                        <TableHead>สถานะ</TableHead>
                                        <TableHead className="text-center">จัดการ</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {items.map((item) => {
                                        const availableStock = getAvailableStock(item.equipment_id);
                                        const locationInfo = getLocationInfoForItem(item.equipment_id);
                                        return (
                                          <TableRow key={item.id}>
                                            <TableCell>
                                              {item.equipment_id && (
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-8 w-8"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleViewEquipmentImages(item.equipment_id!, item.equipment_name || item.equipment_code || "สินค้า");
                                                  }}
                                                >
                                                  <Image className="h-4 w-4 text-primary" />
                                                </Button>
                                              )}
                                            </TableCell>
                                            <TableCell>
                                              {item.equipment_code && <div className="font-medium">{item.equipment_code}</div>}
                                              <div className="text-sm text-muted-foreground">{item.equipment_name || "-"}</div>
                                            </TableCell>
                                            <TableCell>
                                              {item.serial_number ? (
                                                <Badge variant="outline" className="font-mono text-xs bg-blue-50 text-blue-700 border-blue-200">
                                                  {item.serial_number}
                                                </Badge>
                                              ) : (
                                                <span className="text-muted-foreground">-</span>
                                              )}</TableCell>
                                            <TableCell>
                                              {locationInfo ? (
                                                <div className="flex items-center gap-1">
                                                  <Warehouse className="h-3 w-3 text-muted-foreground" />
                                                  <span className="text-sm font-medium">{locationInfo.warehouseName}</span>
                                                </div>
                                              ) : (
                                                <span className="text-muted-foreground text-sm">-</span>
                                              )}
                                            </TableCell>
                                            <TableCell>
                                              {locationInfo ? (
                                                <div className="flex items-center gap-1">
                                                  <MapPin className="h-3 w-3 text-muted-foreground" />
                                                  <span className="text-sm font-medium">{locationInfo.locationName}</span>
                                                </div>
                                              ) : (
                                                <span className="text-muted-foreground text-sm">-</span>
                                              )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              <div>{item.quantity} {item.unit}</div>
                                              {item.issued_quantity && item.issued_quantity > 0 && (
                                                <div className="text-xs text-green-600">จ่ายแล้ว: {item.issued_quantity}</div>
                                              )}
                                              {item.remaining_quantity && item.remaining_quantity > 0 && (
                                                <div className="text-xs text-orange-600">รอ: {item.remaining_quantity}</div>
                                              )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              {availableStock !== null ? (
                                                <span className={availableStock < item.quantity ? "text-destructive font-medium" : ""}>
                                                  {availableStock}
                                                </span>
                                              ) : "-"}
                                            </TableCell>
                                            <TableCell>
                                              {item.billboard_id ? (
                                                <BillboardDisplay billboardId={item.billboard_id} />
                                              ) : (
                                                <span className="text-muted-foreground text-sm">-</span>
                                              )}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(item.status)}</TableCell>
                                            <TableCell className="text-center">
                                              <div className="flex items-center justify-center gap-1">
                                                {(item.status === "pending" || item.status === "waiting_stock") && (
                                                  <>
                                                    <Button size="sm" onClick={(e) => { e.stopPropagation(); handleIssueItem(item); }}>
                                                      <CheckCircle className="h-4 w-4 mr-1" />
                                                      {item.status === "waiting_stock" ? "จ่ายต่อ" : "จ่าย"}
                                                    </Button>
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      className="text-destructive hover:text-destructive"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedItemForReject(item);
                                                        setItemRejectDialogOpen(true);
                                                      }}
                                                    >
                                                      <XCircle className="h-4 w-4" />
                                                    </Button>
                                                  </>
                                                )}
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </CardContent>
        </Card>
      </div>

      {/* Issue Item Dialog - Fixed without scrollbar */}
      <Dialog open={itemIssueDialogOpen} onOpenChange={setItemIssueDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>จ่ายสินค้า - {selectedItem?.equipment_code || selectedItem?.equipment_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <Label className="text-muted-foreground">สินค้า</Label>
                <p className="font-medium">{selectedItem?.equipment_code || "-"}</p>
                <p className="text-sm">{selectedItem?.equipment_name || "-"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Serial Number (จากคำขอ)</Label>
                <p className="font-medium">{selectedItem?.serial_number || "-"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">จำนวนที่ขอ</Label>
                <p className="font-medium">{selectedItem?.quantity} {selectedItem?.unit}</p>
                {selectedItem?.issued_quantity && selectedItem.issued_quantity > 0 && (
                  <p className="text-xs text-green-600">จ่ายไปแล้ว: {selectedItem.issued_quantity}</p>
                )}
              </div>
              <div>
                <Label className="text-muted-foreground">คงเหลือในคลัง</Label>
                <p className="font-medium">
                  {selectedItem?.equipment_id ? getAvailableStock(selectedItem.equipment_id) : "-"}
                </p>
              </div>
            </div>

            {/* Media Player: per-unit S/N + Billboard table (supports multi-unit) */}
            {selectedItem?.is_media_player && mpUnitAssignments.length > 0 && (() => {
              // Available MP units sharing the same code (in stock). Include the originally requested id even if quantity=0 (defensive).
              const candidates = (availableMpUnits || []).filter((m: any) => m.code === selectedItem?.equipment_code);
              return (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    ระบุ S/N และป้ายโฆษณาต่อเครื่อง ({mpUnitAssignments.length} เครื่อง)
                  </Label>
                  <div className="border rounded-lg divide-y">
                    {mpUnitAssignments.map((u, idx) => {
                      // Allowed list = not already picked by other rows
                      const otherIds = new Set(mpUnitAssignments.filter((_, i) => i !== idx).map(x => x.media_player_id).filter(Boolean));
                      const allowed = candidates.filter((m: any) => !otherIds.has(m.id));
                      return (
                        <div key={idx} className="p-3 space-y-2 bg-muted/20">
                          <div className="text-xs font-medium text-muted-foreground">เครื่องที่ {idx + 1}</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Serial Number</Label>
                              <select
                                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                                value={u.media_player_id}
                                onChange={(e) => {
                                  const mpId = e.target.value;
                                  const mp = candidates.find((m: any) => m.id === mpId);
                                  updateMpUnitAssignment(idx, {
                                    media_player_id: mpId,
                                    serial_number: mp?.serial_number_1 || mp?.serial_number_2 || "",
                                  });
                                }}
                              >
                                <option value="">-- เลือก S/N --</option>
                                {allowed.map((m: any) => (
                                  <option key={m.id} value={m.id}>
                                    {m.serial_number_1 || m.serial_number_2 || "(ไม่มี S/N)"}
                                    {m.locations?.warehouses?.name ? ` — ${m.locations.warehouses.name}` : ""}
                                  </option>
                                ))}
                              </select>
                              {allowed.length === 0 && (
                                <p className="text-xs text-destructive">ไม่มี S/N คงเหลือในคลัง</p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">ป้ายโฆษณา (ระบุภายหลังที่ "รอระบุป้าย/รอคืน" ได้)</Label>
                              <BillboardSelect
                                value={u.billboard_id}
                                onChange={(value) => updateMpUnitAssignment(idx, { billboard_id: value })}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* FIFO & Expiry Info */}
            {selectedItem?.equipment_id && (() => {
              const info = getExpiryInfo(selectedItem.equipment_id);
              if (!info) return null;
              
              const hasWarning = (info.expiry && info.expiry.days <= 30) || (info.warranty && info.warranty.days <= 30);
              
              return (
                <div className={`p-3 rounded-lg border ${hasWarning ? 'border-warning/50 bg-warning/5' : 'border-border bg-muted/30'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {hasWarning && <AlertTriangle className="h-4 w-4 text-warning" />}
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">ข้อมูล FIFO</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">อยู่ในคลัง: </span>
                      <span className="font-medium">{info.ageDays} วัน</span>
                    </div>
                    {info.serialNumber && (
                      <div>
                        <span className="text-muted-foreground">Serial: </span>
                        <span className="font-medium">{info.serialNumber}</span>
                      </div>
                    )}
                    {info.expiry && (
                      <div>
                        <span className="text-muted-foreground">หมดอายุ: </span>
                        <span className={`font-medium ${info.expiry.days <= 0 ? 'text-destructive' : info.expiry.days <= 30 ? 'text-warning' : ''}`}>
                          {format(new Date(info.expiry.date), "dd/MM/yyyy")} 
                          ({info.expiry.days <= 0 ? 'หมดแล้ว' : `อีก ${info.expiry.days} วัน`})
                        </span>
                      </div>
                    )}
                    {info.warranty && (
                      <div>
                        <span className="text-muted-foreground">ประกัน: </span>
                        <span className={`font-medium ${info.warranty.days <= 0 ? 'text-destructive' : info.warranty.days <= 30 ? 'text-warning' : ''}`}>
                          {format(new Date(info.warranty.date), "dd/MM/yyyy")} 
                          ({info.warranty.days <= 0 ? 'หมดแล้ว' : `อีก ${info.warranty.days} วัน`})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Equipment Location Info */}
            {selectedItem?.equipment_id && (() => {
              const info = getExpiryInfo(selectedItem.equipment_id);
              if (!info?.locationInfo) return (
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Warehouse className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">ไม่พบข้อมูลตำแหน่งจัดเก็บ</span>
                  </div>
                </div>
              );
              
              return (
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Warehouse className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">ตำแหน่งจัดเก็บ</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">คลัง: </span>
                      <span className="font-medium">{info.locationInfo.warehouseName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ตำแหน่ง: </span>
                      <span className="font-medium">{info.locationInfo.locationName}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-2">
              <Label htmlFor="issued_quantity">จำนวนที่จ่ายจริง *</Label>
              <Input
                id="issued_quantity"
                type="number"
                min="1"
                value={issueData.issued_quantity}
                onChange={(e) => handleIssuedQuantityChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                หากจ่ายไม่ครบ ระบบจะเก็บจำนวนที่เหลือไว้รอสินค้าเข้าคลังแล้วจ่ายต่อ
              </p>
            </div>

            {/* Per-unit S/N + Billboard assignments (Equipment only — Media Player handled above) */}
            {!selectedItem?.is_media_player && unitAssignments.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  ระบุ Serial Number และป้ายโฆษณาต่อเครื่อง ({unitAssignments.length} เครื่อง)
                </Label>
                <div className="border rounded-lg divide-y">
                  {unitAssignments.map((u, idx) => (
                    <div key={idx} className="p-3 space-y-2 bg-muted/20">
                      <div className="text-xs font-medium text-muted-foreground">เครื่องที่ {idx + 1}</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Serial Number</Label>
                          <SerialNumberSelect
                            value={u.serial_number
                              ? `${u.serial_number_source || "equipment"}:${selectedItem?.equipment_id || ""}:${u.serial_number}`
                              : ""}
                            onChange={(item: SerialNumberItem | null) =>
                              updateUnitAssignment(idx, {
                                serial_number: item?.serial_number || "",
                                serial_number_source: item?.source || "equipment",
                              })
                            }
                            equipmentId={selectedItem?.equipment_id || undefined}
                            placeholder="เลือก S/N..."
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">ป้ายโฆษณา (ระบุหรือเปลี่ยนได้)</Label>
                          <BillboardSelect
                            value={u.billboard_id}
                            onChange={(value) => updateUnitAssignment(idx, { billboard_id: value })}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MP billboard handled per-unit in the table above */}

            {/* View Equipment Image Button */}
            {selectedItem?.equipment_id && (
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleViewEquipmentImages(selectedItem.equipment_id!, selectedItem.equipment_name || selectedItem.equipment_code || "สินค้า")}
                  className="gap-2"
                >
                  <Image className="h-4 w-4" />
                  ดูรูปสินค้า
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">หมายเหตุ</Label>
              <Textarea
                id="notes"
                value={issueData.notes}
                onChange={(e) => setIssueData({ ...issueData, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemIssueDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button 
              onClick={() => issueItem.mutate()} 
              disabled={issueItem.isPending}
            >
              {issueItem.isPending ? "กำลังบันทึก..." : "ยืนยันการจ่าย"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ปฏิเสธคำขอ - {selectedRequest?.document_no}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p><strong>ผู้ขอ:</strong> {selectedRequest?.requester_name}</p>
              <p><strong>จำนวนรายการ:</strong> {getItemsForRequest(selectedRequest?.id || "").length || 1} รายการ</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reject_reason">เหตุผลในการปฏิเสธ *</Label>
              <Textarea
                id="reject_reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="ระบุเหตุผล"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => rejectRequest.mutate()}
              disabled={!rejectReason || rejectRequest.isPending}
            >
              {rejectRequest.isPending ? "กำลังบันทึก..." : "ยืนยันการปฏิเสธ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Equipment Image Dialog - Full size images */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              รูปภาพ: {selectedEquipmentName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-2">
            {selectedEquipmentImages.map((url, index) => (
              <div key={index} className="border rounded-lg overflow-hidden">
                <img
                  src={url}
                  alt={`${selectedEquipmentName} - ${index + 1}`}
                  className="w-full h-auto object-contain"
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Item Reject Dialog */}
      <Dialog open={itemRejectDialogOpen} onOpenChange={setItemRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              ปฏิเสธรายการสินค้า
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <Label className="text-muted-foreground">รหัสสินค้า</Label>
                  <p className="font-medium">{selectedItemForReject?.equipment_code || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">ชื่อสินค้า</Label>
                  <p className="font-medium">{selectedItemForReject?.equipment_name || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">จำนวนที่ขอ</Label>
                  <p className="font-medium">{selectedItemForReject?.quantity} {selectedItemForReject?.unit}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">คงเหลือในคลัง</Label>
                  <p className="font-medium">
                    {selectedItemForReject?.equipment_id ? getAvailableStock(selectedItemForReject.equipment_id) : "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="item_reject_reason">เหตุผลในการปฏิเสธรายการนี้ *</Label>
              <Textarea
                id="item_reject_reason"
                value={itemRejectReason}
                onChange={(e) => setItemRejectReason(e.target.value)}
                placeholder="เช่น สินค้าหมด, ไม่มีในคลัง, ต้องรอสั่งซื้อ..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setItemRejectDialogOpen(false); setItemRejectReason(""); }}>
              ยกเลิก
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => rejectItem.mutate()}
              disabled={!itemRejectReason || rejectItem.isPending}
            >
              {rejectItem.isPending ? "กำลังบันทึก..." : "ยืนยันการปฏิเสธ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default IssueGoods;
