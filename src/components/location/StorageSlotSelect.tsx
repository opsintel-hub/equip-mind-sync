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

interface StorageSlot {
  id: string;
  location_id: string;
  name: string;
  description: string | null;
}

interface StorageSlotSelectProps {
  value?: string;
  onChange: (value: string) => void;
  locationId?: string;
  disabled?: boolean;
}

export function StorageSlotSelect({ value, onChange, locationId, disabled }: StorageSlotSelectProps) {
  const [slots, setSlots] = useState<StorageSlot[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<StorageSlot | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteSlotId, setDeleteSlotId] = useState<string | null>(null);
  const [newSlot, setNewSlot] = useState({ name: "", description: "" });

  const fetchSlots = async () => {
    if (!locationId) return;
    
    const { data, error } = await supabase
      .from("storage_slots")
      .select("*")
      .eq("location_id", locationId)
      .eq("is_active", true)
      .order("name");

    if (error) {
      toast.error("เกิดข้อผิดพลาดในการโหลดช่องจัดเก็บ");
      return;
    }

    setSlots(data || []);
  };

  useEffect(() => {
    fetchSlots();
  }, [locationId]);

  const handleAdd = async () => {
    if (!newSlot.name.trim() || !locationId) {
      toast.error("กรุณาระบุชื่อช่องจัดเก็บ");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase.from("storage_slots").insert({
      location_id: locationId,
      name: newSlot.name,
      description: newSlot.description || null,
      created_by: user.id,
    })
    .select()
    .single();

    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
      return;
    }

    toast.success("เพิ่มช่องจัดเก็บสำเร็จ");
    setNewSlot({ name: "", description: "" });
    setIsAdding(false);
    
    // Auto-select the newly created slot
    if (data) {
      onChange(data.id);
    }
    
    fetchSlots();
  };

  const handleEdit = async () => {
    if (!editingSlot || !editingSlot.name.trim()) {
      toast.error("กรุณาระบุชื่อช่องจัดเก็บ");
      return;
    }

    const { error } = await supabase
      .from("storage_slots")
      .update({
        name: editingSlot.name,
        description: editingSlot.description || null,
      })
      .eq("id", editingSlot.id);

    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
      return;
    }

    toast.success("อัพเดทช่องจัดเก็บสำเร็จ");
    setEditingSlot(null);
    fetchSlots();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("storage_slots")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
      return;
    }

    toast.success("ลบช่องจัดเก็บสำเร็จ");
    setDeleteSlotId(null);
    if (value === id) {
      onChange("");
    }
    fetchSlots();
  };

  const options = slots.map((slot) => ({
    value: slot.id,
    label: slot.name,
    description: slot.description || undefined,
  }));

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <SearchableSelect
          options={options}
          value={value || ""}
          onValueChange={onChange}
          placeholder={locationId ? "เลือกช่องจัดเก็บ" : "เลือกตำแหน่งก่อน"}
          searchPlaceholder="ค้นหาช่องจัดเก็บ..."
          emptyMessage="ไม่พบช่องจัดเก็บ"
          disabled={disabled || !locationId}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={!locationId}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>จัดการช่องจัดเก็บ</DialogTitle>
            <DialogDescription>
              เพิ่ม แก้ไข หรือลบช่องจัดเก็บ
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!isAdding && !editingSlot && (
              <Button
                onClick={() => setIsAdding(true)}
                className="w-full gap-2"
                type="button"
              >
                <Plus className="h-4 w-4" />
                เพิ่มช่องจัดเก็บใหม่
              </Button>
            )}

            {isAdding && (
              <div className="p-4 border rounded-lg space-y-3">
                <div className="space-y-2">
                  <Label>Label / ชื่อ สำหรับจัดเก็บ *</Label>
                  <Input
                    value={newSlot.name}
                    onChange={(e) =>
                      setNewSlot({ ...newSlot, name: e.target.value })
                    }
                    placeholder="เช่น ชั้น A"
                  />
                </div>
                <div className="space-y-2">
                  <Label>รายละเอียด</Label>
                  <Input
                    value={newSlot.description}
                    onChange={(e) =>
                      setNewSlot({ ...newSlot, description: e.target.value })
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
                      setNewSlot({ name: "", description: "" });
                    }}
                    type="button"
                  >
                    ยกเลิก
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  {editingSlot?.id === slot.id ? (
                    <div className="flex-1 space-y-2">
                      <Input
                        value={editingSlot.name}
                        onChange={(e) =>
                          setEditingSlot({
                            ...editingSlot,
                            name: e.target.value,
                          })
                        }
                      />
                      <Input
                        value={editingSlot.description || ""}
                        onChange={(e) =>
                          setEditingSlot({
                            ...editingSlot,
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
                          onClick={() => setEditingSlot(null)}
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
                        <p className="font-medium">{slot.name}</p>
                        {slot.description && (
                          <p className="text-sm text-muted-foreground">
                            {slot.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingSlot(slot)}
                          type="button"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteSlotId(slot.id)}
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
        open={!!deleteSlotId}
        onOpenChange={() => setDeleteSlotId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ที่จะลบช่องจัดเก็บนี้?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSlotId && handleDelete(deleteSlotId)}
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
