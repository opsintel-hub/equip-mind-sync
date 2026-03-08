import { useState, useEffect } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Package, ImageIcon, Clock } from "lucide-react";
import { format } from "date-fns";

interface PendingAd {
  id: string;
  code: string;
  entry_type: string;
  name: string;
  total_quantity: number;
  created_at: string;
  photo_urls: string[] | null;
  target_installation_date: string | null;
  installation_team: { name: string } | null;
  ad_versions: { version_name: string; quantity: number }[];
  ad_target_billboards: { billboard_id: string; billboards: { equipment_id: string; location_name: string | null } | null }[];
}

interface AdReceiveSectionProps {
  refresh: number;
  onReceived: () => void;
}

const entryTypeLabels: Record<string, string> = {
  new: "ใหม่",
  temporary: "ฝากชั่วคราว",
  old: "ภาพเก่า",
};

export function AdReceiveSection({ refresh, onReceived }: AdReceiveSectionProps) {
  const [ads, setAds] = useState<PendingAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmAd, setConfirmAd] = useState<PendingAd | null>(null);
  const [rejectAd, setRejectAd] = useState<PendingAd | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingAds();
  }, [refresh]);

  const fetchPendingAds = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("advertisements")
        .select(`
          id, code, entry_type, name, total_quantity, created_at,
          photo_urls, target_installation_date,
          installation_team:contractors!advertisements_installation_team_id_fkey (name),
          ad_versions (version_name, quantity),
          ad_target_billboards (billboard_id, billboards (equipment_id, location_name))
        `)
        .eq("status", "pending")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAds((data as unknown as PendingAd[]) || []);
    } catch (error: any) {
      toast.error("โหลดข้อมูลไม่สำเร็จ: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateIssueDocNo = () => {
    const dateStr = format(new Date(), "yyyyMMdd");
    const rand = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
    return `ADI-${dateStr}-${rand}`;
  };

  const handleReceive = async (ad: PendingAd) => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("กรุณาเข้าสู่ระบบ"); return; }

      // Update advertisement status to in_storage
      const { error: updateError } = await supabase
        .from("advertisements")
        .update({ status: "in_storage", updated_at: new Date().toISOString() })
        .eq("id", ad.id);

      if (updateError) throw updateError;

      // Auto-create issue document for "new" type ads
      if (ad.entry_type === "new") {
        const targetBillboards = ad.ad_target_billboards || [];
        
        if (targetBillboards.length > 0) {
          // Create one issue request per target billboard
          const issueInserts = targetBillboards.map((tb) => ({
            document_no: generateIssueDocNo(),
            advertisement_id: ad.id,
            issue_purpose: "install",
            issued_quantity: ad.total_quantity,
            target_billboard_id: tb.billboard_id,
            status: "pending",
            created_by: user.id,
            notes: `สร้างอัตโนมัติจากการรับเข้าคลัง ${ad.code}`,
          }));

          const { error: issueError } = await supabase
            .from("ad_issue_requests")
            .insert(issueInserts);

          if (issueError) throw issueError;

          toast.success(
            `รับเข้าคลัง ${ad.code} สำเร็จ — สร้างเอกสารเบิก ${issueInserts.length} รายการอัตโนมัติ`,
            { duration: 5000 }
          );
        } else {
          // No target billboards, create single issue request without billboard
          const { error: issueError } = await supabase
            .from("ad_issue_requests")
            .insert({
              document_no: generateIssueDocNo(),
              advertisement_id: ad.id,
              issue_purpose: "install",
              issued_quantity: ad.total_quantity,
              status: "pending",
              created_by: user.id,
              notes: `สร้างอัตโนมัติจากการรับเข้าคลัง ${ad.code}`,
            });

          if (issueError) throw issueError;

          toast.success(
            `รับเข้าคลัง ${ad.code} สำเร็จ — สร้างเอกสารเบิก 1 รายการอัตโนมัติ`,
            { duration: 5000 }
          );
        }
      } else {
        toast.success(`รับเข้าคลัง ${ad.code} สำเร็จ`);
      }

      setConfirmAd(null);
      onReceived();
      fetchPendingAds();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (ad: PendingAd) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("advertisements")
        .update({ status: "rejected", is_active: false, updated_at: new Date().toISOString() })
        .eq("id", ad.id);

      if (error) throw error;
      toast.success(`ปฏิเสธ ${ad.code} เรียบร้อย`);
      setRejectAd(null);
      onReceived();
      fetchPendingAds();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>;
  }

  if (ads.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
        <CheckCircle2 className="h-8 w-8 text-success" />
        <p>ไม่มีรายการรอรับเข้าคลัง</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>รอรับเข้าคลัง {ads.length} รายการ</span>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รหัส</TableHead>
              <TableHead>ประเภท</TableHead>
              <TableHead>ชื่อภาพ</TableHead>
              <TableHead>เวอร์ชัน</TableHead>
              <TableHead className="text-center">จำนวนรวม</TableHead>
              <TableHead>ทีม</TableHead>
              <TableHead>ป้ายเป้าหมาย</TableHead>
              <TableHead>วันที่สร้าง</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ads.map((ad) => (
              <TableRow key={ad.id}>
                <TableCell className="font-mono text-sm">{ad.code}</TableCell>
                <TableCell>
                  <Badge variant={ad.entry_type === "new" ? "default" : ad.entry_type === "temporary" ? "secondary" : "outline"}>
                    {entryTypeLabels[ad.entry_type] || ad.entry_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {ad.photo_urls && ad.photo_urls.length > 0 && (
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium max-w-[180px] truncate">{ad.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {ad.ad_versions.length > 0
                    ? ad.ad_versions.map(v => `${v.version_name} (${v.quantity})`).join(", ")
                    : "-"}
                </TableCell>
                <TableCell className="text-center font-medium">
                  {ad.total_quantity || 0}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {ad.installation_team?.name || "-"}
                </TableCell>
                <TableCell className="text-sm">
                  {ad.ad_target_billboards && ad.ad_target_billboards.length > 0
                    ? ad.ad_target_billboards.map(tb =>
                        tb.billboards?.equipment_id || "-"
                      ).join(", ")
                    : "-"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(ad.created_at), "dd/MM/yyyy HH:mm")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      onClick={() => setConfirmAd(ad)}
                      className="gap-1"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      รับเข้า
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-destructive border-destructive/50 hover:bg-destructive/10"
                      onClick={() => setRejectAd(ad)}
                    >
                      <XCircle className="h-4 w-4" />
                      ปฏิเสธ
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Receive Confirm Dialog */}
      <AlertDialog open={!!confirmAd} onOpenChange={(open) => !open && setConfirmAd(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันรับเข้าคลัง</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                รับเข้าคลัง <strong>{confirmAd?.code}</strong> — {confirmAd?.name}
              </p>
              <p>จำนวนรวม: <strong>{confirmAd?.total_quantity}</strong> ชิ้น</p>
              {confirmAd?.entry_type === "new" && (
                <div className="mt-3 p-3 rounded-md bg-primary/5 border border-primary/20">
                  <p className="text-sm font-medium text-primary flex items-center gap-1">
                    <Package className="h-4 w-4" />
                    ระบบจะสร้างเอกสารเบิกอัตโนมัติ
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    เอกสารเบิกจะถูกสร้างเพื่อนำไปติดตั้งตามป้ายเป้าหมายที่ระบุไว้
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmAd && handleReceive(confirmAd)}
              disabled={processing}
            >
              {processing ? "กำลังดำเนินการ..." : "ยืนยันรับเข้า"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirm Dialog */}
      <AlertDialog open={!!rejectAd} onOpenChange={(open) => !open && setRejectAd(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันปฏิเสธ</AlertDialogTitle>
            <AlertDialogDescription>
              ปฏิเสธ <strong>{rejectAd?.code}</strong> — {rejectAd?.name}?
              <br />
              รายการนี้จะถูกปิดการใช้งาน
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rejectAd && handleReject(rejectAd)}
              disabled={processing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing ? "กำลังดำเนินการ..." : "ยืนยันปฏิเสธ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
