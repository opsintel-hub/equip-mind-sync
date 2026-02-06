import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Layers } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface IssuePurpose {
  id: string;
  name: string;
  description: string | null;
  requires_billboard: boolean;
  requires_return: boolean;
  allow_all_categories: boolean;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface IssuePurposeEditDialogProps {
  purpose: IssuePurpose | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function IssuePurposeEditDialog({ 
  purpose, 
  open, 
  onOpenChange, 
  onSuccess 
}: IssuePurposeEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    requires_billboard: false,
    requires_return: false,
    allow_all_categories: false,
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ["categories-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Category[];
    },
  });

  // Fetch existing category mappings when purpose changes
  useEffect(() => {
    if (purpose && open) {
      setFormData({
        name: purpose.name,
        description: purpose.description || "",
        requires_billboard: purpose.requires_billboard,
        requires_return: purpose.requires_return,
        allow_all_categories: purpose.allow_all_categories,
      });

      // Fetch existing category mappings
      const fetchCategoryMappings = async () => {
        const { data, error } = await supabase
          .from("issue_purpose_categories")
          .select("category_id")
          .eq("issue_purpose_id", purpose.id);

        if (!error && data) {
          setSelectedCategories(data.map(m => m.category_id));
        }
      };

      fetchCategoryMappings();
    }
  }, [purpose, open]);

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purpose) return;

    if (!formData.name.trim()) {
      toast.error("กรุณากรอกชื่อวัตถุประสงค์");
      return;
    }

    // Validate: must select categories if not allow_all
    if (!formData.allow_all_categories && selectedCategories.length === 0) {
      toast.error("กรุณาเลือกหมวดหมู่ที่อนุญาตอย่างน้อย 1 หมวดหมู่ หรือเลือก 'เบิกได้ทุกหมวดหมู่'");
      return;
    }

    try {
      setLoading(true);

      // Update issue purpose
      const { error: updateError } = await supabase
        .from("issue_purposes")
        .update({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          requires_billboard: formData.requires_billboard,
          requires_return: formData.requires_return,
          allow_all_categories: formData.allow_all_categories,
          updated_at: new Date().toISOString(),
        })
        .eq("id", purpose.id);

      if (updateError) throw updateError;

      // Delete existing category mappings
      const { error: deleteError } = await supabase
        .from("issue_purpose_categories")
        .delete()
        .eq("issue_purpose_id", purpose.id);

      if (deleteError) throw deleteError;

      // Insert new category mappings if not allow_all
      if (!formData.allow_all_categories && selectedCategories.length > 0) {
        const categoryMappings = selectedCategories.map(categoryId => ({
          issue_purpose_id: purpose.id,
          category_id: categoryId,
        }));

        const { error: mappingError } = await supabase
          .from("issue_purpose_categories")
          .insert(categoryMappings);

        if (mappingError) throw mappingError;
      }

      toast.success("อัปเดตวัตถุประสงค์สำเร็จ");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>แก้ไขวัตถุประสงค์การเบิก</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">ชื่อวัตถุประสงค์ *</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="เช่น ซ่อมป้ายโฆษณา"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">คำอธิบาย</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="คำอธิบายเพิ่มเติม"
              rows={2}
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">เงื่อนไข:</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-requires_billboard"
                checked={formData.requires_billboard}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, requires_billboard: checked === true })
                }
              />
              <Label htmlFor="edit-requires_billboard" className="text-sm font-normal">
                ต้องระบุป้ายโฆษณา (เช่น เบิกเพื่อซ่อม)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-requires_return"
                checked={formData.requires_return}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, requires_return: checked === true })
                }
              />
              <Label htmlFor="edit-requires_return" className="text-sm font-normal">
                ต้องรับคืนกลับคลัง (เช่น เบิกเพื่อเคลม)
              </Label>
            </div>
          </div>

          {/* Category selection section */}
          <div className="space-y-3 pt-2 border-t">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Layers className="h-4 w-4" />
              หมวดหมู่ที่เบิกได้:
            </Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-allow_all_categories"
                checked={formData.allow_all_categories}
                onCheckedChange={(checked) => {
                  setFormData({ ...formData, allow_all_categories: checked === true });
                  if (checked) {
                    setSelectedCategories([]);
                  }
                }}
              />
              <Label htmlFor="edit-allow_all_categories" className="text-sm font-normal text-primary">
                เบิกได้ทุกหมวดหมู่
              </Label>
            </div>

            {!formData.allow_all_categories && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  เลือกหมวดหมู่ที่อนุญาต * (ต้องเลือกอย่างน้อย 1 หมวด)
                </Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-md border p-3 bg-muted/20">
                  {categories?.map((category) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-category-${category.id}`}
                        checked={selectedCategories.includes(category.id)}
                        onCheckedChange={() => handleCategoryToggle(category.id)}
                      />
                      <Label 
                        htmlFor={`edit-category-${category.id}`} 
                        className="text-sm font-normal cursor-pointer"
                      >
                        {category.name}
                      </Label>
                    </div>
                  ))}
                  {(!categories || categories.length === 0) && (
                    <p className="text-sm text-muted-foreground col-span-2">ไม่พบหมวดหมู่</p>
                  )}
                </div>
                {selectedCategories.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    เลือกแล้ว {selectedCategories.length} หมวดหมู่
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
