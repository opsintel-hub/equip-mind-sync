import { useState, useMemo } from "react";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DeviceTypeBadge } from "@/components/media-player/DeviceTypeBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, AlertTriangle, MapPin, Package, RefreshCw, Clock, ChevronDown, ChevronRight, ShoppingCart, Edit, Warehouse } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { useDeptScope } from "@/hooks/useDeptScope";
import { useAuth } from "@/hooks/useAuth";
import BillboardSelect from "@/components/billboard/BillboardSelect";
import { WarehouseLocationSelect } from "@/components/location/WarehouseLocationSelect";
import { SimpleDepartmentSelect } from "@/components/equipment/SimpleDepartmentSelect";
import { logStockMovement } from "@/lib/stockMovement";
import { getCompatibleBillboardIdsForEquipment } from "@/lib/compatibility";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";
import { ReturnItemDialog, type ReturnItemLine } from "@/components/issue/ReturnItemDialog";

interface IncompleteIssue {
  id: string;
  document_no: string;
  equipment_id: string | null;
  equipment_code: string | null;
  equipment_name: string | null;
  quantity: number;
  issued_quantity: number | null;
  purpose: string | null;
  purpose_id: string | null;
  requester_name: string;
  requester_department: string | null;
  company_id: string | null;
  status: string;
  created_at: string;
  issued_at: string | null;
  notes: string | null;
  billboard_id: string | null;
  return_quantity: number | null;
  total_items: number | null;
  companies?: { name: string } | null;
}

interface PendingItem {
  id: string;
  pending_id: string;
  equipment_id: string | null;
  media_player_id?: string | null;
  is_media_player?: boolean | null;
  equipment_code: string | null;
  equipment_name: string | null;
  serial_number: string | null;
  quantity: number;
  issued_quantity: number | null;
  remaining_quantity: number | null;
  unit: string;
  status: string | null;
  billboard_id: string | null;
  returned_good_qty?: number | null;
  returned_defective_qty?: number | null;
  notes: string | null;
}

interface IssuePurpose {
  id: string;
  name: string;
  requires_billboard: boolean;
  requires_return: boolean;
}

const IncompleteIssues = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isSuperAdmin, viewableDepts, deptKey } = useDeptScope();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIssue, setSelectedIssue] = useState<IncompleteIssue | null>(null);
  const [selectedItem, setSelectedItem] = useState<PendingItem | null>(null);
  const [billboardDialogOpen, setBillboardDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [itemReturnOpen, setItemReturnOpen] = useState(false);
  const [returnTarget, setReturnTarget] = useState<{ issue: IncompleteIssue; item: ReturnItemLine } | null>(null);
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  const [billboardId, setBillboardId] = useState("");
  const [compatibleBbIds, setCompatibleBbIds] = useState<string[] | null>(null);
  const [compatLoading, setCompatLoading] = useState(false);
  const [returnData, setReturnData] = useState({
    quantity: "",
    location_id: "",
    return_department: "",
    return_warehouse_id: "",
    notes: "",
  });

  // Prefetch compatible billboard IDs whenever the assignment dialog opens for an equipment item.
  // MP items keep allowedBillboardIds = null (show all billboards of the requester's department).
  const openBillboardDialog = async (issue: IncompleteIssue, item: PendingItem | null) => {
    setSelectedIssue(issue);
    setSelectedItem(item);
    setBillboardId("");
    setCompatibleBbIds(null);
    setBillboardDialogOpen(true);

    const equipmentId = item?.equipment_id || issue.equipment_id;
    const isMP = !!(item?.media_player_id || item?.is_media_player);
    if (!equipmentId || isMP) return;

    try {
      setCompatLoading(true);
      const set = await getCompatibleBillboardIdsForEquipment(equipmentId);
      // null => unrestricted (show all); Set => filter list
      setCompatibleBbIds(set ? Array.from(set) : null);
    } catch (e) {
      console.error("load compat failed", e);
      setCompatibleBbIds(null);
    } finally {
      setCompatLoading(false);
    }
  };

  // Fetch incomplete issues (issued but missing billboard or waiting for return)
  const { data: incompleteIssues, isLoading } = useQuery({
    queryKey: ["incomplete-issues", deptKey],
    queryFn: async () => {
      // First get purposes that require billboard or return
      const { data: purposes } = await supabase
        .from("issue_purposes")
        .select("id, name, requires_billboard, requires_return");

      const purposeMap = new Map<string, IssuePurpose>();
      (purposes || []).forEach(p => purposeMap.set(p.id, p));

      // Get all issued items — scoped to viewable departments
      let listQ = supabase
        .from("goods_issue_pending")
        .select("*, companies(name)")
        .in("status", ["issued", "partial_return", "partially_issued"])
        .order("issued_at", { ascending: false });
      if (!isSuperAdmin) {
        const depts = viewableDepts || [];
        listQ = listQ.in("requester_department", depts.length > 0 ? depts : ["__no_dept_permission__"]);
      }
      const { data, error } = await listQ;

      if (error) throw error;

      // Load per-item billboard assignment to detect partially-assigned headers
      const ids = (data || []).map((d: any) => d.id);
      let itemsByPending = new Map<string, { billboard_id: string | null; status: string | null; needs_return: boolean | null }[]>();
      if (ids.length > 0) {
        const { data: itemRows } = await supabase
          .from("goods_issue_pending_items")
          .select("pending_id, billboard_id, status, needs_return")
          .in("pending_id", ids);
        (itemRows || []).forEach((r: any) => {
          if (!itemsByPending.has(r.pending_id)) itemsByPending.set(r.pending_id, []);
          itemsByPending.get(r.pending_id)!.push(r);
        });
      }

      // Filter to items that need billboard assignment or return
      const incomplete = (data || []).filter((item: IncompleteIssue) => {
        const purpose = item.purpose_id ? purposeMap.get(item.purpose_id) : null;

        // Need billboard assignment — either header has none, OR any issued line-item has none
        if (purpose?.requires_billboard) {
          const lineItems = itemsByPending.get(item.id) || [];
          const anyItemMissing = lineItems.some(
            (li) => li.status === "issued" && !li.billboard_id,
          );
          if (!item.billboard_id || anyItemMissing) return true;
        }

        // Need return (claim vendor) — only if at least 1 line item is flagged needs_return=true
        if (purpose?.requires_return) {
          const lineItems = itemsByPending.get(item.id) || [];
          const anyNeedsReturn = lineItems.some((li) => li.needs_return === true);
          // Backward-compat: if line items have no needs_return column data yet (all null), fall back to header purpose
          const hasReturnFlags = lineItems.some((li) => li.needs_return !== null);
          if (!hasReturnFlags || anyNeedsReturn) {
            const returnedQty = item.return_quantity || 0;
            const issuedQty = item.issued_quantity || 0;
            if (returnedQty < issuedQty) return true;
          }
        }

        return false;
      });

      return { issues: incomplete as (IncompleteIssue & { companies: { name: string } | null })[], purposes };
    },
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  });

  // Realtime: อัปเดตรายการยังไม่สมบูรณ์ทันที (คลังจ่ายของ / ผู้ขอยืนยัน) โดยไม่กระพริบ
  useRealtimeInvalidate({
    table: "goods_issue_pending",
    queryKeys: [["incomplete-issues", deptKey], ["incomplete-issues-items"]],
  });
  useRealtimeInvalidate({
    table: "goods_issue_pending_items",
    queryKeys: [["incomplete-issues", deptKey], ["incomplete-issues-items"]],
  });


  // Fetch defective returns pending warehouse entry
  const { data: defectiveReturns = [] } = useQuery({
    queryKey: ["defective-returns-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("defective_returns")
        .select("*, media_players:media_player_id(device_type)")
        .eq("status", "pending_warehouse_entry")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch items for all incomplete issues
  const issueIds = useMemo(() => (incompleteIssues?.issues || []).map(i => i.id), [incompleteIssues]);

  const { data: allItems = [] } = useQuery({
    queryKey: ["incomplete-issue-items", issueIds],
    queryFn: async () => {
      if (issueIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("goods_issue_pending_items")
        .select("*")
        .in("pending_id", issueIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PendingItem[];
    },
    enabled: issueIds.length > 0,
  });

  // Group items by pending_id
  const itemsByIssue = useMemo(() => {
    const map = new Map<string, PendingItem[]>();
    allItems.forEach(item => {
      if (!map.has(item.pending_id)) {
        map.set(item.pending_id, []);
      }
      map.get(item.pending_id)!.push(item);
    });
    return map;
  }, [allItems]);

  const toggleExpand = (issueId: string) => {
    setExpandedRequests(prev => {
      const next = new Set(prev);
      if (next.has(issueId)) {
        next.delete(issueId);
      } else {
        next.add(issueId);
      }
      return next;
    });
  };

  // Assign billboard to item mutation
  const assignBillboardToItem = useMutation({
    mutationFn: async () => {
      if (!selectedItem || !billboardId || !user) return;

      // Update item with billboard
      const { error: itemError } = await supabase
        .from("goods_issue_pending_items")
        .update({
          billboard_id: billboardId,
          install_status: "installed",
          intended_billboard_id: null,
          notes: (selectedItem.notes || "") + ` | ติดตั้งที่ป้าย`,
        } as any)
        .eq("id", selectedItem.id);

      if (itemError) throw itemError;

      const installationDate = new Date().toISOString().split('T')[0];

      // Create billboard_equipment record / update Media Player current location
      if (selectedItem.media_player_id) {
        const { data: currentMp, error: mpFetchError } = await supabase
          .from("media_players")
          .select("id, code, name, quantity, location_id")
          .eq("id", selectedItem.media_player_id)
          .maybeSingle();
        if (mpFetchError) throw mpFetchError;

        const { error: mpUpdateError } = await supabase
          .from("media_players")
          .update({
            status: "installed",
            billboard_id: billboardId,
            install_date: installationDate,
            location_id: null,
            quantity: 0,
          })
          .eq("id", selectedItem.media_player_id);
        if (mpUpdateError) throw mpUpdateError;

        const { error: historyError } = await (supabase as any).from("media_player_billboard_history").insert({
          media_player_id: selectedItem.media_player_id,
          billboard_id: billboardId,
          installation_date: installationDate,
          uninstall_date: null,
          installed_by: user.id,
          installation_notes: `จากเอกสาร ${selectedIssue?.document_no}`,
        });
        if (historyError) throw historyError;

        await logStockMovement({
          equipment_id: selectedItem.media_player_id,
          equipment_code: currentMp?.code || selectedItem.equipment_code || "",
          equipment_name: currentMp?.name || selectedItem.equipment_name || "Media Player",
          movement_type: "install_to_billboard",
          quantity: 1,
          stock_before: currentMp?.quantity || 0,
          stock_after: 0,
          reference_type: "billboard_equipment",
          reference_document: selectedIssue?.document_no || "",
          location_id: currentMp?.location_id || undefined,
          notes: `ระบุป้ายให้ S/N ${selectedItem.serial_number || "-"}`,
        });
      } else if (selectedItem.equipment_id) {
        const { error: billboardError } = await supabase
          .from("billboard_equipment")
          .insert({
            billboard_id: billboardId,
            equipment_id: selectedItem.equipment_id,
            quantity: selectedItem.issued_quantity || selectedItem.quantity,
            installation_date: installationDate,
            notes: `จากเอกสาร ${selectedIssue?.document_no} - ${selectedItem.equipment_name}`,
            created_by: user.id,
          });
        if (billboardError) throw billboardError;
      }

      // Check from the database (not stale UI state) if all issued items now have billboard assigned
      if (selectedIssue) {
        const { data: latestItems, error: latestItemsError } = await supabase
          .from("goods_issue_pending_items")
          .select("id, status, billboard_id")
          .eq("pending_id", selectedIssue.id);
        if (latestItemsError) throw latestItemsError;

        const allHaveBillboard = (latestItems || []).every(
          (item: any) => item.status !== "issued" || !!item.billboard_id,
        );

        if (allHaveBillboard) {
          const { error: completeError } = await supabase
            .from("goods_issue_pending")
            .update({ is_complete: true, billboard_id: selectedIssue.billboard_id || billboardId })
            .eq("id", selectedIssue.id);
          if (completeError) throw completeError;
        }
      }
    },
    onSuccess: () => {
      toast.success("บันทึกข้อมูลป้ายโฆษณาสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["incomplete-issues"] });
      queryClient.invalidateQueries({ queryKey: ["incomplete-issue-items"] });
      queryClient.invalidateQueries({ queryKey: ["eq-tracking-media-players-all"] });
      queryClient.invalidateQueries({ queryKey: ["billboard-tracking-media-players"] });
      queryClient.invalidateQueries({ queryKey: ["media-player-report-v2"] });
      queryClient.invalidateQueries({ queryKey: ["stock-card-items"] });
      setBillboardDialogOpen(false);
      setSelectedIssue(null);
      setSelectedItem(null);
      setBillboardId("");
    },
    onError: (error) => {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    },
  });

  // Assign billboard to header (legacy) mutation
  const assignBillboard = useMutation({
    mutationFn: async () => {
      if (!selectedIssue || !billboardId || !user) return;

      // Update the pending issue with billboard
      const { error: updateError } = await supabase
        .from("goods_issue_pending")
        .update({
          billboard_id: billboardId,
          is_complete: true,
          notes: (selectedIssue.notes || "") + ` | ติดตั้งที่ป้าย: ${billboardId}`,
        })
        .eq("id", selectedIssue.id);

      if (updateError) throw updateError;

      // Create billboard_equipment record
      if (selectedIssue.equipment_id) {
        const { error: billboardError } = await supabase
          .from("billboard_equipment")
          .insert({
            billboard_id: billboardId,
            equipment_id: selectedIssue.equipment_id,
            quantity: selectedIssue.issued_quantity || selectedIssue.quantity,
            installation_date: new Date().toISOString().split('T')[0],
            notes: `จากเอกสาร ${selectedIssue.document_no}`,
            created_by: user.id,
          });
        if (billboardError) throw billboardError;
      }
    },
    onSuccess: () => {
      toast.success("บันทึกข้อมูลป้ายโฆษณาสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["incomplete-issues"] });
      setBillboardDialogOpen(false);
      setSelectedIssue(null);
      setBillboardId("");
    },
    onError: (error) => {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    },
  });

  // Record return mutation
  const recordReturn = useMutation({
    mutationFn: async () => {
      if (!selectedIssue || !user) return;

      const returnQty = parseInt(returnData.quantity);
      const currentReturned = selectedIssue.return_quantity || 0;
      const totalReturned = currentReturned + returnQty;
      const issuedQty = selectedIssue.issued_quantity || selectedIssue.quantity;

      // Update the pending issue
      const { error: updateError } = await supabase
        .from("goods_issue_pending")
        .update({
          return_quantity: totalReturned,
          returned_at: new Date().toISOString(),
          returned_by: user.id,
          status: totalReturned >= issuedQty ? "returned" : "partial_return",
          is_complete: totalReturned >= issuedQty,
          notes: (selectedIssue.notes || "") + ` | รับคืน ${returnQty} ชิ้น`,
        })
        .eq("id", selectedIssue.id);

      if (updateError) throw updateError;

      // Update equipment stock
      if (selectedIssue.equipment_id) {
        const { data: currentEquipment } = await supabase
          .from("equipment")
          .select("quantity_in_stock")
          .eq("id", selectedIssue.equipment_id)
          .single();

        const currentStock = currentEquipment?.quantity_in_stock || 0;
        const newStock = currentStock + returnQty;

        const { error: stockError } = await supabase
          .from("equipment")
          .update({ quantity_in_stock: newStock })
          .eq("id", selectedIssue.equipment_id);

        if (stockError) throw stockError;

        // Log stock movement
        await logStockMovement({
          equipment_id: selectedIssue.equipment_id,
          equipment_code: selectedIssue.equipment_code || "",
          equipment_name: selectedIssue.equipment_name || "",
          movement_type: "receive",
          quantity: returnQty,
          stock_before: currentStock,
          stock_after: newStock,
          reference_type: "claim_return",
          reference_document: selectedIssue.document_no,
          location_id: returnData.location_id || undefined,
          notes: returnData.notes || "รับคืนจากการเคลม",
        });
      }
    },
    onSuccess: () => {
      toast.success("บันทึกการรับคืนสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["incomplete-issues"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-active"] });
      setReturnDialogOpen(false);
      setSelectedIssue(null);
      setReturnData({ quantity: "", location_id: "", return_department: "", return_warehouse_id: "", notes: "" });
    },
    onError: (error) => {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    },
  });

  const handleAssignBillboardToItem = (issue: IncompleteIssue, item: PendingItem) => {
    void openBillboardDialog(issue, item);
    setBillboardId(item.billboard_id || "");
  };

  const handleAssignBillboard = (issue: IncompleteIssue) => {
    void openBillboardDialog(issue, null);
  };

  const handleRecordReturn = (issue: IncompleteIssue) => {
    setSelectedIssue(issue);
    const remainingQty = (issue.issued_quantity || issue.quantity) - (issue.return_quantity || 0);
    setReturnData({
      quantity: remainingQty.toString(),
      location_id: "",
      return_department: "",
      return_warehouse_id: "",
      notes: "",
    });
    setReturnDialogOpen(true);
  };

  const getPurposeInfo = (purposeId: string | null) => {
    if (!purposeId || !incompleteIssues?.purposes) return null;
    return incompleteIssues.purposes.find(p => p.id === purposeId);
  };

  const getIssueType = (issue: IncompleteIssue): "billboard" | "return" => {
    const purpose = getPurposeInfo(issue.purpose_id);
    const items = itemsByIssue.get(issue.id) || [];
    const anyItemMissingBillboard = items.some(
      (it) => it.status === "issued" && !it.billboard_id,
    );
    if (purpose?.requires_billboard && (!issue.billboard_id || anyItemMissingBillboard)) return "billboard";
    return "return";
  };


  const getItemsNeedingBillboard = (issue: IncompleteIssue) => {
    const items = itemsByIssue.get(issue.id) || [];
    return items.filter(item => !item.billboard_id && item.status === "issued");
  };

  const filteredIssues = incompleteIssues?.issues.filter(
    (issue) => {
      const term = searchTerm.toLowerCase();
      if (!term) return true;
      if (issue.document_no?.toLowerCase().includes(term) ||
          issue.equipment_code?.toLowerCase().includes(term) ||
          issue.equipment_name?.toLowerCase().includes(term) ||
          issue.requester_name?.toLowerCase().includes(term)) return true;
      const items = itemsByIssue.get(issue.id) || [];
      return items.some((item: any) => item.serial_number?.toLowerCase().includes(term));
    }
  ) || [];

  const billboardIssues = filteredIssues.filter(i => getIssueType(i) === "billboard");
  const returnIssues = filteredIssues.filter(i => getIssueType(i) === "return");

  const getItemStatusBadge = (item: PendingItem) => {
    const installStatus = (item as any).install_status as string | undefined;
    if (installStatus === "pending_confirmation") {
      return <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600">รอผู้รับยืนยัน</Badge>;
    }
    if (installStatus === "cancelled") {
      return <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600">แจ้งปัญหาที่รับ · รอระบุป้ายใหม่</Badge>;
    }
    if (item.billboard_id) {
      return <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600">มีป้ายแล้ว</Badge>;
    }
    if (item.status === "issued") {
      return <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600">รอระบุป้าย</Badge>;
    }
    return <Badge variant="outline" className="text-xs">{item.status || "-"}</Badge>;
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-warning" />
              รายการเบิกที่ยังไม่สมบูรณ์
            </h1>
            <p className="text-muted-foreground">รายการเบิกที่รอระบุป้ายโฆษณา, รอรับคืน, หรือรอเข้าคลัง</p>
          </div>
          <div className="flex gap-2">
            {billboardIssues.length > 0 && (
              <Badge variant="secondary" className="text-lg px-4 py-2 bg-blue-100 text-blue-800">
                <MapPin className="w-4 h-4 mr-1" />
                รอระบุป้าย: {billboardIssues.length}
              </Badge>
            )}
            {returnIssues.length > 0 && (
              <Badge variant="secondary" className="text-lg px-4 py-2 bg-orange-100 text-orange-800">
                <RefreshCw className="w-4 h-4 mr-1" />
                รอรับคืน: {returnIssues.length}
              </Badge>
            )}
            {defectiveReturns.length > 0 && (
              <Badge variant="secondary" className="text-lg px-4 py-2">
                <Warehouse className="w-4 h-4 mr-1" />
                รอเข้าคลัง: {defectiveReturns.length}
              </Badge>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>รายการที่ต้องดำเนินการ</CardTitle>
            <CardDescription>อัปเดตข้อมูลเพื่อปิดการเบิกให้สมบูรณ์</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาเลขที่เอกสาร, รหัส, ชื่อสินค้า, S/N..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Tabs defaultValue="billboard" className="w-full">
              <TabsList className="mb-4 overflow-x-auto whitespace-nowrap">
                <TabsTrigger value="billboard" className="gap-2">
                  <MapPin className="w-4 h-4" />
                  รอระบุป้าย ({billboardIssues.length})
                </TabsTrigger>
                <TabsTrigger value="return" className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  รอรับคืน ({returnIssues.length})
                </TabsTrigger>
                <TabsTrigger value="warehouse" className="gap-2">
                  <Warehouse className="w-4 h-4" />
                  รอเข้าคลัง ({defectiveReturns.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="billboard">
                <div className="space-y-2">
                  {isLoading ? (
                    <div className="text-center py-8">กำลังโหลด...</div>
                  ) : billboardIssues.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">ไม่มีรายการที่รอระบุป้ายโฆษณา</div>
                  ) : (
                    billboardIssues.map((issue) => {
                      const items = itemsByIssue.get(issue.id) || [];
                      const hasItems = items.length > 0;
                      const isExpanded = expandedRequests.has(issue.id);
                      const itemsNeedingBillboard = getItemsNeedingBillboard(issue);

                      return (
                        <Collapsible key={issue.id} open={isExpanded} onOpenChange={() => toggleExpand(issue.id)}>
                          <div className="border rounded-lg bg-blue-50/50 border-blue-200">
                            {/* Header Row */}
                            <CollapsibleTrigger asChild>
                              <div className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer">
                                <div className="flex items-center gap-2">
                                  {hasItems ? (
                                    isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                  ) : (
                                    <div className="w-4" />
                                  )}
                                  <div className="font-medium">{issue.document_no}</div>
                                </div>
                                
                                <div className="text-sm text-muted-foreground">
                                  {issue.issued_at ? format(new Date(issue.issued_at), "d MMM yy", { locale: th }) : "-"}
                                </div>

                                <div className="text-sm">
                                  {issue.companies?.name || "-"}
                                </div>

                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <ShoppingCart className="w-3 h-3" />
                                  {hasItems ? `${itemsNeedingBillboard.length}/${items.length} รอระบุป้าย` : "1 รายการ"}
                                </div>
                                
                                <div className="text-sm text-muted-foreground">
                                  {issue.requester_name}
                                </div>

                                <div className="text-sm text-muted-foreground">
                                  {issue.purpose}
                                </div>
                                
                                <div className="ml-auto flex items-center gap-4">
                                  <Badge variant="outline" className="bg-blue-100 text-blue-800">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    รอระบุป้าย
                                  </Badge>
                                  
                                  {!hasItems && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => { e.stopPropagation(); handleAssignBillboard(issue); }}
                                      className="gap-1"
                                    >
                                      <MapPin className="w-4 h-4" />
                                      ระบุป้าย
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CollapsibleTrigger>

                            {/* Expandable Items */}
                            <CollapsibleContent>
                              <div className="border-t bg-white/50 p-4">
                                {hasItems ? (
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>รหัสสินค้า</TableHead>
                                        <TableHead>ชื่อสินค้า</TableHead>
                                        <TableHead>Serial Number</TableHead>
                                        <TableHead className="text-right">จำนวน</TableHead>
                                        <TableHead>สถานะ</TableHead>
                                        <TableHead className="text-center">จัดการ</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {items.map((item) => (
                                        <TableRow key={item.id} className={!item.billboard_id && item.status === "issued" ? "bg-orange-50/50" : ""}>
                                          <TableCell className="font-mono text-sm">{item.equipment_code || "-"}</TableCell>
                                          <TableCell>{item.equipment_name || "-"}</TableCell>
                                          <TableCell className="text-muted-foreground">{item.serial_number || "-"}</TableCell>
                                          <TableCell className="text-right">{item.issued_quantity || item.quantity}</TableCell>
                                          <TableCell>{getItemStatusBadge(item)}</TableCell>
                                          <TableCell className="text-center">
                                            {item.status === "issued" && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={(e) => { e.stopPropagation(); handleAssignBillboardToItem(issue, item); }}
                                                className="gap-1"
                                              >
                                                {item.billboard_id ? <Edit className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                                                {item.billboard_id ? "แก้ไข" : "ระบุป้าย"}
                                              </Button>
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                ) : (
                                  <div className="flex items-center justify-between p-2">
                                    <div className="flex items-center gap-4">
                                      <div>
                                        <div className="font-medium">{issue.equipment_name}</div>
                                        <div className="text-xs text-muted-foreground">{issue.equipment_code}</div>
                                      </div>
                                      <div className="text-sm">จำนวน: {issue.issued_quantity || issue.quantity}</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      );
                    })
                  )}
                </div>
              </TabsContent>

              <TabsContent value="return">
                <div className="space-y-3">
                  {isLoading ? (
                    <div className="text-center py-8">กำลังโหลด...</div>
                  ) : returnIssues.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">ไม่มีรายการที่รอรับคืน</div>
                  ) : (
                    returnIssues.map((issue) => {
                      const items = itemsByIssue.get(issue.id) || [];
                      const isExpanded = expandedRequests.has(issue.id);
                      const issuedQty = issue.issued_quantity || issue.quantity;
                      const returnedQty = issue.return_quantity || 0;
                      const remainingQty = Math.max(0, issuedQty - returnedQty);
                      return (
                        <Collapsible key={issue.id} open={isExpanded} onOpenChange={() => toggleExpand(issue.id)}>
                          <div className="border rounded-lg bg-amber-50/40 border-amber-200">
                            <CollapsibleTrigger asChild>
                              <div className="flex flex-wrap items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer">
                                <div className="flex items-center gap-2">
                                  {items.length > 0 ? (
                                    isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                  ) : <div className="w-4" />}
                                  <span className="font-mono font-medium">{issue.document_no}</span>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {issue.issued_at ? format(new Date(issue.issued_at), "d MMM yy", { locale: th }) : "-"}
                                </span>
                                <span className="text-sm">{issue.companies?.name || "-"}</span>
                                <span className="text-sm text-muted-foreground">{issue.requester_name}</span>
                                <span className="text-sm">
                                  เบิก {issuedQty} · <span className="text-success">คืนแล้ว {returnedQty}</span> ·{" "}
                                  <span className="text-warning font-medium">ค้าง {remainingQty}</span>
                                </span>
                                <div className="ml-auto flex items-center gap-2">
                                  <Badge variant="outline" className="bg-amber-100 text-amber-800">
                                    <RefreshCw className="w-3 h-3 mr-1" />
                                    รอรับคืน
                                  </Badge>
                                  {items.length === 0 && (
                                    <Button size="sm" variant="outline" className="gap-1"
                                      onClick={(e) => { e.stopPropagation(); handleRecordReturn(issue); }}>
                                      <RefreshCw className="w-4 h-4" /> รับคืน
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                              <div className="border-t bg-white/60 p-4 overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>รหัสสินค้า</TableHead>
                                      <TableHead>ชื่อสินค้า</TableHead>
                                      <TableHead>Serial Number</TableHead>
                                      <TableHead className="text-right">เบิก</TableHead>
                                      <TableHead className="text-right">ติดตั้ง</TableHead>
                                      <TableHead className="text-right">คืนดี</TableHead>
                                      <TableHead className="text-right">คืนเสีย</TableHead>
                                      <TableHead className="text-right">ค้าง</TableHead>
                                      <TableHead className="text-center">จัดการ</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {items.map((item) => {
                                      const iq = item.issued_quantity ?? item.quantity;
                                      const inst = item.billboard_id ? iq : 0;
                                      const g = item.returned_good_qty || 0;
                                      const d = item.returned_defective_qty || 0;
                                      const left = Math.max(0, iq - inst - g - d);
                                      return (
                                        <TableRow key={item.id} className={left > 0 ? "bg-orange-50/40" : ""}>
                                          <TableCell className="font-mono text-sm">{item.equipment_code || "-"}</TableCell>
                                          <TableCell>{item.equipment_name || "-"}</TableCell>
                                          <TableCell className="text-muted-foreground whitespace-pre-line">{item.serial_number || "-"}</TableCell>
                                          <TableCell className="text-right">{iq}</TableCell>
                                          <TableCell className="text-right text-blue-600">{inst}</TableCell>
                                          <TableCell className="text-right text-green-600">{g}</TableCell>
                                          <TableCell className="text-right text-destructive">{d}</TableCell>
                                          <TableCell className="text-right font-medium text-warning">{left}</TableCell>
                                          <TableCell className="text-center">
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="gap-1"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setReturnTarget({ issue, item: item as unknown as ReturnItemLine });
                                                setItemReturnOpen(true);
                                              }}
                                            >
                                              <RefreshCw className="w-3 h-3" />
                                              {left > 0 ? "รับคืน" : "รับคืนเพิ่ม"}
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                    {items.length === 0 && (
                                      <TableRow>
                                        <TableCell colSpan={9} className="text-center text-muted-foreground py-4">
                                          เอกสารเก่า (ไม่มีรายการย่อย) — ใช้ปุ่ม “รับคืน” ด้านบน
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      );
                    })
                  )}
                </div>
              </TabsContent>


              <TabsContent value="warehouse">
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>เลขที่เอกสาร</TableHead>
                        <TableHead>ประเภท</TableHead>
                        <TableHead>สถานะ</TableHead>
                        <TableHead>จำนวน</TableHead>
                        <TableHead>แหล่งที่มา</TableHead>
                        <TableHead>สาเหตุ</TableHead>
                        <TableHead>วันที่บันทึก</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {defectiveReturns.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            ไม่มีรายการรอเข้าคลัง
                          </TableCell>
                        </TableRow>
                      ) : (
                        defectiveReturns.map((dr: any) => (
                          <TableRow key={dr.id}>
                            <TableCell className="font-medium">{dr.document_no}</TableCell>
                            <TableCell>
                              {dr.is_media_player ? (
                                <DeviceTypeBadge value={(dr as any).media_players?.device_type ?? 'media_player'} className="text-xs" />
                              ) : (
                                <Badge variant="outline" className="text-xs">สินค้า/อะไหล่</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={dr.item_condition === "defective" ? "destructive" : "secondary"} className="text-xs">
                                {dr.item_condition === "defective" ? "เสีย/ชำรุด" : "รอตรวจสอบ"}
                              </Badge>
                            </TableCell>
                            <TableCell>{dr.quantity}</TableCell>
                            <TableCell>
                              {dr.source_type === "billboard" ? (
                                <Badge variant="outline" className="text-xs">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  ป้ายโฆษณา
                                </Badge>
                              ) : dr.source_type}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">{dr.reason || "-"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(dr.created_at), "d MMM yy HH:mm", { locale: th })}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Billboard Assignment Dialog */}
      <Dialog open={billboardDialogOpen} onOpenChange={setBillboardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              ระบุป้ายโฆษณา
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">เอกสาร:</span>
                <span className="font-medium">{selectedIssue?.document_no}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">สินค้า:</span>
                <span className="font-medium">{selectedItem?.equipment_name || selectedIssue?.equipment_name}</span>
              </div>
              {selectedItem?.serial_number && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Serial:</span>
                  <span className="font-medium">{selectedItem.serial_number}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">จำนวน:</span>
                <span className="font-medium">{selectedItem?.issued_quantity || selectedItem?.quantity || selectedIssue?.issued_quantity || selectedIssue?.quantity}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>เลือกป้ายโฆษณา</Label>
              <BillboardSelect
                value={billboardId}
                onChange={setBillboardId}
                department={selectedIssue?.requester_department || undefined}
                allowedBillboardIds={
                  selectedItem?.media_player_id || selectedItem?.is_media_player
                    ? null
                    : compatibleBbIds
                }
                emptyLabel="อะไหล่นี้ยังไม่ระบุป้ายที่รองรับ กรุณาแจ้ง Admin"
                disabled={compatLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBillboardDialogOpen(false)}>ยกเลิก</Button>
            <Button 
              onClick={() => selectedItem ? assignBillboardToItem.mutate() : assignBillboard.mutate()} 
              disabled={!billboardId || assignBillboard.isPending || assignBillboardToItem.isPending}
            >
              {(assignBillboard.isPending || assignBillboardToItem.isPending) ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              บันทึกการรับคืนสินค้าเคลม
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">เอกสาร:</span>
                <span className="font-medium">{selectedIssue?.document_no}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">สินค้า:</span>
                <span className="font-medium">{selectedIssue?.equipment_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">เบิกไป:</span>
                <span className="font-medium">{selectedIssue?.issued_quantity || selectedIssue?.quantity}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">คืนแล้ว:</span>
                <span className="font-medium text-success">{selectedIssue?.return_quantity || 0}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>จำนวนที่รับคืน</Label>
              <Input
                type="number"
                value={returnData.quantity}
                onChange={(e) => setReturnData({ ...returnData, quantity: e.target.value })}
                max={(selectedIssue?.issued_quantity || selectedIssue?.quantity || 0) - (selectedIssue?.return_quantity || 0)}
                min={1}
              />
            </div>

            <div className="space-y-2">
              <Label>ฝ่าย</Label>
              <SimpleDepartmentSelect
                value={returnData.return_department}
                onChange={(val) => setReturnData({ ...returnData, return_department: val, return_warehouse_id: "", location_id: "" })}
              />
            </div>

            <WarehouseLocationSelect
              department={returnData.return_department}
              warehouseId={returnData.return_warehouse_id}
              onWarehouseChange={(val) => setReturnData({ ...returnData, return_warehouse_id: val })}
              locationId={returnData.location_id}
              onLocationChange={(value) => setReturnData({ ...returnData, location_id: value })}
            />



            <div className="space-y-2">
              <Label>หมายเหตุ</Label>
              <Textarea
                value={returnData.notes}
                onChange={(e) => setReturnData({ ...returnData, notes: e.target.value })}
                placeholder="หมายเหตุเพิ่มเติม..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>ยกเลิก</Button>
            <Button 
              onClick={() => recordReturn.mutate()} 
              disabled={!returnData.quantity || parseInt(returnData.quantity) <= 0 || recordReturn.isPending}
            >
              {recordReturn.isPending ? "กำลังบันทึก..." : "บันทึกการรับคืน"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default IncompleteIssues;
