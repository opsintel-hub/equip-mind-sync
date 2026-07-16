import { useState } from "react";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DeviceTypeBadge } from "@/components/media-player/DeviceTypeBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, CheckCircle, AlertTriangle, Camera, Upload, Package, Truck, Eye, X, Store, CalendarClock } from "lucide-react";
import { DepartmentMultiFilter } from "@/components/DepartmentMultiFilter";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { DocumentPreviewDialog } from "@/components/DocumentPreviewDialog";
import { logStockMovement } from "@/lib/stockMovement";

const ISSUE_TYPES = [
  { value: "damaged_in_transit", label: "สินค้าชำรุดระหว่างการจัดส่ง" },
  { value: "incomplete", label: "สินค้าไม่ครบ" },
  { value: "wrong_model", label: "สินค้าผิดรุ่น" },
  { value: "wrong_size", label: "สินค้าผิดขนาด" },
  { value: "wrong_type", label: "สินค้าผิดประเภท" },
  { value: "water_damage", label: "สินค้ามีน้ำเข้า" },
  { value: "impact_damage", label: "สินค้าแตกจากการถูกกระแทก" },
];

const DeliveryConfirmation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [snSearchTerm, setSnSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [hasIssue, setHasIssue] = useState(false);
  const [issueType, setIssueType] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [uploadedDocFiles, setUploadedDocFiles] = useState<string[]>([]);
  const [actualQuantity, setActualQuantity] = useState("");
  const [uploading, setUploading] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewConfirmation, setViewConfirmation] = useState<any>(null);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);


  // Fetch issued requests with delivery pickup_type
  const { data: deliveryRequests, isLoading } = useQuery({
    queryKey: ["delivery-confirmation-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_issue_pending")
        .select("*, companies(name), equipment(code, name, serial_number, unit), media_players(code, name, serial_number_1, serial_number_2, unit, device_type)")
        .in("status", ["issued", "partial_issued"])
        .order("issued_at", { ascending: false });
      if (error) throw error;
      
      // Fetch billboard info separately for items that have billboard_id
      if (data && data.length > 0) {
        const billboardIds = [...new Set(data.filter((d: any) => d.billboard_id).map((d: any) => d.billboard_id))];
        if (billboardIds.length > 0) {
          const { data: billboards } = await supabase
            .from("billboards")
            .select("id, equipment_id, location_name, old_code")
            .in("id", billboardIds);
          const bbMap = new Map((billboards || []).map((b: any) => [b.id, b]));
          data.forEach((d: any) => {
            if (d.billboard_id) d._billboard = bbMap.get(d.billboard_id) || null;
          });
        }
      }
      return data;
    },
  });

  // Fetch direct shipments pending confirmation
  const { data: directShipments, isLoading: dsLoading } = useQuery({
    queryKey: ["ds-delivery-confirmation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("direct_shipments")
        .select("*, companies(name), direct_shipment_items(id, equipment_code, equipment_name, quantity, unit, serial_number, serial_number_2, is_media_player)")
        .eq("status", "pending_confirmation")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: existingConfirmations } = useQuery({
    queryKey: ["existing-delivery-confirmations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_confirmations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allItems } = useQuery({
    queryKey: ["delivery-confirmation-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_issue_pending_items")
        .select("*, equipment(code, name, serial_number, unit), media_players(code, name, serial_number_1, serial_number_2, unit, device_type)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      // Fetch billboard info separately
      if (data && data.length > 0) {
        const billboardIds = [...new Set(data.filter((d: any) => d.billboard_id).map((d: any) => d.billboard_id))];
        if (billboardIds.length > 0) {
          const { data: billboards } = await supabase
            .from("billboards")
            .select("id, equipment_id, location_name, old_code")
            .in("id", billboardIds);
          const bbMap = new Map((billboards || []).map((b: any) => [b.id, b]));
          data.forEach((d: any) => {
            if (d.billboard_id) d._billboard = bbMap.get(d.billboard_id) || null;
          });
        }
      }
      return data;
    },
  });

  const getItemsForRequest = (requestId: string) => {
    return allItems?.filter((item: any) => item.pending_id === requestId) || [];
  };

  const isAlreadyConfirmed = (requestId: string, isDirectShipment = false) => {
    if (isDirectShipment) {
      return existingConfirmations?.some((c: any) => c.direct_shipment_id === requestId);
    }
    return existingConfirmations?.some((c: any) => c.goods_issue_pending_id === requestId);
  };

  const getConfirmation = (requestId: string, isDirectShipment = false) => {
    if (isDirectShipment) {
      return existingConfirmations?.find((c: any) => c.direct_shipment_id === requestId);
    }
    return existingConfirmations?.find((c: any) => c.goods_issue_pending_id === requestId);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedRequest?.document_no || 'dc'}-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { error } = await supabase.storage.from("delivery-confirmations").upload(fileName, file);
      if (error) { toast.error(`อัปโหลดไฟล์ ${file.name} ไม่สำเร็จ`); continue; }
      const { data: urlData } = supabase.storage.from("delivery-confirmations").getPublicUrl(fileName);
      newUrls.push(urlData.publicUrl);
    }
    setUploadedFiles(prev => [...prev, ...newUrls]);
    setUploading(false);
    toast.success(`อัปโหลดสำเร็จ ${newUrls.length} ไฟล์`);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const confirmDelivery = useMutation({
    mutationFn: async () => {
      if (!selectedRequest || !user) throw new Error("Missing data");
      const isDS = !!selectedRequest._isDirectShipment;
      
      // Generate DC document number
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const { count } = await supabase
        .from("delivery_confirmations")
        .select("id", { count: "exact", head: true })
        .like("document_no", `DC-${dateStr}%`);
      const seq = String((count || 0) + 1).padStart(4, '0');
      const dcDocumentNo = `DC-${dateStr}-${seq}`;
      
      const { error } = await supabase.from("delivery_confirmations").insert({
        goods_issue_pending_id: isDS ? null : selectedRequest.id,
        direct_shipment_id: isDS ? selectedRequest.id : null,
        document_no: dcDocumentNo,
        confirmed_by: user.id,
        confirmed_at: new Date().toISOString(),
        status: hasIssue ? "issue_reported" : "confirmed",
        issue_type: hasIssue ? issueType : null,
        issue_description: hasIssue ? issueDescription : null,
        notes: notes || null,
        photo_urls: uploadedFiles.length > 0 ? uploadedFiles : null,
        document_urls: uploadedDocFiles.length > 0 ? uploadedDocFiles : null,
        actual_quantity: actualQuantity ? parseInt(actualQuantity) : null,
      } as any);
      if (error) throw error;

      // Update direct shipment status
      if (isDS) {
        await supabase.from("direct_shipments").update({
          status: hasIssue ? "issue_reported" : "confirmed",
          confirmed_at: new Date().toISOString(),
          confirmed_by: user.id,
        }).eq("id", selectedRequest.id);
      }
    },
    onSuccess: () => {
      toast.success(hasIssue ? "บันทึกปัญหาการรับสินค้าสำเร็จ" : "ยืนยันรับสินค้าสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["delivery-confirmation-requests"] });
      queryClient.invalidateQueries({ queryKey: ["existing-delivery-confirmations"] });
      resetForm();
    },
    onError: (error) => toast.error("เกิดข้อผิดพลาด: " + error.message),
  });

  const resetForm = () => {
    setConfirmDialogOpen(false);
    setSelectedRequest(null);
    setHasIssue(false);
    setIssueType("");
    setIssueDescription("");
    setNotes("");
    setUploadedFiles([]);
    setUploadedDocFiles([]);
    setActualQuantity("");
  };

  const getPickupBadge = (type: string) => {
    switch (type) {
      case "wait_onsite": return <Badge variant="destructive" className="gap-1"><Store className="h-3 w-3" />รอรับที่คลัง</Badge>;
      case "scheduled": return <Badge className="bg-blue-100 text-blue-800 gap-1"><CalendarClock className="h-3 w-3" />นัดรับ</Badge>;
      case "delivery": return <Badge className="bg-purple-100 text-purple-800 gap-1"><Truck className="h-3 w-3" />จัดส่ง</Badge>;
      default: return <Badge variant="secondary">-</Badge>;
    }
  };

  // Filter logic
  const filteredRequests = deliveryRequests?.filter((req: any) => {
    // Dedicated S/N search
    if (snSearchTerm) {
      const snTerm = snSearchTerm.toLowerCase();
      const items = getItemsForRequest(req.id);
      if (!items.some((item: any) => item.serial_number?.toLowerCase().includes(snTerm))) return false;
    }
    // General search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!req.document_no?.toLowerCase().includes(term) &&
          !req.equipment_name?.toLowerCase().includes(term) &&
          !req.requester_name?.toLowerCase().includes(term)) return false;
    }
    // Status filter
    if (statusFilter !== "all") {
      const confirmed = isAlreadyConfirmed(req.id);
      const confirmation = getConfirmation(req.id);
      if (statusFilter === "pending" && confirmed) return false;
      if (statusFilter === "confirmed" && (!confirmed || confirmation?.status === "issue_reported")) return false;
      if (statusFilter === "issue_reported" && (!confirmed || confirmation?.status !== "issue_reported")) return false;
    }
    // Department filter
    if (departmentFilter.length > 0 && !departmentFilter.includes(req.requester_department)) return false;
    // Date range
    if (dateRange?.from) {
      const d = new Date(req.created_at);
      if (d < dateRange.from) return false;
      if (dateRange.to && d > dateRange.to) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Truck className="h-6 w-6" />
          ยืนยันรับสินค้า
        </h1>
        <p className="text-muted-foreground">ยืนยันการรับสินค้าหลังจ่ายทุกกรณี พร้อมแจ้งปัญหาและแนบหลักฐาน</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />รายการรอยืนยันรับ</CardTitle>
          <CardDescription>แสดงรายการทั้งหมดที่จ่ายสินค้าแล้วและรอการยืนยันรับ</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="ค้นหา S/N..." value={snSearchTerm} onChange={(e) => setSnSearchTerm(e.target.value)} className="pl-10 w-[160px]" />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="ค้นหาเลขที่เอกสาร, ชื่อสินค้า, ชื่อผู้เบิก..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="สถานะ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="pending">รอยืนยัน</SelectItem>
                <SelectItem value="confirmed">ยืนยันแล้ว</SelectItem>
                <SelectItem value="issue_reported">แจ้งปัญหา</SelectItem>
              </SelectContent>
            </Select>
            <DepartmentMultiFilter value={departmentFilter} onChange={setDepartmentFilter} />
            <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เลขที่เอกสาร</TableHead>
                  <TableHead>วันที่จ่าย</TableHead>
                  <TableHead>บริษัท</TableHead>
                  <TableHead>ผู้ขอเบิก / ฝ่าย</TableHead>
                  <TableHead>รูปแบบการรับ</TableHead>
                  <TableHead>ปลายทาง</TableHead>
                  <TableHead>รายการ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-center">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(isLoading || dsLoading) ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">กำลังโหลด...</TableCell></TableRow>
                ) : (filteredRequests?.length === 0 && (!directShipments || directShipments.length === 0)) ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">ไม่พบรายการ</TableCell></TableRow>
                ) : (
                  <>
                    {filteredRequests?.map((req: any) => {
                      const confirmed = isAlreadyConfirmed(req.id);
                      const confirmation = getConfirmation(req.id);
                      const items = getItemsForRequest(req.id);
                      return (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium">{req.document_no}</TableCell>
                          <TableCell>{req.issued_at ? format(new Date(req.issued_at), "dd/MM/yyyy HH:mm", { locale: th }) : "-"}</TableCell>
                          <TableCell>{req.companies?.name || "-"}</TableCell>
                          <TableCell>
                            <div>{req.requester_name}</div>
                            {req.requester_department && <div className="text-xs text-muted-foreground">{req.requester_department}</div>}
                          </TableCell>
                          <TableCell>{getPickupBadge(req.pickup_type)}</TableCell>
                          <TableCell>{req.destination || "-"}</TableCell>
                          <TableCell>
                            {items.length > 0 ? (
                              <Badge variant="outline">{items.length} รายการ</Badge>
                            ) : (
                              <div className="text-sm">{req.equipment_name || "-"}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            {confirmed ? (
                              confirmation?.status === "issue_reported" ? (
                                <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />แจ้งปัญหา</Badge>
                              ) : (
                                <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />ยืนยันแล้ว</Badge>
                              )
                            ) : (
                              <Badge variant="secondary">รอยืนยัน</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {confirmed ? (
                              <Button size="sm" variant="outline" onClick={() => { setViewConfirmation(getConfirmation(req.id)); setViewDialogOpen(true); }}>
                                <Eye className="h-4 w-4 mr-1" />ดูรายละเอียด
                              </Button>
                            ) : (
                              <Button size="sm" onClick={() => { setSelectedRequest(req); setConfirmDialogOpen(true); }}>
                                <CheckCircle className="h-4 w-4 mr-1" />ยืนยันรับ
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {/* Direct Shipping rows */}
                    {directShipments?.map((ds: any) => {
                      const confirmed = isAlreadyConfirmed(ds.id, true);
                      const confirmation = getConfirmation(ds.id, true);
                      const dsItems = ds.direct_shipment_items || [];
                      return (
                        <TableRow key={`ds-${ds.id}`}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-xs">DS</Badge>
                              {ds.document_no}
                            </div>
                          </TableCell>
                          <TableCell>{ds.shipping_date ? format(new Date(ds.shipping_date), "dd/MM/yyyy") : "-"}</TableCell>
                          <TableCell>{ds.companies?.name || "-"}</TableCell>
                          <TableCell>
                            <div>{ds.supplier_name || "Direct Shipping"}</div>
                            {ds.department && <div className="text-xs text-muted-foreground">{ds.department}</div>}
                          </TableCell>
                          <TableCell><Badge variant="outline" className="gap-1"><Truck className="h-3 w-3" />Direct</Badge></TableCell>
                          <TableCell>{ds.destination_description || "-"}</TableCell>
                          <TableCell><Badge variant="outline">{dsItems.length} รายการ</Badge></TableCell>
                          <TableCell>
                            {confirmed ? (
                              confirmation?.status === "issue_reported" ? (
                                <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />แจ้งปัญหา</Badge>
                              ) : (
                                <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />ยืนยันแล้ว</Badge>
                              )
                            ) : (
                              <Badge variant="secondary">รอยืนยัน</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {confirmed ? (
                              <Button size="sm" variant="outline" onClick={() => { setViewConfirmation(getConfirmation(ds.id, true)); setViewDialogOpen(true); }}>
                                <Eye className="h-4 w-4 mr-1" />ดูรายละเอียด
                              </Button>
                            ) : (
                              <Button size="sm" onClick={() => { setSelectedRequest({ ...ds, _isDirectShipment: true }); setConfirmDialogOpen(true); }}>
                                <CheckCircle className="h-4 w-4 mr-1" />ยืนยันรับ
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </>
                
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5" />ยืนยันรับสินค้า - {selectedRequest?.document_no}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">ผู้ขอเบิก:</span> <span className="font-medium">{selectedRequest?.requester_name}</span></div>
                  <div><span className="text-muted-foreground">ฝ่าย:</span> <span className="font-medium">{selectedRequest?.requester_department || "-"}</span></div>
                  <div><span className="text-muted-foreground">ปลายทาง:</span> <span className="font-medium">{selectedRequest?.destination || "-"}</span></div>
                  <div><span className="text-muted-foreground">สินค้า:</span> <span className="font-medium inline-flex items-center gap-2">{selectedRequest?.equipment_name || selectedRequest?.equipment?.name || "-"}{selectedRequest?.is_media_player && (selectedRequest as any)?.media_players?.device_type && <DeviceTypeBadge value={(selectedRequest as any).media_players.device_type} />}</span></div>
                  {selectedRequest?.equipment_code && (
                    <div><span className="text-muted-foreground">รหัสสินค้า:</span> <span className="font-medium font-mono">{selectedRequest.equipment_code}</span></div>
                  )}
                  {selectedRequest?._billboard && (
                    <div><span className="text-muted-foreground">ป้าย:</span> <span className="font-medium">{selectedRequest._billboard.old_code || selectedRequest._billboard.equipment_id} {selectedRequest._billboard.location_name ? `- ${selectedRequest._billboard.location_name}` : ""}</span></div>
                  )}
                  {selectedRequest?.purpose && (
                    <div><span className="text-muted-foreground">วัตถุประสงค์:</span> <span className="font-medium">{selectedRequest.purpose}</span></div>
                  )}
                  {selectedRequest?.pickup_type && (
                    <div><span className="text-muted-foreground">รูปแบบรับ:</span> {getPickupBadge(selectedRequest.pickup_type)}</div>
                  )}
                  <div><span className="text-muted-foreground">จำนวนขอ:</span> <span className="font-medium">{selectedRequest?.quantity} {selectedRequest?.unit}</span></div>
                  <div><span className="text-muted-foreground">จำนวนจ่าย:</span> <span className="font-medium">{selectedRequest?.issued_quantity || 0} {selectedRequest?.unit}</span></div>
                  {selectedRequest?.item_condition && selectedRequest.item_condition !== "new" && (
                    <div><span className="text-muted-foreground">สภาพ:</span> <span className="font-medium">{selectedRequest.item_condition}</span></div>
                  )}
                  {/* Serial Number from header */}
                  {(selectedRequest?.equipment?.serial_number || selectedRequest?.media_players?.serial_number_1) && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Serial Number:</span>{" "}
                      <span className="font-medium font-mono whitespace-pre-line">
                        {selectedRequest?.is_media_player 
                          ? [selectedRequest?.media_players?.serial_number_1, selectedRequest?.media_players?.serial_number_2].filter(Boolean).join("\n")
                          : selectedRequest?.equipment?.serial_number}
                      </span>
                    </div>
                  )}
                  {selectedRequest?.notes && (
                    <div className="col-span-2"><span className="text-muted-foreground">หมายเหตุ:</span> <span className="font-medium">{selectedRequest.notes}</span></div>
                  )}
                </div>
                {selectedRequest && getItemsForRequest(selectedRequest.id).length > 0 && (
                  <div className="mt-3 border-t pt-3">
                    <p className="font-medium mb-2">รายการสินค้า:</p>
                    <div className="space-y-2">
                      {getItemsForRequest(selectedRequest.id).map((item: any) => (
                        <div key={item.id} className="text-sm bg-background rounded-lg px-3 py-2 border">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{item.equipment_code} - {item.equipment_name}</span>
                            <span className="font-medium">{item.issued_quantity || item.quantity} {item.unit}</span>
                          </div>
                          {/* Item-level serial number */}
                          {item.serial_number && (
                            <div className="text-xs text-muted-foreground mt-1">
                              S/N: <span className="font-mono">{item.serial_number}</span>
                            </div>
                          )}
                          {/* Item-level billboard */}
                          {item._billboard && (
                            <div className="text-xs text-muted-foreground">
                              ป้าย: {item._billboard.old_code || item._billboard.equipment_id} {item._billboard.location_name ? `- ${item._billboard.location_name}` : ""}
                            </div>
                          )}
                          {item.item_condition && item.item_condition !== "new" && (
                            <div className="text-xs text-muted-foreground">สภาพ: {item.item_condition}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Label className="text-base font-medium">มีปัญหากับสินค้าที่ได้รับหรือไม่?</Label>
              <div className="flex gap-3">
                <Button type="button" variant={!hasIssue ? "default" : "outline"} onClick={() => setHasIssue(false)} className="flex-1">
                  <CheckCircle className="h-4 w-4 mr-2" />รับสินค้าครบถ้วน
                </Button>
                <Button type="button" variant={hasIssue ? "destructive" : "outline"} onClick={() => setHasIssue(true)} className="flex-1">
                  <AlertTriangle className="h-4 w-4 mr-2" />แจ้งปัญหา
                </Button>
              </div>
            </div>

            {hasIssue && (
              <div className="space-y-4 p-4 border border-destructive/30 rounded-lg bg-destructive/5">
                <div className="space-y-2">
                  <Label>ประเภทปัญหา *</Label>
                  <Select value={issueType} onValueChange={setIssueType}>
                    <SelectTrigger><SelectValue placeholder="เลือกประเภทปัญหา" /></SelectTrigger>
                    <SelectContent>
                      {ISSUE_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>รายละเอียดปัญหา</Label>
                  <Textarea value={issueDescription} onChange={(e) => setIssueDescription(e.target.value)} placeholder="อธิบายรายละเอียดปัญหาที่พบ..." rows={3} />
                </div>
              </div>
            )}

            {/* Actual quantity (for DS) */}
            {selectedRequest?._isDirectShipment && (
              <div className="space-y-2">
                <Label className="text-base font-medium">จำนวนที่ได้รับจริง</Label>
                <Input type="number" min="0" value={actualQuantity} onChange={e => setActualQuantity(e.target.value)} placeholder="ระบุจำนวนรวมที่ได้รับจริง" />
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-base font-medium flex items-center gap-2"><Camera className="h-4 w-4" />ภาพถ่ายสินค้าจริง</Label>
              <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <input type="file" multiple accept="image/*,video/*" onChange={handleFileUpload} className="hidden" id="delivery-file-upload" disabled={uploading} />
                <label htmlFor="delivery-file-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">{uploading ? "กำลังอัปโหลด..." : "คลิกเพื่ออัปโหลดรูปภาพหรือวิดีโอ"}</p>
                  <p className="text-xs text-muted-foreground mt-1">รองรับ JPG, PNG, MP4, MOV</p>
                </label>
              </div>
              {uploadedFiles.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {uploadedFiles.map((url, index) => (
                    <div key={index} className="relative group">
                      {url.match(/\.(mp4|mov|avi|webm)$/i) ? (
                        <video src={url} className="w-full h-24 object-cover rounded-lg" />
                      ) : (
                        <img src={url} alt={`หลักฐาน ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                      )}
                      <button onClick={() => removeFile(index)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Document upload (delivery note) */}
            <div className="space-y-3">
              <Label className="text-base font-medium flex items-center gap-2"><Upload className="h-4 w-4" />เอกสารใบส่งของ</Label>
              <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                <input type="file" multiple accept="image/*,application/pdf" onChange={async (e) => {
                  const files = e.target.files;
                  if (!files || files.length === 0) return;
                  setUploading(true);
                  const newUrls: string[] = [];
                  for (const file of Array.from(files)) {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `doc-${selectedRequest?.document_no || 'dc'}-${Date.now()}.${fileExt}`;
                    const { error } = await supabase.storage.from("delivery-confirmations").upload(fileName, file);
                    if (error) { toast.error(`อัปโหลดไม่สำเร็จ`); continue; }
                    const { data: urlData } = supabase.storage.from("delivery-confirmations").getPublicUrl(fileName);
                    newUrls.push(urlData.publicUrl);
                  }
                  setUploadedDocFiles(prev => [...prev, ...newUrls]);
                  setUploading(false);
                  if (newUrls.length > 0) toast.success(`อัปโหลดเอกสารสำเร็จ ${newUrls.length} ไฟล์`);
                }} className="hidden" id="delivery-doc-upload" disabled={uploading} />
                <label htmlFor="delivery-doc-upload" className="cursor-pointer">
                  <p className="text-sm text-muted-foreground">{uploading ? "กำลังอัปโหลด..." : "คลิกเพื่ออัปโหลดเอกสารใบส่งของ"}</p>
                  <p className="text-xs text-muted-foreground mt-1">รองรับ JPG, PNG, PDF</p>
                </label>
              </div>
              {uploadedDocFiles.length > 0 && (
                <div className="space-y-1">
                  {uploadedDocFiles.map((url, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm bg-muted/50 px-3 py-2 rounded">
                      <button type="button" onClick={() => setPreviewDocUrl(url)} className="text-primary hover:underline flex-1 truncate text-left">เอกสาร {i + 1}</button>
                      <button onClick={() => setUploadedDocFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-destructive hover:text-destructive/80"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>หมายเหตุเพิ่มเติม</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="หมายเหตุ (ถ้ามี)..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>ยกเลิก</Button>
            <Button onClick={() => { if (hasIssue && !issueType) { toast.error("กรุณาเลือกประเภทปัญหา"); return; } confirmDelivery.mutate(); }}
              disabled={confirmDelivery.isPending} variant={hasIssue ? "destructive" : "default"}>
              {confirmDelivery.isPending ? "กำลังบันทึก..." : hasIssue ? "บันทึกปัญหา" : "ยืนยันรับสินค้า"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Confirmation Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>รายละเอียดการยืนยัน</DialogTitle></DialogHeader>
          {viewConfirmation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">เลขที่:</span> <span className="font-medium">{viewConfirmation.document_no}</span></div>
                <div><span className="text-muted-foreground">วันที่ยืนยัน:</span> <span className="font-medium">{format(new Date(viewConfirmation.confirmed_at), "dd/MM/yyyy HH:mm", { locale: th })}</span></div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">สถานะ:</span>{" "}
                  {viewConfirmation.status === "issue_reported" ? <Badge variant="destructive">แจ้งปัญหา</Badge> : <Badge className="bg-green-100 text-green-800">ยืนยันแล้ว</Badge>}
                </div>
              </div>
              {viewConfirmation.issue_type && (
                <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                  <p className="text-sm font-medium text-destructive mb-1">ปัญหา: {ISSUE_TYPES.find(t => t.value === viewConfirmation.issue_type)?.label || viewConfirmation.issue_type}</p>
                  {viewConfirmation.issue_description && <p className="text-sm text-muted-foreground">{viewConfirmation.issue_description}</p>}
                </div>
              )}
              {viewConfirmation.notes && (
                <div><p className="text-sm text-muted-foreground">หมายเหตุ:</p><p className="text-sm">{viewConfirmation.notes}</p></div>
              )}
              {viewConfirmation.photo_urls?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">หลักฐาน ({viewConfirmation.photo_urls.length} ไฟล์)</p>
                  <div className="grid grid-cols-2 gap-2">
                    {viewConfirmation.photo_urls.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        {url.match(/\.(mp4|mov|avi|webm)$/i) ? (
                          <video src={url} className="w-full h-32 object-cover rounded-lg" controls />
                        ) : (
                          <img src={url} alt={`หลักฐาน ${i + 1}`} className="w-full h-32 object-cover rounded-lg hover:opacity-80 transition-opacity" />
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <DocumentPreviewDialog
        open={!!previewDocUrl}
        onOpenChange={(open) => { if (!open) setPreviewDocUrl(null); }}
        publicUrl={previewDocUrl}
        title="ดูเอกสารใบส่งของ"
      />
    </div>
  );
};

export default DeliveryConfirmation;