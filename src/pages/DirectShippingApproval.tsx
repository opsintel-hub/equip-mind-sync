import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ShieldCheck, Search, Loader2, Eye, CheckCircle2, X, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useDepartmentPermissions } from "@/hooks/useDepartmentPermissions";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { DestinationMapPreview } from "@/components/direct-shipping/DestinationMapPreview";

export default function DirectShippingApproval() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isAdmin, getViewableDepartments } = useDepartmentPermissions();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending_approval");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const viewableDepts = getViewableDepartments();

  // Fetch DS requests for departments user manages
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["ds-approval-requests", statusFilter, viewableDepts],
    queryFn: async () => {
      let query = supabase
        .from("direct_shipments")
        .select("*, companies(name)")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      } else {
        query = query.in("status", ["pending_approval", "approved", "rejected"]);
      }

      if (!isAdmin && viewableDepts.length > 0) {
        query = query.in("department", viewableDepts);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = requests.filter((r: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.document_no?.toLowerCase().includes(term) ||
      r.requester_name?.toLowerCase().includes(term) ||
      r.requested_items_description?.toLowerCase().includes(term) ||
      r.destination_description?.toLowerCase().includes(term)
    );
  });

  const { currentPage, totalPages, paginatedData, handlePageChange, totalItems, pageSize, handlePageSizeChange } = useTablePagination(filtered);

  const handleAction = async () => {
    if (!selectedRequest || !actionType || !user) return;
    if (actionType === "reject" && !rejectionReason.trim()) {
      toast.error("กรุณาระบุเหตุผลที่ไม่อนุมัติ");
      return;
    }

    setProcessing(true);
    try {
      const updateData: any = {
        status: actionType === "approve" ? "approved" : "rejected",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      };
      if (actionType === "reject") {
        updateData.rejection_reason = rejectionReason;
      }

      const { error } = await supabase
        .from("direct_shipments")
        .update(updateData)
        .eq("id", selectedRequest.id);

      if (error) throw error;

      // Create notification
      const notifTitle = actionType === "approve" 
        ? `คำขอส่งตรงอนุมัติแล้ว - ${selectedRequest.document_no}`
        : `คำขอส่งตรงไม่อนุมัติ - ${selectedRequest.document_no}`;
      const notifMsg = actionType === "approve"
        ? `คำขอ ${selectedRequest.document_no} ของ ${selectedRequest.requester_name} ได้รับอนุมัติแล้ว รอจัดซื้อดำเนินการ`
        : `คำขอ ${selectedRequest.document_no} ถูกปฏิเสธ: ${rejectionReason}`;
      
      await supabase.from("notifications").insert({
        title: notifTitle,
        message: notifMsg,
        type: actionType === "approve" ? "success" : "warning",
        category: "stock",
        department: selectedRequest.department,
        reference_id: selectedRequest.id,
        reference_type: "direct_shipment",
        user_id: selectedRequest.created_by,
      });

      toast.success(actionType === "approve" ? "อนุมัติคำขอส่งตรงเรียบร้อย" : "ปฏิเสธคำขอส่งตรงเรียบร้อย");
      queryClient.invalidateQueries({ queryKey: ["ds-approval-requests"] });
      setSelectedRequest(null);
      setActionType(null);
      setRejectionReason("");
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_approval": return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />รออนุมัติ</Badge>;
      case "approved": return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />อนุมัติแล้ว</Badge>;
      case "rejected": return <Badge variant="destructive"><X className="w-3 h-3 mr-1" />ไม่อนุมัติ</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-primary" />
          อนุมัติคำขอส่งตรง
        </h1>
        <p className="text-muted-foreground mt-1">พิจารณาอนุมัติ/ปฏิเสธคำขอ Direct Shipping ก่อนส่งให้จัดซื้อดำเนินการ</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">คำขอส่งตรงที่รอพิจารณา</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="ค้นหา..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <select
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="pending_approval">รออนุมัติ</option>
              <option value="approved">อนุมัติแล้ว</option>
              <option value="rejected">ไม่อนุมัติ</option>
              <option value="all">ทั้งหมด</option>
            </select>
          </div>

          {isLoading ? (
            <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เลขที่</TableHead>
                    <TableHead>วันที่ขอ</TableHead>
                    <TableHead>ผู้ขอ / ฝ่าย</TableHead>
                    <TableHead>สินค้าที่ต้องการ</TableHead>
                    <TableHead>ปลายทาง</TableHead>
                    <TableHead>ต้องการก่อน</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="text-center">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">ไม่พบคำขอ</TableCell></TableRow>
                  ) : (
                    paginatedData.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-sm font-medium">{r.document_no}</TableCell>
                        <TableCell>{format(new Date(r.created_at), "dd/MM/yyyy", { locale: th })}</TableCell>
                        <TableCell>
                          <div>{r.requester_name || "-"}</div>
                          <div className="text-xs text-muted-foreground">{r.department}</div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{r.requested_items_description || "-"}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{r.destination_description || "-"}</TableCell>
                        <TableCell>{r.expected_arrival_date ? format(new Date(r.expected_arrival_date), "dd/MM/yyyy") : "-"}</TableCell>
                        <TableCell>{getStatusBadge(r.status)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setSelectedRequest(r); setActionType(null); }}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            {r.status === "pending_approval" && (
                              <>
                                <Button size="sm" variant="default" onClick={() => { setSelectedRequest(r); setActionType("approve"); }}>
                                  <CheckCircle2 className="w-3 h-3 mr-1" />อนุมัติ
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => { setSelectedRequest(r); setActionType("reject"); setRejectionReason(""); }}>
                                  <X className="w-3 h-3 mr-1" />ปฏิเสธ
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <TablePagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* View / Action Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => { setSelectedRequest(null); setActionType(null); setRejectionReason(""); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "อนุมัติคำขอ" : actionType === "reject" ? "ปฏิเสธคำขอ" : "รายละเอียดคำขอ"} - {selectedRequest?.document_no}
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">ผู้ขอ:</span> <span className="font-medium">{selectedRequest.requester_name}</span></div>
                <div><span className="text-muted-foreground">เบอร์:</span> {selectedRequest.requester_phone || "-"}</div>
                <div><span className="text-muted-foreground">ฝ่าย:</span> {selectedRequest.department}</div>
                <div><span className="text-muted-foreground">บริษัท:</span> {selectedRequest.companies?.name || "-"}</div>
                <div className="col-span-2"><span className="text-muted-foreground">ปลายทาง:</span> {selectedRequest.destination_description}</div>
                {selectedRequest.expected_arrival_date && (
                  <div><span className="text-muted-foreground">ต้องการก่อน:</span> {format(new Date(selectedRequest.expected_arrival_date), "dd/MM/yyyy")}</div>
                )}
                {selectedRequest.purpose && (
                  <div className="col-span-2"><span className="text-muted-foreground">วัตถุประสงค์:</span> {selectedRequest.purpose}</div>
                )}
              </div>

              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-muted-foreground mb-1 font-medium">สินค้าที่ต้องการ:</p>
                <p className="whitespace-pre-wrap">{selectedRequest.requested_items_description}</p>
              </div>

              {selectedRequest.notes && (
                <div><span className="text-muted-foreground">หมายเหตุ:</span> {selectedRequest.notes}</div>
              )}

              {actionType === "reject" && (
                <div className="space-y-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <Label className="text-destructive">เหตุผลที่ไม่อนุมัติ *</Label>
                  <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="ระบุเหตุผล..." rows={3} />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedRequest(null); setActionType(null); }}>ปิด</Button>
            {actionType === "approve" && (
              <Button onClick={handleAction} disabled={processing}>
                {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                ยืนยันอนุมัติ
              </Button>
            )}
            {actionType === "reject" && (
              <Button variant="destructive" onClick={handleAction} disabled={processing}>
                {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
                ยืนยันปฏิเสธ
              </Button>
            )}
            {!actionType && selectedRequest?.status === "pending_approval" && (
              <>
                <Button onClick={() => setActionType("approve")}><CheckCircle2 className="w-4 h-4 mr-1" />อนุมัติ</Button>
                <Button variant="destructive" onClick={() => { setActionType("reject"); setRejectionReason(""); }}><X className="w-4 h-4 mr-1" />ปฏิเสธ</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
