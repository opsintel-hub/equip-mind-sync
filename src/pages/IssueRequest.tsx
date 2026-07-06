import React, { useState, useEffect } from "react";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Search, FileText, Clock, CheckCircle, XCircle, AlertTriangle, MapPin, RotateCcw, Image, Filter, X, Trash2, ShoppingCart, ChevronDown, ChevronUp, Lock, Layers, Eye, Pencil, Warehouse } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format, differenceInDays } from "date-fns";
import { th } from "date-fns/locale";
import BillboardSelect from "@/components/billboard/BillboardSelect";
import { CompanySelect } from "@/components/company/CompanySelect";
import { SectionSelect } from "@/components/section/SectionSelect";
import { SerialNumberSelect, SerialNumberItem } from "@/components/equipment/SerialNumberSelect";
import { SimpleDepartmentSelect } from "@/components/equipment/SimpleDepartmentSelect";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { TablePagination } from "@/components/TablePagination";
import { useTablePagination } from "@/hooks/useTablePagination";
import { SubMediaTypeBadge } from "@/components/media-player/SubMediaTypeBadge";
interface EquipmentWithDetails {
  id: string;
  code: string;
  name: string;
  unit: string;
  quantity_in_stock: number;
  serial_number: string | null;
  serial_number_2?: string | null;
  expiry_date: string | null;
  warranty_expiry_date: string | null;
  warehouse_entry_date: string;
  is_media_player?: boolean;
  category?: string;
  warehouse_name?: string | null;
  warehouse_code?: string | null;
  location_name?: string | null;
  location_code?: string | null;
}

interface IssuePurpose {
  id: string;
  name: string;
  description: string | null;
  requires_billboard: boolean;
  requires_return: boolean;
  allow_all_categories: boolean;
}

interface CategoryMapping {
  issue_purpose_id: string;
  category_id: string;
}

interface CartItem {
  id: string;
  equipment_id: string;
  equipment_code: string;
  equipment_name: string;
  quantity: number;
  unit: string;
  serial_number: string;
  billboard_id: string;
  notes: string;
  is_media_player?: boolean;
  media_player_id?: string;
  serial_number_source?: string; // Track the source prefix for S/N select value
  warehouse_name?: string;
  location_name?: string;
  department?: string | null;
  sub_media_type?: string | null;
}

const IssueRequest = () => {
  const queryClient = useQueryClient();
  const { profile: currentProfile, actorName: currentActorName } = useCurrentUserProfile();
  const [searchTerm, setSearchTerm] = useState("");
  const [fifoSearchTerm, setFifoSearchTerm] = useState("");
  const [fifoShowExpiring, setFifoShowExpiring] = useState(true);
  const [fifoShowWarranty, setFifoShowWarranty] = useState(true);
  const [fifoShowExpired, setFifoShowExpired] = useState(true);
  const [fifoShowWarrantyExpired, setFifoShowWarrantyExpired] = useState(true);
  const [customAdvanceDays, setCustomAdvanceDays] = useState<number | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedEquipmentImages, setSelectedEquipmentImages] = useState<string[]>([]);
  const [selectedEquipmentName, setSelectedEquipmentName] = useState("");
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  
  // Cart items - multiple items per request
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCartIds, setSelectedCartIds] = useState<Set<string>>(new Set());
  
  // Header form data
  const [headerData, setHeaderData] = useState({
    company_id: "",
    department_id: "",
    section: "",
    purpose_id: "",
    purpose: "",
    destination: "",
    requester_name: "",
    requester_phone: "",
    requester_department: "",
    notes: "",
    pickup_type: "scheduled",
    pickup_date: "",
    pickup_time: "",
  });

  // Current item form data
  const [currentItem, setCurrentItem] = useState({
    equipment_id: "",
    equipment_code: "",
    equipment_name: "",
    serial_number: "",
    serial_number_source: "", // Track source for SerialNumberSelect value
    quantity: "1",
    unit: "ชิ้น",
    billboard_id: "",
    notes: "",
  });
  
  // Current stock info for selected equipment
  const [currentStockInfo, setCurrentStockInfo] = useState<{
    currentStock: number;
    remainingAfterIssue: number;
  } | null>(null);
  
  // Stock warning dialog
  const [stockWarningOpen, setStockWarningOpen] = useState(false);
  const [suggestedQuantity, setSuggestedQuantity] = useState(0);
  
  // Track if quantity is locked (when selected via S/N)
  const [isQuantityLocked, setIsQuantityLocked] = useState(false);
  
  // Track editing cart item
  const [editingCartItemId, setEditingCartItemId] = useState<string | null>(null);

  // Fetch notification settings for advance_days
  const { data: notificationSettings } = useQuery({
    queryKey: ["notification-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_settings")
        .select("advance_days")
        .limit(1)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  const advanceDays = customAdvanceDays || notificationSettings?.advance_days || 30;

  // Fetch equipment with full details including expiry dates and category
  const { data: equipmentData } = useQuery({
    queryKey: ["equipment-active-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("id, code, name, unit, quantity_in_stock, serial_number, expiry_date, warranty_expiry_date, warehouse_entry_date, category, location_id, locations(id, code, name, warehouse_id, warehouses(id, code, name))")
        .eq("is_active", true)
        .gt("quantity_in_stock", 0)
        .order("warehouse_entry_date", { ascending: true });
      if (error) throw error;
      return (data || []).map((eq: any) => ({
        ...eq,
        warehouse_name: eq.locations?.warehouses?.name || null,
        warehouse_code: eq.locations?.warehouses?.code || null,
        location_name: eq.locations?.name || null,
        location_code: eq.locations?.code || null,
      })) as (EquipmentWithDetails & { category?: string })[];
    },
  });

  // Fetch media players for issuing
  const { data: mediaPlayersData } = useQuery({
    queryKey: ["media-players-active-for-issue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_players")
        .select("id, code, name, unit, quantity, serial_number_1, serial_number_2, warranty_expiry_date, created_at, location_id, department, sub_media_type, device_type, locations:location_id(id, code, name, warehouse_id, warehouses(id, code, name))")
        .eq("is_active", true)
        .gt("quantity", 0)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Map to EquipmentWithDetails format
      return data.map((mp: any) => ({
        id: mp.id,
        code: mp.code,
        name: mp.name,
        unit: mp.unit,
        quantity_in_stock: mp.quantity,
        serial_number: mp.serial_number_1,
        serial_number_2: mp.serial_number_2,
        expiry_date: null,
        warranty_expiry_date: mp.warranty_expiry_date,
        warehouse_entry_date: mp.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        is_media_player: true,
        warehouse_name: mp.locations?.warehouses?.name || null,
        warehouse_code: mp.locations?.warehouses?.code || null,
        location_name: mp.locations?.name || null,
        location_code: mp.locations?.code || null,
        department: mp.department || null,
        sub_media_type: mp.sub_media_type || null,
        device_type: mp.device_type || null,
      })) as EquipmentWithDetails[];
    },
  });

  // Combine equipment and media players
  const equipment = [
    ...(equipmentData || []),
    ...(mediaPlayersData || []),
  ].sort((a, b) => a.warehouse_entry_date.localeCompare(b.warehouse_entry_date));

  const getMediaPlayerGroupIds = (equipmentId: string) => {
    const selected = equipment.find((item) => item.id === equipmentId);
    if (!selected?.is_media_player) return undefined;
    return equipment
      .filter((item) => item.is_media_player && item.code === selected.code && item.name === selected.name && item.quantity_in_stock > 0)
      .map((item) => item.id);
  };

  // Pending reservations (other people's pending requests) — reduce available stock
  const { data: reservations } = useQuery({
    queryKey: ["pending-reservations"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_pending_reservations");
      if (error) throw error;
      const map: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        const key = r.media_player_id || r.equipment_id;
        if (key) map[key] = (map[key] || 0) + Number(r.reserved || 0);
      });
      return map;
    },
    staleTime: 30_000,
  });

  const getReserved = (id: string) => reservations?.[id] || 0;

  const getSelectableStock = (equipmentId: string) => {
    const selected = equipment.find((item) => item.id === equipmentId);
    if (!selected) return 0;
    if (!selected.is_media_player) {
      return Math.max((selected.quantity_in_stock || 0) - getReserved(equipmentId), 0);
    }

    return equipment
      .filter((item) => item.is_media_player && item.code === selected.code && item.name === selected.name)
      .reduce((sum, item) => sum + Math.max((item.quantity_in_stock || 0) - getReserved(item.id), 0), 0);
  };

  const selectedMediaPlayerIds = currentItem.equipment_id ? getMediaPlayerGroupIds(currentItem.equipment_id) : undefined;

  // Fetch issue purposes
  const { data: purposes } = useQuery({
    queryKey: ["issue-purposes-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issue_purposes")
        .select("id, name, description, requires_billboard, requires_return, allow_all_categories")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as IssuePurpose[];
    },
  });

  // Fetch issue purpose category mappings
  const { data: purposeCategoryMappings } = useQuery({
    queryKey: ["issue-purpose-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issue_purpose_categories")
        .select("issue_purpose_id, category_id");
      if (error) throw error;
      return data as CategoryMapping[];
    },
  });

  // Fetch all categories for displaying names
  const { data: categories } = useQuery({
    queryKey: ["categories-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true);
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  // Fetch departments
  const { data: departments } = useQuery({
    queryKey: ["departments-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch pending requests with items
  const { data: pendingRequests, isLoading } = useQuery({
    queryKey: ["goods-issue-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_issue_pending")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch items for each pending request
  const { data: pendingItems } = useQuery({
    queryKey: ["goods-issue-pending-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_issue_pending_items")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const selectedPurpose = purposes?.find((p) => p.id === headerData.purpose_id);

  // Get allowed category IDs for selected purpose
  const getAllowedCategoryIds = (): string[] => {
    if (!selectedPurpose) return [];
    if (selectedPurpose.allow_all_categories) return [];
    
    return purposeCategoryMappings
      ?.filter(m => m.issue_purpose_id === selectedPurpose.id)
      .map(m => m.category_id) || [];
  };

  // Get allowed category names for display
  const getAllowedCategoryNames = (): string[] => {
    const allowedIds = getAllowedCategoryIds();
    if (allowedIds.length === 0) return [];
    return categories
      ?.filter(c => allowedIds.includes(c.id))
      .map(c => c.name) || [];
  };

  // Filter equipment based on selected purpose's allowed categories
  const filteredEquipmentByCategory = equipment?.filter(eq => {
    if (!selectedPurpose) return true; // No purpose selected, show all
    if (selectedPurpose.allow_all_categories) return true; // Allow all
    
    const allowedCategoryIds = getAllowedCategoryIds();
    if (allowedCategoryIds.length === 0) return true; // No category restrictions
    
    // Media players don't have category, always include them
    if (eq.is_media_player) return true;
    
    // Check if equipment's category is in allowed list
    // Equipment uses category name (string), need to find matching category ID
    const equipmentCategory = categories?.find(c => c.name === eq.category);
    return equipmentCategory ? allowedCategoryIds.includes(equipmentCategory.id) : false;
  }) || [];

  // Add item to cart
  const handleAddToCart = () => {
    // Validate header fields first
    if (!headerData.requester_name.trim()) {
      toast.error("กรุณากรอกชื่อผู้ขอเบิกก่อนเพิ่มสินค้า");
      return;
    }
    if (!headerData.purpose_id) {
      toast.error("กรุณาเลือกวัตถุประสงค์ก่อนเพิ่มสินค้า");
      return;
    }
    if (!currentItem.equipment_id && !currentItem.equipment_name) {
      toast.error("กรุณาเลือกสินค้า");
      return;
    }
    if (!currentItem.quantity || parseInt(currentItem.quantity) < 1) {
      toast.error("กรุณาระบุจำนวน");
      return;
    }

    // Check if selected item is a Media Player
    const selectedEquipment = equipment?.find(e => e.id === currentItem.equipment_id);
    const isMediaPlayer = selectedEquipment?.is_media_player || false;
    const requestedQty = parseInt(currentItem.quantity);
    const currentStock = currentItem.equipment_id ? getSelectableStock(currentItem.equipment_id) : 0;

    // Validate stock
    if (currentStock < requestedQty) {
      // Show stock warning dialog
      setSuggestedQuantity(currentStock);
      setCurrentStockInfo({ currentStock, remainingAfterIssue: 0 });
      setStockWarningOpen(true);
      return;
    }

    addItemToCartInternal(isMediaPlayer);
  };

  // Internal function to add item to cart
  const addItemToCartInternal = (isMediaPlayer: boolean) => {
    const selectedEquipment = equipment?.find(e => e.id === currentItem.equipment_id);
    
    if (editingCartItemId) {
      // Update existing cart item
      setCartItems(prev => prev.map(item => 
        item.id === editingCartItemId ? {
          ...item,
          equipment_id: currentItem.equipment_id,
          equipment_code: currentItem.equipment_code,
          equipment_name: currentItem.equipment_name,
          quantity: parseInt(currentItem.quantity),
          unit: currentItem.unit,
          serial_number: currentItem.serial_number,
          serial_number_source: currentItem.serial_number_source,
          billboard_id: currentItem.billboard_id,
          notes: currentItem.notes,
          is_media_player: isMediaPlayer,
          media_player_id: isMediaPlayer ? currentItem.equipment_id : undefined,
          warehouse_name: selectedEquipment?.warehouse_name || undefined,
          location_name: selectedEquipment?.location_name || undefined,
          department: (selectedEquipment as any)?.department || item.department || null,
          sub_media_type: (selectedEquipment as any)?.sub_media_type || item.sub_media_type || null,
        } : item
      ));
      setEditingCartItemId(null);
      toast.success("อัปเดตรายการเรียบร้อยแล้ว");
    } else {
      const newItem: CartItem = {
        id: crypto.randomUUID(),
        equipment_id: currentItem.equipment_id,
        equipment_code: currentItem.equipment_code,
        equipment_name: currentItem.equipment_name,
        quantity: parseInt(currentItem.quantity),
        unit: currentItem.unit,
        serial_number: currentItem.serial_number,
        serial_number_source: currentItem.serial_number_source,
        billboard_id: currentItem.billboard_id,
        notes: currentItem.notes,
        is_media_player: isMediaPlayer,
        media_player_id: isMediaPlayer ? currentItem.equipment_id : undefined,
        warehouse_name: selectedEquipment?.warehouse_name || undefined,
        location_name: selectedEquipment?.location_name || undefined,
        department: (selectedEquipment as any)?.department || null,
        sub_media_type: (selectedEquipment as any)?.sub_media_type || null,
      };

      setCartItems([...cartItems, newItem]);
      setSelectedCartIds(prev => new Set(prev).add(newItem.id));
    }
    
    // Reset current item form
    setCurrentItem({
      equipment_id: "",
      equipment_code: "",
      equipment_name: "",
      serial_number: "",
      serial_number_source: "",
      quantity: "1",
      unit: "ชิ้น",
      billboard_id: "",
      notes: "",
    });
    setIsQuantityLocked(false);
    setCurrentStockInfo(null);

    if (!editingCartItemId) {
      toast.success("เพิ่มรายการลงตะกร้าแล้ว");
    }
  };

  // Accept suggested quantity from warning dialog
  const handleAcceptSuggestedQuantity = () => {
    setCurrentItem(prev => ({ ...prev, quantity: suggestedQuantity.toString() }));
    setStockWarningOpen(false);
    
    // Update stock info
    const selectedEquipment = equipment?.find(e => e.id === currentItem.equipment_id);
    if (selectedEquipment) {
      setCurrentStockInfo({
        currentStock: getSelectableStock(currentItem.equipment_id),
        remainingAfterIssue: getSelectableStock(currentItem.equipment_id) - suggestedQuantity,
      });
    }
  };

  // Edit cart item - load data back into form
  const handleEditCartItem = (item: CartItem) => {
    setEditingCartItemId(item.id);
    setCurrentItem({
      equipment_id: item.equipment_id,
      equipment_code: item.equipment_code,
      equipment_name: item.equipment_name,
      serial_number: item.serial_number || "",
      serial_number_source: item.serial_number_source || "",
      quantity: String(item.quantity),
      unit: item.unit,
      billboard_id: item.billboard_id || "",
      notes: item.notes || "",
    });
    setIsQuantityLocked(Boolean(item.serial_number));
    
    // Update stock info
    const selectedEquipment = equipment?.find(e => e.id === item.equipment_id);
    if (selectedEquipment) {
      setCurrentStockInfo({
        currentStock: getSelectableStock(item.equipment_id),
        remainingAfterIssue: getSelectableStock(item.equipment_id) - item.quantity,
      });
    }
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.info("กำลังแก้ไขรายการ — แก้ไขข้อมูลแล้วกดปุ่มบันทึก");
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingCartItemId(null);
    setCurrentItem({
      equipment_id: "",
      equipment_code: "",
      equipment_name: "",
      serial_number: "",
      serial_number_source: "",
      quantity: "1",
      unit: "ชิ้น",
      billboard_id: "",
      notes: "",
    });
    setIsQuantityLocked(false);
    setCurrentStockInfo(null);
  };


  const handleRemoveFromCart = (itemId: string) => {
    setCartItems(cartItems.filter(item => item.id !== itemId));
    setSelectedCartIds(prev => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  };

  // Remove selected items from cart
  const handleRemoveSelected = () => {
    if (selectedCartIds.size === 0) return;
    setCartItems(cartItems.filter(item => !selectedCartIds.has(item.id)));
    setSelectedCartIds(new Set());
  };

  // Toggle select all cart items
  const handleToggleSelectAll = () => {
    if (selectedCartIds.size === cartItems.length) {
      setSelectedCartIds(new Set());
    } else {
      setSelectedCartIds(new Set(cartItems.map(item => item.id)));
    }
  };

  // Create request mutation
  const createRequest = useMutation({
    mutationFn: async () => {
      const itemsToSubmit = cartItems.filter(item => selectedCartIds.has(item.id));
      if (itemsToSubmit.length === 0) {
        throw new Error("กรุณาเลือกรายการสินค้าอย่างน้อย 1 รายการ");
      }

      const purposeName = purposes?.find((p) => p.id === headerData.purpose_id)?.name || headerData.purpose;
      
      // Check if first item is a Media Player
      const firstItemIsMediaPlayer = itemsToSubmit[0]?.is_media_player || false;
      const totalRequestedQty = itemsToSubmit.reduce((sum, item) => sum + item.quantity, 0);

      // Approval required if request contains any Media Player OR any asset (is_asset = true) item
      let requiresApproval = false;
      for (const item of itemsToSubmit) {
        if (item.is_media_player) {
          requiresApproval = true;
          break;
        }
        if (item.equipment_id) {
          const { data: eqData } = await supabase
            .from("equipment")
            .select("is_asset")
            .eq("id", item.equipment_id)
            .single();
          if (eqData?.is_asset) {
            requiresApproval = true;
            break;
          }
        }
      }
      
      // Create header record
      const { data: headerRecord, error: headerError } = await supabase
        .from("goods_issue_pending")
        .insert({
          purpose_id: headerData.purpose_id || null,
          purpose: purposeName || null,
          destination: headerData.destination || null,
          requester_name: headerData.requester_name,
          requester_phone: headerData.requester_phone || null,
          requester_department: headerData.requester_department || null,
          notes: headerData.notes || null,
          pickup_type: headerData.pickup_type || 'scheduled',
          total_items: itemsToSubmit.length,
          company_id: headerData.company_id || null,
          equipment_id: firstItemIsMediaPlayer ? null : (itemsToSubmit[0]?.equipment_id || null),
          media_player_id: firstItemIsMediaPlayer ? itemsToSubmit[0]?.media_player_id : null,
          is_media_player: firstItemIsMediaPlayer,
          equipment_code: itemsToSubmit[0]?.equipment_code || null,
          equipment_name: itemsToSubmit[0]?.equipment_name || null,
          quantity: totalRequestedQty,
          issued_quantity: 0,
          remaining_quantity: totalRequestedQty,
          unit: itemsToSubmit[0]?.unit || "ชิ้น",
          billboard_id: itemsToSubmit[0]?.billboard_id || null,
          is_complete: !selectedPurpose?.requires_billboard || itemsToSubmit.every(item => !!item.billboard_id),
          pickup_date: headerData.pickup_date || null,
          pickup_time: headerData.pickup_time || null,
          requires_approval: requiresApproval,
          approval_status: requiresApproval ? "pending" : "not_required",
          status: requiresApproval ? "pending_approval" : "pending",
        } as any)
        .select()
        .single();

      if (headerError) throw headerError;

      // Create item records
      const itemsToInsert = itemsToSubmit.map(item => ({
        pending_id: headerRecord.id,
        equipment_id: item.is_media_player ? null : (item.equipment_id || null),
        media_player_id: item.is_media_player ? item.media_player_id : null,
        is_media_player: item.is_media_player || false,
        equipment_code: item.equipment_code || null,
        equipment_name: item.equipment_name || null,
        quantity: item.quantity,
        unit: item.unit,
        serial_number: item.serial_number || null,
        billboard_id: item.billboard_id || null,
        remaining_quantity: item.quantity,
        status: "pending",
        notes: item.notes || null,
        sub_media_type: item.sub_media_type || null,
      })) as any;

      const { error: itemsError } = await supabase
        .from("goods_issue_pending_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
      
      return { requiresApproval };
    },
    onSuccess: (result) => {
      const submittedCount = selectedCartIds.size;
      const remainingItems = cartItems.filter(item => !selectedCartIds.has(item.id));
      
      if (result?.requiresApproval) {
        toast.success(`ส่งคำขอเบิกสำเร็จ (${submittedCount} รายการ) — รอผู้มีอำนาจอนุมัติ`, { duration: 5000 });
      } else {
        toast.success(`ส่งคำขอเบิกสำเร็จ (${submittedCount} รายการ)`);
      }
      queryClient.invalidateQueries({ queryKey: ["goods-issue-pending"] });
      queryClient.invalidateQueries({ queryKey: ["goods-issue-pending-items"] });
      
      // Keep unselected items in cart, reset selected
      setCartItems(remainingItems);
      setSelectedCartIds(new Set());
      
      // Only reset header if cart is now empty
      if (remainingItems.length === 0) {
        setHeaderData({
          company_id: "",
          department_id: "",
          section: "",
          purpose_id: "",
          purpose: "",
          destination: "",
          requester_name: "",
          requester_phone: "",
          requester_department: "",
          notes: "",
          pickup_type: "scheduled",
          pickup_date: "",
          pickup_time: "",
        });
      }
    },
    onError: (error) => {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    },
  });

  const inferSerialSource = (item: any): string => {
    if (!item?.serial_number) return "";
    if (item?.is_media_player) {
      const mediaPlayer = mediaPlayersData?.find((mp) => mp.id === item.media_player_id);
      if (mediaPlayer?.serial_number_2 && mediaPlayer.serial_number_2 === item.serial_number) {
        return "media_player_sn2";
      }
      return "media_player_sn1";
    }
    return "equipment";
  };

  // Handle editing a rejected request - load its data back into the form
  const handleEditRejectedRequest = (req: any, items: any[]) => {
    // Load header data
    setHeaderData({
      company_id: req.company_id || "",
      department_id: "",
      section: "",
      purpose_id: req.purpose_id || "",
      purpose: req.purpose || "",
      destination: req.destination || "",
      requester_name: req.requester_name || "",
      requester_phone: req.requester_phone || "",
      requester_department: req.requester_department || "",
      notes: req.notes || "",
      pickup_type: req.pickup_type || "scheduled",
      pickup_date: req.pickup_date || "",
      pickup_time: req.pickup_time || "",
    });

    // Load items back into cart
    const restoredItems: CartItem[] = items.map((item: any) => ({
      id: crypto.randomUUID(),
      equipment_id: item.is_media_player ? (item.media_player_id || "") : (item.equipment_id || ""),
      equipment_code: item.equipment_code || "",
      equipment_name: item.equipment_name || "",
      quantity: item.quantity || 1,
      unit: item.unit || "ชิ้น",
      serial_number: item.serial_number || "",
      serial_number_source: inferSerialSource(item),
      billboard_id: item.billboard_id || "",
      notes: item.notes || "",
      is_media_player: item.is_media_player || false,
      media_player_id: item.is_media_player ? item.media_player_id : undefined,
    }));

    setCartItems(restoredItems);
    setSelectedCartIds(new Set(restoredItems.map(i => i.id)));

    // Prefill "เพิ่มรายการสินค้า" with the first restored item for easier correction
    const firstItem = restoredItems[0];
    if (firstItem) {
      setCurrentItem({
        equipment_id: firstItem.equipment_id,
        equipment_code: firstItem.equipment_code,
        equipment_name: firstItem.equipment_name,
        serial_number: firstItem.serial_number,
        serial_number_source: firstItem.serial_number_source || "",
        quantity: String(firstItem.quantity || 1),
        unit: firstItem.unit || "ชิ้น",
        billboard_id: firstItem.billboard_id || "",
        notes: firstItem.notes || "",
      });
      setIsQuantityLocked(Boolean(firstItem.serial_number));
    }

    toast.info("โหลดข้อมูลคำขอเดิมแล้ว — แก้ไขที่ฟอร์ม/ตะกร้าและส่งใหม่ได้ทันที");

    // Scroll to form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (!headerData.requester_name) {
      toast.error("กรุณากรอกชื่อผู้ขอเบิก");
      return;
    }
    if (!headerData.purpose_id) {
      toast.error("กรุณาเลือกวัตถุประสงค์");
      return;
    }
    if (selectedCartIds.size === 0) {
      toast.error("กรุณาเลือกรายการสินค้าอย่างน้อย 1 รายการ");
      return;
    }
    createRequest.mutate();
  };

  const handleEquipmentSelect = (equipmentId: string) => {
    const selected = equipment?.find((e) => e.id === equipmentId);
    if (selected) {
      setCurrentItem({
        ...currentItem,
        equipment_id: selected.id,
        equipment_code: selected.code,
        equipment_name: selected.name,
        unit: selected.unit,
        serial_number: "", // Clear S/N when changing equipment
        serial_number_source: "",
      });
      setIsQuantityLocked(false); // Reset lock when selecting via equipment dropdown
      // Update stock info
      const stock = getSelectableStock(selected.id);
      setCurrentStockInfo({
        currentStock: stock,
        remainingAfterIssue: stock - parseInt(currentItem.quantity || "1"),
      });
    } else {
      setCurrentStockInfo(null);
    }
  };

  // Handler for Serial Number searchable dropdown selection
  const handleSerialNumberSelect = (item: SerialNumberItem | null) => {
    if (item) {
      // Find the equipment to get current stock
      const selectedEquipment = equipment?.find(e => e.id === item.id);
      setCurrentItem({
        ...currentItem,
        equipment_id: item.id,
        equipment_code: item.code,
        equipment_name: item.name,
        unit: item.unit,
        serial_number: item.serial_number,
        serial_number_source: item.source, // Store the source for value matching
        quantity: "1", // Lock quantity to 1
      });
      setIsQuantityLocked(true); // Lock quantity when selected via S/N
      // Update stock info
      if (selectedEquipment) {
        const stock = getSelectableStock(item.id);
        setCurrentStockInfo({
          currentStock: stock,
          remainingAfterIssue: stock - 1,
        });
      }
    } else {
      // Clear the selection
      setCurrentItem({
        ...currentItem,
        equipment_id: "",
        equipment_code: "",
        equipment_name: "",
        serial_number: "",
        serial_number_source: "",
        quantity: "1",
      });
      setIsQuantityLocked(false);
      setCurrentStockInfo(null);
    }
  };

  // Update stock info when quantity changes
  const handleQuantityChange = (newQty: string) => {
    setCurrentItem({ ...currentItem, quantity: newQty });
    
    if (currentItem.equipment_id) {
      const selectedEquipment = equipment?.find(e => e.id === currentItem.equipment_id);
      if (selectedEquipment) {
        const qty = parseInt(newQty) || 0;
        const stock = getSelectableStock(currentItem.equipment_id);
        setCurrentStockInfo({
          currentStock: stock,
          remainingAfterIssue: stock - qty,
        });
      }
    }
  };

  const handleViewEquipmentImages = async (equipmentId: string, equipmentName: string) => {
    const urls: string[] = [];

    // 1. equipment_images
    const { data: eqImgs } = await supabase
      .from("equipment_images")
      .select("image_url")
      .eq("equipment_id", equipmentId)
      .order("display_order");
    if (eqImgs) urls.push(...eqImgs.map(d => d.image_url).filter(Boolean));

    // 2. equipment.image_url (master fallback)
    const eqRow = equipment?.find(e => e.id === equipmentId) as any;
    if (eqRow?.image_url && !urls.includes(eqRow.image_url)) {
      urls.push(eqRow.image_url);
    }

    // 3. media_player_images (for media player items)
    if (eqRow?.is_media_player) {
      const { data: mpImgs } = await supabase
        .from("media_player_images")
        .select("image_url")
        .eq("media_player_id", equipmentId)
        .order("display_order");
      if (mpImgs) {
        for (const m of mpImgs) {
          if (m.image_url && !urls.includes(m.image_url)) urls.push(m.image_url);
        }
      }
    }

    if (urls.length === 0) {
      toast.info("ไม่พบรูปภาพสินค้านี้");
      return;
    }

    setSelectedEquipmentImages(urls);
    setSelectedEquipmentName(equipmentName);
    setImageDialogOpen(true);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />รอดำเนินการ</Badge>;
      case "pending_approval":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800"><Lock className="h-3 w-3 mr-1" />รออนุมัติ</Badge>;
      case "issued":
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />จ่ายแล้ว</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />ปฏิเสธ</Badge>;
      case "waiting_stock":
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800"><Clock className="h-3 w-3 mr-1" />รอสินค้า</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getExpiryBadge = (expiryDate: string | null, warrantyDate: string | null) => {
    const today = new Date();
    let badges = [];
    
    if (expiryDate) {
      const days = differenceInDays(new Date(expiryDate), today);
      if (days <= 0) {
        badges.push(<Badge key="exp" className="bg-destructive/10 text-destructive text-xs">หมดอายุแล้ว</Badge>);
      } else if (days <= advanceDays) {
        badges.push(<Badge key="exp" className="bg-orange-500/10 text-orange-500 text-xs">หมดอายุใน {days} วัน</Badge>);
      }
    }
    
    if (warrantyDate) {
      const days = differenceInDays(new Date(warrantyDate), today);
      if (days <= 0) {
        badges.push(<Badge key="war" className="bg-warning/10 text-warning text-xs">ประกันหมดแล้ว</Badge>);
      } else if (days <= advanceDays) {
        badges.push(<Badge key="war" className="bg-warning/10 text-warning text-xs">ประกันหมดใน {days} วัน</Badge>);
      }
    }
    
    return badges.length > 0 ? <div className="flex flex-wrap gap-1">{badges}</div> : null;
  };

  const filteredRequests = pendingRequests?.filter(
    (req) =>
      req.document_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.equipment_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requester_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getItemsForRequest = (requestId: string) => {
    return pendingItems?.filter(item => item.pending_id === requestId) || [];
  };

  // Separate equipment into priority groups for FIFO with filtering
  const priorityEquipment = equipment?.filter(eq => {
    if (fifoSearchTerm) {
      const search = fifoSearchTerm.toLowerCase();
      if (!eq.code.toLowerCase().includes(search) && 
          !eq.name.toLowerCase().includes(search) &&
          !(eq.serial_number?.toLowerCase().includes(search))) {
        return false;
      }
    }
    
    if (!eq.expiry_date && !eq.warranty_expiry_date) return false;
    const today = new Date();
    const expiryDays = eq.expiry_date ? differenceInDays(new Date(eq.expiry_date), today) : Infinity;
    const warrantyDays = eq.warranty_expiry_date ? differenceInDays(new Date(eq.warranty_expiry_date), today) : Infinity;
    
    const isExpired = expiryDays <= 0;
    const isExpiring = expiryDays > 0 && expiryDays <= advanceDays;
    const isWarrantyExpired = warrantyDays <= 0;
    const isWarrantyExpiring = warrantyDays > 0 && warrantyDays <= advanceDays;
    
    const matchesExpired = fifoShowExpired && isExpired;
    const matchesExpiring = fifoShowExpiring && isExpiring;
    const matchesWarrantyExpired = fifoShowWarrantyExpired && isWarrantyExpired;
    const matchesWarranty = fifoShowWarranty && isWarrantyExpiring;
    
    return matchesExpired || matchesExpiring || matchesWarrantyExpired || matchesWarranty;
  }) || [];

  const hasAnyPriorityItems = equipment?.some(eq => {
    if (!eq.expiry_date && !eq.warranty_expiry_date) return false;
    const today = new Date();
    const expiryDays = eq.expiry_date ? differenceInDays(new Date(eq.expiry_date), today) : Infinity;
    const warrantyDays = eq.warranty_expiry_date ? differenceInDays(new Date(eq.warranty_expiry_date), today) : Infinity;
    return expiryDays <= advanceDays || warrantyDays <= advanceDays;
  }) || false;

  const fifoPagination = useTablePagination(priorityEquipment, 10);
  const historyPagination = useTablePagination(filteredRequests || [], 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">ขอเบิกสินค้า</h1>
        <p className="text-muted-foreground">สำหรับผู้ขอเบิกสินค้า - รองรับหลายรายการต่อ 1 เอกสาร</p>
      </div>

      {/* Priority Alert - Items approaching expiry */}
      {hasAnyPriorityItems && (
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              สินค้าควรเบิกก่อน (FIFO)
            </CardTitle>
            <CardDescription>
              รายการสินค้าที่ใกล้หมดอายุหรือใกล้หมดประกันภายใน {advanceDays} วัน - แนะนำให้เบิกก่อน
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* FIFO Filters */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="flex items-center gap-1">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">กรอง:</span>
              </div>
              <div className="relative flex-1 max-w-[140px]">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="ค้นหารหัส/ชื่อ..."
                  value={fifoSearchTerm}
                  onChange={(e) => setFifoSearchTerm(e.target.value)}
                  className="pl-7 h-7 text-xs"
                />
              </div>
              <Select
                value={customAdvanceDays?.toString() || "default"}
                onValueChange={(value) => setCustomAdvanceDays(value === "default" ? null : parseInt(value))}
              >
                <SelectTrigger className="h-7 w-24 text-xs">
                  <SelectValue placeholder="วัน" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">ค่าตั้ง ({notificationSettings?.advance_days || 30} วัน)</SelectItem>
                  <SelectItem value="30">30 วัน</SelectItem>
                  <SelectItem value="60">60 วัน</SelectItem>
                  <SelectItem value="90">90 วัน</SelectItem>
                  <SelectItem value="120">120 วัน</SelectItem>
                  <SelectItem value="180">180 วัน</SelectItem>
                  <SelectItem value="365">365 วัน</SelectItem>
                  <SelectItem value="99999">ทั้งหมด</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant={fifoShowExpired ? "destructive" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setFifoShowExpired(!fifoShowExpired)}
              >
                หมดอายุแล้ว
              </Button>
              <Button
                type="button"
                variant={fifoShowExpiring ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setFifoShowExpiring(!fifoShowExpiring)}
              >
                ใกล้หมดอายุ
              </Button>
              <Button
                type="button"
                variant={fifoShowWarrantyExpired ? "destructive" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setFifoShowWarrantyExpired(!fifoShowWarrantyExpired)}
              >
                ประกันหมดแล้ว
              </Button>
              <Button
                type="button"
                variant={fifoShowWarranty ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setFifoShowWarranty(!fifoShowWarranty)}
              >
                ใกล้หมดประกัน
              </Button>
              {fifoSearchTerm && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setFifoSearchTerm("")}
                >
                  <X className="h-3 w-3 mr-1" />
                  ล้าง
                </Button>
              )}
            </div>
            
            {/* Grid with pagination */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {fifoPagination.paginatedData.map((eq) => (
                <div 
                  key={eq.id} 
                  className="p-2 rounded-lg border border-warning/30 bg-background cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleEquipmentSelect(eq.id)}
                >
                  {eq.is_media_player && (
                    <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 mb-1">MP</Badge>
                  )}
                  <div className="font-medium text-xs truncate">{eq.code}</div>
                  <div className="text-xs text-muted-foreground truncate">{eq.name}</div>
                  {eq.serial_number && (
                    <div className="text-[10px] text-muted-foreground truncate">SN: {eq.serial_number}</div>
                  )}
                  <div className="text-[10px] text-muted-foreground">คงเหลือ: {eq.quantity_in_stock} {eq.unit}</div>
                  <div className="mt-1">
                    {getExpiryBadge(eq.expiry_date, eq.warranty_expiry_date)}
                  </div>
                </div>
              ))}
            </div>
            {priorityEquipment.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-4">
                ไม่พบสินค้าที่ตรงกับเงื่อนไข
              </div>
            )}
            <TablePagination
              currentPage={fifoPagination.currentPage}
              totalPages={fifoPagination.totalPages}
              totalItems={fifoPagination.totalItems}
              pageSize={fifoPagination.pageSize}
              onPageChange={fifoPagination.handlePageChange}
              onPageSizeChange={fifoPagination.handlePageSizeChange}
            />
          </CardContent>
        </Card>
      )}

      {/* Request Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            แบบฟอร์มขอเบิกสินค้า
          </CardTitle>
          <CardDescription>
            เพิ่มหลายรายการสินค้าในคำขอเดียว และระบุป้ายโฆษณาแยกต่างหากสำหรับแต่ละรายการได้
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header Section - Requester Info */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                ข้อมูลผู้ขอเบิก
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="requester_name">ชื่อผู้ขอเบิก *</Label>
                  <Input
                    id="requester_name"
                    value={headerData.requester_name}
                    onChange={(e) => setHeaderData({ ...headerData, requester_name: e.target.value })}
                    placeholder="กรอกชื่อ-นามสกุล"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requester_phone">เบอร์โทรศัพท์</Label>
                  <Input
                    id="requester_phone"
                    value={headerData.requester_phone}
                    onChange={(e) => setHeaderData({ ...headerData, requester_phone: e.target.value })}
                    placeholder="กรอกเบอร์โทร"
                  />
                </div>
                {/* ฝ่าย and แผนก - Adjacent layout */}
                <div className="space-y-2">
                  <Label htmlFor="department">ฝ่าย</Label>
                  <SimpleDepartmentSelect
                    value={headerData.requester_department}
                    onChange={(value) => setHeaderData({ ...headerData, requester_department: value, section: "" })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="section">แผนก</Label>
                  <SectionSelect
                    value={headerData.section}
                    onChange={(value) => setHeaderData({ ...headerData, section: value })}
                    departmentId={departments?.find(d => d.name === headerData.requester_department)?.id}
                    disabled={!headerData.requester_department}
                    placeholder={headerData.requester_department ? "เลือกแผนก..." : "เลือกฝ่ายก่อน"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purpose_id">วัตถุประสงค์ *</Label>
                  <Select
                    value={headerData.purpose_id} 
                    onValueChange={(value) => {
                      const purpose = purposes?.find((p) => p.id === value);
                      setHeaderData({ 
                        ...headerData, 
                        purpose_id: value, 
                        purpose: purpose?.name || "",
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกวัตถุประสงค์" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
                      {purposes?.map((purpose) => (
                        <SelectItem key={purpose.id} value={purpose.id}>
                          <div className="flex items-center gap-2">
                            <span>{purpose.name}</span>
                            {purpose.requires_billboard && (
                              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                <MapPin className="h-3 w-3 mr-1" />ระบุป้าย
                              </Badge>
                            )}
                            {purpose.requires_return && (
                              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                                <RotateCcw className="h-3 w-3 mr-1" />ต้องคืน
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickup_type">รูปแบบการรับสินค้า</Label>
                  <Select
                    value={headerData.pickup_type}
                    onValueChange={(value) => setHeaderData({ 
                      ...headerData, 
                      pickup_type: value,
                      // Clear date/time when switching away from scheduled
                      pickup_date: value === "scheduled" ? headerData.pickup_date : "",
                      pickup_time: value === "scheduled" ? headerData.pickup_time : "",
                      // Clear destination when switching away from delivery
                      destination: value === "delivery" ? headerData.destination : "",
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกรูปแบบ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wait_onsite">🏪 รอรับที่คลัง (รับทันที)</SelectItem>
                      <SelectItem value="scheduled">📅 นัดรับล่วงหน้า</SelectItem>
                      <SelectItem value="delivery">🚚 จัดส่ง</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {headerData.pickup_type === "delivery" && (
                  <div className="space-y-2">
                    <Label htmlFor="destination">จุดหมายจัดส่ง</Label>
                    <Input
                      id="destination"
                      value={headerData.destination}
                      onChange={(e) => setHeaderData({ ...headerData, destination: e.target.value })}
                      placeholder="ระบุจุดหมาย/สถานที่จัดส่ง"
                    />
                  </div>
                )}
                {headerData.pickup_type === "scheduled" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="pickup_date">วันที่ต้องการรับสินค้า</Label>
                      <Input
                        id="pickup_date"
                        type="date"
                        value={headerData.pickup_date}
                        onChange={(e) => setHeaderData({ ...headerData, pickup_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pickup_time">เวลาที่ต้องการรับสินค้า</Label>
                      <Input
                        id="pickup_time"
                        type="time"
                        value={headerData.pickup_time}
                        onChange={(e) => setHeaderData({ ...headerData, pickup_time: e.target.value })}
                      />
                    </div>
                  </>
                )}
                {headerData.pickup_type === "scheduled" && (headerData.pickup_date || headerData.pickup_time) && (
                  <div className="md:col-span-3">
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                      💡 ระบุวันที่และเวลาล่วงหน้า เพื่อให้เจ้าหน้าที่คลังมีเวลาจัดเตรียมสินค้าให้พร้อมก่อนถึงเวลารับ
                    </p>
                  </div>
                )}
                {headerData.pickup_type === "wait_onsite" && (
                  <div className="md:col-span-3">
                    <p className="text-xs text-primary bg-primary/5 rounded-md px-3 py-2">
                      🏪 ผู้ขอเบิกจะรอรับสินค้าที่คลัง — เจ้าหน้าที่คลังจะได้รับแจ้งให้จัดเตรียมสินค้าทันที
                    </p>
                  </div>
                )}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">หมายเหตุ</Label>
                  <Textarea
                    id="notes"
                    value={headerData.notes}
                    onChange={(e) => setHeaderData({ ...headerData, notes: e.target.value })}
                    placeholder="หมายเหตุเพิ่มเติม"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Add Item Section */}
            <div className="p-4 border rounded-lg space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                {editingCartItemId ? (
                  <>
                    <Pencil className="h-4 w-4 text-primary" />
                    <span className="text-primary">แก้ไขรายการสินค้า</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4" />
                    เพิ่มรายการสินค้า
                  </>
                )}
              </h3>
              
              {/* Category restriction notice */}
              {selectedPurpose && !selectedPurpose.allow_all_categories && getAllowedCategoryNames().length > 0 && (
                <div className="text-sm bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                  <p className="text-blue-800 dark:text-blue-200">
                    <Layers className="h-4 w-4 inline mr-1" />
                    วัตถุประสงค์นี้เบิกได้เฉพาะหมวดหมู่: <strong>{getAllowedCategoryNames().join(", ")}</strong>
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>เลือกสินค้า (FIFO)</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <SearchableSelect
                        options={(() => {
                          const list = filteredEquipmentByCategory || [];
                          // Dedupe Media Player rows by code+name (1 รหัส 1 บรรทัด รวมจำนวนคงเหลือ)
                          // Equipment ปกติยังคงแสดงตามเดิม (1 row ต่อ 1 record)
                          const mpGroups = new Map<string, { rep: typeof list[number]; total: number; count: number }>();
                          const nonMp: typeof list = [];
                          for (const eq of list) {
                            if (eq.is_media_player) {
                              const key = `${eq.code}::${eq.name}`;
                              const g = mpGroups.get(key);
                              if (g) {
                                g.total += eq.quantity_in_stock || 0;
                                g.count += 1;
                              } else {
                                mpGroups.set(key, { rep: eq, total: eq.quantity_in_stock || 0, count: 1 });
                              }
                            } else {
                              nonMp.push(eq);
                            }
                          }
                          const mpOptions = Array.from(mpGroups.values()).map(({ rep, total, count }) => ({
                            value: rep.id,
                            label: `${rep.code} - ${rep.name}`,
                            description: `[Media Player] คงเหลือ: ${total} ${rep.unit}${count > 1 ? ` (${count} เครื่อง)` : ''}`,
                            searchableText: `${rep.code} ${rep.name} ${rep.category || ''}`,
                          }));
                          const otherOptions = nonMp.map((eq) => ({
                            value: eq.id,
                            label: `${eq.code} - ${eq.name}`,
                            description: `${eq.category ? `[${eq.category}] ` : ''}คงเหลือ: ${eq.quantity_in_stock} ${eq.unit}`,
                            searchableText: `${eq.code} ${eq.name} ${eq.serial_number || ''} ${eq.category || ''}`,
                          }));
                          return [...mpOptions, ...otherOptions];
                        })()}
                        value={currentItem.equipment_id}
                        onValueChange={handleEquipmentSelect}
                        placeholder="เลือกสินค้า"
                        searchPlaceholder="พิมพ์รหัส, ชื่อ หรือ S/N..."
                        emptyMessage={selectedPurpose && !selectedPurpose.allow_all_categories ? "ไม่พบสินค้าในหมวดหมู่ที่อนุญาต" : "ไม่พบสินค้า"}
                      />
                    </div>
                    {currentItem.equipment_id && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewEquipmentImages(currentItem.equipment_id, currentItem.equipment_name)}
                      >
                        <Image className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    จำนวน
                    {isQuantityLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={currentItem.quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    placeholder="จำนวน"
                    disabled={isQuantityLocked}
                    className={isQuantityLocked ? "bg-muted" : ""}
                  />
                  {/* Stock Info Display */}
                  {currentStockInfo && (
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">คงเหลือในคลัง:</span>
                        <span className="font-medium">{currentStockInfo.currentStock} {currentItem.unit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">หลังเบิก:</span>
                        <span className={`font-medium ${currentStockInfo.remainingAfterIssue < 0 ? 'text-destructive' : 'text-primary'}`}>
                          {currentStockInfo.remainingAfterIssue} {currentItem.unit}
                        </span>
                      </div>
                      {currentStockInfo.remainingAfterIssue < 0 && (
                        <div className="text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          จำนวนไม่เพียงพอ
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>หน่วย</Label>
                  <Input
                    value={currentItem.unit}
                    onChange={(e) => setCurrentItem({ ...currentItem, unit: e.target.value })}
                    placeholder="หน่วย"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <Label>ป้ายโฆษณา (สำหรับรายการนี้) {selectedPurpose?.requires_billboard ? "*" : ""}</Label>
                    <BillboardSelect
                      value={currentItem.billboard_id}
                      onChange={(value) => setCurrentItem({ ...currentItem, billboard_id: value })}
                    />
                  </div>
                <div className="space-y-2 md:col-span-4">
                  <Label>หมายเหตุรายการ</Label>
                  <Input
                    value={currentItem.notes}
                    onChange={(e) => setCurrentItem({ ...currentItem, notes: e.target.value })}
                    placeholder="หมายเหตุ"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant={editingCartItemId ? "default" : "secondary"} onClick={handleAddToCart}>
                  {editingCartItemId ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      บันทึกการแก้ไข
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      เพิ่มลงตะกร้า
                    </>
                  )}
                </Button>
                {editingCartItemId && (
                  <Button type="button" variant="outline" onClick={handleCancelEdit}>
                    <X className="h-4 w-4 mr-2" />
                    ยกเลิกแก้ไข
                  </Button>
                )}
              </div>
            </div>

            {/* Cart Items */}
            {cartItems.length > 0 && (
              <div className="p-4 border border-primary/30 bg-primary/5 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    ตะกร้าสินค้าขอเบิก ({cartItems.length} รายการ)
                  </h3>
                  <div className="flex items-center gap-2">
                    {selectedCartIds.size > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveSelected}
                        className="text-destructive hover:text-destructive gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        ลบที่เลือก ({selectedCartIds.size})
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => { setCartItems([]); setSelectedCartIds(new Set()); }}
                      className="text-destructive hover:text-destructive gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      ล้างตะกร้า
                    </Button>
                  </div>
                </div>
                <ScrollArea className="max-h-60">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={cartItems.length > 0 && selectedCartIds.size === cartItems.length}
                            onCheckedChange={handleToggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>#</TableHead>
                        <TableHead>รหัส/ชื่อสินค้า</TableHead>
                        <TableHead>S/N</TableHead>
                        <TableHead>คลังสินค้า</TableHead>
                        <TableHead>ตำแหน่งจัดเก็บ</TableHead>
                        <TableHead className="text-right">จำนวน</TableHead>
                        <TableHead>ป้ายโฆษณา</TableHead>
                        <TableHead>หมายเหตุ</TableHead>
                        <TableHead className="w-[80px]">จัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cartItems.map((item, index) => (
                        <TableRow key={item.id} className={selectedCartIds.has(item.id) ? "bg-primary/5" : ""}>
                          <TableCell>
                            <Checkbox
                              checked={selectedCartIds.has(item.id)}
                              onCheckedChange={(checked) => {
                                setSelectedCartIds(prev => {
                                  const next = new Set(prev);
                                  if (checked) next.add(item.id);
                                  else next.delete(item.id);
                                  return next;
                                });
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                          <TableCell>
                            {item.equipment_code && <div className="font-medium">{item.equipment_code}</div>}
                            <div className="text-sm text-muted-foreground">{item.equipment_name}</div>
                            <div className="mt-1">
                              <SubMediaTypeBadge
                                department={item.department}
                                subMediaType={item.sub_media_type}
                                showPlaceholder
                                onEdit={async (next) => {
                                  setCartItems(prev => prev.map(ci => ci.id === item.id ? { ...ci, sub_media_type: next } : ci));
                                }}
                              />
                            </div>
                          </TableCell>
                          <TableCell>{item.serial_number || "-"}</TableCell>
                          <TableCell>
                            {item.warehouse_name ? (
                              <div className="flex items-center gap-1">
                                <Warehouse className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">{item.warehouse_name}</span>
                              </div>
                            ) : <span className="text-muted-foreground text-sm">-</span>}
                          </TableCell>
                          <TableCell>
                            {item.location_name ? (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">{item.location_name}</span>
                              </div>
                            ) : <span className="text-muted-foreground text-sm">-</span>}
                          </TableCell>
                          <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                          <TableCell>
                            {item.billboard_id ? (
                              <Badge variant="outline" className="text-xs">
                                <MapPin className="h-3 w-3 mr-1" />
                                ระบุแล้ว
                              </Badge>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.notes || "-"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditCartItem(item)}
                                className="text-primary hover:text-primary"
                                title="แก้ไข"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveFromCart(item.id)}
                                className="text-destructive hover:text-destructive"
                                title="ลบ"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>

                {/* Summary */}
                <div className="flex flex-wrap items-center gap-4 text-sm pt-2 border-t">
                  <span className="text-muted-foreground">
                    ทั้งหมด: <strong className="text-foreground">{cartItems.length} รายการ</strong>
                  </span>
                  <span className="text-muted-foreground">
                    จำนวนรวม: <strong className="text-foreground">{cartItems.reduce((s, i) => s + i.quantity, 0)} ชิ้น</strong>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    เลือก {selectedCartIds.size} รายการ
                  </Badge>
                  <span className="text-muted-foreground">
                    จำนวน: <strong className="text-foreground">{cartItems.filter(i => selectedCartIds.has(i.id)).reduce((s, i) => s + i.quantity, 0)} ชิ้น</strong>
                  </span>
                </div>
              </div>
            )}

            <Button type="submit" disabled={createRequest.isPending || selectedCartIds.size === 0}>
              <Plus className="h-4 w-4 mr-2" />
              {createRequest.isPending ? "กำลังส่ง..." : `ส่งรายการที่เลือก (${selectedCartIds.size} รายการ)`}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Request History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            ประวัติคำขอเบิก
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
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
                  <TableHead>รายการ</TableHead>
                  <TableHead>ผู้ขอเบิก</TableHead>
                  <TableHead>วัตถุประสงค์</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-center">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      กำลังโหลด...
                    </TableCell>
                  </TableRow>
                ) : filteredRequests?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      ไม่พบข้อมูล
                    </TableCell>
                  </TableRow>
                ) : (
                  historyPagination.paginatedData.map((req) => {
                    const items = getItemsForRequest(req.id);
                    const isExpanded = expandedRequests.has(req.id);
                    return (
                      <React.Fragment key={req.id}>
                        <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRequestExpand(req.id)}>
                          <TableCell>
                            {items.length > 0 && (
                              <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{req.document_no}</TableCell>
                          <TableCell>
                            {format(new Date(req.created_at), "dd/MM/yyyy HH:mm", { locale: th })}
                          </TableCell>
                          <TableCell>
                            {items.length > 0 ? (
                              <Badge variant="outline">{items.length} รายการ</Badge>
                            ) : (
                              <div>
                                {req.equipment_code && <span className="font-medium">{req.equipment_code} - </span>}
                                {req.equipment_name || "-"}
                                <span className="text-muted-foreground ml-2">({req.quantity} {req.unit})</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>{req.requester_name}</div>
                            {req.requester_department && (
                              <div className="text-sm text-muted-foreground">{req.requester_department}</div>
                            )}
                            {(req as any).pickup_type && (
                              <div className="mt-1">
                                {(req as any).pickup_type === "wait_onsite" && (
                                  <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800">🏪 รอรับที่คลัง</Badge>
                                )}
                                {(req as any).pickup_type === "scheduled" && (
                                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                    📅 {(req as any).pickup_date ? format(new Date((req as any).pickup_date), "dd/MM/yyyy") : "นัดรับ"} {(req as any).pickup_time || ""}
                                  </Badge>
                                )}
                                {(req as any).pickup_type === "delivery" && (
                                  <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                                    🚚 จัดส่ง{(req as any).destination ? `: ${(req as any).destination}` : ""}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{req.purpose || "-"}</TableCell>
                          <TableCell>{getStatusBadge(req.status)}</TableCell>
                          <TableCell className="text-center">
                            {req.status === "rejected" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditRejectedRequest(req, items);
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                                แก้ไข/ส่งใหม่
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                        {isExpanded && items.length > 0 && (
                          <TableRow>
                            <TableCell colSpan={8} className="bg-muted/30 p-0">
                              <div className="p-4">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>รหัส/ชื่อสินค้า</TableHead>
                                      <TableHead>S/N</TableHead>
                                      <TableHead className="text-right">จำนวน</TableHead>
                                      <TableHead>ป้ายโฆษณา</TableHead>
                                      <TableHead>สถานะ</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {items.map((item) => (
                                      <TableRow key={item.id}>
                                        <TableCell>
                                          {item.equipment_code && <span className="font-medium">{item.equipment_code} - </span>}
                                          {item.equipment_name || "-"}
                                        </TableCell>
                                        <TableCell>{item.serial_number || "-"}</TableCell>
                                        <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                                        <TableCell>
                                          {item.billboard_id ? (
                                            <Badge variant="outline" className="text-xs">
                                              <MapPin className="h-3 w-3 mr-1" />ระบุแล้ว
                                            </Badge>
                                          ) : "-"}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            currentPage={historyPagination.currentPage}
            totalPages={historyPagination.totalPages}
            totalItems={historyPagination.totalItems}
            pageSize={historyPagination.pageSize}
            onPageChange={historyPagination.handlePageChange}
            onPageSizeChange={historyPagination.handlePageSizeChange}
          />
        </CardContent>
      </Card>

      {/* Equipment Image Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              รูปภาพ: {selectedEquipmentName}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto p-4">
            {selectedEquipmentImages.map((url, index) => (
              <div key={index} className="relative aspect-square border rounded-lg overflow-hidden">
                <img
                  src={url}
                  alt={`${selectedEquipmentName} - ${index + 1}`}
                  className="object-cover w-full h-full"
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock Warning Dialog */}
      <Dialog open={stockWarningOpen} onOpenChange={setStockWarningOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              จำนวนสินค้าไม่เพียงพอ
            </DialogTitle>
            <DialogDescription>
              สินค้า "{currentItem.equipment_name}" มีในคลังเพียง {currentStockInfo?.currentStock || 0} {currentItem.unit} 
              แต่ท่านขอเบิก {currentItem.quantity} {currentItem.unit}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">จำนวนในคลัง:</span>
                <span className="font-medium">{currentStockInfo?.currentStock || 0} {currentItem.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">จำนวนที่ขอเบิก:</span>
                <span className="font-medium text-destructive">{currentItem.quantity} {currentItem.unit}</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="text-muted-foreground">จำนวนแนะนำ:</span>
                <span className="font-medium text-primary">{suggestedQuantity} {currentItem.unit}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setStockWarningOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                const selected = equipment?.find(e => e.id === currentItem.equipment_id);
                if (!selected) return;
                const { data, error } = await supabase.rpc("create_pr_from_shortage", {
                  _equipment_id: selected.id,
                  _is_media_player: !!selected.is_media_player,
                  _equipment_code: selected.code,
                  _equipment_name: selected.name,
                  _requested_qty: parseInt(currentItem.quantity || "0"),
                  _available_qty: currentStockInfo?.currentStock || 0,
                  _requester_name: headerData.requester_name || "-",
                  _unit: currentItem.unit || "ชิ้น",
                });
                if (error || !(data as any)?.success) {
                  toast.error("สร้างใบขอซื้อไม่สำเร็จ: " + (error?.message || (data as any)?.error));
                  return;
                }
                const d = data as any;
                toast.success(d.updated ? `อัปเดตใบขอซื้อ ${d.pr_number} (รวมคำขอนี้แล้ว)` : `สร้างใบขอซื้อ ${d.pr_number} สำเร็จ`);
                setStockWarningOpen(false);
              }}
            >
              📋 แจ้งขอซื้อ
            </Button>
            {suggestedQuantity > 0 && (
              <Button onClick={handleAcceptSuggestedQuantity}>
                ใช้จำนวน {suggestedQuantity} แทน
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IssueRequest;
