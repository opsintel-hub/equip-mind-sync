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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, CheckCircle, XCircle, Shield, Clock, ShoppingCart, ChevronDown, ChevronUp, Package, Store, CalendarClock, Truck } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { DepartmentMultiFilter } from "@/components/DepartmentMultiFilter";

const ManagerApproval = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [snSearchTerm, setSnSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([]);
  const [companyFilter, setCompanyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const { data: companies } = useQuery({
    queryKey: ["ma-companies"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, name").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: userRole } = useQuery({
    queryKey: ["user-manager-role", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).in("role", ["manager", "admin"]);
      return data;
    },
    enabled: !!user,
  });

  const { data: userDepartments } = useQuery({
    queryKey: ["user-manager-departments", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("user_departments").select("department").eq("user_id", user.id);
      return data;
    },
    enabled: !!user,
  });

  // Profiles for approver names
  const { data: profiles } = useQuery({
    queryKey: ["ma-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name");
      const map: Record<string, string> = {};
      data?.forEach((p: any) => { map[p.id] = p.full_name; });
      return map;
    },
  });

  const isAdmin = userRole?.some((r: any) => r.role === "admin");
  const isManager = userRole?.some((r: any) => r.role === "manager") || isAdmin;
  const managerDepartments = userDepartments?.map((d: any) => d.department) || [];

  const { data: pendingApprovals, isLoading } = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_issue_pending")
        .select("*, companies(name)")
        .eq("requires_approval", true)
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!isAdmin && managerDepartments.length > 0) {
        return data?.filter((req: any) => managerDepartments.includes(req.requester_department)) || [];
      }
      return data;
    },
    enabled: isManager,
  });

  const { data: approvalHistory } = useQuery({
    queryKey: ["approval-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_issue_pending")
        .select("*, companies(name)")
        .eq("requires_approval", true)
        .neq("approval_status", "pending")
        .order("approved_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: isManager,
  });

  const { data: allItems } = useQuery({
    queryKey: ["approval-items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("goods_issue_pending_items").select("*");
      if (error) throw error;
      return data;
    },
  });

  const getItemsForRequest = (requestId: string) => allItems?.filter((item: any) => item.pending_id === requestId) || [];

  const toggleExpand = (id: string) => {
    setExpandedRequests(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRequest || !user) throw new Error("Missing data");
      const { error } = await supabase.from("goods_issue_pending").update({
        approval_status: "approved", approved_by: user.id, approved_at: new Date().toISOString(), approval_notes: approvalNotes || null,
      } as any).eq("id", selectedRequest.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("อนุมัติคำขอเบิกสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["approval-history"] });
      queryClient.invalidateQueries({ queryKey: ["goods-issue-pending-staff"] });
      setApproveDialogOpen(false); setSelectedRequest(null); setApprovalNotes("");
    },
    onError: (error) => toast.error("เกิดข้อผิดพลาด: " + error.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRequest || !user) throw new Error("Missing data");
      const { error } = await supabase.from("goods_issue_pending").update({
        approval_status: "rejected", approved_by: user.id, approved_at: new Date().toISOString(),
        approval_notes: approvalNotes || null, status: "rejected",
        reject_reason: "ผู้มีอำนาจไม่อนุมัติ: " + (approvalNotes || "ไม่ระบุเหตุผล"),
      } as any).eq("id", selectedRequest.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ปฏิเสธคำขอเบิกสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["approval-history"] });
      setRejectDialogOpen(false); setSelectedRequest(null); setApprovalNotes("");
    },
    onError: (error) => toast.error("เกิดข้อผิดพลาด: " + error.message),
  });

  const getPickupBadge = (type: string) => {
    switch (type) {
      case "wait_onsite": return <Badge variant="destructive" className="gap-1"><Store className="h-3 w-3" />รอรับที่คลัง</Badge>;
      case "scheduled": return <Badge className="bg-blue-100 text-blue-800 gap-1"><CalendarClock className="h-3 w-3" />นัดรับ</Badge>;
      case "delivery": return <Badge className="bg-purple-100 text-purple-800 gap-1"><Truck className="h-3 w-3" />จัดส่ง</Badge>;
      default: return <Badge variant="secondary">-</Badge>;
    }
  };

  const applyFilters = (data: any[] | undefined) => {
    if (!data) return [];
    return data.filter((req: any) => {
      // Dedicated S/N search
      if (snSearchTerm) {
        const snTerm = snSearchTerm.toLowerCase();
        const items = getItemsForRequest(req.id);
        const matchSN = items.some((item: any) => item.serial_number?.toLowerCase().includes(snTerm));
        if (!matchSN) return false;
      }
      // General search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchDirect = req.document_no?.toLowerCase().includes(term) ||
            req.requester_name?.toLowerCase().includes(term) ||
            req.equipment_name?.toLowerCase().includes(term) ||
            req.equipment_code?.toLowerCase().includes(term);
        const items = getItemsForRequest(req.id);
        const matchItems = items.some((item: any) => 
          item.equipment_code?.toLowerCase().includes(term) ||
          item.equipment_name?.toLowerCase().includes(term)
        );
        if (!matchDirect && !matchItems) return false;
      }
      if (departmentFilter.length > 0 && !departmentFilter.includes(req.requester_department)) return false;
      if (companyFilter !== "all" && req.company_id !== companyFilter) return false;
      if (dateRange?.from) {
        const d = new Date(req.created_at);
        if (d < dateRange.from) return false;
        if (dateRange.to && d > dateRange.to) return false;
      }
      return true;
    });
  };

  const filteredPending = applyFilters(pendingApprovals);
  const filteredHistory = applyFilters(
    statusFilter === "all" ? approvalHistory :
    statusFilter === "approved" ? approvalHistory?.filter((r: any) => r.approval_status === "approved") :
    statusFilter === "rejected" ? approvalHistory?.filter((r: any) => r.approval_status === "rejected") :
    approvalHistory
  );

  if (!isManager) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-bold mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
            <p className="text-muted-foreground">หน้านี้สำหรับผู้มีสิทธิ์ Manager หรือ Admin เท่านั้น</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderRequestRow = (req: any, showActions: boolean) => {
    const items = getItemsForRequest(req.id);
    const isExpanded = expandedRequests.has(req.id);
    return (
      <>
        <TableRow key={req.id} className="cursor-pointer hover:bg-muted/50" onClick={() => items.length > 0 && toggleExpand(req.id)}>
          <TableCell>
            {items.length > 0 && (
              <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            )}
          </TableCell>
          <TableCell className="font-medium">{req.document_no}</TableCell>
          <TableCell>{format(new Date(req.created_at), "dd/MM/yyyy HH:mm", { locale: th })}</TableCell>
          <TableCell>{req.companies?.name || "-"}</TableCell>
          <TableCell>
            <div>{req.requester_name}</div>
            {req.requester_department && <div className="text-xs text-muted-foreground">{req.requester_department}</div>}
          </TableCell>
          <TableCell>{getPickupBadge(req.pickup_type)}</TableCell>
          <TableCell>
            {req.pickup_date ? format(new Date(req.pickup_date), "dd/MM/yyyy", { locale: th }) : "-"}
            {req.pickup_time && <div className="text-xs text-muted-foreground">{req.pickup_time}</div>}
          </TableCell>
          <TableCell>
            {items.length > 0 ? (
              <Badge variant="outline" className="gap-1"><ShoppingCart className="h-3 w-3" />{items.length} รายการ</Badge>
            ) : (
              <div className="text-sm">{req.equipment_name || "-"}</div>
            )}
          </TableCell>
          <TableCell>
            {showActions ? (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 gap-1"><Clock className="h-3 w-3" />รออนุมัติ</Badge>
            ) : req.approval_status === "approved" ? (
              <Badge className="bg-green-100 text-green-800 gap-1"><CheckCircle className="h-3 w-3" />อนุมัติแล้ว</Badge>
            ) : (
              <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />ไม่อนุมัติ</Badge>
            )}
          </TableCell>
          {!showActions && (
            <TableCell>
              {req.approved_by && profiles ? (
                <div>
                  <div className="text-sm">{profiles[req.approved_by] || "-"}</div>
                  {req.approved_at && <div className="text-xs text-muted-foreground">{format(new Date(req.approved_at), "dd/MM/yy HH:mm", { locale: th })}</div>}
                </div>
              ) : "-"}
            </TableCell>
          )}
          <TableCell className="text-center">
            {showActions && (
              <div className="flex gap-1 justify-center">
                <Button size="sm" onClick={(e) => { e.stopPropagation(); setSelectedRequest(req); setApproveDialogOpen(true); }}>
                  <CheckCircle className="h-4 w-4 mr-1" />อนุมัติ
                </Button>
                <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); setSelectedRequest(req); setRejectDialogOpen(true); }}>
                  <XCircle className="h-4 w-4 mr-1" />ไม่อนุมัติ
                </Button>
              </div>
            )}
          </TableCell>
        </TableRow>
        {isExpanded && items.length > 0 && (
          <TableRow key={`${req.id}-items`}>
            <TableCell colSpan={showActions ? 10 : 11} className="bg-muted/20 p-4">
              <div className="space-y-2">
                {items.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center bg-background rounded-lg px-4 py-2 border">
                    <div>
                      <span className="font-medium">{item.equipment_code}</span>
                      <span className="text-muted-foreground ml-2">{item.equipment_name}</span>
                      {item.serial_number && <span className="text-xs text-muted-foreground ml-2">S/N: {item.serial_number}</span>}
                    </div>
                    <span className="font-medium">{item.quantity} {item.unit}</span>
                  </div>
                ))}
              </div>
            </TableCell>
          </TableRow>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Shield className="h-6 w-6" />อนุมัติเบิกทรัพย์สิน</h1>
          <p className="text-muted-foreground">อนุมัติคำขอเบิกสินค้าที่เป็นทรัพย์สิน (เฉพาะฝ่ายที่รับผิดชอบ)</p>
        </div>
        {pendingApprovals && pendingApprovals.length > 0 && (
          <Badge variant="destructive" className="text-lg px-4 py-2">รออนุมัติ: {pendingApprovals.length} รายการ</Badge>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="ค้นหา S/N..." value={snSearchTerm} onChange={(e) => setSnSearchTerm(e.target.value)} className="pl-10 w-[160px]" />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="ค้นหาเลขที่เอกสาร, ชื่อสินค้า, ชื่อผู้เบิก..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <DepartmentMultiFilter value={departmentFilter} onChange={setDepartmentFilter} />
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger><SelectValue placeholder="บริษัท" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกบริษัท</SelectItem>
                {companies?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="สถานะ (ประวัติ)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="approved">อนุมัติแล้ว</SelectItem>
                <SelectItem value="rejected">ไม่อนุมัติ</SelectItem>
              </SelectContent>
            </Select>
            <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
          </div>
        </CardContent>
      </Card>

      {/* Pending */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />รายการรออนุมัติ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>เลขที่เอกสาร</TableHead>
                  <TableHead>วันที่ขอ</TableHead>
                  <TableHead>บริษัท</TableHead>
                  <TableHead>ผู้ขอเบิก</TableHead>
                  <TableHead>รูปแบบการรับ</TableHead>
                  <TableHead>วันนัดรับ</TableHead>
                  <TableHead>รายการ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-center">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">กำลังโหลด...</TableCell></TableRow>
                ) : filteredPending.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">ไม่มีรายการรออนุมัติ</TableCell></TableRow>
                ) : (
                  filteredPending.map((req: any) => renderRequestRow(req, true))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />ประวัติการอนุมัติ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>เลขที่เอกสาร</TableHead>
                  <TableHead>วันที่ขอ</TableHead>
                  <TableHead>บริษัท</TableHead>
                  <TableHead>ผู้ขอเบิก</TableHead>
                  <TableHead>รูปแบบการรับ</TableHead>
                  <TableHead>วันนัดรับ</TableHead>
                  <TableHead>รายการ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>ผู้อนุมัติ</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">ไม่มีประวัติ</TableCell></TableRow>
                ) : (
                  filteredHistory.map((req: any) => renderRequestRow(req, false))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={(o) => { if (!o) { setApproveDialogOpen(false); setApprovalNotes(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>อนุมัติคำขอเบิก - {selectedRequest?.document_no}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted/30 rounded-lg text-sm">
              <p><span className="text-muted-foreground">ผู้ขอ:</span> {selectedRequest?.requester_name}</p>
              <p><span className="text-muted-foreground">สินค้า:</span> {selectedRequest?.equipment_name || "หลายรายการ"}</p>
              <p><span className="text-muted-foreground">วัตถุประสงค์:</span> {selectedRequest?.purpose || "-"}</p>
            </div>
            <div className="space-y-2">
              <Label>หมายเหตุ (ไม่บังคับ)</Label>
              <Textarea value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} placeholder="หมายเหตุ..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? "กำลังอนุมัติ..." : "ยืนยันอนุมัติ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={(o) => { if (!o) { setRejectDialogOpen(false); setApprovalNotes(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>ไม่อนุมัติคำขอเบิก - {selectedRequest?.document_no}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted/30 rounded-lg text-sm">
              <p><span className="text-muted-foreground">ผู้ขอ:</span> {selectedRequest?.requester_name}</p>
              <p><span className="text-muted-foreground">สินค้า:</span> {selectedRequest?.equipment_name || "หลายรายการ"}</p>
            </div>
            <div className="space-y-2">
              <Label>เหตุผลที่ไม่อนุมัติ *</Label>
              <Textarea value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} placeholder="ระบุเหตุผล..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={() => {
              if (!approvalNotes.trim()) { toast.error("กรุณาระบุเหตุผล"); return; }
              rejectMutation.mutate();
            }} disabled={rejectMutation.isPending}>
              {rejectMutation.isPending ? "กำลังบันทึก..." : "ยืนยันไม่อนุมัติ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagerApproval;