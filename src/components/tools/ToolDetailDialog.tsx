import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Eye, Lock } from "lucide-react";
import { ToolImageViewer } from "./ToolImageViewer";
import { ToolDocumentViewer } from "./ToolDocumentViewer";

interface Tool {
  id: string;
  code: string;
  name: string;
  description: string | null;
  department: string | null;
  brand: string | null;
  unit: string;
  current_quantity: number;
  serial_number: string | null;
  unit_price: number;
  pm_interval_days: number;
  has_warranty: boolean;
  warranty_expiry_date: string | null;
  expiry_date: string | null;
  is_asset: boolean;
  asset_code: string | null;
  responsible_person: string | null;
  is_personal_tool: boolean;
  tool_category: { name: string } | null;
  company: { name: string } | null;
  location: { name: string } | null;
  supplier: { name: string } | null;
  notes: string | null;
  warehouse_entry_date: string;
}

interface Props {
  tool: Tool;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground break-words">
        {value === null || value === undefined || value === "" ? (
          <span className="text-muted-foreground">-</span>
        ) : (
          value
        )}
      </div>
    </div>
  );
}

export function ToolDetailDialog({ tool, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <Eye className="h-5 w-5" />
            <span>ข้อมูลเครื่องมือ: {tool.code}</span>
            <span className="text-sm font-normal text-muted-foreground">{tool.name}</span>
            <Badge variant="outline" className="ml-auto gap-1 text-xs">
              <Lock className="h-3 w-3" /> อ่านอย่างเดียว
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 rounded-lg border bg-muted/30 p-4">
            <Field label="รหัส" value={<span className="font-mono">{tool.code}</span>} />
            <Field label="ชื่อเครื่องมือ" value={tool.name} />
            <Field label="หมวดหมู่" value={tool.tool_category?.name} />
            <Field label="ฝ่าย" value={tool.department} />
            <Field label="บริษัท" value={tool.company?.name} />
            <Field label="ยี่ห้อ" value={tool.brand} />
            <Field label="Serial Number" value={<span className="font-mono">{tool.serial_number}</span>} />
            <Field label="จำนวน" value={`${tool.current_quantity} ${tool.unit}`} />
            <Field label="ราคา/ชิ้น (บาท)" value={tool.unit_price?.toLocaleString()} />
            <Field label="คลัง/ตำแหน่งจัดเก็บ" value={tool.location?.name} />
            <Field label="ผู้จัดจำหน่าย" value={tool.supplier?.name} />
            <Field label="ผู้รับผิดชอบ" value={tool.responsible_person} />
            <Field label="ระยะเวลา PM" value={`${tool.pm_interval_days} วัน`} />
            <Field
              label="มีประกัน"
              value={tool.has_warranty ? <Badge variant="secondary">มีประกัน</Badge> : "ไม่มี"}
            />
            <Field label="วันหมดประกัน" value={tool.warranty_expiry_date} />
            <Field label="วันหมดอายุ" value={tool.expiry_date} />
            <Field label="วันที่นำเข้าคลัง" value={tool.warehouse_entry_date} />
            <Field
              label="ประเภท"
              value={
                <div className="flex flex-wrap gap-1">
                  {tool.is_asset && <Badge variant="secondary" className="text-xs">ทรัพย์สิน</Badge>}
                  {tool.is_personal_tool && <Badge className="bg-primary/80 text-primary-foreground text-xs">ประจำตัวช่าง</Badge>}
                  {!tool.is_asset && !tool.is_personal_tool && <span className="text-muted-foreground">-</span>}
                </div>
              }
            />
            {tool.is_asset && <Field label="เลขที่ทรัพย์สิน" value={tool.asset_code} />}
          </div>

          {(tool.description || tool.notes) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tool.description && <Field label="รายละเอียด" value={tool.description} />}
              {tool.notes && <Field label="หมายเหตุ" value={tool.notes} />}
            </div>
          )}

          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <div className="text-sm font-semibold text-primary">📷 รูปภาพ & 📎 เอกสารประกอบ</div>
            <div className="flex flex-wrap gap-2">
              <ToolImageViewer toolId={tool.id} toolName={tool.name} variant="button" />
              <ToolDocumentViewer toolId={tool.id} toolCode={tool.code} toolName={tool.name} />
              <span className="text-xs text-muted-foreground self-center">
                กดเพื่อดู/ดาวน์โหลดรูปภาพและเอกสาร
              </span>
            </div>
          </div>

          <div className="text-xs text-muted-foreground text-center border-t pt-3">
            หากต้องการแก้ไขข้อมูล ให้ไปที่ <strong>ข้อมูลหลัก → เครื่องมือ → รายการเครื่องมือ</strong>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
