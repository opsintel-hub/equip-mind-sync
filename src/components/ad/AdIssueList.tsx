import { useState, useEffect } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, FileOutput, Search, Copy, ExternalLink, ImageIcon, MapPin } from "lucide-react";
import { format } from "date-fns";
import { formatBillboardLabel } from "@/lib/billboardUtils";

interface IssueRequest {
  id: string;
  document_no: string;
  issue_purpose: string;
  old_ad_action: string | null;
  issued_quantity: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  issued_at: string | null;
  confirmation_token: string | null;
  confirmed_by_name: string | null;
  confirmed_at: string | null;
  issue_report_type: string | null;
  issue_report_description: string | null;
  advertisement: {
    code: string;
    name: string;
    total_quantity: number | null;
    photo_urls: string[] | null;
    installation_details: string | null;
    target_installation_date: string | null;
  } | null;
  target_billboard: {
    old_code: string | null;
    equipment_id: string;
    location_name: string | null;
    department: string | null;
    size: string | null;
  } | null;
}

interface AdIssueListProps {
  refresh: number;
  onUpdated: () => void;
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

export function AdIssueList({ refresh, onUpdated }: AdIssueListProps) {
  const [requests, setRequests] = useState<IssueRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmIssue, setConfirmIssue] = useState<IssueRequest | null>(null);
  const [confirmComplete, setConfirmComplete] = useState<IssueRequest | null>(null);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchIssueRequests();
  }, [refresh]);

  const fetchIssueRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("ad_issue_requests")
        .select(`
          *,
          advertisement:advertisements (code, name, total_quantity),
          target_billboard:billboards!ad_issue_requests_target_billboard_id_fkey (old_code, equipment_id, location_name)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setRequests((data as unknown as IssueRequest[]) || []);
    } catch (error: any) {
      toast.error("โหลดข้อมูลไม่สำเร็จ: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter((req) => {
    const matchSearch = !searchTerm ||
      req.document_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.advertisement?.code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.advertisement?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || req.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const { paginatedData, currentPage, pageSize, totalPages, totalItems, handlePageChange, handlePageSizeChange } = useTablePagination(filteredRequests);

  const handleIssue = async (req: IssueRequest) => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("กรุณาเข้าสู่ระบบ"); return; }

      const { error } = await supabase
        .from("ad_issue_requests")
        .update({
          status: "issued",
          issued_by: user.id,
          issued_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", req.id);

      if (error) throw error;

      toast.success(`เบิก ${req.document_no} สำเร็จ`);
      setConfirmIssue(null);
      onUpdated();
      fetchIssueRequests();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleComplete = async (req: IssueRequest) => {
    setProcessing(true);
    try {
      const { error: issueError } = await supabase
        .from("ad_issue_requests")
        .update({
          status: "completed",
          received_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", req.id);

      if (issueError) throw issueError;

      if (req.advertisement) {
        const { error: adError } = await supabase
          .from("advertisements")
          .update({ status: "installed", updated_at: new Date().toISOString() })
          .eq("code", req.advertisement.code);

        if (adError) console.error("Failed to update ad status:", adError);
      }

      toast.success(`ยืนยันติดตั้ง ${req.document_no} เสร็จสิ้น`);
      setConfirmComplete(null);
      onUpdated();
      fetchIssueRequests();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>;
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
        <FileOutput className="h-8 w-8 text-muted-foreground/50" />
        <p>ยังไม่มีเอกสารเบิกภาพโฆษณา</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
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

      {/* Mobile card view */}
      <div className="block sm:hidden space-y-3">
        {paginatedData.map((req) => {
          const status = statusLabels[req.status] || { label: req.status, variant: "secondary" as const };
          return (
            <div key={req.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-medium">{req.document_no}</p>
                  <p className="text-sm text-foreground truncate">{req.advertisement?.name || "-"}</p>
                </div>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-xs text-muted-foreground">
                <div>รหัสภาพ: <span className="font-mono">{req.advertisement?.code || "-"}</span></div>
                <div>จำนวน: <span className="font-medium text-foreground">{req.issued_quantity || 0}</span></div>
                <div>วัตถุประสงค์: {purposeLabels[req.issue_purpose] || req.issue_purpose}</div>
                <div>{format(new Date(req.created_at), "dd/MM/yyyy")}</div>
                {req.target_billboard && (
                  <div className="col-span-2 truncate">
                    ป้าย: {formatBillboardLabel(req.target_billboard.old_code, req.target_billboard.location_name, req.target_billboard.equipment_id)}
                  </div>
                )}
              </div>
              {(req.status === "pending" || req.status === "issued") && (
                <div>
                  {req.status === "pending" && (
                    <Button size="sm" className="w-full gap-1" onClick={() => setConfirmIssue(req)}>
                      <FileOutput className="h-3.5 w-3.5" /> เบิก
                    </Button>
                  )}
                  {req.status === "issued" && (
                    <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => setConfirmComplete(req)}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> ติดตั้งแล้ว
                    </Button>
                  )}
                </div>
              )}
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
              <TableHead>วันที่</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((req) => {
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
                  <TableCell className="text-right">
                    {req.status === "pending" && (
                      <Button size="sm" onClick={() => setConfirmIssue(req)} className="gap-1">
                        <FileOutput className="h-3.5 w-3.5" /> เบิก
                      </Button>
                    )}
                    {req.status === "issued" && (
                      <Button size="sm" variant="outline" onClick={() => setConfirmComplete(req)} className="gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> ติดตั้งแล้ว
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      {/* Issue Confirm */}
      <AlertDialog open={!!confirmIssue} onOpenChange={(o) => !o && setConfirmIssue(null)}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันเบิกภาพโฆษณา</AlertDialogTitle>
            <AlertDialogDescription>
              เบิก <strong>{confirmIssue?.document_no}</strong> —{" "}
              {confirmIssue?.advertisement?.name} จำนวน{" "}
              {confirmIssue?.issued_quantity} ชิ้น
              {confirmIssue?.target_billboard && (
                <> ไปป้าย <strong>{formatBillboardLabel(confirmIssue.target_billboard.old_code, confirmIssue.target_billboard.location_name, confirmIssue.target_billboard.equipment_id)}</strong></>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmIssue && handleIssue(confirmIssue)}
              disabled={processing}
            >
              {processing ? "กำลังดำเนินการ..." : "ยืนยันเบิก"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Confirm */}
      <AlertDialog open={!!confirmComplete} onOpenChange={(o) => !o && setConfirmComplete(null)}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันติดตั้งเสร็จสิ้น</AlertDialogTitle>
            <AlertDialogDescription>
              ยืนยันว่า <strong>{confirmComplete?.document_no}</strong> ติดตั้งเรียบร้อยแล้ว?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmComplete && handleComplete(confirmComplete)}
              disabled={processing}
            >
              {processing ? "กำลังดำเนินการ..." : "ยืนยันเสร็จสิ้น"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
