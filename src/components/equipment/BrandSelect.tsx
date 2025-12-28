import { useState, useEffect } from "react";
import { Settings2, Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Brand {
  id: string;
  name: string;
  description: string | null;
}

interface BrandSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function BrandSelect({ value, onChange, disabled }: BrandSelectProps) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const fetchBrands = async () => {
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error fetching brands:", error);
      toast.error("ไม่สามารถโหลดข้อมูลยี่ห้อได้");
    } else {
      setBrands(data || []);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast.error("กรุณากรอกชื่อยี่ห้อ");
      return;
    }

    const { error } = await supabase
      .from("brands")
      .insert({ name: newName.trim(), description: newDescription.trim() || null });

    if (error) {
      console.error("Error adding brand:", error);
      toast.error("ไม่สามารถเพิ่มยี่ห้อได้");
    } else {
      toast.success("เพิ่มยี่ห้อสำเร็จ");
      setNewName("");
      setNewDescription("");
      setIsAdding(false);
      fetchBrands();
    }
  };

  const handleEdit = async () => {
    if (!editName.trim()) {
      toast.error("กรุณากรอกชื่อยี่ห้อ");
      return;
    }

    const { error } = await supabase
      .from("brands")
      .update({ name: editName.trim(), description: editDescription.trim() || null })
      .eq("id", editingId);

    if (error) {
      console.error("Error updating brand:", error);
      toast.error("ไม่สามารถแก้ไขยี่ห้อได้");
    } else {
      toast.success("แก้ไขยี่ห้อสำเร็จ");
      setEditingId(null);
      setEditName("");
      setEditDescription("");
      fetchBrands();
    }
  };

  const handleDelete = async () => {
    const { error } = await supabase
      .from("brands")
      .update({ is_active: false })
      .eq("id", deleteId);

    if (error) {
      console.error("Error deleting brand:", error);
      toast.error("ไม่สามารถลบยี่ห้อได้");
    } else {
      toast.success("ลบยี่ห้อสำเร็จ");
      setDeleteId(null);
      fetchBrands();
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="เลือกยี่ห้อ" />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
            {brands.map((brand) => (
              <SelectItem key={brand.id} value={brand.name}>
                {brand.name}
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
            <DialogTitle>จัดการยี่ห้อ</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!isAdding ? (
              <Button onClick={() => setIsAdding(true)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มยี่ห้อ
              </Button>
            ) : (
              <div className="border rounded-lg p-4 space-y-3">
                <Input
                  placeholder="ชื่อยี่ห้อ"
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
              {brands.map((brand) => (
                <div key={brand.id} className="border rounded-lg p-3">
                  {editingId === brand.id ? (
                    <div className="space-y-3">
                      <Input
                        placeholder="ชื่อยี่ห้อ"
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
                        <div className="font-medium">{brand.name}</div>
                        {brand.description && (
                          <div className="text-sm text-muted-foreground">{brand.description}</div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingId(brand.id);
                            setEditName(brand.name);
                            setEditDescription(brand.description || "");
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(brand.id)}
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
              คุณแน่ใจหรือไม่ว่าต้องการลบยี่ห้อนี้?
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
