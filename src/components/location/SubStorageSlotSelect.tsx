import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface SubStorageSlot {
  id: string;
  storage_slot_id: string;
  name: string;
  description: string | null;
}

interface SubStorageSlotSelectProps {
  value?: string;
  onChange: (value: string) => void;
  storageSlotId?: string;
  disabled?: boolean;
}

export function SubStorageSlotSelect({ value, onChange, storageSlotId, disabled }: SubStorageSlotSelectProps) {
  const [subSlots, setSubSlots] = useState<SubStorageSlot[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubSlot, setEditingSubSlot] = useState<SubStorageSlot | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteSubSlotId, setDeleteSubSlotId] = useState<string | null>(null);
  const [newSubSlot, setNewSubSlot] = useState({ name: "", description: "" });

  const fetchSubSlots = async () => {
    if (!storageSlotId) return;
    
    const { data, error } = await supabase
      .from("sub_storage_slots")
      .select("*")
      .eq("storage_slot_id", storageSlotId)
      .eq("is_active", true)
      .order("name");

    if (error) {
      toast.error("เกิดข้อผิดพลาดในการโหลดช่องย่อยจัดเก็บ");
      return;
    }

    setSubSlots(data || []);
  };

  useEffect(() => {
    fetchSubSlots();
  }, [storageSlotId]);

  const handleAdd = async () => {
    if (!newSubSlot.name.trim() || !storageSlotId) {
      toast.error("กรุณาระบุชื่อช่องย่อยจัดเก็บ");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase.from("sub_storage_slots").insert({
      storage_slot_id: storageSlotId,
      name: newSubSlot.name,
      description: newSubSlot.description || null,
      created_by: user.id,
    })
    .select()
    .single();

    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
      return;
    }

    toast.success("เพิ่มช่องย่อยจัดเก็บสำเร็จ");
    setNewSubSlot({ name: "", description: "" });
    setIsAdding(false);
    
    // Auto-select the newly created sub slot
    if (data) {
      onChange(data.id);
    }
    
    fetchSubSlots();
  };

  const handleEdit = async () => {
    if (!editingSubSlot || !editingSubSlot.name.trim()) {
      toast.error("กรุณาระบุชื่อช่องย่อยจัดเก็บ");
      return;
    }

    const { error } = await supabase
      .from("sub_storage_slots")
      .update({
        name: editingSubSlot.name,
        description: editingSubSlot.description || null,
      })
      .eq("id", editingSubSlot.id);

    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
      return;
    }

    toast.success("อัพเดทช่องย่อยจัดเก็บสำเร็จ");
    setEditingSubSlot(null);
    fetchSubSlots();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("sub_storage_slots")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
      return;
    }

    toast.success("ลบช่องย่อยจัดเก็บสำเร็จ");
    setDeleteSubSlotId(null);
    if (value === id) {
      onChange("");
    }
    fetchSubSlots();
  };

  return (
    <div className="flex gap-2">
      <Select value={value} onValueChange={onChange} disabled={disabled || !storageSlotId}>
        <SelectTrigger>
          <SelectValue placeholder={storageSlotId ? "เลือกช่องย่อยจัดเก็บ (ไม่บังคับ)" : "เลือกช่องจัดเก็บก่อน"} />
        </SelectTrigger>
        <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
          {subSlots.map((subSlot) => (
            <SelectItem key={subSlot.id} value={subSlot.id}>
              {subSlot.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={!storageSlotId}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>จัดการช่องย่อยจัดเก็บ</DialogTitle>
            <DialogDescription>
              เพิ่ม แก้ไข หรือลบช่องย่อยจัดเก็บ
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!isAdding && !editingSubSlot && (
              <Button
                onClick={() => setIsAdding(true)}
                className="w-full gap-2"
                type="button"
              >
                <Plus className="h-4 w-4" />
                เพิ่มช่องย่อยจัดเก็บใหม่
              </Button>
            )}

            {isAdding && (
              <div className="p-4 border rounded-lg space-y-3">
                <div className="space-y-2">
                  <Label>ชื่อช่องย่อยจัดเก็บ *</Label>
                  <Input
                    value={newSubSlot.name}
                    onChange={(e) =>
                      setNewSubSlot({ ...newSubSlot, name: e.target.value })
                    }
                    placeholder="เช่น ตู้ 1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>รายละเอียด</Label>
                  <Input
                    value={newSubSlot.description}
                    onChange={(e) =>
                      setNewSubSlot({ ...newSubSlot, description: e.target.value })
                    }
                    placeholder="รายละเอียดเพิ่มเติม"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAdd} type="button">บันทึก</Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAdding(false);
                      setNewSubSlot({ name: "", description: "" });
                    }}
                    type="button"
                  >
                    ยกเลิก
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {subSlots.map((subSlot) => (
                <div
                  key={subSlot.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  {editingSubSlot?.id === subSlot.id ? (
                    <div className="flex-1 space-y-2">
                      <Input
                        value={editingSubSlot.name}
                        onChange={(e) =>
                          setEditingSubSlot({
                            ...editingSubSlot,
                            name: e.target.value,
                          })
                        }
                      />
                      <Input
                        value={editingSubSlot.description || ""}
                        onChange={(e) =>
                          setEditingSubSlot({
                            ...editingSubSlot,
                            description: e.target.value,
                          })
                        }
                        placeholder="รายละเอียด"
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleEdit} size="sm" type="button">
                          บันทึก
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setEditingSubSlot(null)}
                          size="sm"
                          type="button"
                        >
                          ยกเลิก
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="font-medium">{subSlot.name}</p>
                        {subSlot.description && (
                          <p className="text-sm text-muted-foreground">
                            {subSlot.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingSubSlot(subSlot)}
                          type="button"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteSubSlotId(subSlot.id)}
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteSubSlotId}
        onOpenChange={() => setDeleteSubSlotId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ที่จะลบช่องย่อยจัดเก็บนี้?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSubSlotId && handleDelete(deleteSubSlotId)}
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
