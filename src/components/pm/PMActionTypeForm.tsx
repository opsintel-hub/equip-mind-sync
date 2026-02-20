import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PMActionType {
  id?: string;
  name: string;
  code: string;
  is_snooze: boolean;
  snooze_days: number | null;
  is_active: boolean;
  sort_order: number;
}

interface PMActionTypeFormProps {
  editItem?: PMActionType | null;
  onSuccess: () => void;
  onClose?: () => void;
}

export function PMActionTypeForm({ editItem, onSuccess, onClose }: PMActionTypeFormProps) {
  const [open, setOpen] = useState(!!editItem);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<PMActionType>({
    name: "",
    code: "",
    is_snooze: false,
    snooze_days: null,
    is_active: true,
    sort_order: 10,
  });

  useEffect(() => {
    if (editItem) {
      setForm(editItem);
      setOpen(true);
    }
  }, [editItem]);

  const handleSubmit = async () => {
    if (!form.name || !form.code) {
      toast.error("กรุณากรอกชื่อและ Code");
      return;
    }
    setLoading(true);
    try {
      if (editItem?.id) {
        const { error } = await supabase
          .from("pm_action_types")
          .update(form)
          .eq("id", editItem.id);
        if (error) throw error;
        toast.success("แก้ไขสำเร็จ");
      } else {
        const { error } = await supabase
          .from("pm_action_types")
          .insert(form);
        if (error) throw error;
        toast.success("เพิ่ม Action สำเร็จ");
      }
      handleClose();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setForm({ name: "", code: "", is_snooze: false, snooze_days: null, is_active: true, sort_order: 10 });
    onClose?.();
  };

  return (
    <>
      {!editItem && (
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          เพิ่ม Action
        </Button>
      )}

      <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "แก้ไข PM Action" : "เพิ่ม PM Action"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ชื่อ Action *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="เช่น นำไปสร้างตั๋วใหม่..."
              />
            </div>

            <div className="space-y-2">
              <Label>Code * (ภาษาอังกฤษ ไม่มีช่องว่าง)</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase().replace(/\s/g, "_") })}
                placeholder="เช่น create_ticket"
                disabled={!!editItem}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={form.is_snooze}
                onCheckedChange={(v) => setForm({ ...form, is_snooze: v, snooze_days: v ? 30 : null })}
              />
              <Label>เป็น Action ซ่อนชั่วคราว (Snooze)</Label>
            </div>

            {form.is_snooze && (
              <div className="space-y-2">
                <Label>จำนวนวันที่ซ่อน</Label>
                <Select
                  value={form.snooze_days?.toString() || "30"}
                  onValueChange={(v) => setForm({ ...form, snooze_days: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 วัน</SelectItem>
                    <SelectItem value="60">60 วัน</SelectItem>
                    <SelectItem value="90">90 วัน</SelectItem>
                    <SelectItem value="120">120 วัน</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>ลำดับการแสดง</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label>เปิดใช้งาน</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={loading}>ยกเลิก</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
