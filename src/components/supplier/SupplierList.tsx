import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { SupplierForm } from "./SupplierForm";

interface Supplier {
  id: string;
  code: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

interface SupplierListProps {
  refresh: number;
}

export function SupplierList({ refresh }: SupplierListProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchSuppliers();
  }, [refresh]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("code");

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาดในการดึงข้อมูล: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("suppliers")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("ลบผู้จัดจำหน่ายสำเร็จ");
      fetchSuppliers();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setDeleteId(null);
    }
  };

  if (loading) {
    return <div className="text-center py-8">กำลังโหลด...</div>;
  }

  if (suppliers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        ยังไม่มีข้อมูลผู้จัดจำหน่าย
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>รหัส</TableHead>
            <TableHead>ชื่อผู้จัดจำหน่าย</TableHead>
            <TableHead>ผู้ติดต่อ</TableHead>
            <TableHead>เบอร์โทร</TableHead>
            <TableHead>อีเมล</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead className="text-right">จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((supplier) => (
            <TableRow key={supplier.id}>
              <TableCell className="font-medium">{supplier.code}</TableCell>
              <TableCell>{supplier.name}</TableCell>
              <TableCell>{supplier.contact_person || "-"}</TableCell>
              <TableCell>{supplier.phone || "-"}</TableCell>
              <TableCell>{supplier.email || "-"}</TableCell>
              <TableCell>
                <Badge variant={supplier.is_active ? "default" : "secondary"}>
                  {supplier.is_active ? "ใช้งาน" : "ไม่ใช้งาน"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <SupplierForm
                    onSuccess={fetchSuppliers}
                    supplier={supplier}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteId(supplier.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบผู้จัดจำหน่ายนี้?
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
