import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AdIssueDialog } from "@/components/ad/AdIssueDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { FileOutput, Clock } from "lucide-react";
import { format } from "date-fns";
import { formatBillboardLabel } from "@/lib/billboardUtils";

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
  const [refreshKey, setRefreshKey] = useState(0);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">เบิกภาพโฆษณา</h1>
          <p className="text-muted-foreground mt-1">
            สร้างคำขอเบิกภาพโฆษณาและติดตามสถานะ
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdIssueDialog onSuccess={handleRefresh} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileOutput className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>คำขอเบิกของฉัน</CardTitle>
              <CardDescription>
                รายการคำขอเบิกภาพโฆษณาที่คุณสร้าง
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
              <Clock className="h-8 w-8 text-muted-foreground/50" />
              <p>ยังไม่มีคำขอเบิกภาพโฆษณา</p>
              <p className="text-sm">คลิก "เบิกภาพโฆษณา" เพื่อสร้างคำขอใหม่</p>
            </div>
          ) : (
            <div className="rounded-lg border">
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
                  {requests.map((req) => {
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdRequest;
