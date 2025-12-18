import { useState, useEffect } from "react";
import { Trash2, AlertCircle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DepartmentForm } from "./DepartmentForm";

interface DepartmentData {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean | null;
}

interface DepartmentListProps {
  refresh: number;
}

export function DepartmentList({ refresh }: DepartmentListProps) {
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDepartment, setDeleteDepartment] = useState<DepartmentData | null>(null);

  useEffect(() => {
    fetchDepartments();
  }, [refresh]);

  const fetchDepartments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error("Error fetching departments:", error);
      toast.error("ไม่สามารถโหลดข้อมูลฝ่ายได้");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDepartment) return;

    try {
      const { error } = await supabase
        .from("departments")
        .update({ is_active: false })
        .eq("id", deleteDepartment.id);

      if (error) throw error;
      toast.success("ลบฝ่ายสำเร็จ");
      setDeleteDepartment(null);
      fetchDepartments();
    } catch (error: any) {
      console.error("Error deleting department:", error);
      toast.error(error.message || "ลบฝ่ายไม่สำเร็จ");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (departments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <AlertCircle className="h-12 w-12 mb-4" />
        <p>ยังไม่มีข้อมูลฝ่าย</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ชื่อฝ่าย</TableHead>
            <TableHead>รายละเอียด</TableHead>
            <TableHead className="text-right">จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {departments.map((department) => (
            <TableRow key={department.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{department.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {department.description || "-"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <DepartmentForm editData={department} onSuccess={fetchDepartments} />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteDepartment(department)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!deleteDepartment} onOpenChange={(open) => !open && setDeleteDepartment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบฝ่าย</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบฝ่าย "{deleteDepartment?.name}" ใช่หรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>ลบ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
