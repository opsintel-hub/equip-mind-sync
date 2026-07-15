import { useState, useMemo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Package, Clock, CheckCircle, Bell, AlertTriangle, ChevronDown, ChevronRight, ShoppingCart } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { th } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { CompatibilityBadgeCell } from "@/components/reports/CompatibilityBadgeCell";

import { WarehouseLocationSelect } from "@/components/location/WarehouseLocationSelect";
import { SimpleDepartmentSelect } from "@/components/equipment/SimpleDepartmentSelect";
import BillboardSelect from "@/components/billboard/BillboardSelect";

interface WaitingRequest {
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
  total_items: number | null;
  created_at: string;
}

interface PendingItem {
  id: string;
  pending_id: string;
  equipment_id: string | null;
  equipment_code: string | null;
  equipment_name: string | null;
  serial_number: string | null;
  quantity: number;
  issued_quantity: number | null;
  remaining_quantity: number | null;
  unit: string;
  status: string | null;
  billboard_id: string | null;
  notes: string | null;
}

interface EquipmentWithStock {
  id: string;
  code: string;
  name: string;
  quantity_in_stock: number;
}

const WaitingStockRequests = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<WaitingRequest | null>(null);
  const [selectedItem, setSelectedItem] = useState<PendingItem | null>(null);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  const [issueData, setIssueData] = useState({
    issued_quantity: "",
    issued_location_id: "",
    issued_department: "",
    issued_warehouse_id: "",
    notes: "",
    install_to_billboard: false,
    billboard_id: "",
  });

  // Fetch waiting_stock requests only with company info
  const { data: waitingRequests, isLoading } = useQuery({
    queryKey: ["waiting-stock-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_issue_pending")
        .select("*, companies(name)")
        .eq("status", "waiting_stock")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as (WaitingRequest & { companies: { name: string } | null })[];
    },
  });

  // Fetch items for all waiting requests
  const requestIds = useMemo(() => (waitingRequests || []).map(r => r.id), [waitingRequests]);

  const { data: allItems = [] } = useQuery({
    queryKey: ["waiting-stock-items", requestIds],
    queryFn: async () => {
      if (requestIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("goods_issue_pending_items")
        .select("*")
        .in("pending_id", requestIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PendingItem[];
    },
    enabled: requestIds.length > 0,
  });

  // Group items by pending_id
  const itemsByRequest = useMemo(() => {
    const map = new Map<string, PendingItem[]>();
    allItems.forEach(item => {
      if (!map.has(item.pending_id)) {
        map.set(item.pending_id, []);
      }
      map.get(item.pending_id)!.push(item);
    });
    return map;
  }, [allItems]);

  // Fetch equipment for stock check
  const { data: equipment } = useQuery({
    queryKey: ["equipment-active-stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("id, code, name, quantity_in_stock")
        .eq("is_active", true);
      if (error) throw error;
      return data as EquipmentWithStock[];
    },
  });

  const toggleExpand = (requestId: string) => {
    setExpandedRequests(prev => {
      const next = new Set(prev);
      if (next.has(requestId)) {
        next.delete(requestId);
      } else {
        next.add(requestId);
      }
      return next;
    });
  };

  // Issue item mutation
  const issueGoods = useMutation({
    mutationFn: async () => {
      if (!user) return;

      const issuedQty = parseInt(issueData.issued_quantity);

      // If issuing for a specific item
      if (selectedItem && selectedRequest) {
        const remainingQty = (selectedItem.remaining_quantity ?? selectedItem.quantity) - issuedQty;
        const previousIssued = selectedItem.issued_quantity || 0;
        const totalIssued = previousIssued + issuedQty;

        const newItemStatus = remainingQty <= 0 ? "issued" : "partially_issued";

        // Update item
        const { error: itemError } = await supabase
          .from("goods_issue_pending_items")
          .update({
            issued_quantity: totalIssued,
            remaining_quantity: Math.max(0, remainingQty),
            status: newItemStatus,
            billboard_id: issueData.install_to_billboard ? issueData.billboard_id : null,
            notes: issueData.notes || selectedItem.notes,
          })
          .eq("id", selectedItem.id);

        if (itemError) throw itemError;

        // Update equipment stock
        if (selectedItem.equipment_id && issuedQty > 0) {
          const currentEquipment = equipment?.find((e) => e.id === selectedItem.equipment_id);
          if (currentEquipment) {
            const newStock = Math.max(0, currentEquipment.quantity_in_stock - issuedQty);
            await supabase.from("equipment").update({ quantity_in_stock: newStock }).eq("id", selectedItem.equipment_id);

            // Create goods_issue record
            await supabase.from("goods_issue").insert({
              document_no: selectedRequest.document_no + `-${selectedItem.id.slice(0, 4)}`,
              equipment_id: selectedItem.equipment_id,
              quantity: issuedQty,
              location_id: issueData.issued_location_id || currentEquipment.id,
              issue_date: new Date().toISOString().split('T')[0],
              requester: selectedRequest.requester_name,
              purpose: selectedRequest.purpose,
              notes: issueData.notes || `จ่ายจากรายการรอสินค้า`,
              created_by: user.id,
            });
          }
        }

        // If installing to billboard
        if (issueData.install_to_billboard && issueData.billboard_id && selectedItem.equipment_id) {
          await supabase.from("billboard_equipment").insert({
            billboard_id: issueData.billboard_id,
            equipment_id: selectedItem.equipment_id,
            quantity: issuedQty,
            installation_date: new Date().toISOString().split('T')[0],
            notes: issueData.notes || `เบิกจากเอกสาร ${selectedRequest.document_no}`,
            created_by: user.id,
          });
        }

        // Check if all items are issued
        const requestItems = itemsByRequest.get(selectedRequest.id) || [];
        const updatedItems = requestItems.map(item => 
          item.id === selectedItem.id 
            ? { ...item, status: newItemStatus, remaining_quantity: Math.max(0, remainingQty) }
            : item
        );
        const allIssued = updatedItems.every(item => item.status === "issued");
        const anyIssued = updatedItems.some(item => item.status === "issued" || item.status === "partially_issued");

        // Update header status
        let headerStatus = "waiting_stock";
        if (allIssued) {
          headerStatus = "issued";
        } else if (anyIssued) {
          headerStatus = "partially_issued";
        }

        await supabase.from("goods_issue_pending").update({
          status: headerStatus,
          issued_at: new Date().toISOString(),
          issued_by: user.id,
        }).eq("id", selectedRequest.id);

        return { allIssued };
      }
      
      // Legacy: issuing for request without items
      if (selectedRequest && !selectedItem) {
        const remainingQty = (selectedRequest.remaining_quantity || 0) - issuedQty;
        const previousIssued = selectedRequest.issued_quantity || 0;
        const totalIssued = previousIssued + issuedQty;
        const partialCount = (selectedRequest.partial_issue_count || 0) + 1;

        let newStatus: string;
        if (remainingQty <= 0) {
          newStatus = "issued";
        } else {
          newStatus = "waiting_stock";
        }

        const { error: updateError } = await supabase
          .from("goods_issue_pending")
          .update({
            status: newStatus,
            issued_quantity: totalIssued,
            remaining_quantity: Math.max(0, remainingQty),
            partial_issue_count: partialCount,
            last_partial_issue_at: new Date().toISOString(),
            issued_at: new Date().toISOString(),
            issued_by: user.id,
            issued_location_id: issueData.issued_location_id || null,
            notes: issueData.notes || selectedRequest.notes,
          })
          .eq("id", selectedRequest.id);

        if (updateError) throw updateError;

        if (selectedRequest.equipment_id && issuedQty > 0) {
          const currentEquipment = equipment?.find((e) => e.id === selectedRequest.equipment_id);
          if (currentEquipment) {
            const newStock = Math.max(0, currentEquipment.quantity_in_stock - issuedQty);
            await supabase.from("equipment").update({ quantity_in_stock: newStock }).eq("id", selectedRequest.equipment_id);

            await supabase.from("goods_issue").insert({
              document_no: selectedRequest.document_no + `-P${partialCount}`,
              equipment_id: selectedRequest.equipment_id,
              quantity: issuedQty,
              location_id: issueData.issued_location_id || currentEquipment.id,
              issue_date: new Date().toISOString().split('T')[0],
              requester: selectedRequest.requester_name,
              purpose: selectedRequest.purpose,
              notes: issueData.notes || `จ่ายเพิ่มเติม ${issuedQty} (รอ: ${Math.max(0, remainingQty)})`,
              created_by: user.id,
            });
          }
        }

        if (issueData.install_to_billboard && issueData.billboard_id && selectedRequest.equipment_id) {
          await supabase.from("billboard_equipment").insert({
            billboard_id: issueData.billboard_id,
            equipment_id: selectedRequest.equipment_id,
            quantity: issuedQty,
            installation_date: new Date().toISOString().split('T')[0],
            notes: issueData.notes || `เบิกจากเอกสาร ${selectedRequest.document_no}`,
            created_by: user.id,
          });
        }

        return { remainingQty, newStatus };
      }
    },
    onSuccess: () => {
      toast.success("จ่ายสินค้าสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["waiting-stock-requests"] });
      queryClient.invalidateQueries({ queryKey: ["waiting-stock-items"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-active-stock"] });
      queryClient.invalidateQueries({ queryKey: ["goods-issue-pending-staff"] });
      setIssueDialogOpen(false);
      setSelectedRequest(null);
      setSelectedItem(null);
      setIssueData({ issued_quantity: "", issued_location_id: "", issued_department: "", issued_warehouse_id: "", notes: "", install_to_billboard: false, billboard_id: "" });
    },
    onError: (error) => {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    },
  });

  const getAvailableStock = (equipmentId: string | null) => {
    if (!equipmentId) return null;
    const eq = equipment?.find((e) => e.id === equipmentId);
    return eq?.quantity_in_stock ?? null;
  };

  const handleIssueItem = (request: WaitingRequest, item: PendingItem) => {
    const availableStock = getAvailableStock(item.equipment_id);
    const remainingQty = item.remaining_quantity ?? item.quantity;
    const qtyToIssue = availableStock !== null ? Math.min(remainingQty, availableStock) : remainingQty;
    
    setSelectedRequest(request);
    setSelectedItem(item);
    setIssueData({
      issued_quantity: qtyToIssue.toString(),
      issued_location_id: "",
      issued_department: "",
      issued_warehouse_id: "",
      notes: "",
      install_to_billboard: false,
      billboard_id: "",
    });
    setIssueDialogOpen(true);
  };

  const handleIssueLegacy = (request: WaitingRequest) => {
    const availableStock = getAvailableStock(request.equipment_id);
    const remainingQty = request.remaining_quantity || 0;
    const qtyToIssue = availableStock !== null ? Math.min(remainingQty, availableStock) : remainingQty;
    
    setSelectedRequest(request);
    setSelectedItem(null);
    setIssueData({
      issued_quantity: qtyToIssue.toString(),
      issued_location_id: "",
      issued_department: "",
      issued_warehouse_id: "",
      notes: "",
      install_to_billboard: false,
      billboard_id: "",
    });
    setIssueDialogOpen(true);
  };

  const canIssueItem = (item: PendingItem) => {
    const availableStock = getAvailableStock(item.equipment_id);
    return availableStock !== null && availableStock > 0 && item.status !== "issued";
  };

  const canIssueLegacy = (request: WaitingRequest) => {
    const availableStock = getAvailableStock(request.equipment_id);
    return availableStock !== null && availableStock > 0;
  };

  const getItemsWithStockStatus = (request: WaitingRequest) => {
    const items = itemsByRequest.get(request.id) || [];
    const readyItems = items.filter(item => canIssueItem(item));
    const pendingItems = items.filter(item => item.status !== "issued");
    return { items, readyItems, pendingItems };
  };

  const filteredRequests = waitingRequests?.filter(
    (req) => {
      const term = searchTerm.toLowerCase();
      if (!term) return true;
      if (req.document_no?.toLowerCase().includes(term) ||
          req.equipment_code?.toLowerCase().includes(term) ||
          req.equipment_name?.toLowerCase().includes(term) ||
          req.requester_name?.toLowerCase().includes(term)) return true;
      const items = itemsByRequest.get(req.id) || [];
      return items.some((item: any) => item.serial_number?.toLowerCase().includes(term));
    }
  );

  const requestsWithStock = useMemo(() => {
    if (!filteredRequests) return 0;
    return filteredRequests.filter(req => {
      const { items, readyItems } = getItemsWithStockStatus(req);
      if (items.length > 0) return readyItems.length > 0;
      return canIssueLegacy(req);
    }).length;
  }, [filteredRequests, itemsByRequest, equipment]);

  const getItemStatusBadge = (status: string | null) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600">รอจ่าย</Badge>;
      case "issued":
        return <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600">จ่ายแล้ว</Badge>;
      case "partially_issued":
        return <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600">จ่ายบางส่วน</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">รอจ่าย</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">คำขอรอสินค้า</h1>
          <p className="text-muted-foreground">รายการคำขอเบิกที่รอสินค้าเข้าคลัง</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-lg px-4 py-2 bg-orange-100 text-orange-800">
            <Clock className="h-4 w-4 mr-1" />
            รอสินค้า: {waitingRequests?.length || 0} รายการ
          </Badge>
          {requestsWithStock > 0 && (
            <Badge variant="default" className="text-lg px-4 py-2 bg-green-100 text-green-800">
              <CheckCircle className="h-4 w-4 mr-1" />
              พร้อมจ่าย: {requestsWithStock} รายการ
            </Badge>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            รายการรอสินค้าเข้าคลัง
          </CardTitle>
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

          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
            ) : filteredRequests?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">ไม่มีคำขอรอสินค้า</div>
            ) : (
              filteredRequests?.map((req) => {
                const { items, readyItems, pendingItems } = getItemsWithStockStatus(req);
                const hasItems = items.length > 0;
                const isExpanded = expandedRequests.has(req.id);
                const hasReadyStock = hasItems ? readyItems.length > 0 : canIssueLegacy(req);

                return (
                  <Collapsible key={req.id} open={isExpanded} onOpenChange={() => toggleExpand(req.id)}>
                    <div className={`border rounded-lg ${hasReadyStock ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"}`}>
                      {/* Header Row */}
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer">
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                            <div className="font-medium">{req.document_no}</div>
                          </div>
                          
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(req.created_at), "dd/MM/yyyy HH:mm", { locale: th })}
                          </div>

                          <div className="text-sm">
                            {req.companies?.name || "-"}
                          </div>

                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <ShoppingCart className="w-3 h-3" />
                            {hasItems ? `${pendingItems.length}/${items.length} รอจ่าย` : "1 รายการ"}
                          </div>
                          
                          <div className="text-sm text-muted-foreground">
                            {req.requester_name} {req.requester_department && `(${req.requester_department})`}
                          </div>
                          
                          <div className="ml-auto flex items-center gap-4">
                            {hasReadyStock ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                พร้อมจ่าย {hasItems && readyItems.length > 0 ? `(${readyItems.length} รายการ)` : ""}
                              </Badge>
                            ) : (
                              <Badge className="bg-orange-100 text-orange-800">
                                <Clock className="h-3 w-3 mr-1" />
                                รอสินค้า
                              </Badge>
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
                                  <TableHead className="text-right">ขอ</TableHead>
                                  <TableHead className="text-right">จ่ายแล้ว</TableHead>
                                  <TableHead className="text-right">รอ</TableHead>
                                  <TableHead className="text-right">คลังมี</TableHead>
                                  <TableHead>สถานะ</TableHead>
                                  <TableHead className="text-center">จัดการ</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {items.map((item) => {
                                  const availableStock = getAvailableStock(item.equipment_id);
                                  const hasStock = canIssueItem(item);
                                  const remainingQty = item.remaining_quantity ?? item.quantity;

                                  return (
                                    <TableRow key={item.id} className={hasStock ? "bg-green-50/50" : ""}>
                                      <TableCell className="font-mono text-sm">{item.equipment_code || "-"}</TableCell>
                                      <TableCell>{item.equipment_name || "-"}</TableCell>
                                      <TableCell className="text-muted-foreground">{item.serial_number || "-"}</TableCell>
                                      <TableCell className="text-right">{item.quantity}</TableCell>
                                      <TableCell className="text-right text-green-600">{item.issued_quantity || 0}</TableCell>
                                      <TableCell className="text-right text-orange-600 font-medium">{remainingQty}</TableCell>
                                      <TableCell className="text-right">
                                        {availableStock !== null ? (
                                          <Badge className={hasStock ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                                            {availableStock}
                                          </Badge>
                                        ) : "-"}
                                      </TableCell>
                                      <TableCell>{getItemStatusBadge(item.status)}</TableCell>
                                      <TableCell className="text-center">
                                        {item.status !== "issued" && (
                                          <Button
                                            size="sm"
                                            onClick={(e) => { e.stopPropagation(); handleIssueItem(req, item); }}
                                            disabled={!hasStock}
                                            className={hasStock ? "bg-green-600 hover:bg-green-700" : ""}
                                          >
                                            <Package className="h-3 w-3 mr-1" />
                                            จ่าย
                                          </Button>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          ) : (
                            <div className="flex items-center justify-between p-2">
                              <div className="flex items-center gap-4">
                                <div>
                                  <div className="font-medium">{req.equipment_code}</div>
                                  <div className="text-sm text-muted-foreground">{req.equipment_name}</div>
                                </div>
                                <div className="text-sm">
                                  ขอ: {req.quantity} | จ่าย: {req.issued_quantity || 0} | 
                                  <span className="text-orange-600 font-medium"> รอ: {req.remaining_quantity || 0}</span>
                                </div>
                                <div>
                                  คลังมี: <Badge className={canIssueLegacy(req) ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                                    {getAvailableStock(req.equipment_id) || 0}
                                  </Badge>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleIssueLegacy(req); }}
                                disabled={!canIssueLegacy(req)}
                                className={canIssueLegacy(req) ? "bg-green-600 hover:bg-green-700" : ""}
                              >
                                <Package className="h-4 w-4 mr-1" />
                                จ่ายสินค้า
                              </Button>
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
        </CardContent>
      </Card>

      {/* Issue Dialog */}
      <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>จ่ายสินค้าที่รอ</DialogTitle>
          </DialogHeader>
          {(selectedRequest || selectedItem) && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">เอกสาร:</span>
                  <span className="font-medium">{selectedRequest?.document_no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">สินค้า:</span>
                  <span className="font-medium">{selectedItem?.equipment_name || selectedRequest?.equipment_name}</span>
                </div>
                {selectedItem?.serial_number && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Serial:</span>
                    <span className="font-medium">{selectedItem.serial_number}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">ขอทั้งหมด:</span>
                  <span>{selectedItem?.quantity || selectedRequest?.quantity} {selectedItem?.unit || selectedRequest?.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">จ่ายแล้ว:</span>
                  <span className="text-green-600">{selectedItem?.issued_quantity || selectedRequest?.issued_quantity || 0}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-orange-600">รอจ่าย:</span>
                  <span className="text-orange-600">
                    {selectedItem 
                      ? (selectedItem.remaining_quantity ?? selectedItem.quantity)
                      : (selectedRequest?.remaining_quantity || 0)
                    } {selectedItem?.unit || selectedRequest?.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">คลังมี:</span>
                  <span className="text-blue-600 font-medium">
                    {getAvailableStock(selectedItem?.equipment_id || selectedRequest?.equipment_id) || 0} ชิ้น
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>จำนวนที่จะจ่าย *</Label>
                <Input
                  type="number"
                  min={1}
                  max={Math.min(
                    selectedItem 
                      ? (selectedItem.remaining_quantity ?? selectedItem.quantity)
                      : (selectedRequest?.remaining_quantity || 0),
                    getAvailableStock(selectedItem?.equipment_id || selectedRequest?.equipment_id) || 0
                  )}
                  value={issueData.issued_quantity}
                  onChange={(e) => setIssueData({ ...issueData, issued_quantity: e.target.value })}
                  placeholder="ระบุจำนวน"
                />
              </div>

              <div className="space-y-2">
                <Label>ฝ่าย</Label>
                <SimpleDepartmentSelect
                  value={issueData.issued_department}
                  onChange={(val) => setIssueData({ ...issueData, issued_department: val, issued_warehouse_id: "", issued_location_id: "" })}
                />
              </div>

              <WarehouseLocationSelect
                department={issueData.issued_department}
                warehouseId={issueData.issued_warehouse_id}
                onWarehouseChange={(val) => setIssueData({ ...issueData, issued_warehouse_id: val })}
                locationId={issueData.issued_location_id}
                onLocationChange={(val) => setIssueData({ ...issueData, issued_location_id: val })}
              />

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="install_to_billboard"
                  checked={issueData.install_to_billboard}
                  onCheckedChange={(checked) =>
                    setIssueData({ ...issueData, install_to_billboard: checked as boolean })
                  }
                />
                <Label htmlFor="install_to_billboard">ติดตั้งที่ป้าย</Label>
              </div>

              {issueData.install_to_billboard && (
                <div className="space-y-2">
                  <Label>เลือกป้าย *</Label>
                  <BillboardSelect
                    value={issueData.billboard_id}
                    onChange={(val) => setIssueData({ ...issueData, billboard_id: val })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>หมายเหตุ</Label>
                <Textarea
                  value={issueData.notes}
                  onChange={(e) => setIssueData({ ...issueData, notes: e.target.value })}
                  placeholder="หมายเหตุเพิ่มเติม"
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              onClick={() => issueGoods.mutate()}
              disabled={
                issueGoods.isPending ||
                !issueData.issued_quantity ||
                parseInt(issueData.issued_quantity) <= 0 ||
                (issueData.install_to_billboard && !issueData.billboard_id)
              }
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              ยืนยันจ่ายสินค้า
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WaitingStockRequests;
