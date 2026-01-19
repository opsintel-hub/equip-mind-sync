import { useState, useEffect } from "react";
import { Settings2, Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Unit {
  id: string;
  name: string;
  description: string | null;
}

interface UnitSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function UnitSelect({ value, onChange, disabled }: UnitSelectProps) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const fetchUnits = async () => {
    const { data, error } = await supabase
      .from("units")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error fetching units:", error);
      toast.error("ไม่สามารถโหลดข้อมูลหน่วยนับได้");
    } else {
      setUnits(data || []);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast.error("กรุณากรอกชื่อหน่วยนับ");
      return;
    }

    const { error } = await supabase
      .from("units")
      .insert({ 
        name: newName.trim(), 
        description: newDescription.trim() || null 
      });

    if (error) {
      console.error("Error adding unit:", error);
      if (error.code === '23505') {
        toast.error("หน่วยนับนี้มีอยู่แล้วในระบบ");
      } else {
        toast.error("ไม่สามารถเพิ่มหน่วยนับได้");
      }
    } else {
      toast.success("เพิ่มหน่วยนับสำเร็จ");
      setNewName("");
      setNewDescription("");
      setIsAdding(false);
      fetchUnits();
    }
  };

  const handleEdit = async () => {
    if (!editName.trim()) {
      toast.error("กรุณากรอกชื่อหน่วยนับ");
      return;
    }

    const { error } = await supabase
      .from("units")
      .update({ 
        name: editName.trim(), 
        description: editDescription.trim() || null 
      })
      .eq("id", editingId);

    if (error) {
      console.error("Error updating unit:", error);
      if (error.code === '23505') {
        toast.error("หน่วยนับนี้มีอยู่แล้วในระบบ");
      } else {
        toast.error("ไม่สามารถแก้ไขหน่วยนับได้");
      }
    } else {
      toast.success("แก้ไขหน่วยนับสำเร็จ");
      setEditingId(null);
      setEditName("");
      setEditDescription("");
      fetchUnits();
    }
  };

  const handleDelete = async () => {
    const { error } = await supabase
      .from("units")
      .update({ is_active: false })
      .eq("id", deleteId);

    if (error) {
      console.error("Error deleting unit:", error);
      toast.error("ไม่สามารถลบหน่วยนับได้");
    } else {
      toast.success("ลบหน่วยนับสำเร็จ");
      setDeleteId(null);
      if (value) {
        const deletedUnit = units.find(u => u.id === deleteId);
        if (deletedUnit && deletedUnit.name === value) {
          onChange("");
        }
      }
      fetchUnits();
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <div className="flex-1">
          <Select value={value} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกหน่วยนับ" />
            </SelectTrigger>
            <SelectContent className="z-[9999]" position="popper" sideOffset={4}>
              {units.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  ยังไม่มีหน่วยนับ กรุณาเพิ่มจากปุ่มด้านขวา
                </div>
              ) : (
                units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.name}>
                    {unit.name}
                    {unit.description && (
                      <span className="text-muted-foreground text-xs ml-2">
                        ({unit.description})
                      </span>
                    )}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setIsManageOpen(true)}
          disabled={disabled}
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>จัดการหน่วยนับ</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!isAdding ? (
              <Button onClick={() => setIsAdding(true)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มหน่วยนับ
              </Button>
            ) : (
              <div className="border rounded-lg p-4 space-y-3">
                <Input
                  placeholder="ชื่อหน่วยนับ เช่น ชิ้น, เมตร, กล่อง"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <Input
                  placeholder="รายละเอียด (ไม่บังคับ)"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button onClick={handleAdd} className="flex-1">บันทึก</Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAdding(false);
                      setNewName("");
                      setNewDescription("");
                    }}
                    className="flex-1"
                  >
                    ยกเลิก
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {units.map((unit) => (
                <div key={unit.id} className="border rounded-lg p-3">
                  {editingId === unit.id ? (
                    <div className="space-y-3">
                      <Input
                        placeholder="ชื่อหน่วยนับ"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                      <Input
                        placeholder="รายละเอียด"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleEdit} size="sm" className="flex-1">
                          บันทึก
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingId(null);
                            setEditName("");
                            setEditDescription("");
                          }}
                          size="sm"
                          className="flex-1"
                        >
                          ยกเลิก
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{unit.name}</div>
                        {unit.description && (
                          <div className="text-sm text-muted-foreground">{unit.description}</div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingId(unit.id);
                            setEditName(unit.name);
                            setEditDescription(unit.description || "");
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(unit.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {units.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  ยังไม่มีหน่วยนับ กรุณาเพิ่มหน่วยนับใหม่
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบหน่วยนับนี้?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>ลบ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
