import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Settings, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface Status {
  id: string;
  value: string;
  label: string;
}

interface StatusSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function StatusSelect({ value, onChange, disabled }: StatusSelectProps) {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Status | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ value: "", label: "" });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { fetchStatuses(); }, []);

  const fetchStatuses = async () => {
    const { data, error } = await supabase
      .from("media_player_statuses")
      .select("*")
      .eq("is_active", true)
      .order("label");
    if (!error) setStatuses(data || []);
  };

  const handleSave = async () => {
    if (!formData.label.trim()) { toast.error("กรุณากรอก Label"); return; }
    const val = formData.value.trim() || formData.label.trim().toLowerCase().replace(/\s+/g, "_");
    setIsLoading(true);
    try {
      if (editingItem) {
        const { error } = await supabase.from("media_player_statuses")
          .update({ label: formData.label, value: val })
          .eq("id", editingItem.id);
        if (error) throw error;
        toast.success("แก้ไข Status สำเร็จ");
      } else {
        const { error } = await supabase.from("media_player_statuses")
          .insert({ label: formData.label, value: val });
        if (error) throw error;
        toast.success("เพิ่ม Status สำเร็จ");
      }
      setFormData({ value: "", label: "" });
      setEditingItem(null);
      fetchStatuses();
    } catch { toast.error("เกิดข้อผิดพลาด"); }
    finally { setIsLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from("media_player_statuses")
        .update({ is_active: false }).eq("id", deleteId);
      if (error) throw error;
      toast.success("ลบ Status สำเร็จ");
      fetchStatuses();
    } catch { toast.error("ไม่สามารถลบได้"); }
    finally { setIsDeleteDialogOpen(false); setDeleteId(null); }
  };

  const options = statuses.map((s) => ({
    value: s.value,
    label: s.label,
  }));

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <SearchableSelect
          options={options}
          value={value}
          onValueChange={onChange}
          placeholder="เลือกสถานะ"
          searchPlaceholder="ค้นหาสถานะ..."
          emptyMessage="ไม่พบสถานะ"
          disabled={disabled}
        />
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" type="button"><Settings className="h-4 w-4" /></Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>จัดการ Status</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Label (ชื่อแสดง)</Label>
              <Input value={formData.label} onChange={(e) => setFormData({ ...formData, label: e.target.value })} placeholder="เช่น Active, Spare Online" />
            </div>
            <div className="space-y-2">
              <Label>Value (ค่าในระบบ - ถ้าไม่กรอกจะสร้างอัตโนมัติ)</Label>
              <Input value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} placeholder="เช่น active, spare_online" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isLoading} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                {editingItem ? "บันทึกการแก้ไข" : "เพิ่ม Status"}
              </Button>
              {editingItem && (
                <Button variant="outline" onClick={() => { setEditingItem(null); setFormData({ value: "", label: "" }); }}>ยกเลิก</Button>
              )}
            </div>
            <div className="border-t pt-4">
              <Label className="mb-2 block">Status ที่มีอยู่</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {statuses.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div>
                      <div className="font-medium">{s.label}</div>
                      <div className="text-xs text-muted-foreground">{s.value}</div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingItem(s); setFormData({ value: s.value, label: s.label }); }}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { setDeleteId(s.id); setIsDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>คุณต้องการลบ Status นี้หรือไม่?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>ลบ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
