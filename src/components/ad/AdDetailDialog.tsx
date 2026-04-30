import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { formatBillboardLabel } from "@/lib/billboardUtils";
import {
  Package,
  MapPin,
  Calendar,
  Clock,
  Image as ImageIcon,
  FileText,
  Users,
  Layers,
  AlertTriangle,
} from "lucide-react";
import { DocumentPreviewDialog } from "@/components/DocumentPreviewDialog";

interface AdVersion {
  id: string;
  version_name: string;
  quantity: number;
}

interface AdTargetBillboard {
  id: string;
  billboard_id: string;
  billboard?: {
    old_code: string | null;
    equipment_id: string;
    location_name: string | null;
  };
}

interface AdDetail {
  id: string;
  code: string;
  name: string;
  entry_type: string;
  status: string;
  total_quantity: number | null;
  storage_location: string | null;
  storage_in_datetime: string | null;
  storage_out_datetime: string | null;
  target_installation_date: string | null;
  installation_details: string | null;
  retention_days: number | null;
  retention_start_date: string | null;
  notes: string | null;
  photo_urls: string[] | null;
  supporting_doc_url: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  created_at: string;
  ad_versions: AdVersion[];
  ad_target_billboards: AdTargetBillboard[];
  installation_team: { name: string } | null;
  pickup_contractor: { name: string } | null;
  ad_size: { name: string } | null;
  ad_media_type: { name: string } | null;
  company: { name: string; code: string } | null;
  department: { name: string } | null;
}

interface AdDetailDialogProps {
  adId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const entryTypeLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  new: { label: "ภาพใหม่", variant: "default" },
  temporary: { label: "ฝากชั่วคราว", variant: "secondary" },
  old: { label: "ภาพเก่า", variant: "outline" },
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "รอรับเข้า", variant: "secondary" },
  received: { label: "รับเข้าแล้ว", variant: "default" },
  in_storage: { label: "อยู่ในคลัง", variant: "default" },
  issued: { label: "เบิกแล้ว", variant: "outline" },
  installed: { label: "ติดตั้งแล้ว", variant: "outline" },
  completed: { label: "เสร็จสิ้น", variant: "secondary" },
};

export function AdDetailDialog({ adId, open, onOpenChange }: AdDetailDialogProps) {
  const [ad, setAd] = useState<AdDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);

  useEffect(() => {
    if (adId && open) {
      fetchAdDetail(adId);
    } else {
      setAd(null);
    }
  }, [adId, open]);

  const fetchAdDetail = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("advertisements")
        .select(`
          *,
          ad_versions (*),
          ad_target_billboards (
            id,
            billboard_id,
            billboard:billboards (old_code, equipment_id, location_name)
          ),
          installation_team:contractors!advertisements_installation_team_id_fkey (name),
          pickup_contractor:contractors!advertisements_pickup_contractor_id_fkey (name),
          ad_size:ad_sizes (name),
          ad_media_type:ad_media_types (name),
          company:companies (name, code),
          department:departments (name)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setAd(data as unknown as AdDetail);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const getRetentionInfo = () => {
    if (!ad || ad.entry_type !== "old" || !ad.retention_start_date || !ad.retention_days) return null;
    const start = new Date(ad.retention_start_date);
    const deadline = new Date(start.getTime() + ad.retention_days * 24 * 60 * 60 * 1000);
    const today = new Date();
    const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return { deadline, daysLeft };
  };

  const retentionInfo = ad ? getRetentionInfo() : null;

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-12 text-muted-foreground">กำลังโหลด...</div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!ad) return null;

  const entryType = entryTypeLabels[ad.entry_type] || { label: ad.entry_type, variant: "secondary" as const };
  const status = statusLabels[ad.status] || { label: ad.status, variant: "secondary" as const };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="font-mono text-lg">{ad.code}</span>
            <Badge variant={entryType.variant}>{entryType.label}</Badge>
            <Badge variant={status.variant}>{status.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Basic Info */}
          <div>
            <h3 className="text-lg font-semibold">{ad.name}</h3>
            <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
              {ad.company && (
                <InfoRow icon={<Users className="h-4 w-4" />} label="บริษัท" value={`${ad.company.name} (${ad.company.code})`} />
              )}
              {ad.department && (
                <InfoRow icon={<Users className="h-4 w-4" />} label="ฝ่าย" value={ad.department.name} />
              )}
              {ad.ad_size && (
                <InfoRow icon={<Layers className="h-4 w-4" />} label="ขนาด" value={ad.ad_size.name} />
              )}
              {ad.ad_media_type && (
                <InfoRow icon={<Layers className="h-4 w-4" />} label="ประเภทสื่อ" value={ad.ad_media_type.name} />
              )}
              {ad.installation_team && (
                <InfoRow icon={<Users className="h-4 w-4" />} label="ทีมติดตั้ง" value={ad.installation_team.name} />
              )}
              {ad.pickup_contractor && (
                <InfoRow icon={<Users className="h-4 w-4" />} label="ผู้รับ" value={ad.pickup_contractor.name} />
              )}
              <InfoRow icon={<Package className="h-4 w-4" />} label="จำนวนรวม" value={`${ad.total_quantity || 0} ชิ้น`} />
              <InfoRow icon={<Calendar className="h-4 w-4" />} label="วันที่สร้าง" value={format(new Date(ad.created_at), "dd/MM/yyyy HH:mm")} />
            </div>
          </div>

          {/* Retention Alert for Old Ads */}
          {retentionInfo && (
            <>
              <Separator />
              <div className={`rounded-lg p-3 flex items-start gap-3 ${
                retentionInfo.daysLeft <= 0
                  ? "bg-destructive/10 text-destructive"
                  : retentionInfo.daysLeft <= 7
                  ? "bg-warning/10 text-warning"
                  : "bg-muted"
              }`}>
                <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">
                    {retentionInfo.daysLeft <= 0
                      ? `ครบกำหนดจัดเก็บแล้ว (เกิน ${Math.abs(retentionInfo.daysLeft)} วัน)`
                      : `เหลือเวลาจัดเก็บอีก ${retentionInfo.daysLeft} วัน`}
                  </p>
                  <p className="text-xs mt-0.5">
                    ระยะเวลา {ad.retention_days} วัน — กำหนด {format(retentionInfo.deadline, "dd/MM/yyyy")}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Versions */}
          {ad.ad_versions.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  เวอร์ชัน ({ad.ad_versions.length})
                </h4>
                <div className="rounded-lg border divide-y">
                  {ad.ad_versions.map((v, i) => (
                    <div key={v.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <span className="font-medium">
                        {i + 1}. {v.version_name}
                      </span>
                      <Badge variant="outline">{v.quantity} ชิ้น</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Target Billboards */}
          {ad.ad_target_billboards.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  ป้ายเป้าหมาย ({ad.ad_target_billboards.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {ad.ad_target_billboards.map((tb) => (
                    <Badge key={tb.id} variant="secondary" className="text-xs">
                      {tb.billboard
                        ? formatBillboardLabel(tb.billboard.old_code, tb.billboard.location_name, tb.billboard.equipment_id)
                        : tb.billboard_id}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Storage & Installation Info */}
          <Separator />
          <div className="grid grid-cols-2 gap-3 text-sm">
            {ad.storage_location && (
              <InfoRow icon={<MapPin className="h-4 w-4" />} label="ที่จัดเก็บ" value={ad.storage_location} />
            )}
            {ad.storage_in_datetime && (
              <InfoRow icon={<Clock className="h-4 w-4" />} label="เข้าคลัง" value={format(new Date(ad.storage_in_datetime), "dd/MM/yyyy HH:mm")} />
            )}
            {ad.storage_out_datetime && (
              <InfoRow icon={<Clock className="h-4 w-4" />} label="ออกคลัง" value={format(new Date(ad.storage_out_datetime), "dd/MM/yyyy HH:mm")} />
            )}
            {ad.target_installation_date && (
              <InfoRow icon={<Calendar className="h-4 w-4" />} label="กำหนดติดตั้ง" value={format(new Date(ad.target_installation_date), "dd/MM/yyyy")} />
            )}
          </div>

          {/* Installation Details */}
          {ad.installation_details && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold text-sm mb-1">รายละเอียดการติดตั้ง</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ad.installation_details}</p>
              </div>
            </>
          )}

          {/* Contact */}
          {(ad.contact_name || ad.contact_phone || ad.contact_email) && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold text-sm mb-2">ผู้ติดต่อ</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {ad.contact_name && <InfoRow icon={<Users className="h-4 w-4" />} label="ชื่อ" value={ad.contact_name} />}
                  {ad.contact_phone && <InfoRow icon={<Users className="h-4 w-4" />} label="โทร" value={ad.contact_phone} />}
                  {ad.contact_email && <InfoRow icon={<Users className="h-4 w-4" />} label="อีเมล" value={ad.contact_email} />}
                </div>
              </div>
            </>
          )}

          {/* Photos */}
          {ad.photo_urls && ad.photo_urls.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  ภาพโฆษณา ({ad.photo_urls.length})
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {ad.photo_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={url}
                        alt={`ภาพ ${i + 1}`}
                        className="rounded-lg border w-full h-24 object-cover hover:opacity-80 transition-opacity"
                      />
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Document */}
          {ad.supporting_doc_url && (
            <>
              <Separator />
              <div>
                <button
                  type="button"
                  onClick={() => setPreviewDocUrl(ad.supporting_doc_url)}
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  ดูเอกสาร Layout
                </button>
              </div>
            </>
          )}

          {/* Notes */}
          {ad.notes && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold text-sm mb-1">หมายเหตุ</h4>
                <p className="text-sm text-muted-foreground">{ad.notes}</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
    <DocumentPreviewDialog
      open={!!previewDocUrl}
      onOpenChange={(dialogOpen) => { if (!dialogOpen) setPreviewDocUrl(null); }}
      publicUrl={previewDocUrl}
      title="ดูเอกสาร Layout"
    />
    </>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium truncate">{value}</span>
    </div>
  );
}
