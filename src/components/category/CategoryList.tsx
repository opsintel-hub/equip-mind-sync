import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CategoryForm } from "./CategoryForm";
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

interface Category {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean | null;
  subcategory_count?: number;
}

interface CategoryListProps {
  refresh: number;
}

export function CategoryList({ refresh }: CategoryListProps) {
  const queryClient = useQueryClient();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories-with-count", refresh],
    queryFn: async () => {
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (categoriesError) throw categoriesError;

      // Fetch subcategory counts
      const { data: subcategories, error: subcategoriesError } = await supabase
        .from("subcategories")
        .select("category_id");

      if (subcategoriesError) throw subcategoriesError;

      // Count subcategories per category
      const countMap: Record<string, number> = {};
      subcategories?.forEach((sub) => {
        if (sub.category_id) {
          countMap[sub.category_id] = (countMap[sub.category_id] || 0) + 1;
        }
      });

      return categoriesData?.map((cat) => ({
        ...cat,
        subcategory_count: countMap[cat.id] || 0,
      })) as Category[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories-with-count"] });
      toast.success("ลบหมวดหมู่หลักสำเร็จ");
      setDeletingCategory(null);
    },
    onError: (error: Error) => {
      toast.error("ไม่สามารถลบได้: " + error.message);
    },
  });

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
  };

  const handleDelete = (category: Category) => {
    if (category.subcategory_count && category.subcategory_count > 0) {
      toast.error("ไม่สามารถลบได้เนื่องจากมีหมวดหมู่ย่อยอยู่");
      return;
    }
    setDeletingCategory(category);
  };

  if (isLoading) {
    return <div className="text-center py-4">กำลังโหลด...</div>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ชื่อหมวดหมู่</TableHead>
            <TableHead>คำอธิบาย</TableHead>
            <TableHead className="text-center">หมวดหมู่ย่อย</TableHead>
            <TableHead className="text-center">สถานะ</TableHead>
            <TableHead className="text-right">จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories?.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                ยังไม่มีหมวดหมู่หลัก
              </TableCell>
            </TableRow>
          ) : (
            categories?.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {category.description || "-"}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{category.subcategory_count}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={category.is_active ? "default" : "secondary"}>
                    {category.is_active ? "ใช้งาน" : "ปิดใช้งาน"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(category)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(category)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {editingCategory && (
        <CategoryForm
          category={editingCategory}
          open={!!editingCategory}
          onOpenChange={(open) => !open && setEditingCategory(null)}
          onSuccess={() => {
            setEditingCategory(null);
            queryClient.invalidateQueries({ queryKey: ["categories-with-count"] });
          }}
        />
      )}

      <AlertDialog open={!!deletingCategory} onOpenChange={(open) => !open && setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบหมวดหมู่ "{deletingCategory?.name}" หรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCategory && deleteMutation.mutate(deletingCategory.id)}
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
