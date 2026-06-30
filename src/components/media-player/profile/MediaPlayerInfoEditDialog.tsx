import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MediaPlayerRow } from "./types";
import { SubMediaTypeSelect } from "@/components/media-player/SubMediaTypeSelect";
import { requiresSubMediaType } from "@/lib/mediaPlayerSubTypes";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: MediaPlayerRow;
  onSaved: () => void;
}

type FormState = {
  name: string;
  description: string;
  brand: string;
  specification: string;
  serial_number_1: string;
  serial_number_2: string;
  remote_name: string;
  activate_windows: string;
  asset_caretaker: string;
  planned_install_location: string;
  asset_code: string;
  equipment_id_code: string;
  order_for_project: string;
  po_number: string;
  pr_number: string;
  invoice_number: string;
  delivery_note_number: string;
  unit_price: string;
  depreciation_months: string;
  usage_lifespan_months: string;
  date_of_receipt: string;
  warranty_expiry_date: string;
  warranty_years: string;
  po_item_no: string;
  notes: string;
  sub_media_type: string | null;
};

function init(p: MediaPlayerRow): FormState {
  return {
    name: p.name || "",
    description: (p as any).description || "",
    brand: p.brand || "",
    specification: p.specification || "",
    serial_number_1: p.serial_number_1 || "",
    serial_number_2: p.serial_number_2 || "",
    remote_name: p.remote_name || "",
    activate_windows: p.activate_windows || "",
    asset_caretaker: p.asset_caretaker || "",
    planned_install_location: p.planned_install_location || "",
    asset_code: p.asset_code || "",
    equipment_id_code: p.equipment_id_code || "",
    order_for_project: p.order_for_project || "",
    po_number: p.po_number || "",
    pr_number: p.pr_number || "",
    invoice_number: p.invoice_number || "",
    delivery_note_number: (p as any).delivery_note_number || "",
    unit_price: p.unit_price?.toString() || "",
    depreciation_months: p.depreciation_months?.toString() || "",
    usage_lifespan_months: p.usage_lifespan_months?.toString() || "",
    date_of_receipt: p.date_of_receipt || "",
    warranty_expiry_date: p.warranty_expiry_date || "",
    warranty_years: p.warranty_years != null ? String(p.warranty_years) : "",
    po_item_no: p.po_item_no || "",
    notes: p.notes || "",
    sub_media_type: p.sub_media_type ?? null,
  };
}

export function MediaPlayerInfoEditDialog({ open, onOpenChange, player, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(() => init(player));
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setForm(init(player)); }, [open, player]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const toNull = (s: string) => (s.trim() ? s.trim() : null);
  const toNum = (s: string) => { const n = parseFloat(s); return Number.isFinite(n) ? n : null; };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        name: form.name.trim() || player.name,
        description: toNull(form.description),
        brand: toNull(form.brand),
        specification: toNull(form.specification),
        serial_number_1: toNull(form.serial_number_1),
        serial_number_2: toNull(form.serial_number_2),
        remote_name: toNull(form.remote_name),
        activate_windows: toNull(form.activate_windows),
        asset_caretaker: toNull(form.asset_caretaker),
        planned_install_location: toNull(form.planned_install_location),
        asset_code: toNull(form.asset_code),
        equipment_id_code: toNull(form.equipment_id_code),
        order_for_project: toNull(form.order_for_project),
        po_number: toNull(form.po_number),
        pr_number: toNull(form.pr_number),
        invoice_number: toNull(form.invoice_number),
        delivery_note_number: toNull(form.delivery_note_number),
        unit_price: toNum(form.unit_price),
        depreciation_months: toNum(form.depreciation_months),
        usage_lifespan_months: toNum(form.usage_lifespan_months),
        date_of_receipt: toNull(form.date_of_receipt),
        warranty_expiry_date: toNull(form.warranty_expiry_date),
        warranty_years: toNum(form.warranty_years),
        po_item_no: toNull(form.po_item_no),
        notes: toNull(form.notes),
        sub_media_type: requiresSubMediaType(player.department) ? form.sub_media_type : null,
      };
      if (requiresSubMediaType(player.department) && !form.sub_media_type) {
        toast.error("ฝ่าย 7-Eleven Media: กรุณาเลือก Sub Media Type");
        setSaving(false);
        return;
      }
      
      const { error } = await supabase.from("media_players").update(payload).eq("id", player.id);
      if (error) throw error;
      toast.success("บันทึกข้อมูลเรียบร้อย");
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast.error("บันทึกไม่สำเร็จ: " + (e?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>แก้ไขข้อมูล Media Player</DialogTitle>
          <DialogDescription>
            เฉพาะเจ้าหน้าที่คลังเท่านั้น • รหัส ({player.code}) และ จำนวนคงคลังแก้ไขที่นี่ไม่ได้
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Identity */}
          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-primary">ข้อมูลทั่วไป</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>ชื่อสินค้า</Label><Input value={form.name} onChange={set("name")} /></div>
              <div className="space-y-1.5"><Label>ยี่ห้อ</Label><Input value={form.brand} onChange={set("brand")} /></div>
              <div className="md:col-span-2 space-y-1.5"><Label>รายละเอียด (Description)</Label><Textarea value={form.description} onChange={set("description")} rows={2} /></div>
              <div className="md:col-span-2 space-y-1.5"><Label>Specification</Label><Textarea value={form.specification} onChange={set("specification")} rows={2} /></div>
              <div className="space-y-1.5"><Label>S/N 1</Label><Input value={form.serial_number_1} onChange={set("serial_number_1")} /></div>
              <div className="space-y-1.5"><Label>S/N 2</Label><Input value={form.serial_number_2} onChange={set("serial_number_2")} /></div>
              <div className="space-y-1.5"><Label>Remote Name</Label><Input value={form.remote_name} onChange={set("remote_name")} /></div>
              <div className="space-y-1.5"><Label>Activate Windows</Label><Input value={form.activate_windows} onChange={set("activate_windows")} /></div>
            </div>
          </section>

          {/* Asset */}
          <section className="space-y-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <h4 className="text-sm font-semibold text-primary">ข้อมูลทรัพย์สิน</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>ผู้ดูแลทรัพย์สิน</Label><Input value={form.asset_caretaker} onChange={set("asset_caretaker")} /></div>
              <div className="space-y-1.5"><Label>Location ตามแผน PO</Label><Input value={form.planned_install_location} onChange={set("planned_install_location")} /></div>
              <div className="space-y-1.5"><Label>รหัสทรัพย์สิน</Label><Input value={form.asset_code} onChange={set("asset_code")} /></div>
              <div className="space-y-1.5"><Label>Equipment ID</Label><Input value={form.equipment_id_code} onChange={set("equipment_id_code")} /></div>
              <div className="md:col-span-2 space-y-1.5"><Label>Order For Project</Label><Input value={form.order_for_project} onChange={set("order_for_project")} /></div>
              {requiresSubMediaType(player.department) && (
                <div className="md:col-span-2">
                  <SubMediaTypeSelect
                    value={form.sub_media_type}
                    onChange={(v) => setForm((prev) => ({ ...prev, sub_media_type: v }))}
                    required
                    hint={`ฝ่าย ${player.department} ต้องระบุตำแหน่งสื่อย่อย`}
                  />
                </div>
              )}
            </div>
          </section>

          {/* Pricing & lifespan */}
          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-primary">ราคา & อายุการใช้งาน</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>ราคา (บาท)</Label><Input type="number" value={form.unit_price} onChange={set("unit_price")} /></div>
              <div className="space-y-1.5"><Label>ค่าเสื่อม (เดือน)</Label><Input type="number" value={form.depreciation_months} onChange={set("depreciation_months")} /></div>
              <div className="space-y-1.5"><Label>อายุใช้งาน (เดือน)</Label><Input type="number" value={form.usage_lifespan_months} onChange={set("usage_lifespan_months")} /></div>
              <div className="space-y-1.5"><Label>วันที่รับเข้าคลัง</Label><Input type="date" value={form.date_of_receipt} onChange={set("date_of_receipt")} /></div>
              <div className="space-y-1.5"><Label>วันหมดประกัน</Label><Input type="date" value={form.warranty_expiry_date} onChange={set("warranty_expiry_date")} /></div>
              <div className="space-y-1.5"><Label>ระยะรับประกัน (ปี)</Label><Input type="number" step="0.5" value={form.warranty_years} onChange={set("warranty_years")} /></div>
            </div>
          </section>

          {/* Documents */}
          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-primary">เลขที่เอกสาร</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Item No. (PO)</Label><Input value={form.po_item_no} onChange={set("po_item_no")} placeholder="เช่น DG-A03001-F001" /></div>
              <div className="space-y-1.5"><Label>PO No.</Label><Input value={form.po_number} onChange={set("po_number")} /></div>
              <div className="space-y-1.5"><Label>PR No.</Label><Input value={form.pr_number} onChange={set("pr_number")} /></div>
              <div className="space-y-1.5"><Label>Invoice No.</Label><Input value={form.invoice_number} onChange={set("invoice_number")} /></div>
            </div>
          </section>

          <div className="space-y-1.5">
            <Label>หมายเหตุ</Label>
            <Textarea value={form.notes} onChange={set("notes")} rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>ยกเลิก</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "กำลังบันทึก..." : "บันทึก"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
