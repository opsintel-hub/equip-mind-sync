import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Search, ArrowLeftRight, RotateCcw, Clock, CheckCircle, XCircle, ShieldAlert, Info, ChevronDown, ChevronUp, ShieldCheck, Users, CalendarClock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { LoanRequestForm } from "@/components/loan/LoanRequestForm";
import { LoanReturnDialog } from "@/components/loan/LoanReturnDialog";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";

interface Loan {
  id: string;
  equipment_id: string | null;
  from_company_id: string;
  to_company_id: string;
  quantity: number;
  loan_date: string;
  due_date: string;
  return_date: string | null;
  returned_quantity: number;
  status: string;
  requester_name: string;
  requester_phone: string | null;
  notes: string | null;
  return_notes: string | null;
  created_at: string;
  is_cross_department?: boolean;
  equipment?: { code: string; name: string } | null;
  from_company?: { code: string; name: string } | null;
  to_company?: { code: string; name: string } | null;
}

const EquipmentLoans = () => {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchLoans();
    fetchUserRoles();
  }, [user]);

  const fetchUserRoles = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    setUserRoles((data || []).map((r: any) => r.role));
  };

  const isManagerOrAdmin = userRoles.some(r => ["admin", "super_admin", "manager"].includes(r));

  const fetchLoans = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("equipment_loans")
      .select(`
        *,
        equipment:equipment_id (code, name),
        from_company:companies!equipment_loans_from_company_id_fkey (code, name),
        to_company:companies!equipment_loans_to_company_id_fkey (code, name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("ไม่สามารถโหลดข้อมูลการยืมได้");
      console.error(error);
    } else {
      setLoans(data || []);
    }
    setIsLoading(false);
  };

  const handleApprove = async (loanId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("equipment_loans")
      .update({
        status: "approved",
        approved_by: user?.id,
        approved_at: new Date().toISOString()
      })
      .eq("id", loanId);

    if (error) {
      toast.error("ไม่สามารถอนุมัติได้");
    } else {
      toast.success("อนุมัติการยืมสำเร็จ");
      fetchLoans();
    }
  };

  const handleReject = async (loanId: string) => {
    const { error } = await supabase
      .from("equipment_loans")
      .update({ status: "rejected" })
      .eq("id", loanId);

    if (error) {
      toast.error("ไม่สามารถปฏิเสธได้");
    } else {
      toast.success("ปฏิเสธการยืมสำเร็จ");
      fetchLoans();
    }
  };

  const getStatusBadge = (loan: Loan) => {
    const isOverdue = new Date(loan.due_date) < new Date() && loan.status === "approved" && !loan.return_date;
    
    if (isOverdue) {
      return <Badge variant="destructive">เกินกำหนด</Badge>;
    }

    switch (loan.status) {
      case "pending":
        return (
          <div className="flex flex-col gap-1">
            <Badge variant="secondary">รออนุมัติ</Badge>
            {loan.is_cross_department && (
              <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">
                <ShieldAlert className="w-3 h-3 mr-1" />ข้ามฝ่าย
              </Badge>
            )}
          </div>
        );
      case "approved":
        if (loan.returned_quantity >= loan.quantity) {
          return <Badge className="bg-success text-success-foreground">คืนครบแล้ว</Badge>;
        }
        if (loan.returned_quantity > 0) {
          return <Badge variant="outline">คืนบางส่วน</Badge>;
        }
        return <Badge className="bg-primary text-primary-foreground">กำลังยืม</Badge>;
      case "rejected":
        return <Badge variant="destructive">ปฏิเสธ</Badge>;
      case "returned":
        return <Badge className="bg-success text-success-foreground">คืนครบแล้ว</Badge>;
      default:
        return <Badge>{loan.status}</Badge>;
    }
  };

  const filteredLoans = loans.filter(loan => {
    const matchesSearch = 
      loan.equipment?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.equipment?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.requester_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.from_company?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.to_company?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    if (activeTab === "all") return matchesSearch;
    if (activeTab === "pending") return matchesSearch && loan.status === "pending";
    if (activeTab === "active") return matchesSearch && loan.status === "approved" && loan.returned_quantity < loan.quantity;
    if (activeTab === "overdue") {
      const isOverdue = new Date(loan.due_date) < new Date() && loan.status === "approved" && loan.returned_quantity < loan.quantity;
      return matchesSearch && isOverdue;
    }
    if (activeTab === "returned") return matchesSearch && (loan.status === "returned" || loan.returned_quantity >= loan.quantity);
    return matchesSearch;
  });

  const {
    paginatedData: paginatedLoans,
    currentPage: loanPage,
    pageSize: loanPageSize,
    totalPages: loanTotalPages,
    totalItems: loanTotalItems,
    handlePageChange: handleLoanPageChange,
    handlePageSizeChange: handleLoanPageSizeChange,
  } = useTablePagination(filteredLoans, 20);

  const countByStatus = {
    all: loans.length,
    pending: loans.filter(l => l.status === "pending").length,
    active: loans.filter(l => l.status === "approved" && l.returned_quantity < l.quantity).length,
    overdue: loans.filter(l => new Date(l.due_date) < new Date() && l.status === "approved" && l.returned_quantity < l.quantity).length,
    returned: loans.filter(l => l.status === "returned" || l.returned_quantity >= l.quantity).length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">ยืมอะไหล่ข้ามบริษัท</h1>
          <p className="text-muted-foreground">จัดการการยืมและคืนอะไหล่ระหว่างบริษัท</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              ขอยืมอะไหล่
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>ขอยืมอะไหล่ข้ามบริษัท</DialogTitle>
            </DialogHeader>
            <LoanRequestForm
              onSuccess={() => {
                setIsCreateDialogOpen(false);
                fetchLoans();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <Collapsible>
          <CollapsibleTrigger className="flex w-full items-center justify-between p-4 font-medium [&[data-state=open]>svg]:rotate-180">
            <div className="flex items-center gap-2 text-primary">
              <Info className="w-5 h-5" />
              เงื่อนไขและนโยบายการใช้งานระบบยืมอะไหล่
            </div>
            <ChevronDown className="w-5 h-5 text-primary transition-transform duration-200" />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground mt-2 border-t border-primary/10 pt-4">
              <div className="space-y-4">
                <div>
                  <h4 className="flex items-center gap-2 font-semibold text-foreground mb-1">
                    <ShieldCheck className="w-4 h-4 text-primary" /> ระดับการอนุมัติ (Approval Flow)
                  </h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong className="text-foreground">ยืมภายในฝ่ายเดียวกัน:</strong> อนุมัติโดยเจ้าหน้าที่คลัง (Warehouse) หรือ Admin</li>
                    <li><strong className="text-foreground">ยืมข้ามฝ่าย:</strong> ต้องได้รับการอนุมัติจากหัวหน้างาน (Manager) หรือ Admin เท่านั้น (ระบบจะติดป้าย <Badge variant="outline" className="text-[10px] border-warning text-warning ml-1 leading-none py-0">ข้ามฝ่าย</Badge> ให้โดยอัตโนมัติ)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="flex items-center gap-2 font-semibold text-foreground mb-1">
                    <Users className="w-4 h-4 text-primary" /> สิทธิ์การจัดการ (Permissions)
                  </h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>ฝ่ายคลัง/Admin:</strong> สามารถทำรายการคืนอะไหล่ได้เมื่อมีการส่งคืนจริง</li>
                    <li><strong>พนักงานทั่วไป:</strong> สามารถส่งคำขอยืมและดูสถานะคำขอของตนเองได้</li>
                  </ul>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="flex items-center gap-2 font-semibold text-foreground mb-1">
                    <CalendarClock className="w-4 h-4 text-primary" /> ระยะเวลาและการคืน (Timelines)
                  </h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>ต้องระบุ <strong className="text-foreground">กำหนดคืน</strong> ทุกครั้งที่ทำรายการยืม</li>
                    <li>ระบบสามารถรับคืน <strong className="text-foreground">แบบบางส่วนได้ (Partial Return)</strong></li>
                    <li>เมื่อถึงกำหนดคืน ระบบจะแจ้งเตือนสถานะ <Badge variant="destructive" className="text-[10px] ml-1 leading-none py-0">เกินกำหนด</Badge> ทันที</li>
                  </ul>
                </div>
                <div>
                  <h4 className="flex items-center gap-2 font-semibold text-foreground mb-1">
                    <AlertTriangle className="w-4 h-4 text-primary" /> ข้อควรระวัง
                  </h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>อะไหล่ที่ถูกยืมจะถูกตัดออกจากสต็อกของบริษัทต้นทางทันทีที่รายการได้รับการอนุมัติ</li>
                    <li>กรุณาตรวจสอบสภาพอะไหล่ทั้งตอนรับและตอนคืนทุกครั้ง พร้อมระบุหมายเหตุหากพบความเสียหาย</li>
                  </ul>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ArrowLeftRight className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{countByStatus.active}</p>
                <p className="text-sm text-muted-foreground">กำลังยืม</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{countByStatus.pending}</p>
                <p className="text-sm text-muted-foreground">รออนุมัติ</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{countByStatus.overdue}</p>
                <p className="text-sm text-muted-foreground">เกินกำหนด</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{countByStatus.returned}</p>
                <p className="text-sm text-muted-foreground">คืนแล้ว</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <CardTitle>รายการยืมอะไหล่</CardTitle>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="ค้นหาอะไหล่, ผู้ขอ, บริษัท..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">ทั้งหมด ({countByStatus.all})</TabsTrigger>
              <TabsTrigger value="pending">รออนุมัติ ({countByStatus.pending})</TabsTrigger>
              <TabsTrigger value="active">กำลังยืม ({countByStatus.active})</TabsTrigger>
              <TabsTrigger value="overdue">เกินกำหนด ({countByStatus.overdue})</TabsTrigger>
              <TabsTrigger value="returned">คืนแล้ว ({countByStatus.returned})</TabsTrigger>
            </TabsList>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>อะไหล่</TableHead>
                    <TableHead>ยืมจาก</TableHead>
                    <TableHead>ยืมไป</TableHead>
                    <TableHead className="text-center">จำนวน</TableHead>
                    <TableHead>วันยืม</TableHead>
                    <TableHead>กำหนดคืน</TableHead>
                    <TableHead>ผู้ขอ</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        กำลังโหลด...
                      </TableCell>
                    </TableRow>
                  ) : filteredLoans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        ไม่พบรายการยืม
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedLoans.map((loan) => (
                      <TableRow key={loan.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{loan.equipment?.name || "-"}</p>
                            <p className="text-sm text-muted-foreground">{loan.equipment?.code || "-"}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{loan.from_company?.code}</Badge>
                          <p className="text-sm text-muted-foreground mt-1">{loan.from_company?.name}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{loan.to_company?.code}</Badge>
                          <p className="text-sm text-muted-foreground mt-1">{loan.to_company?.name}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-medium">{loan.returned_quantity}/{loan.quantity}</span>
                        </TableCell>
                        <TableCell>
                          {format(new Date(loan.loan_date), "dd MMM yyyy", { locale: th })}
                        </TableCell>
                        <TableCell>
                          <span className={new Date(loan.due_date) < new Date() && loan.returned_quantity < loan.quantity ? "text-destructive font-medium" : ""}>
                            {format(new Date(loan.due_date), "dd MMM yyyy", { locale: th })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <p>{loan.requester_name}</p>
                          {loan.requester_phone && (
                            <p className="text-sm text-muted-foreground">{loan.requester_phone}</p>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(loan)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {loan.status === "pending" && (
                              loan.is_cross_department && !isManagerOrAdmin ? (
                                <span className="text-xs text-muted-foreground">ต้อง Manager/Admin อนุมัติ</span>
                              ) : (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => handleApprove(loan.id)}>
                                    อนุมัติ
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleReject(loan.id)}>
                                    ปฏิเสธ
                                  </Button>
                                </>
                              )
                            )}
                            {loan.status === "approved" && loan.returned_quantity < loan.quantity && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedLoan(loan);
                                  setIsReturnDialogOpen(true);
                                }}
                              >
                                <RotateCcw className="w-4 h-4 mr-1" />
                                บันทึกคืน
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <TablePagination
              currentPage={loanPage}
              totalPages={loanTotalPages}
              totalItems={loanTotalItems}
              pageSize={loanPageSize}
              onPageChange={handleLoanPageChange}
              onPageSizeChange={handleLoanPageSizeChange}
            />
          </Tabs>
        </CardContent>
      </Card>

      {selectedLoan && (
        <LoanReturnDialog
          loan={selectedLoan}
          open={isReturnDialogOpen}
          onOpenChange={setIsReturnDialogOpen}
          onSuccess={() => {
            setSelectedLoan(null);
            fetchLoans();
          }}
        />
      )}
    </div>
  );
};

export default EquipmentLoans;
