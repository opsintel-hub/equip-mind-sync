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

interface Subcategory {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
}

interface Category {
  id: string;
  name: string;
}

interface SubcategorySelectProps {
  categoryName: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function SubcategorySelect({ categoryName, value, onChange, disabled }: SubcategorySelectProps) {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [manageOpen, setManageOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [deleteSubcategory, setDeleteSubcategory] = useState<Subcategory | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", category_id: "" });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (categoryName) {
      fetchSubcategories(categoryName);
    } else {
      setSubcategories([]);
    }
  }, [categoryName]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchSubcategories = async (catName: string) => {
    try {
      const { data: categoryData, error: catError } = await supabase
        .from("categories")
        .select("id")
        .eq("name", catName)
        .eq("is_active", true)
        .maybeSingle();

      if (catError) throw catError;
      
      if (!categoryData) {
        setSubcategories([]);
        return;
      }

      const { data, error } = await supabase
        .from("subcategories")
        .select("*")
        .eq("category_id", categoryData.id)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setSubcategories(data || []);
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      setSubcategories([]);
    }
  };

  const fetchAllSubcategories = async () => {
    try {
      const { data, error } = await supabase
        .from("subcategories")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching all subcategories:", error);
      return [];
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("กรุณากรอกชื่อหมวดหมู่ย่อย");
      return;
    }
    if (!formData.category_id) {
      toast.error("กรุณาเลือกหมวดหมู่หลัก");
      return;
    }

    setIsLoading(true);
    try {
      if (editingSubcategory) {
        const { error } = await supabase
          .from("subcategories")
          .update({
            name: formData.name,
            description: formData.description || null,
            category_id: formData.category_id,
          })
          .eq("id", editingSubcategory.id);

        if (error) throw error;
        toast.success("แก้ไขหมวดหมู่ย่อยสำเร็จ");
      } else {
        const { error } = await supabase
          .from("subcategories")
          .insert({
            name: formData.name,
            description: formData.description || null,
            category_id: formData.category_id,
          });

        if (error) throw error;
        toast.success("เพิ่มหมวดหมู่ย่อยสำเร็จ");
      }

      setFormData({ name: "", description: "", category_id: "" });
      setEditingSubcategory(null);
      
      // Refresh the list in manage dialog
      const allSubs = await fetchAllSubcategories();
      setSubcategories(allSubs);
    } catch (error: any) {
      console.error("Error saving subcategory:", error);
      toast.error(error.message || "บันทึกหมวดหมู่ย่อยไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteSubcategory) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("subcategories")
        .update({ is_active: false })
        .eq("id", deleteSubcategory.id);

      if (error) throw error;
      toast.success("ลบหมวดหมู่ย่อยสำเร็จ");
      setDeleteSubcategory(null);
      if (categoryName) {
        await fetchSubcategories(categoryName);
      }
    } catch (error: any) {
      console.error("Error deleting subcategory:", error);
      toast.error(error.message || "ลบหมวดหมู่ย่อยไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (subcategory: Subcategory) => {
    setEditingSubcategory(subcategory);
    setFormData({
      name: subcategory.name,
      description: subcategory.description || "",
      category_id: subcategory.category_id,
    });
  };

  const cancelEdit = () => {
    setEditingSubcategory(null);
    setFormData({ name: "", description: "", category_id: "" });
  };

  const handleManageOpen = async (open: boolean) => {
    setManageOpen(open);
    if (open) {
      const allSubs = await fetchAllSubcategories();
      setSubcategories(allSubs);
    } else if (categoryName) {
      await fetchSubcategories(categoryName);
    }
  };

  return (
    <div className="flex gap-2">
      <div className="flex-1">
      <Select value={value} onValueChange={onChange} disabled={disabled || !categoryName}>
          <SelectTrigger>
            <SelectValue placeholder={categoryName ? "เลือกหมวดหมู่ย่อย" : "เลือกหมวดหมู่หลักก่อน"} />
          </SelectTrigger>
          <SelectContent 
            position="popper" 
            sideOffset={4} 
            className="bg-background z-[9999] max-h-60 overflow-y-auto"
          >
            {subcategories.length === 0 ? (
              <SelectItem value="no-data" disabled>
                ไม่มีหมวดหมู่ย่อย
              </SelectItem>
            ) : (
              subcategories.map((sub) => (
                <SelectItem key={sub.id} value={sub.id}>
                  {sub.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <Dialog open={manageOpen} onOpenChange={handleManageOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="icon" disabled={disabled}>
            <Settings className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>จัดการหมวดหมู่ย่อย</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold">
                {editingSubcategory ? "แก้ไขหมวดหมู่ย่อย" : "เพิ่มหมวดหมู่ย่อยใหม่"}
              </h3>
              <div className="space-y-2">
                <Label>หมวดหมู่หลัก *</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(val) => setFormData({ ...formData, category_id: val })}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกหมวดหมู่หลัก" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>ชื่อหมวดหมู่ย่อย *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น สายไฟ, หลอดไฟ..."
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
                {editingSubcategory && (
                  <Button type="button" variant="outline" onClick={cancelEdit} disabled={isLoading}>
                    ยกเลิก
                  </Button>
                )}
                <Button type="button" onClick={handleSave} disabled={isLoading}>
                  <Plus className="h-4 w-4 mr-2" />
                  {editingSubcategory ? "บันทึก" : "เพิ่ม"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">รายการหมวดหมู่ย่อยทั้งหมด</h3>
              <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                {subcategories.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">ไม่มีหมวดหมู่ย่อย</div>
                ) : (
                  subcategories.map((subcategory) => (
                    <div key={subcategory.id} className="p-3 flex items-center justify-between hover:bg-accent">
                      <div>
                        <div className="font-medium">{subcategory.name}</div>
                        {subcategory.description && (
                          <div className="text-sm text-muted-foreground">{subcategory.description}</div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          หมวดหมู่: {categories.find((c) => c.id === subcategory.category_id)?.name || "N/A"}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(subcategory)}
                          disabled={isLoading}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteSubcategory(subcategory)}
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

      <AlertDialog open={!!deleteSubcategory} onOpenChange={(open) => !open && setDeleteSubcategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบหมวดหมู่ย่อย</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบหมวดหมู่ย่อย "{deleteSubcategory?.name}" ใช่หรือไม่?
              <br />
              การลบหมวดหมู่ย่อยจะไม่ส่งผลกระทบต่ออุปกรณ์ที่มีอยู่
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
