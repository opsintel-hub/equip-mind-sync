import { useState, useEffect } from "react";
import { Settings, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  description: string | null;
}

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function CategorySelect({ value, onChange, disabled }: CategorySelectProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [manageOpen, setManageOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("ไม่สามารถโหลดหมวดหมู่ได้");
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("กรุณากรอกชื่อหมวดหมู่");
      return;
    }

    setIsLoading(true);
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from("categories")
          .update({ name: formData.name, description: formData.description || null })
          .eq("id", editingCategory.id);

        if (error) throw error;
        toast.success("แก้ไขหมวดหมู่สำเร็จ");
      } else {
        const { error } = await supabase
          .from("categories")
          .insert({ name: formData.name, description: formData.description || null });

        if (error) throw error;
        toast.success("เพิ่มหมวดหมู่สำเร็จ");
      }

      setFormData({ name: "", description: "" });
      setEditingCategory(null);
      await fetchCategories();
    } catch (error: any) {
      console.error("Error saving category:", error);
      toast.error(error.message || "บันทึกหมวดหมู่ไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCategory) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("categories")
        .update({ is_active: false })
        .eq("id", deleteCategory.id);

      if (error) throw error;
      toast.success("ลบหมวดหมู่สำเร็จ");
      setDeleteCategory(null);
      await fetchCategories();
    } catch (error: any) {
      console.error("Error deleting category:", error);
      toast.error(error.message || "ลบหมวดหมู่ไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, description: category.description || "" });
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    setFormData({ name: "", description: "" });
  };

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder="เลือกหมวดหมู่" />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={4} className="bg-background z-[9999] max-h-60 overflow-y-auto">
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.name}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="icon" disabled={disabled}>
            <Settings className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>จัดการหมวดหมู่</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold">
                {editingCategory ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่ใหม่"}
              </h3>
              <div className="space-y-2">
                <Label>ชื่อหมวดหมู่ *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เครื่องมือ, วัสดุ, อะไหล่..."
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>คำอธิบาย</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="คำอธิบายเพิ่มเติม..."
                  disabled={isLoading}
                />
              </div>
              <div className="flex gap-2 justify-end">
                {editingCategory && (
                  <Button type="button" variant="outline" onClick={cancelEdit} disabled={isLoading}>
                    ยกเลิก
                  </Button>
                )}
                <Button type="button" onClick={handleSave} disabled={isLoading}>
                  <Plus className="h-4 w-4 mr-2" />
                  {editingCategory ? "บันทึก" : "เพิ่ม"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">รายการหมวดหมู่</h3>
              <div className="border rounded-lg divide-y">
                {categories.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">ไม่มีหมวดหมู่</div>
                ) : (
                  categories.map((category) => (
                    <div key={category.id} className="p-3 flex items-center justify-between hover:bg-accent">
                      <div>
                        <div className="font-medium">{category.name}</div>
                        {category.description && (
                          <div className="text-sm text-muted-foreground">{category.description}</div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(category)}
                          disabled={isLoading}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteCategory(category)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteCategory} onOpenChange={(open) => !open && setDeleteCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบหมวดหมู่</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบหมวดหมู่ "{deleteCategory?.name}" ใช่หรือไม่?
              <br />
              การลบหมวดหมู่จะไม่ส่งผลกระทบต่ออุปกรณ์ที่มีอยู่
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isLoading}>
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
