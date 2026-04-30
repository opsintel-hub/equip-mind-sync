import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { FileText, Pencil, Check, X, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { DocumentPreviewDialog } from "@/components/DocumentPreviewDialog";
import { supabase } from "@/integrations/supabase/client";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";

interface DeliveryDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: any | null;
}

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => {
  if (!value || value === "-") return null;
  return (
    <div className="flex justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
};

const isImageUrl = (url: string) => /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url);

const DocLink = ({
  url,
  label,
  onPreview,
}: {
  url: string | null;
  label: string;
  onPreview: (url: string, label: string) => void;
}) => {
  if (!url) return null;
  const urls = url.split(/\s*,\s*/).filter(Boolean);
  const count = urls.length;
  return (
    <button
      type="button"
      onClick={() => onPreview(url, label)}
      className="flex items-center gap-1.5 text-sm text-primary hover:underline cursor-pointer"
    >
      <FileText className="w-4 h-4" /> {label}
      {count > 1 && <span className="text-xs text-muted-foreground">({count} ไฟล์)</span>}
    </button>
  );
};

/** Split combined document_url into two groups: extra docs (non-image) and extra images. */
const splitExtraDocs = (combined: string | null) => {
  if (!combined) return { docs: [] as string[], images: [] as string[] };
  const all = combined.split(/\s*,\s*/).filter(Boolean);
  const docs: string[] = [];
  const images: string[] = [];
  for (const u of all) {
    if (isImageUrl(u)) images.push(u);
    else docs.push(u);
  }
  return { docs, images };
};

export function DeliveryDetailDialog({ open, onOpenChange, receipt }: DeliveryDetailDialogProps) {
  const { isSuperAdmin } = useIsSuperAdmin();
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [editingDept, setEditingDept] = useState(false);
  const [newDeptId, setNewDeptId] = useState<string>("");
  const [savingDept, setSavingDept] = useState(false);
  const [currentDeptId, setCurrentDeptId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; label: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    supabase.from("departments").select("id, name").eq("is_active", true).order("name")
      .then(({ data }) => setDepartments(data || []));
  }, [open]);

  useEffect(() => {
    setCurrentDeptId(receipt?.department_id || null);
    setEditingDept(false);
    setNewDeptId(receipt?.department_id || "");
  }, [receipt]);

  if (!receipt) return null;

  const currentDeptName = departments.find(d => d.id === currentDeptId)?.name || "-";

  const handleSaveDept = async () => {
    if (!newDeptId || newDeptId === currentDeptId) {
      setEditingDept(false);
      return;
    }
    setSavingDept(true);
    const newDeptName = departments.find(d => d.id === newDeptId)?.name || null;

    // 1. Update PD record
    const { error: pdErr } = await supabase
      .from("goods_receipt_pending")
      .update({ department_id: newDeptId })
      .eq("id", receipt.id);

    if (pdErr) {
      toast.error("แก้ไขฝ่ายไม่สำเร็จ: " + pdErr.message);
      setSavingDept(false);
      return;
    }

    // 2. If already received, propagate to equipment / media_players (authoritative source rule)
    if (receipt.status === "received" && newDeptName) {
      if (receipt.is_media_player) {
        // Match media_players by S/N (most precise)
        const sn = receipt.serial_number || receipt.lot_number;
        if (sn) {
          await supabase
            .from("media_players")
            .update({ department: newDeptName })
            .or(`serial_number_1.eq.${sn},serial_number_2.eq.${sn}`);
        }
      } else if (receipt.equipment_id_code) {
        // Match equipment by code (fallback)
        await supabase
          .from("equipment")
          .update({ department: newDeptName })
          .eq("code", receipt.equipment_id_code);
      }
    }

    setCurrentDeptId(newDeptId);
    setEditingDept(false);
    setSavingDept(false);
    toast.success(`เปลี่ยนฝ่ายเป็น "${newDeptName}" แล้ว`);
    // Reflect on parent receipt object so re-open shows new value
    receipt.department_id = newDeptId;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "received": return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">รับเข้าแล้ว</Badge>;
      case "pending": return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">รอรับเข้า</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            รายละเอียดการนำเข้า
            <span className="text-sm font-mono text-muted-foreground">{receipt.document_no}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">สถานะ</span>
            {getStatusBadge(receipt.status)}
          </div>

          <Separator />

          {/* ข้อมูลสินค้า */}
          <div>
            <h4 className="text-sm font-semibold mb-2">ข้อมูลสินค้า</h4>
            <div className="space-y-0.5">
              <DetailRow label="รหัสสินค้า" value={receipt.equipment_code} />
              <DetailRow label="ชื่อสินค้า" value={receipt.equipment_name} />
              <DetailRow label="จำนวน" value={`${receipt.quantity} ${receipt.unit}`} />
              <DetailRow label="ราคาต่อหน่วย" value={receipt.unit_price ? `฿${Number(receipt.unit_price).toLocaleString()}` : null} />
              <DetailRow label="S/N" value={receipt.serial_number} />
              <DetailRow label="Lot No." value={receipt.lot_number} />
              <DetailRow label="Lot No. 2" value={receipt.lot_number_2} />
              <DetailRow label="รหัสทรัพย์สิน" value={receipt.asset_code} />
              <DetailRow label="Equipment ID" value={receipt.equipment_id_code} />
              <DetailRow label="Media Player" value={receipt.is_media_player ? "ใช่" : null} />
            </div>
          </div>

          <Separator />

          {/* ข้อมูลการนำเข้า */}
          <div>
            <h4 className="text-sm font-semibold mb-2">ข้อมูลการนำเข้า</h4>
            <div className="space-y-0.5">
              <DetailRow label="วันที่นำเข้า" value={format(new Date(receipt.created_at), "dd/MM/yyyy HH:mm")} />

              {/* ฝ่าย — แก้ไขได้โดย Super Admin */}
              <div className="flex justify-between py-1.5 items-start gap-2">
                <span className="text-sm text-muted-foreground pt-1.5">ฝ่าย</span>
                <div className="flex-1 max-w-[70%]">
                  {editingDept ? (
                    <div className="space-y-2">
                      <SearchableSelect
                        options={departments.map(d => ({ value: d.id, label: d.name }))}
                        value={newDeptId}
                        onValueChange={setNewDeptId}
                        placeholder="เลือกฝ่าย"
                        searchPlaceholder="ค้นหาฝ่าย..."
                        emptyMessage="ไม่พบฝ่าย"
                      />
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => { setEditingDept(false); setNewDeptId(currentDeptId || ""); }} disabled={savingDept}>
                          <X className="w-3.5 h-3.5" /> ยกเลิก
                        </Button>
                        <Button size="sm" onClick={handleSaveDept} disabled={savingDept || !newDeptId}>
                          {savingDept ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} บันทึก
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-sm font-medium text-right">{currentDeptName}</span>
                      {isSuperAdmin && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          title="แก้ไขฝ่าย (Super Admin)"
                          onClick={() => setEditingDept(true)}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <DetailRow label="ผู้ส่ง" value={receipt.delivery_person_name} />
              <DetailRow label="เบอร์ผู้ส่ง" value={receipt.delivery_person_phone} />
              <DetailRow label="บริษัทที่สั่งซื้อ" value={receipt.supplier_name} />
              <DetailRow label="สั่งซื้อสำหรับโปรเจค" value={receipt.order_for_project} />
              <DetailRow label="PO Number" value={receipt.po_number} />
              <DetailRow label="PR Number" value={receipt.pr_number} />
              <DetailRow label="Invoice Number" value={receipt.invoice_number} />
              <DetailRow label="เลขใบส่งของ" value={receipt.delivery_note_number} />
            </div>
            {isSuperAdmin && receipt.status === "received" && (
              <p className="text-[11px] text-muted-foreground/70 mt-2 italic">
                ℹ️ การแก้ฝ่ายจะอัปเดตทั้งใบรับเข้าและสินค้าในคลัง (Master Data) ให้สอดคล้องกัน
              </p>
            )}
          </div>

          {/* เอกสารแนบ */}
          {(() => {
            const { docs, images } = splitExtraDocs(receipt.document_url);
            const hasAny =
              docs.length > 0 ||
              images.length > 0 ||
              receipt.purchase_document_url ||
              receipt.po_number ||
              receipt.invoice_document_url ||
              receipt.delivery_note_document_url;
            if (!hasAny) return null;
            return (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-2">เอกสารแนบ</h4>
                  <div className="space-y-2">
                    <DocLink
                      url={docs.length > 0 ? docs.join(", ") : null}
                      label="เอกสารแนบเพิ่มเติม"
                      onPreview={(u, l) => setPreviewDoc({ url: u, label: l })}
                    />
                    <DocLink
                      url={images.length > 0 ? images.join(", ") : null}
                      label="รูปภาพเพิ่มเติม"
                      onPreview={(u, l) => setPreviewDoc({ url: u, label: l })}
                    />
                    <DocLink url={receipt.purchase_document_url} label="เอกสารจัดซื้อ" onPreview={(u, l) => setPreviewDoc({ url: u, label: l })} />
                    <DocLink url={receipt.invoice_document_url} label="Invoice" onPreview={(u, l) => setPreviewDoc({ url: u, label: l })} />
                    <DocLink url={receipt.delivery_note_document_url} label="ใบส่งของ" onPreview={(u, l) => setPreviewDoc({ url: u, label: l })} />
                  </div>
                </div>
              </>
            );
          })()}

          {/* การรับเข้า */}
          {receipt.status === "received" && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2">ข้อมูลการรับเข้าคลัง</h4>
                <div className="space-y-0.5">
                  <DetailRow label="รับเข้าเมื่อ" value={receipt.received_at ? format(new Date(receipt.received_at), "dd/MM/yyyy HH:mm") : null} />
                </div>
              </div>
            </>
          )}

          {/* หมายเหตุ */}
          {receipt.notes && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2">หมายเหตุ</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{receipt.notes}</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
    <DocumentPreviewDialog
      open={!!previewDoc}
      onOpenChange={(dialogOpen) => { if (!dialogOpen) setPreviewDoc(null); }}
      publicUrl={previewDoc?.url || null}
      title={previewDoc?.label || "ดูเอกสาร"}
      labels={(() => {
        if (!previewDoc) return undefined;
        const urls = previewDoc.url.split(/\s*,\s*/).filter(Boolean);
        return urls.length > 1 ? urls.map((_, i) => `${previewDoc.label} - ${i + 1}`) : undefined;
      })()}
    />
    </>
  );
}
