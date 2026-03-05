import { useRef } from "react";
import { Download, FileText, TrendingUp, TrendingDown, ArrowRightLeft, RotateCcw, Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { GroupedMovement } from "./StockMovementGroupRow";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type MovementType = 'receive' | 'issue' | 'transfer_in' | 'transfer_out' | 'return_from_billboard' | 'install_to_billboard';

const movementTypeConfig: Record<MovementType, { label: string; thaiLabel: string }> = {
  receive: { label: "รับเข้า", thaiLabel: "ใบรับสินค้า" },
  issue: { label: "เบิกออก", thaiLabel: "ใบเบิกสินค้า" },
  transfer_in: { label: "รับโอน", thaiLabel: "ใบรับโอนสินค้า" },
  transfer_out: { label: "โอนออก", thaiLabel: "ใบโอนสินค้า" },
  return_from_billboard: { label: "คืนจากป้าย", thaiLabel: "ใบรับคืนสินค้า" },
  install_to_billboard: { label: "ติดตั้งป้าย", thaiLabel: "ใบติดตั้งอุปกรณ์" },
};

const getMovementIcon = (type: string) => {
  switch (type) {
    case 'receive': return TrendingUp;
    case 'issue': return TrendingDown;
    case 'transfer_in':
    case 'transfer_out': return ArrowRightLeft;
    case 'return_from_billboard': return RotateCcw;
    case 'install_to_billboard': return Package;
    default: return FileText;
  }
};

interface StockMovementDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: GroupedMovement | null;
}

export const StockMovementDocumentDialog = ({
  open,
  onOpenChange,
  group,
}: StockMovementDocumentDialogProps) => {
  const documentRef = useRef<HTMLDivElement>(null);

  if (!group) return null;

  const config = movementTypeConfig[group.movement_type as MovementType] || { label: group.movement_type, thaiLabel: "เอกสาร" };
  const Icon = getMovementIcon(group.movement_type);

  const handleDownload = async () => {
    if (!documentRef.current) return;

    try {
      const canvas = await html2canvas(documentRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 10, 10, imgWidth, Math.min(imgHeight, pageHeight - 20));
      pdf.save(`${group.reference_document || "document"}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    }
  };

  const getTotalQuantity = () => {
    return group.items.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getStockChange = (type: string, quantity: number) => {
    const isIncrease = ['receive', 'transfer_in', 'return_from_billboard'].includes(type);
    return isIncrease ? `+${quantity}` : `-${quantity}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              {config.thaiLabel}
            </DialogTitle>
            <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1">
              <Download className="h-4 w-4" />
              ดาวน์โหลด PDF
            </Button>
          </div>
        </DialogHeader>

        {/* Document Content */}
        <div ref={documentRef} className="bg-white p-6 rounded-lg border">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-foreground">{config.thaiLabel}</h1>
            <p className="text-muted-foreground">Stock Movement Document</p>
          </div>

          <Separator className="my-4" />

          {/* Document Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <div className="flex">
                <span className="font-medium w-32">เลขที่เอกสาร:</span>
                <span className="font-mono">{group.reference_document || "-"}</span>
              </div>
              <div className="flex">
                <span className="font-medium w-32">วันที่:</span>
                <span>{format(new Date(group.created_at), "dd MMMM yyyy HH:mm น.", { locale: th })}</span>
              </div>
              <div className="flex">
                <span className="font-medium w-32">ประเภท:</span>
                <Badge variant="secondary">{config.label}</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex">
                <span className="font-medium w-32">บริษัท:</span>
                <span>{group.company_name || "-"}</span>
              </div>
              <div className="flex">
                <span className="font-medium w-32">จำนวนรายการ:</span>
                <span>{group.total_items} รายการ</span>
              </div>
              <div className="flex">
                <span className="font-medium w-32">จำนวนรวม:</span>
                <span className="font-semibold">{getStockChange(group.movement_type, getTotalQuantity())}</span>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Items Table */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">รายการสินค้า</h3>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12">ลำดับ</TableHead>
                  <TableHead>รหัสสินค้า</TableHead>
                  <TableHead>ชื่อสินค้า</TableHead>
                  <TableHead className="text-right">จำนวน</TableHead>
                  <TableHead className="text-right">ก่อน</TableHead>
                  <TableHead className="text-right">หลัง</TableHead>
                  <TableHead>ตำแหน่ง</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-center">{index + 1}</TableCell>
                    <TableCell className="font-mono text-sm">{item.equipment_code}</TableCell>
                    <TableCell>{item.equipment_name}</TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={['receive', 'transfer_in', 'return_from_billboard'].includes(item.movement_type) 
                        ? "text-green-600" 
                        : "text-red-600"
                      }>
                        {getStockChange(item.movement_type, item.quantity)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">{item.stock_before}</TableCell>
                    <TableCell className="text-right font-mono font-medium">{item.stock_after}</TableCell>
                    <TableCell>{item.location?.name || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Notes */}
          {group.items.some(item => item.notes) && (
            <>
              <Separator className="my-4" />
              <div>
                <h3 className="font-semibold mb-2">หมายเหตุ</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  {group.items
                    .filter(item => item.notes)
                    .map((item, index) => (
                      <p key={index}>• {item.equipment_code}: {item.notes}</p>
                    ))}
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <Separator className="my-4" />
          <div className="grid grid-cols-3 gap-4 mt-8 pt-4">
            <div className="text-center">
              <div className="border-t border-dashed pt-2 mx-4">
                <p className="text-sm text-muted-foreground">ผู้จัดทำ</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-dashed pt-2 mx-4">
                <p className="text-sm text-muted-foreground">ผู้ตรวจสอบ</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-dashed pt-2 mx-4">
                <p className="text-sm text-muted-foreground">ผู้อนุมัติ</p>
              </div>
            </div>
          </div>

          {/* Print Date */}
          <div className="text-right text-xs text-muted-foreground mt-6">
            พิมพ์เมื่อ: {format(new Date(), "dd/MM/yyyy HH:mm:ss", { locale: th })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
