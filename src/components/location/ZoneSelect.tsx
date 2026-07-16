import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface Zone {
  id: string;
  warehouse_id: string;
  code: string;
  name: string;
  description: string | null;
}

interface ZoneSelectProps {
  value?: string;
  onChange: (value: string) => void;
  warehouseId?: string;
  disabled?: boolean;
  allowNone?: boolean;
}

export function ZoneSelect({ value, onChange, warehouseId, disabled, allowNone = true }: ZoneSelectProps) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ code: "", name: "", description: "" });

  const fetchZones = async () => {
    if (!warehouseId) {
      setZones([]);
      return;
    }
    const { data, error } = await supabase
      .from("zones")
      .select("*")
      .eq("warehouse_id", warehouseId)
      .eq("is_active", true)
      .order("code");
    if (error) {
      toast.error("โหลดโซนไม่สำเร็จ");
      return;
    }
    setZones((data || []) as Zone[]);
  };

  useEffect(() => {
    fetchZones();
  }, [warehouseId]);

  const handleAdd = async () => {
    if (!draft.code.trim() || !draft.name.trim() || !warehouseId) {
      toast.error("กรุณาระบุรหัสและชื่อโซน");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("zones")
      .insert({
        warehouse_id: warehouseId,
        code: draft.code.trim(),
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        created_by: user?.id,
      })
      .select()
      .single();
    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
      return;
    }
    toast.success("เพิ่มโซนสำเร็จ");
    setDraft({ code: "", name: "", description: "" });
    setIsAdding(false);
    if (data) onChange(data.id);
    fetchZones();
  };

  const handleEdit = async () => {
    if (!editingZone || !editingZone.code.trim() || !editingZone.name.trim()) {
      toast.error("กรุณาระบุรหัสและชื่อโซน");
      return;
    }
    const { error } = await supabase
      .from("zones")
      .update({
        code: editingZone.code.trim(),
        name: editingZone.name.trim(),
        description: editingZone.description || null,
      })
      .eq("id", editingZone.id);
    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
      return;
    }
    toast.success("อัพเดทโซนสำเร็จ");
    setEditingZone(null);
    fetchZones();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("zones").update({ is_active: false }).eq("id", id);
    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
      return;
    }
    toast.success("ลบโซนสำเร็จ");
    setDeleteId(null);
    if (value === id) onChange("");
    fetchZones();
  };

  const options = zones.map((z) => ({
    value: z.id,
    label: `${z.code} · ${z.name}`,
    description: z.description || undefined,
  }));

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <SearchableSelect
          options={options}
          value={value || ""}
          onValueChange={onChange}
          placeholder={warehouseId ? (allowNone ? "เลือกโซน (ไม่บังคับ)" : "เลือกโซน") : "เลือกคลังก่อน"}
          searchPlaceholder="ค้นหาโซน..."
          emptyMessage="ยังไม่มีโซนในคลังนี้"
          disabled={disabled || !warehouseId}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="icon" disabled={!warehouseId}>
            <Settings className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>จัดการโซน</DialogTitle>
            <DialogDescription>เพิ่ม แก้ไข หรือลบโซนภายในคลังนี้</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!isAdding && !editingZone && (
              <Button onClick={() => setIsAdding(true)} className="w-full gap-2" type="button">
                <Plus className="h-4 w-4" />
                เพิ่มโซนใหม่
              </Button>
            )}

            {isAdding && (
              <div className="p-4 border rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>รหัสโซน *</Label>
                    <Input
                      value={draft.code}
                      onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                      placeholder="เช่น A"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ชื่อโซน *</Label>
                    <Input
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      placeholder="เช่น โซนซ้าย"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>รายละเอียด</Label>
                  <Input
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    placeholder="รายละเอียดเพิ่มเติม"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAdd} type="button">บันทึก</Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAdding(false);
                      setDraft({ code: "", name: "", description: "" });
                    }}
                    type="button"
                  >
                    ยกเลิก
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {zones.map((z) => (
                <div key={z.id} className="flex items-center justify-between p-3 border rounded-lg">
                  {editingZone?.id === z.id ? (
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={editingZone.code}
                          onChange={(e) => setEditingZone({ ...editingZone, code: e.target.value })}
                          placeholder="รหัส"
                        />
                        <Input
                          value={editingZone.name}
                          onChange={(e) => setEditingZone({ ...editingZone, name: e.target.value })}
                          placeholder="ชื่อ"
                        />
                      </div>
                      <Input
                        value={editingZone.description || ""}
                        onChange={(e) => setEditingZone({ ...editingZone, description: e.target.value })}
                        placeholder="รายละเอียด"
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleEdit} size="sm" type="button">บันทึก</Button>
                        <Button variant="outline" onClick={() => setEditingZone(null)} size="sm" type="button">
                          ยกเลิก
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="font-medium">
                          {z.code} · {z.name}
                        </p>
                        {z.description && <p className="text-sm text-muted-foreground">{z.description}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setEditingZone(z)} type="button">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(z.id)} type="button">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {zones.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">ยังไม่มีโซนในคลังนี้</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบโซน</AlertDialogTitle>
            <AlertDialogDescription>
              ตำแหน่งจัดเก็บที่ผูกกับโซนนี้จะกลายเป็น "ไม่มีโซน" — ต้องการดำเนินการต่อหรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>ลบ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
