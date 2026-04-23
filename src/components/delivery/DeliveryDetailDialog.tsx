import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { downloadStorageFile } from "@/lib/storageDownload";

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

const DocLink = ({ url, label }: { url: string | null; label: string }) => {
  if (!url) return null;
  return (
    <button
      type="button"
      onClick={() => downloadStorageFile(url, label)}
      className="flex items-center gap-1.5 text-sm text-primary hover:underline cursor-pointer"
    >
      <FileText className="w-4 h-4" /> {label} <ExternalLink className="w-3 h-3" />
    </button>
  );
};

export function DeliveryDetailDialog({ open, onOpenChange, receipt }: DeliveryDetailDialogProps) {
  if (!receipt) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "received": return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">รับเข้าแล้ว</Badge>;
      case "pending": return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">รอรับเข้า</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
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
              <DetailRow label="ผู้ส่ง" value={receipt.delivery_person_name} />
              <DetailRow label="เบอร์ผู้ส่ง" value={receipt.delivery_person_phone} />
              <DetailRow label="บริษัทที่สั่งซื้อ" value={receipt.supplier_name} />
              <DetailRow label="สั่งซื้อสำหรับโปรเจค" value={receipt.order_for_project} />
              <DetailRow label="PO Number" value={receipt.po_number} />
              <DetailRow label="PR Number" value={receipt.pr_number} />
              <DetailRow label="Invoice Number" value={receipt.invoice_number} />
              <DetailRow label="เลขใบส่งของ" value={receipt.delivery_note_number} />
            </div>
          </div>

          {/* เอกสารแนบ */}
          {(receipt.document_url || receipt.purchase_document_url || receipt.po_number || receipt.invoice_document_url || receipt.delivery_note_document_url) && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2">เอกสารแนบ</h4>
                <div className="space-y-2">
                  <DocLink url={receipt.document_url} label="เอกสารประกอบ" />
                  <DocLink url={receipt.purchase_document_url} label="เอกสารจัดซื้อ" />
                  <DocLink url={receipt.invoice_document_url} label="Invoice" />
                  <DocLink url={receipt.delivery_note_document_url} label="ใบส่งของ" />
                </div>
              </div>
            </>
          )}

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
  );
}
