import { useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Package, Clock, CheckCircle, XCircle, MapPin, AlertTriangle, Calendar, Image, Warehouse } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { th } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import BillboardSelect from "@/components/billboard/BillboardSelect";
import { logStockMovement } from "@/lib/stockMovement";

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
}

const IssueGoods = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [issueData, setIssueData] = useState({
    issued_quantity: "",
    notes: "",
    install_to_billboard: false,
    billboard_id: "",
  });
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
      return data as (PendingRequest & { companies: { name: string } | null })[];
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
        .order("warehouse_entry_date", { ascending: true }); // FIFO ordering
      if (error) throw error;
      return data as (EquipmentWithDetails & { 
        location_id: string | null; 
        locations: { id: string; name: string; code: string; warehouse_id: string | null; warehouses: { id: string; name: string; code: string } | null } | null 
      })[];
    },
  });

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

  // Issue goods mutation - supports partial issue
  const issueGoods = useMutation({
    mutationFn: async () => {
      if (!selectedRequest || !user) return;

      const issuedQty = parseInt(issueData.issued_quantity);
      const requestedQty = selectedRequest.remaining_quantity && selectedRequest.remaining_quantity > 0 
        ? selectedRequest.remaining_quantity 
        : selectedRequest.quantity;
      const remainingQty = requestedQty - issuedQty;
      const previousIssued = selectedRequest.issued_quantity || 0;
      const totalIssued = previousIssued + issuedQty;
      const partialCount = (selectedRequest.partial_issue_count || 0) + 1;
      
      // Determine new status
      let newStatus: string;
      if (remainingQty <= 0) {
        newStatus = "issued"; // Fully issued
      } else if (issuedQty > 0) {
        newStatus = "waiting_stock"; // Partial issued, waiting for more stock
      } else {
        newStatus = selectedRequest.status;
      }
      
      // Update pending request
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
          issued_location_id: selectedRequest.equipment_id ? equipment?.find(e => e.id === selectedRequest.equipment_id)?.location_id || null : null,
          notes: issueData.notes || selectedRequest.notes,
        })
        .eq("id", selectedRequest.id);

      if (updateError) throw updateError;

      // If equipment_id exists, update stock
      if (selectedRequest.equipment_id && issuedQty > 0) {
        // Fetch current stock from database (not from cache)
        const { data: currentEquipmentData, error: fetchError } = await supabase
          .from("equipment")
          .select("quantity_in_stock")
          .eq("id", selectedRequest.equipment_id)
          .single();

        if (fetchError) throw fetchError;

        const currentStock = currentEquipmentData?.quantity_in_stock || 0;
        const newStock = Math.max(0, currentStock - issuedQty);
        
        const { error: stockError } = await supabase
          .from("equipment")
          .update({ quantity_in_stock: newStock })
          .eq("id", selectedRequest.equipment_id);
        if (stockError) throw stockError;

        // Log stock movement
        await logStockMovement({
          equipment_id: selectedRequest.equipment_id,
          equipment_code: selectedRequest.equipment_code || "",
          equipment_name: selectedRequest.equipment_name || "",
          movement_type: "issue",
          quantity: issuedQty,
          stock_before: currentStock,
          stock_after: newStock,
          reference_type: "goods_issue",
          reference_document: selectedRequest.document_no,
          location_id: equipment?.find(e => e.id === selectedRequest.equipment_id)?.location_id || undefined,
          notes: issueData.notes || undefined,
        });

        // Create goods_issue record
        const { error: issueError } = await supabase
          .from("goods_issue")
          .insert({
            document_no: selectedRequest.document_no + (partialCount > 1 ? `-P${partialCount}` : ""),
            equipment_id: selectedRequest.equipment_id,
            quantity: issuedQty,
            location_id: equipment?.find(e => e.id === selectedRequest.equipment_id)?.location_id || selectedRequest.equipment_id, // use equipment's location
            issue_date: new Date().toISOString().split('T')[0],
            requester: selectedRequest.requester_name,
            purpose: selectedRequest.purpose,
            notes: issueData.notes || (remainingQty > 0 ? `จ่ายบางส่วน ${issuedQty}/${requestedQty} รอที่เหลือ ${remainingQty} (Stock: ${currentStock} → ${newStock})` : `Stock: ${currentStock} → ${newStock}`),
            created_by: user.id,
          });
        if (issueError) console.error("Error creating goods_issue:", issueError);

        // If installing to billboard, create billboard_equipment record and log movement
        if (issueData.install_to_billboard && issueData.billboard_id) {
          const { error: billboardError } = await supabase
            .from("billboard_equipment")
            .insert({
              billboard_id: issueData.billboard_id,
              equipment_id: selectedRequest.equipment_id,
              quantity: issuedQty,
              installation_date: new Date().toISOString().split('T')[0],
              notes: issueData.notes || `เบิกจากเอกสาร ${selectedRequest.document_no}`,
              created_by: user.id,
            });
          if (billboardError) throw billboardError;

          // Log stock movement for install to billboard
          await logStockMovement({
            equipment_id: selectedRequest.equipment_id,
            equipment_code: selectedRequest.equipment_code || "",
            equipment_name: selectedRequest.equipment_name || "",
            movement_type: "install_to_billboard",
            quantity: issuedQty,
            stock_before: currentStock,
            stock_after: newStock,
            reference_type: "billboard_equipment",
            reference_document: selectedRequest.document_no,
            location_id: equipment?.find(e => e.id === selectedRequest.equipment_id)?.location_id || undefined,
            notes: `ติดตั้งที่ป้าย ${issueData.billboard_id}`,
          });
        }
      }

      return { remainingQty, newStatus };
    },
    onSuccess: (result) => {
      let successMessage = "";
      if (result?.newStatus === "waiting_stock") {
        successMessage = `จ่ายสินค้าบางส่วนสำเร็จ รอของเข้าอีก ${result.remainingQty} ชิ้น`;
      } else if (issueData.install_to_billboard && issueData.billboard_id) {
        successMessage = "จ่ายสินค้าและบันทึกการติดตั้งที่ป้ายสำเร็จ";
      } else {
        successMessage = "จ่ายสินค้าสำเร็จ";
      }
      toast.success(successMessage);
      queryClient.invalidateQueries({ queryKey: ["goods-issue-pending-staff"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-active"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-active-details"] });
      queryClient.invalidateQueries({ queryKey: ["billboard-equipment"] });
      setIssueDialogOpen(false);
      setSelectedRequest(null);
      setIssueData({ issued_quantity: "", notes: "", install_to_billboard: false, billboard_id: "" });
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
    },
    onSuccess: () => {
      toast.success("ปฏิเสธคำขอสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["goods-issue-pending-staff"] });
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectReason("");
    },
    onError: (error) => {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    },
  });

  const handleIssue = (request: PendingRequest & { billboard_id?: string | null }) => {
    setSelectedRequest(request);
    // Use remaining_quantity if available (for partial issues), otherwise use original quantity
    const qtyToIssue = request.remaining_quantity && request.remaining_quantity > 0 
      ? request.remaining_quantity 
      : request.quantity;
    setIssueData({
      issued_quantity: qtyToIssue.toString(),
      notes: request.notes || "",
      install_to_billboard: !!request.billboard_id,
      billboard_id: request.billboard_id || "",
    });
    setIssueDialogOpen(true);
  };

  const handleReject = (request: PendingRequest) => {
    setSelectedRequest(request);
    setRejectDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />รอดำเนินการ</Badge>;
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
    (req) =>
      req.document_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.equipment_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requester_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingCount = pendingRequests?.filter((r) => r.status === "pending" || r.status === "waiting_stock").length || 0;
  const waitingStockCount = pendingRequests?.filter((r) => r.status === "waiting_stock").length || 0;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">จ่ายสินค้า</h1>
            <p className="text-muted-foreground">สำหรับเจ้าหน้าที่คลัง - ดำเนินการจ่ายสินค้าตามคำขอ</p>
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
                    <TableHead>เลขที่เอกสาร</TableHead>
                    <TableHead>วันที่ขอ</TableHead>
                    <TableHead>บริษัท</TableHead>
                    <TableHead>รหัส/ชื่อสินค้า</TableHead>
                    <TableHead>จำนวนขอ</TableHead>
                    <TableHead>คงเหลือ</TableHead>
                    <TableHead>ผู้ขอเบิก</TableHead>
                    <TableHead>ส่งไปที่</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="text-center">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        กำลังโหลด...
                      </TableCell>
                    </TableRow>
                  ) : filteredRequests?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        ไม่พบข้อมูล
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests?.map((req) => {
                      const availableStock = getAvailableStock(req.equipment_id);
                      return (
                        <TableRow key={req.id} className={req.status === "pending" ? "bg-yellow-50" : req.status === "waiting_stock" ? "bg-orange-50" : ""}>
                          <TableCell className="font-medium">{req.document_no}</TableCell>
                          <TableCell>
                            {format(new Date(req.created_at), "dd/MM/yyyy HH:mm", { locale: th })}
                          </TableCell>
                          <TableCell>
                            {req.companies?.name || "-"}
                          </TableCell>
                          <TableCell>
                            {req.equipment_code && <div className="font-medium">{req.equipment_code}</div>}
                            <div className="text-sm text-muted-foreground">{req.equipment_name || "-"}</div>
                          </TableCell>
                          <TableCell>
                            <div>{req.quantity} {req.unit}</div>
                            {req.issued_quantity && req.issued_quantity > 0 && (
                              <div className="text-xs text-green-600">จ่ายแล้ว: {req.issued_quantity}</div>
                            )}
                            {req.remaining_quantity && req.remaining_quantity > 0 && (
                              <div className="text-xs text-orange-600 font-medium">รอ: {req.remaining_quantity}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            {availableStock !== null ? (
                              <span className={availableStock < req.quantity ? "text-destructive font-medium" : ""}>
                                {availableStock}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>{req.requester_name}</div>
                            {req.requester_department && (
                              <div className="text-sm text-muted-foreground">{req.requester_department}</div>
                            )}
                          </TableCell>
                          <TableCell>{req.destination || "-"}</TableCell>
                          <TableCell>{getStatusBadge(req.status)}</TableCell>
                          <TableCell>
                            {(req.status === "pending" || req.status === "waiting_stock") && (
                              <div className="flex items-center gap-2 justify-center">
                                <Button size="sm" onClick={() => handleIssue(req)}>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  {req.status === "waiting_stock" ? "จ่ายต่อ" : "จ่าย"}
                                </Button>
                                {req.status === "pending" && (
                                  <Button size="sm" variant="destructive" onClick={() => handleReject(req)}>
                                    <XCircle className="h-4 w-4 mr-1" />
                                    ปฏิเสธ
                                  </Button>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Issue Dialog */}
      <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>จ่ายสินค้า - {selectedRequest?.document_no}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <Label className="text-muted-foreground">สินค้า</Label>
                <p className="font-medium">{selectedRequest?.equipment_code || "-"}</p>
                <p className="text-sm">{selectedRequest?.equipment_name || "-"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">ผู้ขอเบิก</Label>
                <p className="font-medium">{selectedRequest?.requester_name}</p>
                <p className="text-sm text-muted-foreground">{selectedRequest?.requester_department}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">จำนวนที่ขอทั้งหมด</Label>
                <p className="font-medium">{selectedRequest?.quantity} {selectedRequest?.unit}</p>
                {selectedRequest?.issued_quantity && selectedRequest.issued_quantity > 0 && (
                  <p className="text-xs text-green-600">จ่ายไปแล้ว: {selectedRequest.issued_quantity}</p>
                )}
              </div>
              <div>
                <Label className="text-muted-foreground">
                  {selectedRequest?.remaining_quantity && selectedRequest.remaining_quantity > 0 
                    ? "ต้องจ่ายอีก" 
                    : "คงเหลือในคลัง"}
                </Label>
                <p className="font-medium">
                  {selectedRequest?.remaining_quantity && selectedRequest.remaining_quantity > 0 
                    ? <span className="text-orange-600">{selectedRequest.remaining_quantity} {selectedRequest?.unit}</span>
                    : selectedRequest?.equipment_id ? getAvailableStock(selectedRequest.equipment_id) : "-"}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">คงเหลือในคลัง</Label>
                <p className="font-medium">
                  {selectedRequest?.equipment_id ? getAvailableStock(selectedRequest.equipment_id) : "-"}
                </p>
              </div>
              {selectedRequest?.partial_issue_count && selectedRequest.partial_issue_count > 0 && (
                <div>
                  <Label className="text-muted-foreground">จ่ายไปแล้ว</Label>
                  <p className="font-medium text-blue-600">{selectedRequest.partial_issue_count} ครั้ง</p>
                </div>
              )}
            </div>

            {/* FIFO & Expiry Info */}
            {selectedRequest?.equipment_id && (() => {
              const info = getExpiryInfo(selectedRequest.equipment_id);
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
                  {hasWarning && (
                    <p className="text-xs text-warning mt-2">แนะนำให้จ่ายสินค้านี้เพื่อใช้ประโยชน์ก่อนหมดอายุ/ประกัน</p>
                  )}
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
                onChange={(e) => setIssueData({ ...issueData, issued_quantity: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                หากจ่ายไม่ครบ ระบบจะเก็บจำนวนที่เหลือไว้รอสินค้าเข้าคลังแล้วจ่ายต่อ
              </p>
            </div>

            {/* Equipment Location Info */}
            {selectedRequest?.equipment_id && (() => {
              const info = getExpiryInfo(selectedRequest.equipment_id);
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
                    <span className="text-sm font-medium">ตำแหน่งจัดเก็บ (ไปหยิบสินค้าที่นี่)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">คลัง: </span>
                      <span className="font-medium">{info.locationInfo.warehouseName}</span>
                      <span className="text-xs text-muted-foreground ml-1">({info.locationInfo.warehouseCode})</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ตำแหน่ง: </span>
                      <span className="font-medium">{info.locationInfo.locationName}</span>
                      <span className="text-xs text-muted-foreground ml-1">({info.locationInfo.locationCode})</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* View Equipment Image Button */}
            {selectedRequest?.equipment_id && (
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleViewEquipmentImages(selectedRequest.equipment_id!, selectedRequest.equipment_name || selectedRequest.equipment_code || "สินค้า")}
                  className="gap-2"
                >
                  <Image className="h-4 w-4" />
                  ดูรูปสินค้า (ก่อนหยิบ)
                </Button>
              </div>
            )}

            {/* Billboard Installation Option */}
            {selectedRequest?.equipment_id && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-dashed">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="install_to_billboard"
                    checked={issueData.install_to_billboard}
                    onCheckedChange={(checked) => 
                      setIssueData({ 
                        ...issueData, 
                        install_to_billboard: checked === true,
                        billboard_id: checked ? issueData.billboard_id : ""
                      })
                    }
                  />
                  <Label htmlFor="install_to_billboard" className="flex items-center gap-2 cursor-pointer">
                    <MapPin className="h-4 w-4 text-primary" />
                    ติดตั้งที่ป้ายโฆษณา
                  </Label>
                </div>
                
                {issueData.install_to_billboard && (
                  <div className="space-y-2 ml-6">
                    <Label>เลือกป้ายโฆษณาปลายทาง *</Label>
                    <BillboardSelect
                      value={issueData.billboard_id}
                      onChange={(value) => setIssueData({ ...issueData, billboard_id: value })}
                      placeholder="ค้นหาและเลือกป้ายโฆษณา..."
                    />
                    <p className="text-xs text-muted-foreground">
                      ระบบจะบันทึกอุปกรณ์นี้เป็นอุปกรณ์ที่ติดตั้งที่ป้ายโฆษณาที่เลือก
                    </p>
                  </div>
                )}
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
            <Button variant="outline" onClick={() => setIssueDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button 
              onClick={() => issueGoods.mutate()} 
              disabled={issueGoods.isPending || (issueData.install_to_billboard && !issueData.billboard_id)}
            >
              {issueGoods.isPending ? "กำลังบันทึก..." : "ยืนยันการจ่าย"}
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
              <p><strong>สินค้า:</strong> {selectedRequest?.equipment_name || selectedRequest?.equipment_code || "-"}</p>
              <p><strong>จำนวน:</strong> {selectedRequest?.quantity} {selectedRequest?.unit}</p>
              <p><strong>ผู้ขอ:</strong> {selectedRequest?.requester_name}</p>
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

      {/* Equipment Image Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              รูปสินค้า: {selectedEquipmentName}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
            {selectedEquipmentImages.map((url, index) => (
              <div key={index} className="rounded-lg overflow-hidden border">
                <img 
                  src={url} 
                  alt={`${selectedEquipmentName} - รูปที่ ${index + 1}`}
                  className="w-full h-48 object-contain bg-muted"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setImageDialogOpen(false)}>ปิด</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default IssueGoods;
