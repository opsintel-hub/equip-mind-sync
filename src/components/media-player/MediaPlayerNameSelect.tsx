import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Settings, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface Item {
  id: string;
  name: string;
  description: string | null;
}

interface MediaPlayerNameSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function MediaPlayerNameSelect({ value, onChange, disabled }: MediaPlayerNameSelectProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("media_player_names" as any)
      .select("*")
      .eq("is_active", true)
      .order("name");
    if (!error) setItems((data as any) || []);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.error("กรุณากรอกชื่อสินค้า"); return; }
    setIsLoading(true);
    try {
      if (editingItem) {
        const { error } = await supabase.from("media_player_names" as any)
          .update({ name: formData.name, description: formData.description || null } as any)
          .eq("id", editingItem.id);
        if (error) throw error;
        toast.success("แก้ไขชื่อสินค้าสำเร็จ");
      } else {
        const { error } = await supabase.from("media_player_names" as any)
          .insert({ name: formData.name, description: formData.description || null } as any);
        if (error) throw error;
        toast.success("เพิ่มชื่อสินค้าสำเร็จ");
      }
      setFormData({ name: "", description: "" });
      setEditingItem(null);
      fetchItems();
    } catch { toast.error("เกิดข้อผิดพลาด"); }
    finally { setIsLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from("media_player_names" as any)
        .update({ is_active: false } as any).eq("id", deleteId);
      if (error) throw error;
      toast.success("ลบชื่อสินค้าสำเร็จ");
      fetchItems();
    } catch { toast.error("ไม่สามารถลบได้"); }
    finally { setIsDeleteDialogOpen(false); setDeleteId(null); }
  };

  const options = items.map((m) => ({
    value: m.id,
    label: m.name,
    description: m.description || undefined,
  }));

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <SearchableSelect
          options={options}
          value={value}
          onValueChange={onChange}
          placeholder="เลือกชื่อสินค้า"
          searchPlaceholder="ค้นหาชื่อสินค้า..."
          emptyMessage="ไม่พบชื่อสินค้า"
          disabled={disabled}
        />
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" type="button"><Settings className="h-4 w-4" /></Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>จัดการชื่อสินค้า</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ชื่อสินค้า</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="กรอกชื่อสินค้า" />
            </div>
            <div className="space-y-2">
              <Label>รายละเอียด</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="กรอกรายละเอียด (ถ้ามี)" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isLoading} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                {editingItem ? "บันทึกการแก้ไข" : "เพิ่มชื่อสินค้า"}
              </Button>
              {editingItem && (
                <Button variant="outline" onClick={() => { setEditingItem(null); setFormData({ name: "", description: "" }); }}>ยกเลิก</Button>
              )}
            </div>
            <div className="border-t pt-4">
              <Label className="mb-2 block">ชื่อสินค้าที่มีอยู่</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {items.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div>
                      <div className="font-medium">{m.name}</div>
                      {m.description && <div className="text-sm text-muted-foreground">{m.description}</div>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingItem(m); setFormData({ name: m.name, description: m.description || "" }); }}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { setDeleteId(m.id); setIsDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>คุณต้องการลบชื่อสินค้านี้หรือไม่?</AlertDialogDescription>
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
