import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Package, CheckCircle2, ImageIcon, MapPin, FileText,
  Download, AlertTriangle, ExternalLink, User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";
import { formatBillboardLabel } from "@/lib/billboardUtils";

const purposeLabels: Record<string, string> = {
  install: "ติดตั้ง",
  inspect: "ตรวจสภาพ",
  csr: "CSR",
};

const oldAdActionLabels: Record<string, string> = {
  return_to_warehouse: "ปลดภาพโฆษณาเก่ากลับเข้าคลัง",
  no_return: "ไม่ต้องนำภาพโฆษณากลับ",
  return_for_inspect: "ปลดภาพโฆษณาเก่ากลับเพื่อตรวจสอบ",
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "รอจ่าย", color: "bg-warning/10 text-warning" },
  issued: { label: "จ่ายแล้ว - รอรับ", color: "bg-primary/10 text-primary" },
  completed: { label: "รับเรียบร้อย", color: "bg-success/10 text-success" },
  reported: { label: "แจ้งปัญหา", color: "bg-destructive/10 text-destructive" },
};

const AdPublicView = () => {
  const { token } = useParams<{ token: string }>();
  const [receiverName, setReceiverName] = useState("");
  const [reportType, setReportType] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [showReport, setShowReport] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["ad-public-view", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("public_get_ad_issue_request", {
        _token: token,
      });
      if (error) throw error;
      if (!data) throw new Error("ไม่พบข้อมูลคำขอ");
      return data as any;
    },
    enabled: !!token,
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!receiverName.trim()) throw new Error("กรุณากรอกชื่อผู้รับ");
      const { error } = await supabase.rpc("public_confirm_ad_issue_request", {
        _token: token,
        _receiver_name: receiverName.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ยืนยันรับภาพโฆษณาเรียบร้อย");
      refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!receiverName.trim()) throw new Error("กรุณากรอกชื่อผู้แจ้ง");
      if (!reportType) throw new Error("กรุณาเลือกประเภทปัญหา");
      const { error } = await supabase.rpc("public_report_ad_issue", {
        _token: token,
        _reporter_name: receiverName.trim(),
        _report_type: reportType,
        _report_description: reportDescription.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("แจ้งปัญหาเรียบร้อย เจ้าหน้าที่คลังจะดำเนินการตรวจสอบ");
      refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-3" />
            <h2 className="text-lg font-semibold">ไม่พบข้อมูล</h2>
            <p className="text-sm text-muted-foreground mt-1">ลิงก์นี้ไม่ถูกต้องหรือหมดอายุ</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ad = data.advertisement as any;
  const bb = data.target_billboard as any;
  const isCompleted = data.status === "completed";
  const hasReport = !!data.issue_report_type;
  const canConfirm = data.status === "issued" && !isCompleted && !hasReport;
  const st = statusLabels[data.status] || statusLabels.pending;

  return (
    <div className="min-h-screen bg-muted/30 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">รับภาพโฆษณา</h1>
          <p className="text-sm text-muted-foreground">ตรวจสอบข้อมูลและยืนยันรับภาพโฆษณา</p>
          <Badge className={st.color}>{st.label}</Badge>
        </div>

        {/* Document Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> ข้อมูลเอกสาร
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">เลขที่เอกสาร:</span>
                <p className="font-mono font-medium">{data.document_no}</p>
              </div>
              <div>
                <span className="text-muted-foreground">วัตถุประสงค์:</span>
                <p className="font-medium">{purposeLabels[data.issue_purpose] || data.issue_purpose}</p>
              </div>
              <div>
                <span className="text-muted-foreground">จำนวน:</span>
                <p className="font-medium">{data.issued_quantity || 0} ชิ้น</p>
              </div>
              {data.issued_at && (
                <div>
                  <span className="text-muted-foreground">วันที่จ่าย:</span>
                  <p className="font-medium">{format(new Date(data.issued_at), "d MMM yyyy HH:mm", { locale: th })}</p>
                </div>
              )}
              {data.old_ad_action && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">จัดการภาพเก่า:</span>
                  <p className="font-medium">{oldAdActionLabels[data.old_ad_action] || data.old_ad_action}</p>
                </div>
              )}
              {data.notes && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">หมายเหตุ:</span>
                  <p className="text-sm">{data.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Advertisement Info */}
        {ad && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="h-4 w-4" /> ข้อมูลภาพโฆษณา
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">รหัส:</span>
                  <p className="font-mono font-medium">{ad.code}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">ชื่อ:</span>
                  <p className="font-medium">{ad.name}</p>
                </div>
                {ad.ad_media_type && (
                  <div>
                    <span className="text-muted-foreground">ประเภทสื่อ:</span>
                    <p>{ad.ad_media_type.name}</p>
                  </div>
                )}
                {ad.ad_size && (
                  <div>
                    <span className="text-muted-foreground">ขนาด:</span>
                    <p>{ad.ad_size.name}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">จำนวนรวม:</span>
                  <p className="font-medium">{ad.total_quantity || 0} ชิ้น</p>
                </div>
                {ad.target_installation_date && (
                  <div>
                    <span className="text-muted-foreground">วันที่ติดตั้ง:</span>
                    <p>{format(new Date(ad.target_installation_date), "d MMM yyyy", { locale: th })}</p>
                  </div>
                )}
              </div>

              {/* Versions */}
              {ad.ad_versions && ad.ad_versions.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">เวอร์ชัน:</p>
                  <div className="flex flex-wrap gap-1">
                    {ad.ad_versions.map((v: any, i: number) => (
                      <Badge key={i} variant="outline">{v.version_name} ({v.quantity})</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Installation Details */}
              {ad.installation_details && (
                <div className="p-3 rounded-md bg-muted/50 border">
                  <p className="text-xs font-medium text-muted-foreground mb-1">📋 รายละเอียดการติดตั้ง:</p>
                  <p className="text-sm whitespace-pre-line">{ad.installation_details}</p>
                </div>
              )}

              {/* Photos */}
              {ad.photo_urls && ad.photo_urls.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">ภาพโฆษณา:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ad.photo_urls.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                        <img src={url} alt={`ภาพ ${i + 1}`} className="w-full h-24 object-cover rounded-md border hover:opacity-80 transition" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Supporting Doc */}
              {ad.supporting_doc_url && (
                <a
                  href={ad.supporting_doc_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Download className="h-4 w-4" />
                  ดาวน์โหลดเอกสารประกอบการติดตั้ง
                </a>
              )}
            </CardContent>
          </Card>
        )}

        {/* Target Billboard */}
        {bb && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" /> ป้ายเป้าหมาย
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Old Code:</span>
                  <p className="font-medium">{bb.old_code || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">สถานที่:</span>
                  <p className="font-medium">{bb.location_name || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">ฝ่าย:</span>
                  <p>{bb.department || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">ขนาด:</span>
                  <p>{bb.size || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Confirmation Section */}
        {isCompleted && (
          <Alert className="border-success/30 bg-success/5">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertDescription className="text-success">
              รับภาพโฆษณาเรียบร้อยแล้ว
              {data.confirmed_by_name && <> โดย <strong>{data.confirmed_by_name}</strong></>}
              {data.confirmed_at && <> เมื่อ {format(new Date(data.confirmed_at), "d MMM yyyy HH:mm", { locale: th })}</>}
            </AlertDescription>
          </Alert>
        )}

        {hasReport && (
          <Alert className="border-destructive/30 bg-destructive/5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              แจ้งปัญหา: <strong>{data.issue_report_type}</strong>
              {data.issue_report_description && <> — {data.issue_report_description}</>}
              {data.confirmed_by_name && <> (โดย {data.confirmed_by_name})</>}
            </AlertDescription>
          </Alert>
        )}

        {canConfirm && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" /> ยืนยันรับภาพโฆษณา
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>ชื่อผู้รับ *</Label>
                <Input
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  placeholder="กรอกชื่อ-นามสกุล ผู้รับ"
                />
              </div>

              {!showReport ? (
                <div className="flex gap-2">
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => confirmMutation.mutate()}
                    disabled={confirmMutation.isPending || !receiverName.trim()}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {confirmMutation.isPending ? "กำลังยืนยัน..." : "ยืนยันรับภาพโฆษณา"}
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 text-destructive border-destructive/50"
                    onClick={() => setShowReport(true)}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    แจ้งปัญหา
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 p-3 rounded-md border border-destructive/30 bg-destructive/5">
                  <p className="text-sm font-medium text-destructive">แจ้งปัญหา</p>
                  <RadioGroup value={reportType} onValueChange={setReportType}>
                    {[
                      { value: "incomplete", label: "ของไม่ครบตามจำนวน" },
                      { value: "wrong_item", label: "ของผิดรายการ / ผิดเวอร์ชัน" },
                      { value: "damaged", label: "ของเสียหาย / ชำรุด" },
                      { value: "other", label: "อื่นๆ" },
                    ].map((opt) => (
                      <div key={opt.value} className="flex items-center gap-2">
                        <RadioGroupItem value={opt.value} id={`report-${opt.value}`} />
                        <Label htmlFor={`report-${opt.value}`} className="font-normal cursor-pointer text-sm">
                          {opt.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  <Textarea
                    placeholder="รายละเอียดเพิ่มเติม..."
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      className="gap-2"
                      onClick={() => reportMutation.mutate()}
                      disabled={reportMutation.isPending || !reportType || !receiverName.trim()}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      {reportMutation.isPending ? "กำลังส่ง..." : "ส่งรายงานปัญหา"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowReport(false)}>
                      ยกเลิก
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {data.status === "pending" && (
          <Alert>
            <Package className="h-4 w-4" />
            <AlertDescription>
              รายการนี้ยังอยู่ระหว่างรอจ่ายจากคลัง กรุณารอเจ้าหน้าที่คลังดำเนินการ
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default AdPublicView;
