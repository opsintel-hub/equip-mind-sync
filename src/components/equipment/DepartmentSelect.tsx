import { useState, useEffect } from "react";
import { Settings2, Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Department {
  id: string;
  name: string;
  description: string | null;
}

interface DepartmentSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function DepartmentSelect({ value, onChange, disabled }: DepartmentSelectProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const fetchDepartments = async () => {
    const { data, error } = await supabase
      .from("departments")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error fetching departments:", error);
      toast.error("ไม่สามารถโหลดข้อมูลฝ่ายได้");
    } else {
      setDepartments(data || []);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast.error("กรุณากรอกชื่อฝ่าย");
      return;
    }

    const { error } = await supabase
      .from("departments")
      .insert({ name: newName.trim(), description: newDescription.trim() || null });

    if (error) {
      console.error("Error adding department:", error);
      toast.error("ไม่สามารถเพิ่มฝ่ายได้");
    } else {
      toast.success("เพิ่มฝ่ายสำเร็จ");
      setNewName("");
      setNewDescription("");
      setIsAdding(false);
      fetchDepartments();
    }
  };

  const handleEdit = async () => {
    if (!editName.trim()) {
      toast.error("กรุณากรอกชื่อฝ่าย");
      return;
    }

    const { error } = await supabase
      .from("departments")
      .update({ name: editName.trim(), description: editDescription.trim() || null })
      .eq("id", editingId);

    if (error) {
      console.error("Error updating department:", error);
      toast.error("ไม่สามารถแก้ไขฝ่ายได้");
    } else {
      toast.success("แก้ไขฝ่ายสำเร็จ");
      setEditingId(null);
      setEditName("");
      setEditDescription("");
      fetchDepartments();
    }
  };

  const handleDelete = async () => {
    const { error } = await supabase
      .from("departments")
      .update({ is_active: false })
      .eq("id", deleteId);

    if (error) {
      console.error("Error deleting department:", error);
      toast.error("ไม่สามารถลบฝ่ายได้");
    } else {
      toast.success("ลบฝ่ายสำเร็จ");
      setDeleteId(null);
      fetchDepartments();
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="เลือกฝ่าย" />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.name}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>จัดการฝ่าย</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!isAdding ? (
              <Button onClick={() => setIsAdding(true)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มฝ่าย
              </Button>
            ) : (
              <div className="border rounded-lg p-4 space-y-3">
                <Input
                  placeholder="ชื่อฝ่าย"
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
              {departments.map((dept) => (
                <div key={dept.id} className="border rounded-lg p-3">
                  {editingId === dept.id ? (
                    <div className="space-y-3">
                      <Input
                        placeholder="ชื่อฝ่าย"
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
                        <div className="font-medium">{dept.name}</div>
                        {dept.description && (
                          <div className="text-sm text-muted-foreground">{dept.description}</div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingId(dept.id);
                            setEditName(dept.name);
                            setEditDescription(dept.description || "");
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(dept.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบฝ่ายนี้?
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
