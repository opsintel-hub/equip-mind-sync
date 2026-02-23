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

interface CMSType {
  id: string;
  name: string;
  description: string | null;
}

interface CMSTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function CMSTypeSelect({ value, onChange, disabled }: CMSTypeSelectProps) {
  const [cmsTypes, setCmsTypes] = useState<CMSType[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CMSType | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchCmsTypes();
  }, []);

  const fetchCmsTypes = async () => {
    const { data, error } = await supabase
      .from("cms_types")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) {
      toast.error("ไม่สามารถโหลดประเภท CMS ได้");
      return;
    }
    setCmsTypes(data || []);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("กรุณากรอกชื่อประเภท CMS");
      return;
    }

    setIsLoading(true);
    try {
      if (editingItem) {
        const { error } = await supabase
          .from("cms_types")
          .update({ name: formData.name, description: formData.description || null })
          .eq("id", editingItem.id);

        if (error) throw error;
        toast.success("แก้ไขประเภท CMS สำเร็จ");
      } else {
        const { error } = await supabase
          .from("cms_types")
          .insert({ name: formData.name, description: formData.description || null });

        if (error) throw error;
        toast.success("เพิ่มประเภท CMS สำเร็จ");
      }

      setFormData({ name: "", description: "" });
      setEditingItem(null);
      fetchCmsTypes();
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
        .from("cms_types")
        .update({ is_active: false })
        .eq("id", deleteId);

      if (error) throw error;
      toast.success("ลบประเภท CMS สำเร็จ");
      fetchCmsTypes();
    } catch (error) {
      toast.error("ไม่สามารถลบประเภท CMS ได้");
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteId(null);
    }
  };

  const startEdit = (item: CMSType) => {
    setEditingItem(item);
    setFormData({ name: item.name, description: item.description || "" });
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setFormData({ name: "", description: "" });
  };

  const options = cmsTypes.map((cms) => ({
    value: cms.id,
    label: cms.name,
    description: cms.description || undefined,
  }));

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <SearchableSelect
          options={options}
          value={value}
          onValueChange={onChange}
          placeholder="เลือกประเภท CMS"
          searchPlaceholder="ค้นหาประเภท CMS..."
          emptyMessage="ไม่พบประเภท CMS"
          disabled={disabled}
        />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" type="button">
            <Settings className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>จัดการประเภท CMS</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ชื่อประเภท CMS</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="กรอกชื่อประเภท CMS"
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
                {editingItem ? "บันทึกการแก้ไข" : "เพิ่มประเภท CMS"}
              </Button>
              {editingItem && (
                <Button variant="outline" onClick={cancelEdit}>
                  ยกเลิก
                </Button>
              )}
            </div>

            <div className="border-t pt-4">
              <Label className="mb-2 block">ประเภท CMS ที่มีอยู่</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {cmsTypes.map((cms) => (
                  <div
                    key={cms.id}
                    className="flex items-center justify-between p-2 bg-muted rounded"
                  >
                    <div>
                      <div className="font-medium">{cms.name}</div>
                      {cms.description && (
                        <div className="text-sm text-muted-foreground">
                          {cms.description}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(cms)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeleteId(cms.id);
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

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบประเภท CMS นี้หรือไม่?
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
