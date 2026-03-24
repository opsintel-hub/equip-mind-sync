import { useState, useEffect } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
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
import { CheckCircle2, XCircle, Package, ImageIcon, Clock, Search } from "lucide-react";
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
  installation_details: string | null;
  supporting_doc_url: string | null;
  notes: string | null;
  storage_location: string | null;
  retention_days: number | null;
  contact_name: string | null;
  contact_phone: string | null;
  installation_team: { name: string } | null;
  pickup_contractor: { name: string } | null;
  ad_size: { name: string } | null;
  ad_media_type: { name: string } | null;
  ad_versions: { version_name: string; quantity: number }[];
  ad_target_billboards: { billboard_id: string; billboards: { equipment_id: string; old_code: string | null; location_name: string | null } | null }[];
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
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

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
          photo_urls, target_installation_date, installation_details,
          supporting_doc_url, notes, storage_location, retention_days,
          contact_name, contact_phone,
          installation_team:contractors!advertisements_installation_team_id_fkey (name),
          pickup_contractor:contractors!advertisements_pickup_contractor_id_fkey (name),
          ad_size:ad_sizes!advertisements_ad_size_id_fkey (name),
          ad_media_type:ad_media_types!advertisements_ad_media_type_id_fkey (name),
          ad_versions (version_name, quantity),
          ad_target_billboards (billboard_id, billboards (equipment_id, old_code, location_name))
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

      const { error: updateError } = await supabase
        .from("advertisements")
        .update({ status: "in_storage", updated_at: new Date().toISOString() })
        .eq("id", ad.id);

      if (updateError) throw updateError;

      // Fetch updated record to get contractor_access_token and PIN
      const { data: updatedAd } = await supabase
        .from("advertisements")
        .select("contractor_access_token, contractor_access_pin")
        .eq("id", ad.id)
        .single();

      if (ad.entry_type === "new") {
        const targetBillboards = ad.ad_target_billboards || [];
        
        if (targetBillboards.length > 0) {
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

          // Show contractor link info
          if (updatedAd?.contractor_access_token) {
            const contractorUrl = `${window.location.origin}/ad-contractor/${updatedAd.contractor_access_token}`;
            await navigator.clipboard.writeText(contractorUrl);
            toast.success(
              `รับเข้าคลัง ${ad.code} สำเร็จ — สร้างเอกสารเบิก ${issueInserts.length} รายการ\n\nลิงก์ผู้รับเหมาถูกคัดลอกแล้ว (PIN: ${updatedAd.contractor_access_pin})`,
              { duration: 10000, action: { label: "ดูเอกสารเบิก", onClick: () => window.location.href = "/ad-issue" } }
            );
          } else {
            toast.success(
              `รับเข้าคลัง ${ad.code} สำเร็จ — สร้างเอกสารเบิก ${issueInserts.length} รายการ`,
              { duration: 5000, action: { label: "ดูเอกสารเบิก", onClick: () => window.location.href = "/ad-issue" } }
            );
          }
        } else {
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

          if (updatedAd?.contractor_access_token) {
            const contractorUrl = `${window.location.origin}/ad-contractor/${updatedAd.contractor_access_token}`;
            await navigator.clipboard.writeText(contractorUrl);
            toast.success(
              `รับเข้าคลัง ${ad.code} สำเร็จ — สร้างเอกสารเบิก 1 รายการ\n\nลิงก์ผู้รับเหมาถูกคัดลอกแล้ว (PIN: ${updatedAd.contractor_access_pin})`,
              { duration: 10000, action: { label: "ดูเอกสารเบิก", onClick: () => window.location.href = "/ad-issue" } }
            );
          } else {
            toast.success(
              `รับเข้าคลัง ${ad.code} สำเร็จ — สร้างเอกสารเบิก 1 รายการ`,
              { duration: 5000, action: { label: "ดูเอกสารเบิก", onClick: () => window.location.href = "/ad-issue" } }
            );
          }
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

  const filteredAds = ads.filter((ad) => {
    const matchSearch = !searchTerm ||
      ad.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ad.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = typeFilter === "all" || ad.entry_type === typeFilter;
    return matchSearch && matchType;
  });

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
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหารหัส หรือชื่อภาพ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="ทุกประเภท" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกประเภท</SelectItem>
            <SelectItem value="new">ภาพใหม่</SelectItem>
            <SelectItem value="temporary">ฝากชั่วคราว</SelectItem>
            <SelectItem value="old">ภาพเก่า</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>พบ {filteredAds.length} รายการ</span>
      </div>

      {/* Mobile card view */}
      <div className="block sm:hidden space-y-3">
        {filteredAds.map((ad) => (
          <div key={ad.id} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-sm font-medium">{ad.code}</p>
                <p className="text-sm text-foreground truncate">{ad.name}</p>
              </div>
              <Badge variant={ad.entry_type === "new" ? "default" : ad.entry_type === "temporary" ? "secondary" : "outline"}>
                {entryTypeLabels[ad.entry_type] || ad.entry_type}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>จำนวน: <span className="font-medium text-foreground">{ad.total_quantity || 0}</span></div>
              <div>ทีม: {ad.installation_team?.name || "-"}</div>
              <div className="col-span-2">
                เวอร์ชัน: {ad.ad_versions.length > 0 ? ad.ad_versions.map(v => `${v.version_name}(${v.quantity})`).join(", ") : "-"}
              </div>
              <div className="col-span-2">
                {format(new Date(ad.created_at), "dd/MM/yyyy HH:mm")}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 gap-1" onClick={() => setConfirmAd(ad)}>
                <CheckCircle2 className="h-4 w-4" /> รับเข้า
              </Button>
              <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive/50" onClick={() => setRejectAd(ad)}>
                <XCircle className="h-4 w-4" /> ปฏิเสธ
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table view */}
      <div className="hidden sm:block rounded-lg border overflow-x-auto">
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
            {filteredAds.map((ad) => (
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
                    <Button size="sm" onClick={() => setConfirmAd(ad)} className="gap-1">
                      <CheckCircle2 className="h-4 w-4" /> รับเข้า
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive/50 hover:bg-destructive/10" onClick={() => setRejectAd(ad)}>
                      <XCircle className="h-4 w-4" /> ปฏิเสธ
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
        <AlertDialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันรับเข้าคลัง</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">รหัส:</span>
                    <p className="font-mono font-medium">{confirmAd?.code}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ชื่อภาพ:</span>
                    <p className="font-medium">{confirmAd?.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ประเภท:</span>
                    <p><Badge variant="outline">{entryTypeLabels[confirmAd?.entry_type || ""] || confirmAd?.entry_type}</Badge></p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">จำนวนรวม:</span>
                    <p className="font-medium">{confirmAd?.total_quantity || 0} ชิ้น</p>
                  </div>
                  {confirmAd?.ad_size && (
                    <div>
                      <span className="text-muted-foreground">ขนาดภาพ:</span>
                      <p>{confirmAd.ad_size.name}</p>
                    </div>
                  )}
                  {confirmAd?.ad_media_type && (
                    <div>
                      <span className="text-muted-foreground">ประเภทสื่อ:</span>
                      <p>{confirmAd.ad_media_type.name}</p>
                    </div>
                  )}
                  {confirmAd?.installation_team && (
                    <div>
                      <span className="text-muted-foreground">ทีมติดตั้ง:</span>
                      <p>{confirmAd.installation_team.name}</p>
                    </div>
                  )}
                  {confirmAd?.target_installation_date && (
                    <div>
                      <span className="text-muted-foreground">วันที่ติดตั้ง:</span>
                      <p>{format(new Date(confirmAd.target_installation_date), "dd/MM/yyyy")}</p>
                    </div>
                  )}
                  {confirmAd?.pickup_contractor && (
                    <div>
                      <span className="text-muted-foreground">ผู้รับเหมารับสินค้า:</span>
                      <p>{confirmAd.pickup_contractor.name}</p>
                    </div>
                  )}
                  {confirmAd?.contact_name && (
                    <div>
                      <span className="text-muted-foreground">ผู้ติดต่อ:</span>
                      <p>{confirmAd.contact_name}{confirmAd.contact_phone ? ` (${confirmAd.contact_phone})` : ""}</p>
                    </div>
                  )}
                  {confirmAd?.storage_location && (
                    <div>
                      <span className="text-muted-foreground">ตำแหน่งจัดเก็บ:</span>
                      <p>{confirmAd.storage_location}</p>
                    </div>
                  )}
                  {confirmAd?.retention_days && (
                    <div>
                      <span className="text-muted-foreground">ระยะเวลาจัดเก็บ:</span>
                      <p>{confirmAd.retention_days} วัน</p>
                    </div>
                  )}
                </div>

                {/* Versions */}
                {confirmAd?.ad_versions && confirmAd.ad_versions.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">เวอร์ชัน:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {confirmAd.ad_versions.map((v, i) => (
                        <Badge key={i} variant="secondary">{v.version_name} ({v.quantity})</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Target Billboards */}
                {confirmAd?.ad_target_billboards && confirmAd.ad_target_billboards.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">ป้ายเป้าหมาย ({confirmAd.ad_target_billboards.length}):</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {confirmAd.ad_target_billboards.slice(0, 10).map((tb, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tb.billboards?.old_code || tb.billboards?.equipment_id || "-"} {tb.billboards?.location_name ? `- ${tb.billboards.location_name}` : ""}
                        </Badge>
                      ))}
                      {confirmAd.ad_target_billboards.length > 10 && (
                        <Badge variant="secondary" className="text-xs">+{confirmAd.ad_target_billboards.length - 10} ป้าย</Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Installation details */}
                {confirmAd?.installation_details && (
                  <div className="p-3 rounded-md bg-muted/50 border">
                    <p className="text-xs font-medium text-muted-foreground mb-1">📋 รายละเอียดการติดตั้ง:</p>
                    <p className="text-sm">{confirmAd.installation_details}</p>
                  </div>
                )}

                {/* Supporting Doc */}
                {confirmAd?.supporting_doc_url && (
                  <div>
                    <span className="text-sm text-muted-foreground">เอกสารประกอบ:</span>
                    <a href={confirmAd.supporting_doc_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline ml-1">ดูเอกสาร</a>
                  </div>
                )}

                {/* Notes */}
                {confirmAd?.notes && (
                  <div>
                    <span className="text-sm text-muted-foreground">หมายเหตุ:</span>
                    <p className="text-sm">{confirmAd.notes}</p>
                  </div>
                )}

                {/* Photos preview */}
                {confirmAd?.photo_urls && confirmAd.photo_urls.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {confirmAd.photo_urls.map((url, i) => (
                      <img key={i} src={url} alt={`ภาพ ${i + 1}`} className="w-16 h-16 rounded border object-cover flex-shrink-0" />
                    ))}
                  </div>
                )}

                {confirmAd?.entry_type === "new" && (
                  <div className="p-3 rounded-md bg-primary/5 border border-primary/20">
                    <p className="text-sm font-medium text-primary flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      ระบบจะสร้างเอกสารเบิกอัตโนมัติ
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      เอกสารเบิกจะถูกสร้างเพื่อนำไปติดตั้งตามป้ายเป้าหมายที่ระบุไว้
                    </p>
                  </div>
                )}
              </div>
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
        <AlertDialogContent className="max-w-[95vw] sm:max-w-lg">
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
