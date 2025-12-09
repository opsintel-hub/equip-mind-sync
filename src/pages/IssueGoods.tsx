import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
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
import { Search, Package, Clock, CheckCircle, XCircle, Edit } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { LocationSelect } from "@/components/equipment/LocationSelect";

interface PendingRequest {
  id: string;
  document_no: string;
  equipment_id: string | null;
  equipment_code: string | null;
  equipment_name: string | null;
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
    issued_location_id: "",
    notes: "",
  });
  const [rejectReason, setRejectReason] = useState("");

  // Fetch pending requests
  const { data: pendingRequests, isLoading } = useQuery({
    queryKey: ["goods-issue-pending-staff"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_issue_pending")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PendingRequest[];
    },
  });

  // Fetch equipment for validation
  const { data: equipment } = useQuery({
    queryKey: ["equipment-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("id, code, name, quantity_in_stock")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  // Issue goods mutation
  const issueGoods = useMutation({
    mutationFn: async () => {
      if (!selectedRequest || !user) return;

      const issuedQty = parseInt(issueData.issued_quantity);
      
      // Update pending request
      const { error: updateError } = await supabase
        .from("goods_issue_pending")
        .update({
          status: "issued",
          issued_quantity: issuedQty,
          issued_at: new Date().toISOString(),
          issued_by: user.id,
          issued_location_id: issueData.issued_location_id || null,
          notes: issueData.notes || selectedRequest.notes,
        })
        .eq("id", selectedRequest.id);

      if (updateError) throw updateError;

      // If equipment_id exists, update stock
      if (selectedRequest.equipment_id) {
        const currentEquipment = equipment?.find((e) => e.id === selectedRequest.equipment_id);
        if (currentEquipment) {
          const newStock = Math.max(0, currentEquipment.quantity_in_stock - issuedQty);
          const { error: stockError } = await supabase
            .from("equipment")
            .update({ quantity_in_stock: newStock })
            .eq("id", selectedRequest.equipment_id);
          if (stockError) throw stockError;
        }
      }
    },
    onSuccess: () => {
      toast.success("จ่ายสินค้าสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["goods-issue-pending-staff"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-active"] });
      setIssueDialogOpen(false);
      setSelectedRequest(null);
      setIssueData({ issued_quantity: "", issued_location_id: "", notes: "" });
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

  const handleIssue = (request: PendingRequest) => {
    setSelectedRequest(request);
    setIssueData({
      issued_quantity: request.quantity.toString(),
      issued_location_id: "",
      notes: request.notes || "",
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
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />จ่ายแล้ว</Badge>;
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

  const pendingCount = pendingRequests?.filter((r) => r.status === "pending").length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">จ่ายสินค้า</h1>
            <p className="text-muted-foreground">สำหรับเจ้าหน้าที่คลัง - ดำเนินการจ่ายสินค้าตามคำขอ</p>
          </div>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-lg px-4 py-2">
              รอดำเนินการ: {pendingCount} รายการ
            </Badge>
          )}
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
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        กำลังโหลด...
                      </TableCell>
                    </TableRow>
                  ) : filteredRequests?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        ไม่พบข้อมูล
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests?.map((req) => {
                      const availableStock = getAvailableStock(req.equipment_id);
                      return (
                        <TableRow key={req.id} className={req.status === "pending" ? "bg-yellow-50" : ""}>
                          <TableCell className="font-medium">{req.document_no}</TableCell>
                          <TableCell>
                            {format(new Date(req.created_at), "dd/MM/yyyy HH:mm", { locale: th })}
                          </TableCell>
                          <TableCell>
                            {req.equipment_code && <div className="font-medium">{req.equipment_code}</div>}
                            <div className="text-sm text-muted-foreground">{req.equipment_name || "-"}</div>
                          </TableCell>
                          <TableCell>
                            {req.quantity} {req.unit}
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
                            {req.status === "pending" && (
                              <div className="flex items-center gap-2 justify-center">
                                <Button size="sm" onClick={() => handleIssue(req)}>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  จ่าย
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleReject(req)}>
                                  <XCircle className="h-4 w-4 mr-1" />
                                  ปฏิเสธ
                                </Button>
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
                <Label className="text-muted-foreground">จำนวนที่ขอ</Label>
                <p className="font-medium">{selectedRequest?.quantity} {selectedRequest?.unit}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">คงเหลือในคลัง</Label>
                <p className="font-medium">
                  {selectedRequest?.equipment_id ? getAvailableStock(selectedRequest.equipment_id) : "-"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="issued_quantity">จำนวนที่จ่ายจริง *</Label>
              <Input
                id="issued_quantity"
                type="number"
                min="1"
                value={issueData.issued_quantity}
                onChange={(e) => setIssueData({ ...issueData, issued_quantity: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>จ่ายจากคลัง</Label>
              <LocationSelect
                value={issueData.issued_location_id}
                onChange={(value) => setIssueData({ ...issueData, issued_location_id: value })}
              />
            </div>

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
            <Button onClick={() => issueGoods.mutate()} disabled={issueGoods.isPending}>
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
    </DashboardLayout>
  );
};

export default IssueGoods;
