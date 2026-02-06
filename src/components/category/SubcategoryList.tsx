import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SubcategoryForm } from "./SubcategoryForm";
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
}

interface Subcategory {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean | null;
  category_id: string | null;
  categories?: Category | null;
}

interface SubcategoryListProps {
  refresh: number;
}

export function SubcategoryList({ refresh }: SubcategoryListProps) {
  const queryClient = useQueryClient();
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [deletingSubcategory, setDeletingSubcategory] = useState<Subcategory | null>(null);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
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

  const { data: subcategories, isLoading } = useQuery({
    queryKey: ["subcategories-with-category", refresh, filterCategoryId],
    queryFn: async () => {
      let query = supabase
        .from("subcategories")
        .select(`
          *,
          categories:category_id (
            id,
            name
          )
        `)
        .order("name");

      if (filterCategoryId && filterCategoryId !== "all") {
        query = query.eq("category_id", filterCategoryId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Subcategory[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subcategories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcategories-with-category"] });
      queryClient.invalidateQueries({ queryKey: ["categories-with-count"] });
      toast.success("ลบหมวดหมู่ย่อยสำเร็จ");
      setDeletingSubcategory(null);
    },
    onError: (error: Error) => {
      toast.error("ไม่สามารถลบได้: " + error.message);
    },
  });

  const handleEdit = (subcategory: Subcategory) => {
    setEditingSubcategory(subcategory);
  };

  const handleDelete = (subcategory: Subcategory) => {
    setDeletingSubcategory(subcategory);
  };

  if (isLoading) {
    return <div className="text-center py-4">กำลังโหลด...</div>;
  }

  return (
    <>
      <div className="mb-4">
        <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="กรองตามหมวดหมู่หลัก" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            {categories?.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ชื่อหมวดหมู่ย่อย</TableHead>
            <TableHead>หมวดหมู่หลัก</TableHead>
            <TableHead>คำอธิบาย</TableHead>
            <TableHead className="text-center">สถานะ</TableHead>
            <TableHead className="text-right">จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subcategories?.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                ยังไม่มีหมวดหมู่ย่อย
              </TableCell>
            </TableRow>
          ) : (
            subcategories?.map((subcategory) => (
              <TableRow key={subcategory.id}>
                <TableCell className="font-medium">{subcategory.name}</TableCell>
                <TableCell>
                  {subcategory.categories ? (
                    <Badge variant="outline">{subcategory.categories.name}</Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {subcategory.description || "-"}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={subcategory.is_active ? "default" : "secondary"}>
                    {subcategory.is_active ? "ใช้งาน" : "ปิดใช้งาน"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(subcategory)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(subcategory)}
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

      {editingSubcategory && (
        <SubcategoryForm
          subcategory={editingSubcategory}
          open={!!editingSubcategory}
          onOpenChange={(open) => !open && setEditingSubcategory(null)}
          onSuccess={() => {
            setEditingSubcategory(null);
            queryClient.invalidateQueries({ queryKey: ["subcategories-with-category"] });
          }}
        />
      )}

      <AlertDialog open={!!deletingSubcategory} onOpenChange={(open) => !open && setDeletingSubcategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบหมวดหมู่ย่อย "{deletingSubcategory?.name}" หรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSubcategory && deleteMutation.mutate(deletingSubcategory.id)}
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
