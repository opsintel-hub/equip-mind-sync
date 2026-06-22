import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Package, ImageIcon, MapPin, FileText, Lock, Eye, Calendar,
  User, Phone, ClipboardList,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { formatBillboardLabel } from "@/lib/billboardUtils";

const AdContractorView = () => {
  const { token } = useParams<{ token: string }>();
  const [pin, setPin] = useState("");
  const [pinVerified, setPinVerified] = useState(false);
  const [pinError, setPinError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["ad-contractor-view", token, pinVerified, pin],
    queryFn: async () => {
      if (!token || !pinVerified) return null;
      const { data, error } = await supabase.rpc("public_get_ad_by_contractor_token" as any, {
        _token: token,
        _pin: pin,
      });
      if (error) throw error;
      if (!data) throw new Error("ไม่พบข้อมูลภาพโฆษณา");
      return data as any;
    },
    enabled: !!token && pinVerified,
  });

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || pin.length !== 4) return;
    setVerifying(true);
    const { data, error: rpcErr } = await supabase.rpc("public_get_ad_by_contractor_token" as any, {
      _token: token,
      _pin: pin,
    });
    setVerifying(false);
    if (rpcErr || !data) {
      setPinError("รหัส PIN ไม่ถูกต้อง กรุณาลองใหม่");
      return;
    }
    setPinError("");
    setPinVerified(true);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-medium">ไม่พบข้อมูล</p>
            <p className="text-sm text-muted-foreground mt-1">ลิงก์อาจไม่ถูกต้องหรือหมดอายุ</p>
          </CardContent>
        </Card>
      </div>
    );
  }


  // PIN entry screen
  if (!pinVerified) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">ข้อมูลงานติดตั้งภาพโฆษณา</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">กรุณาใส่รหัส PIN 4 หลักเพื่อดูข้อมูล</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>รหัส PIN</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="0000"
                  value={pin}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setPin(v);
                    setPinError("");
                  }}
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                  autoFocus
                />
                {pinError && <p className="text-sm text-destructive">{pinError}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={pin.length !== 4}>
                <Eye className="h-4 w-4 mr-2" /> เปิดดูข้อมูล
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main content
  const ad = data as any;
  const versions = ad.ad_versions || [];
  const targetBillboards = ad.ad_target_billboards || [];

  return (
    <div className="min-h-screen bg-muted/30 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-xl">📋 ข้อมูลงานติดตั้งภาพโฆษณา</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  รหัส: <span className="font-mono font-medium">{ad.code}</span>
                </p>
              </div>
              <Badge variant="default">
                {ad.entry_type === "new" ? "ภาพใหม่" : ad.entry_type}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <Package className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-muted-foreground">ชื่อภาพโฆษณา</p>
                  <p className="font-medium">{ad.name}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <ClipboardList className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-muted-foreground">จำนวนรวม</p>
                  <p className="font-medium">{ad.total_quantity || 0} ชิ้น</p>
                </div>
              </div>
              {ad.ad_size && (
                <div>
                  <p className="text-muted-foreground">ขนาดภาพ</p>
                  <p className="font-medium">{ad.ad_size.name}</p>
                </div>
              )}
              {ad.ad_media_type && (
                <div>
                  <p className="text-muted-foreground">ประเภทสื่อ</p>
                  <p className="font-medium">{ad.ad_media_type.name}</p>
                </div>
              )}
              {ad.target_installation_date && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-muted-foreground">วันที่ต้องเบิกไปติดตั้ง</p>
                    <p className="font-medium">{format(new Date(ad.target_installation_date), "dd/MM/yyyy")}</p>
                  </div>
                </div>
              )}
              {ad.installation_team && (
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-muted-foreground">ทีมติดตั้ง</p>
                    <p className="font-medium">{ad.installation_team.name}</p>
                    {ad.installation_team.contact_person && (
                      <p className="text-xs text-muted-foreground">ติดต่อ: {ad.installation_team.contact_person}</p>
                    )}
                  </div>
                </div>
              )}
              {ad.contact_name && (
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-muted-foreground">ผู้ติดต่อ</p>
                    <p className="font-medium">{ad.contact_name}{ad.contact_phone ? ` (${ad.contact_phone})` : ""}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Versions */}
            {versions.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">เวอร์ชัน ({versions.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {versions.map((v: any, i: number) => (
                      <Badge key={i} variant="secondary">{v.version_name} ({v.quantity} ชิ้น)</Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Target Billboards */}
            {targetBillboards.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> ป้ายเป้าหมาย ({targetBillboards.length})
                  </p>
                  <div className="space-y-1.5">
                    {targetBillboards.map((tb: any, i: number) => (
                      <div key={i} className="text-sm p-2 rounded bg-muted/50 border flex items-center gap-2">
                        <span className="font-mono font-medium">{tb.billboards?.old_code || tb.billboards?.equipment_id || "-"}</span>
                        <span className="text-muted-foreground">—</span>
                        <span>{tb.billboards?.location_name || "-"}</span>
                        {tb.billboards?.size && <Badge variant="outline" className="text-xs ml-auto">{tb.billboards.size}</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Installation Details */}
            {ad.installation_details && (
              <>
                <Separator />
                <div className="p-3 rounded-md bg-primary/5 border border-primary/20">
                  <p className="text-xs font-medium text-primary mb-1">📋 รายละเอียดการติดตั้ง</p>
                  <p className="text-sm whitespace-pre-wrap">{ad.installation_details}</p>
                </div>
              </>
            )}

            {/* Supporting Doc */}
            {ad.supporting_doc_url && (
              <div>
                <a
                  href={ad.supporting_doc_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <FileText className="h-4 w-4" /> ดาวน์โหลดเอกสารประกอบการติดตั้ง
                </a>
              </div>
            )}

            {/* Photos */}
            {ad.photo_urls && ad.photo_urls.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-1">
                    <ImageIcon className="h-4 w-4" /> ภาพโฆษณา ({ad.photo_urls.length})
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ad.photo_urls.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt={`ภาพ ${i + 1}`} className="w-full aspect-square object-cover rounded-lg border hover:opacity-80 transition-opacity" />
                      </a>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            {ad.notes && (
              <div>
                <p className="text-sm text-muted-foreground">หมายเหตุ:</p>
                <p className="text-sm">{ad.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          วันที่สร้าง: {format(new Date(ad.created_at), "dd/MM/yyyy HH:mm")}
        </p>
      </div>
    </div>
  );
};

export default AdContractorView;
