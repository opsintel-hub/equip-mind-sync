import { useState } from "react";
import { FileText, ExternalLink, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MediaPlayerRow } from "./types";
import { formatBillboardLabel } from "@/lib/billboardUtils";
import { DocumentPreviewDialog } from "@/components/DocumentPreviewDialog";

interface GeneralInfoTabProps {
  player: MediaPlayerRow;
  modelName: string;
}

function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={`font-medium ${mono ? "font-mono" : ""}`}>{value || "-"}</p>
    </div>
  );
}

function DocLink({ label, number, url, onPreview }: { label: string; number?: string | null; url?: string | null; onPreview: (url: string) => void }) {
  if (!number && !url) return null;
  return (
    <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
      <FileText className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm font-medium">{label}: {number || "-"}</span>
      {url && (
        <button type="button" onClick={() => onPreview(url)} className="text-primary hover:text-primary/80 cursor-pointer">
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export function GeneralInfoTab({ player, modelName }: GeneralInfoTabProps) {
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);

  return (
    <>
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 text-sm">
          <InfoRow label="รหัส" value={player.code} />
          <InfoRow label="ชื่อสินค้า" value={player.name} />
          <InfoRow label="โมเดล" value={modelName} />
          <InfoRow label="ยี่ห้อ" value={player.brand} />
          <InfoRow label="ประเภท (CMS)" value={player.cms_types?.name} />
          <InfoRow label="Specification" value={player.specification} />
          <InfoRow label="S/N 1" value={player.serial_number_1} mono />
          <InfoRow label="S/N 2" value={player.serial_number_2} mono />
          <InfoRow label="Activate Windows" value={player.activate_windows} />
          <InfoRow label="ชื่อ (Remote Name)" value={player.remote_name} />
          <InfoRow label="ฝ่าย" value={player.department} />
          <InfoRow label="บริษัท" value={player.companies?.name} />
          <div>
            <p className="text-muted-foreground text-xs">ที่อยู่ปัจจุบัน</p>
            {player.billboard_id && player.billboard ? (
              <p className="font-medium text-primary flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                ติดตั้งที่ป้าย: {formatBillboardLabel(player.billboard.old_code, player.billboard.location_name, player.billboard.equipment_id)}
              </p>
            ) : (
              <p className="font-medium">
                {player.locations?.name ? `คลัง: ${player.locations.name}` : "-"}
              </p>
            )}
          </div>
          <InfoRow label="ผู้จัดจำหน่าย" value={player.suppliers?.name} />
          <InfoRow label="วันที่รับเข้าคลัง" value={player.date_of_receipt} />
          <InfoRow label="วันหมดประกัน" value={player.warranty_expiry_date} />
          <InfoRow label="ราคา (บาท)" value={player.unit_price?.toLocaleString()} />
          <InfoRow label="ค่าเสื่อม (เดือน)" value={player.depreciation_months?.toString()} />
          <InfoRow label="อายุใช้งาน (เดือน)" value={player.usage_lifespan_months?.toString()} />
          <InfoRow label="รหัสทรัพย์สิน" value={player.asset_code} />
          <InfoRow label="Equipment ID" value={player.equipment_id_code} />
          <InfoRow label="Order For Project" value={player.order_for_project} />
        </div>

        {/* Documents */}
        <div className="mt-6 pt-4 border-t">
          <h4 className="text-sm font-semibold mb-3">เอกสารที่เกี่ยวข้อง</h4>
          <div className="flex flex-wrap gap-3">
            <DocLink label="PO" number={player.po_number} url={player.po_document_url} onPreview={setPreviewDocUrl} />
            <DocLink label="PR" number={player.pr_number} url={player.pr_document_url} onPreview={setPreviewDocUrl} />
            <DocLink label="Invoice" number={player.invoice_number} url={player.invoice_document_url} onPreview={setPreviewDocUrl} />
          </div>
        </div>

        {player.notes && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-semibold mb-1">หมายเหตุ</h4>
            <p className="text-sm text-muted-foreground">{player.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
    <DocumentPreviewDialog
      open={!!previewDocUrl}
      onOpenChange={(open) => { if (!open) setPreviewDocUrl(null); }}
      publicUrl={previewDocUrl}
      title="ดูเอกสาร Media Player"
    />
    </>
  );
}
