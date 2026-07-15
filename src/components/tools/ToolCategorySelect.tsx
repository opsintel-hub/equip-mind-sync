import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
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
import { Plus, Settings, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface ToolCategory {
  id: string;
  name: string;
  description: string | null;
}

interface ToolCategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hideManage?: boolean;
}

export function ToolCategorySelect({ value, onChange, disabled, hideManage }: ToolCategorySelectProps) {

  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ToolCategory | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("tool_categories")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) {
      toast.error("ไม่สามารถโหลดหมวดหมู่เครื่องมือได้");
      return;
    }
    setCategories(data || []);
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
          .from("tool_categories")
          .update({ name: formData.name, description: formData.description })
          .eq("id", editingCategory.id);

        if (error) throw error;
        toast.success("แก้ไขหมวดหมู่สำเร็จ");
      } else {
        const { error } = await supabase
          .from("tool_categories")
          .insert({ name: formData.name, description: formData.description });

        if (error) throw error;
        toast.success("เพิ่มหมวดหมู่สำเร็จ");
      }

      setFormData({ name: "", description: "" });
      setEditingCategory(null);
      fetchCategories();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("tool_categories")
        .update({ is_active: false })
        .eq("id", deleteId);

      if (error) throw error;
      toast.success("ลบหมวดหมู่สำเร็จ");
      fetchCategories();
    } catch (error) {
      toast.error("ไม่สามารถลบหมวดหมู่ได้");
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteId(null);
    }
  };

  const startEdit = (category: ToolCategory) => {
    setEditingCategory(category);
    setFormData({ name: category.name, description: category.description || "" });
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    setFormData({ name: "", description: "" });
  };

  const options = categories.map((category) => ({
    value: category.id,
    label: category.name,
    description: category.description || undefined,
  }));

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <SearchableSelect
          options={options}
          value={value}
          onValueChange={onChange}
          placeholder="เลือกหมวดหมู่เครื่องมือ"
          searchPlaceholder="ค้นหาหมวดหมู่..."
          emptyMessage="ไม่พบหมวดหมู่"
          disabled={disabled}
        />
      </div>

      {!hideManage && (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" type="button">
            <Settings className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>จัดการหมวดหมู่เครื่องมือ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ชื่อหมวดหมู่</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="กรอกชื่อหมวดหมู่"
              />
            </div>
            <div className="space-y-2">
              <Label>รายละเอียด</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="กรอกรายละเอียด (ถ้ามี)"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isLoading} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                {editingCategory ? "บันทึกการแก้ไข" : "เพิ่มหมวดหมู่"}
              </Button>
              {editingCategory && (
                <Button variant="outline" onClick={cancelEdit}>
                  ยกเลิก
                </Button>
              )}
            </div>

            <div className="border-t pt-4">
              <Label className="mb-2 block">หมวดหมู่ที่มีอยู่</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-2 bg-muted rounded"
                  >
                    <div>
                      <div className="font-medium">{category.name}</div>
                      {category.description && (
                        <div className="text-sm text-muted-foreground">
                          {category.description}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeleteId(category.id);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      )}


      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบหมวดหมู่นี้หรือไม่?
            </AlertDialogDescription>
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
