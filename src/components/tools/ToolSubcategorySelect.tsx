import { useState, useEffect } from "react";
import { Settings, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface ToolSubcategory {
  id: string;
  name: string;
  description: string | null;
  tool_category_id: string;
}

interface ToolCategory {
  id: string;
  name: string;
}

interface Props {
  toolCategoryId: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hideManage?: boolean;
}

export function ToolSubcategorySelect({ toolCategoryId, value, onChange, disabled, hideManage }: Props) {

  const [subcategories, setSubcategories] = useState<ToolSubcategory[]>([]);
  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [manageOpen, setManageOpen] = useState(false);
  const [editing, setEditing] = useState<ToolSubcategory | null>(null);
  const [deleteItem, setDeleteItem] = useState<ToolSubcategory | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", tool_category_id: "" });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => {
    if (toolCategoryId) fetchByCategory(toolCategoryId);
    else setSubcategories([]);
  }, [toolCategoryId]);

  const fetchCategories = async () => {
    const { data } = await supabase.from("tool_categories").select("id, name").eq("is_active", true).order("name");
    setCategories(data || []);
  };

  const fetchByCategory = async (catId: string) => {
    const { data } = await supabase
      .from("tool_subcategories" as any)
      .select("*")
      .eq("tool_category_id", catId)
      .eq("is_active", true)
      .order("name");
    setSubcategories((data as any) || []);
  };

  const fetchAll = async () => {
    const { data } = await supabase
      .from("tool_subcategories" as any)
      .select("*")
      .eq("is_active", true)
      .order("name");
    return ((data as any) || []) as ToolSubcategory[];
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return toast.error("กรุณากรอกชื่อหมวดหมู่ย่อย");
    if (!formData.tool_category_id) return toast.error("กรุณาเลือกหมวดหมู่หลักเครื่องมือ");
    setIsLoading(true);
    try {
      if (editing) {
        const { error } = await supabase.from("tool_subcategories" as any).update({
          name: formData.name,
          description: formData.description || null,
          tool_category_id: formData.tool_category_id,
        }).eq("id", editing.id);
        if (error) throw error;
        toast.success("แก้ไขหมวดหมู่ย่อยสำเร็จ");
      } else {
        const { error } = await supabase.from("tool_subcategories" as any).insert({
          name: formData.name,
          description: formData.description || null,
          tool_category_id: formData.tool_category_id,
        });
        if (error) throw error;
        toast.success("เพิ่มหมวดหมู่ย่อยสำเร็จ");
      }
      setFormData({ name: "", description: "", tool_category_id: "" });
      setEditing(null);
      setSubcategories(await fetchAll());
    } catch (e: any) {
      toast.error(e.message || "บันทึกไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from("tool_subcategories" as any).update({ is_active: false }).eq("id", deleteItem.id);
      if (error) throw error;
      toast.success("ลบสำเร็จ");
      setDeleteItem(null);
      if (toolCategoryId) await fetchByCategory(toolCategoryId);
    } catch (e: any) {
      toast.error(e.message || "ลบไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (s: ToolSubcategory) => {
    setEditing(s);
    setFormData({ name: s.name, description: s.description || "", tool_category_id: s.tool_category_id });
  };

  const cancelEdit = () => {
    setEditing(null);
    setFormData({ name: "", description: "", tool_category_id: "" });
  };

  const handleManageOpen = async (open: boolean) => {
    setManageOpen(open);
    if (open) setSubcategories(await fetchAll());
    else if (toolCategoryId) await fetchByCategory(toolCategoryId);
  };

  const options = subcategories.map((s) => ({ value: s.id, label: s.name, description: s.description || undefined }));
  const catOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <SearchableSelect
          options={options}
          value={value}
          onValueChange={onChange}
          placeholder={toolCategoryId ? "เลือกหมวดหมู่ย่อยเครื่องมือ" : "เลือกหมวดหมู่เครื่องมือก่อน"}
          searchPlaceholder="ค้นหา..."
          emptyMessage="ไม่มีหมวดหมู่ย่อย"
          disabled={disabled || !toolCategoryId}
        />
      </div>

      {!hideManage && (
      <Dialog open={manageOpen} onOpenChange={handleManageOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="icon" disabled={disabled}>
            <Settings className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>จัดการหมวดหมู่ย่อยเครื่องมือ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold">{editing ? "แก้ไข" : "เพิ่ม"}หมวดหมู่ย่อย</h3>
              <div className="space-y-2">
                <Label>หมวดหมู่หลักเครื่องมือ *</Label>
                <SearchableSelect
                  options={catOptions}
                  value={formData.tool_category_id}
                  onValueChange={(v) => setFormData({ ...formData, tool_category_id: v })}
                  placeholder="เลือกหมวดหมู่เครื่องมือ"
                  searchPlaceholder="ค้นหา..."
                  emptyMessage="ไม่พบหมวดหมู่"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>ชื่อหมวดหมู่ย่อย *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="เช่น สว่าน, ประแจ..." disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <Label>คำอธิบาย</Label>
                <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} disabled={isLoading} />
              </div>
              <div className="flex gap-2 justify-end">
                {editing && <Button type="button" variant="outline" onClick={cancelEdit} disabled={isLoading}>ยกเลิก</Button>}
                <Button type="button" onClick={handleSave} disabled={isLoading}>
                  <Plus className="h-4 w-4 mr-2" />{editing ? "บันทึก" : "เพิ่ม"}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">รายการทั้งหมด</h3>
              <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                {subcategories.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">ไม่มีหมวดหมู่ย่อย</div>
                ) : subcategories.map((s) => (
                  <div key={s.id} className="p-3 flex items-center justify-between hover:bg-accent">
                    <div>
                      <div className="font-medium">{s.name}</div>
                      {s.description && <div className="text-sm text-muted-foreground">{s.description}</div>}
                      <div className="text-xs text-muted-foreground mt-1">หมวดหมู่: {categories.find(c => c.id === s.tool_category_id)?.name || "N/A"}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" size="icon" onClick={() => startEdit(s)} disabled={isLoading}><Pencil className="h-4 w-4" /></Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => setDeleteItem(s)} disabled={isLoading}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      )}


      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>ลบหมวดหมู่ย่อย "{deleteItem?.name}" ใช่หรือไม่?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isLoading}>ลบ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
