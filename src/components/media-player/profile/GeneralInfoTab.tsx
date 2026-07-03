import { useEffect, useState } from "react";
import { FileText, ExternalLink, MapPin, Pencil, Repeat } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MediaPlayerRow } from "./types";
import { formatBillboardLabel } from "@/lib/billboardUtils";
import { DocumentPreviewDialog } from "@/components/DocumentPreviewDialog";
import { MediaPlayerInfoEditDialog } from "./MediaPlayerInfoEditDialog";
import { useFunctionPermissions } from "@/hooks/useFunctionPermissions";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface GeneralInfoTabProps {
  player: MediaPlayerRow;
  modelName: string;
  onUpdated?: () => void;
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

export function GeneralInfoTab({ player, modelName, onUpdated }: GeneralInfoTabProps) {
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const { hasFunctionAccess } = useFunctionPermissions();
  const canEdit = hasFunctionAccess("goods_receipt");
  const [snHistory, setSnHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!player?.id) return;
    supabase
      .from("media_player_serial_history")
      .select("*")
      .eq("media_player_id", player.id)
      .order("changed_at", { ascending: false })
      .then(({ data }) => setSnHistory((data as any[]) || []));
  }, [player?.id]);

  return (
    <>
    <Card>
      <CardContent className="pt-6">
        {canEdit && (
          <div className="flex justify-end mb-3">
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="w-3.5 h-3.5 mr-1.5" /> แก้ไขข้อมูลทรัพย์สิน
            </Button>
          </div>
        )}
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
          {player.sub_media_type && (
            <InfoRow label="ตำแหน่งสื่อย่อย" value={player.sub_media_type} />
          )}
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
          <InfoRow label="ผู้ดูแลทรัพย์สิน" value={player.asset_caretaker} />
          <InfoRow label="Location ตามแผน PO" value={player.planned_install_location} />
          <InfoRow label="ผู้จัดจำหน่าย" value={player.suppliers?.name} />
          <InfoRow label="วันที่รับเข้าคลัง" value={player.date_of_receipt} />
          <InfoRow label="วันหมดประกัน" value={player.warranty_expiry_date} />
          <InfoRow label="ระยะรับประกัน (ปี)" value={player.warranty_years != null ? String(player.warranty_years) : null} />
          <InfoRow label="ราคา (บาท)" value={player.unit_price?.toLocaleString()} />
          <InfoRow label="ค่าเสื่อม (เดือน)" value={player.depreciation_months?.toString()} />
          <InfoRow label="อายุใช้งาน (เดือน)" value={player.usage_lifespan_months?.toString()} />
          <InfoRow label="รหัสทรัพย์สิน" value={player.asset_code} />
          <InfoRow label="Equipment ID" value={player.equipment_id_code} />
          <InfoRow label="Item No. (PO)" value={player.po_item_no} mono />
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

        {snHistory.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <Repeat className="w-4 h-4 text-warning" /> ประวัติการเปลี่ยน S/N ของเครื่องนี้
            </h4>
            <div className="space-y-2">
              {snHistory.map((h) => (
                <div key={h.id} className="text-xs border-l-2 border-warning/60 pl-3 py-1.5 bg-muted/30 rounded-r">
                  <div className="text-muted-foreground">
                    {format(new Date(h.changed_at), "dd MMM yyyy HH:mm", { locale: th })}
                    {h.changed_by_name && <> • โดย {h.changed_by_name}</>}
                    {h.claim_document_no && <> • อ้างอิงเคลม: <span className="font-mono">{h.claim_document_no}</span></>}
                  </div>
                  <div className="mt-1">
                    <span className="font-mono line-through text-muted-foreground">{h.old_serial || "—"}</span>
                    <span className="mx-2">→</span>
                    <span className="font-mono font-semibold text-primary">{h.new_serial || "—"}</span>
                    {h.reason && <span className="text-muted-foreground ml-2">({h.reason})</span>}
                  </div>
                  {(h.new_warranty_expiry_date || h.new_po_number || h.new_invoice_number) && (
                    <div className="mt-1 text-muted-foreground">
                      {h.new_warranty_expiry_date && <>ประกันใหม่: {h.new_warranty_expiry_date} </>}
                      {h.new_po_number && <>• PO ใหม่: {h.new_po_number} </>}
                      {h.new_invoice_number && <>• Invoice ใหม่: {h.new_invoice_number}</>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
    {canEdit && (
      <MediaPlayerInfoEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        player={player}
        onSaved={() => onUpdated?.()}
      />
    )}
    </>
  );
}
