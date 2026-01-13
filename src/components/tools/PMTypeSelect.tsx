import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Badge } from "@/components/ui/badge";

interface PMType {
  id: string;
  name: string;
  description: string | null;
}

interface PMTypeSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export function PMTypeSelect({ value, onChange, disabled }: PMTypeSelectProps) {
  const [pmTypes, setPmTypes] = useState<PMType[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<PMType | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchPMTypes();
  }, []);

  const fetchPMTypes = async () => {
    const { data, error } = await supabase
      .from("pm_types")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) {
      toast.error("ไม่สามารถโหลดประเภท PM ได้");
      return;
    }
    setPmTypes(data || []);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("กรุณากรอกชื่อประเภท PM");
      return;
    }

    setIsLoading(true);
    try {
      if (editingType) {
        const { error } = await supabase
          .from("pm_types")
          .update({ name: formData.name, description: formData.description })
          .eq("id", editingType.id);

        if (error) throw error;
        toast.success("แก้ไขประเภท PM สำเร็จ");
      } else {
        const { error } = await supabase
          .from("pm_types")
          .insert({ name: formData.name, description: formData.description });

        if (error) throw error;
        toast.success("เพิ่มประเภท PM สำเร็จ");
      }

      setFormData({ name: "", description: "" });
      setEditingType(null);
      fetchPMTypes();
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
        .from("pm_types")
        .update({ is_active: false })
        .eq("id", deleteId);

      if (error) throw error;
      toast.success("ลบประเภท PM สำเร็จ");
      fetchPMTypes();
      // Remove from selected if deleted
      onChange(value.filter((v) => v !== deleteId));
    } catch (error) {
      toast.error("ไม่สามารถลบประเภท PM ได้");
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteId(null);
    }
  };

  const startEdit = (type: PMType) => {
    setEditingType(type);
    setFormData({ name: type.name, description: type.description || "" });
  };

  const cancelEdit = () => {
    setEditingType(null);
    setFormData({ name: "", description: "" });
  };

  const toggleType = (typeId: string) => {
    if (disabled) return;
    if (value.includes(typeId)) {
      onChange(value.filter((v) => v !== typeId));
    } else {
      onChange([...value, typeId]);
    }
  };

  const selectedTypes = pmTypes.filter((t) => value.includes(t.id));

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-start">
        <div className="flex-1 border rounded-md p-3 min-h-[80px]">
          {selectedTypes.length === 0 ? (
            <span className="text-muted-foreground text-sm">เลือกประเภทการ PM</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {selectedTypes.map((type) => (
                <Badge key={type.id} variant="secondary" className="cursor-pointer" onClick={() => toggleType(type.id)}>
                  {type.name} ×
                </Badge>
              ))}
            </div>
          )}
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" type="button">
              <Settings className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>จัดการประเภทการ PM</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>ชื่อประเภท PM</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="กรอกชื่อประเภท PM"
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
                  {editingType ? "บันทึกการแก้ไข" : "เพิ่มประเภท PM"}
                </Button>
                {editingType && (
                  <Button variant="outline" onClick={cancelEdit}>
                    ยกเลิก
                  </Button>
                )}
              </div>

              <div className="border-t pt-4">
                <Label className="mb-2 block">ประเภท PM ที่มีอยู่</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {pmTypes.map((type) => (
                    <div
                      key={type.id}
                      className="flex items-center justify-between p-2 bg-muted rounded"
                    >
                      <div>
                        <div className="font-medium">{type.name}</div>
                        {type.description && (
                          <div className="text-sm text-muted-foreground">
                            {type.description}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(type)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeleteId(type.id);
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
      </div>

      {/* Multi-select checkboxes */}
      <div className="grid grid-cols-2 gap-2">
        {pmTypes.map((type) => (
          <div key={type.id} className="flex items-center space-x-2">
            <Checkbox
              id={`pm-type-${type.id}`}
              checked={value.includes(type.id)}
              onCheckedChange={() => toggleType(type.id)}
              disabled={disabled}
            />
            <label
              htmlFor={`pm-type-${type.id}`}
              className="text-sm cursor-pointer"
            >
              {type.name}
            </label>
          </div>
        ))}
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบประเภท PM นี้หรือไม่?
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
