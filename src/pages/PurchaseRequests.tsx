import { useState } from "react";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Search, FileCheck, FileX, AlertTriangle, ShoppingCart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface PurchaseRequest {
  id: string;
  pr_number: string;
  equipment_id: string | null;
  equipment_code: string;
  equipment_name: string;
  current_stock: number;
  min_stock_level: number;
  suggested_quantity: number;
  unit: string;
  reason: string | null;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  reject_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function PurchaseRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPR, setSelectedPR] = useState<PurchaseRequest | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [approveNotes, setApproveNotes] = useState("");

  const { data: purchaseRequests = [], isLoading } = useQuery({
    queryKey: ["purchase-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PurchaseRequest[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("purchase_requests")
        .update({
          status: "approved",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          notes: notes || null,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      toast.success("อนุมัติใบขอซื้อเรียบร้อย");
      setShowApproveDialog(false);
      setSelectedPR(null);
      setApproveNotes("");
    },
    onError: (error) => {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from("purchase_requests")
        .update({
          status: "rejected",
          rejected_by: user?.id,
          rejected_at: new Date().toISOString(),
          reject_reason: reason,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      toast.success("ปฏิเสธใบขอซื้อเรียบร้อย");
      setShowRejectDialog(false);
      setSelectedPR(null);
      setRejectReason("");
    },
    onError: (error) => {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    },
  });

  const filteredRequests = purchaseRequests.filter((pr) => {
    const matchesSearch =
      pr.pr_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.equipment_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.equipment_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || pr.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const { paginatedData: paginatedRequests, currentPage, pageSize, totalPages, totalItems, handlePageChange, handlePageSizeChange } = useTablePagination(filteredRequests, 20);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">รออนุมัติ</Badge>;
      case "approved":
        return <Badge variant="secondary" className="bg-green-100 text-green-800">อนุมัติแล้ว</Badge>;
      case "rejected":
        return <Badge variant="secondary" className="bg-red-100 text-red-800">ไม่อนุมัติ</Badge>;
      case "ordered":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">สั่งซื้อแล้ว</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = purchaseRequests.filter(pr => pr.status === "pending").length;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">ใบขอซื้อ (Purchase Requests)</h1>
            <p className="text-muted-foreground mt-1">จัดการใบขอซื้ออะไหล่ที่สร้างอัตโนมัติเมื่อ Stock ต่ำ</p>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 bg-yellow-50 text-yellow-800 px-4 py-2 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">{pendingCount} รายการรออนุมัติ</span>
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="ค้นหาเลข PR, รหัสอะไหล่, ชื่ออะไหล่..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  onClick={() => setStatusFilter("all")}
                  size="sm"
                >
                  ทั้งหมด
                </Button>
                <Button
                  variant={statusFilter === "pending" ? "default" : "outline"}
                  onClick={() => setStatusFilter("pending")}
                  size="sm"
                >
                  รออนุมัติ
                </Button>
                <Button
                  variant={statusFilter === "approved" ? "default" : "outline"}
                  onClick={() => setStatusFilter("approved")}
                  size="sm"
                >
                  อนุมัติแล้ว
                </Button>
                <Button
                  variant={statusFilter === "rejected" ? "default" : "outline"}
                  onClick={() => setStatusFilter("rejected")}
                  size="sm"
                >
                  ไม่อนุมัติ
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">ไม่พบใบขอซื้อ</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เลข PR</TableHead>
                    <TableHead>รหัสอะไหล่</TableHead>
                    <TableHead>ชื่ออะไหล่</TableHead>
                    <TableHead className="text-right">Stock ปัจจุบัน</TableHead>
                    <TableHead className="text-right">จุดสั่งซื้อ</TableHead>
                    <TableHead className="text-right">แนะนำสั่ง</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>วันที่สร้าง</TableHead>
                    <TableHead className="text-center">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRequests.map((pr) => (
                    <TableRow key={pr.id}>
                      <TableCell className="font-medium">{pr.pr_number}</TableCell>
                      <TableCell>{pr.equipment_code}</TableCell>
                      <TableCell>{pr.equipment_name}</TableCell>
                      <TableCell className="text-right">
                        <span className={pr.current_stock <= pr.min_stock_level ? "text-red-600 font-medium" : ""}>
                          {pr.current_stock}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{pr.min_stock_level}</TableCell>
                      <TableCell className="text-right font-medium">{pr.suggested_quantity} {pr.unit}</TableCell>
                      <TableCell>{getStatusBadge(pr.status)}</TableCell>
                      <TableCell>
                        {format(new Date(pr.created_at), "d MMM yyyy HH:mm", { locale: th })}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-2">
                          {pr.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => {
                                  setSelectedPR(pr);
                                  setShowApproveDialog(true);
                                }}
                              >
                                <FileCheck className="w-4 h-4 mr-1" />
                                อนุมัติ
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  setSelectedPR(pr);
                                  setShowRejectDialog(true);
                                }}
                              >
                                <FileX className="w-4 h-4 mr-1" />
                                ปฏิเสธ
                              </Button>
                            </>
                          )}
                          {pr.status === "rejected" && pr.reject_reason && (
                            <span className="text-sm text-muted-foreground">
                              เหตุผล: {pr.reject_reason}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>อนุมัติใบขอซื้อ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p><strong>เลข PR:</strong> {selectedPR?.pr_number}</p>
              <p><strong>อะไหล่:</strong> {selectedPR?.equipment_code} - {selectedPR?.equipment_name}</p>
              <p><strong>จำนวนแนะนำสั่ง:</strong> {selectedPR?.suggested_quantity} {selectedPR?.unit}</p>
            </div>
            <div>
              <label className="text-sm font-medium">หมายเหตุ (ถ้ามี)</label>
              <Textarea
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                placeholder="ระบุหมายเหตุเพิ่มเติม..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              ยกเลิก
            </Button>
            <Button
              onClick={() => selectedPR && approveMutation.mutate({ id: selectedPR.id, notes: approveNotes })}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveMutation.isPending ? "กำลังอนุมัติ..." : "ยืนยันอนุมัติ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ปฏิเสธใบขอซื้อ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p><strong>เลข PR:</strong> {selectedPR?.pr_number}</p>
              <p><strong>อะไหล่:</strong> {selectedPR?.equipment_code} - {selectedPR?.equipment_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium">เหตุผลที่ปฏิเสธ <span className="text-red-500">*</span></label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="ระบุเหตุผลที่ปฏิเสธ..."
                className="mt-1"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              ยกเลิก
            </Button>
            <Button
              onClick={() => selectedPR && rejectMutation.mutate({ id: selectedPR.id, reason: rejectReason })}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
              variant="destructive"
            >
              {rejectMutation.isPending ? "กำลังปฏิเสธ..." : "ยืนยันปฏิเสธ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
