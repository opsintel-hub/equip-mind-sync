import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AdIssueDialog } from "@/components/ad/AdIssueDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { FileOutput, Clock, Search, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { formatBillboardLabel } from "@/lib/billboardUtils";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";

interface MyIssueRequest {
  id: string;
  document_no: string;
  issue_purpose: string;
  old_ad_action: string | null;
  issued_quantity: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  issued_at: string | null;
  advertisement: {
    code: string;
    name: string;
    total_quantity: number | null;
  } | null;
  target_billboard: {
    old_code: string | null;
    equipment_id: string;
    location_name: string | null;
  } | null;
}

const purposeLabels: Record<string, string> = {
  install: "ติดตั้ง",
  inspect: "ตรวจสภาพ",
  csr: "CSR",
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "รอเบิก", variant: "secondary" },
  issued: { label: "เบิกแล้ว", variant: "default" },
  completed: { label: "เสร็จสิ้น", variant: "outline" },
};

const AdRequest = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MyIssueRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    if (!user) return;
    fetchMyRequests();
  }, [user, refreshKey]);

  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("ad_issue_requests")
        .select(`
          *,
          advertisement:advertisements (code, name, total_quantity),
          target_billboard:billboards!ad_issue_requests_target_billboard_id_fkey (old_code, equipment_id, location_name)
        `)
        .eq("created_by", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setRequests((data as unknown as MyIssueRequest[]) || []);
    } catch (error: any) {
      toast.error("โหลดข้อมูลไม่สำเร็จ: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const matchSearch = !searchTerm ||
      r.document_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.advertisement?.code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.advertisement?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchDate = (() => {
      if (!dateRange?.from) return true;
      const d = new Date(r.created_at);
      if (d < dateRange.from) return false;
      if (dateRange.to && d > new Date(dateRange.to.getTime() + 86400000)) return false;
      return true;
    })();
    return matchSearch && matchStatus && matchDate;
  });

  const stats = {
    pending: requests.filter(r => r.status === "pending").length,
    issued: requests.filter(r => r.status === "issued").length,
    completed: requests.filter(r => r.status === "completed").length,
  };

  const { paginatedData: paginatedRequests, currentPage, pageSize, totalPages, totalItems, handlePageChange, handlePageSizeChange } = useTablePagination(filteredRequests, 20);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">เบิกภาพโฆษณา</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            สร้างคำขอเบิกภาพโฆษณาและติดตามสถานะ
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdIssueDialog onSuccess={handleRefresh} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "รอเบิก", value: stats.pending, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
          { label: "เบิกแล้ว", value: stats.issued, icon: FileOutput, color: "text-primary", bg: "bg-primary/10" },
          { label: "เสร็จสิ้น", value: stats.completed, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
        ].map((s) => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                  <s.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileOutput className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg">คำขอเบิกของฉัน</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                รายการคำขอเบิกภาพโฆษณาที่คุณสร้าง
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {/* Filters */}
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาเลขที่เอกสาร, รหัส หรือชื่อภาพ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="ทุกสถานะ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกสถานะ</SelectItem>
                  <SelectItem value="pending">รอเบิก</SelectItem>
                  <SelectItem value="issued">เบิกแล้ว</SelectItem>
                  <SelectItem value="completed">เสร็จสิ้น</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
              <Clock className="h-8 w-8 text-muted-foreground/50" />
              <p>ยังไม่มีคำขอเบิกภาพโฆษณา</p>
              <p className="text-sm">คลิก "เบิกภาพโฆษณา" เพื่อสร้างคำขอใหม่</p>
            </div>
          ) : (
            <>
              {/* Mobile card view */}
              <div className="block sm:hidden space-y-3">
                {paginatedRequests.map((req) => {
                  const status = statusLabels[req.status] || { label: req.status, variant: "secondary" as const };
                  return (
                    <div key={req.id} className="rounded-lg border p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-medium">{req.document_no}</p>
                          <p className="text-sm text-foreground truncate">{req.advertisement?.name || "-"}</p>
                        </div>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-xs text-muted-foreground">
                        <div>รหัส: <span className="font-mono">{req.advertisement?.code || "-"}</span></div>
                        <div>จำนวน: <span className="font-medium text-foreground">{req.issued_quantity || 0}</span></div>
                        <div>วัตถุประสงค์: {purposeLabels[req.issue_purpose] || req.issue_purpose}</div>
                        <div>{format(new Date(req.created_at), "dd/MM/yyyy")}</div>
                        {req.target_billboard && (
                          <div className="col-span-2 truncate">
                            ป้าย: {formatBillboardLabel(req.target_billboard.old_code, req.target_billboard.location_name, req.target_billboard.equipment_id)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table view */}
              <div className="hidden sm:block rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>เลขที่เอกสาร</TableHead>
                      <TableHead>รหัสภาพ</TableHead>
                      <TableHead>ชื่อภาพ</TableHead>
                      <TableHead>วัตถุประสงค์</TableHead>
                      <TableHead className="text-center">จำนวน</TableHead>
                      <TableHead>ป้ายเป้าหมาย</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>วันที่สร้าง</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRequests.map((req) => {
                      const status = statusLabels[req.status] || { label: req.status, variant: "secondary" as const };
                      return (
                        <TableRow key={req.id}>
                          <TableCell className="font-mono text-sm">{req.document_no}</TableCell>
                          <TableCell className="font-mono text-sm text-muted-foreground">
                            {req.advertisement?.code || "-"}
                          </TableCell>
                          <TableCell className="font-medium max-w-[160px] truncate">
                            {req.advertisement?.name || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {purposeLabels[req.issue_purpose] || req.issue_purpose}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {req.issued_quantity || 0}
                          </TableCell>
                          <TableCell className="text-sm">
                            {req.target_billboard
                              ? formatBillboardLabel(req.target_billboard.old_code, req.target_billboard.location_name, req.target_billboard.equipment_id)
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(req.created_at), "dd/MM/yyyy")}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
          <TablePagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdRequest;
