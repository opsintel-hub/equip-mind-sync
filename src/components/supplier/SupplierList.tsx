import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
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
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Download, Search } from "lucide-react";
import { SupplierForm } from "./SupplierForm";
import * as XLSX from "xlsx";

interface Supplier {
  id: string;
  code: string;
  vendor_code: string | null;
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
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const pagination = useTablePagination(filteredSuppliers);

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
      setFilteredSuppliers(data || []);
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

  useEffect(() => {
    if (searchTerm) {
      const filtered = suppliers.filter(
        (supplier) =>
          supplier.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (supplier.vendor_code && supplier.vendor_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
          supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (supplier.contact_person && supplier.contact_person.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (supplier.email && supplier.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredSuppliers(filtered);
    } else {
      setFilteredSuppliers(suppliers);
    }
  }, [searchTerm, suppliers]);

  const handleExport = () => {
    const exportData = filteredSuppliers.map((supplier) => ({
      "รหัส": supplier.code,
      "รหัส Vendor": supplier.vendor_code || "-",
      "ชื่อผู้จัดจำหน่าย": supplier.name,
      "ผู้ติดต่อ": supplier.contact_person || "-",
      "เบอร์โทร": supplier.phone || "-",
      "อีเมล": supplier.email || "-",
      "ที่อยู่": supplier.address || "-",
      "สถานะ": supplier.is_active ? "ใช้งาน" : "ไม่ใช้งาน",
      "หมายเหตุ": supplier.notes || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Suppliers");
    XLSX.writeFile(wb, `suppliers_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("ส่งออกข้อมูลสำเร็จ");
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
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาด้วยรหัส, ชื่อ, ผู้ติดต่อ, หรืออีเมล..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleExport} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          ส่งออก Excel
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>รหัส Vendor</TableHead>
            <TableHead>ชื่อผู้จัดจำหน่าย</TableHead>
            <TableHead>ผู้ติดต่อ</TableHead>
            <TableHead>เบอร์โทร</TableHead>
            <TableHead>อีเมล</TableHead>
            <TableHead className="text-right">จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagination.paginatedData.map((supplier) => (
            <TableRow key={supplier.id}>
              <TableCell className="font-medium">{supplier.code}</TableCell>
              <TableCell>{supplier.vendor_code || "-"}</TableCell>
              <TableCell>{supplier.name}</TableCell>
              <TableCell>{supplier.contact_person || "-"}</TableCell>
              <TableCell>{supplier.phone || "-"}</TableCell>
              <TableCell>{supplier.email || "-"}</TableCell>
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
      <TablePagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        pageSize={pagination.pageSize}
        onPageChange={pagination.handlePageChange}
        onPageSizeChange={pagination.handlePageSizeChange}
      />

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
