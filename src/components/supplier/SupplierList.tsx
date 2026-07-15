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
  company_code: string | null;
  tax_id: string | null;
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
  const [companyFilter, setCompanyFilter] = useState<string>("");
  const pagination = useTablePagination(filteredSuppliers);

  useEffect(() => {
    fetchSuppliers();
  }, [refresh]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_suppliers_admin");
      if (error) throw error;
      setSuppliers((data || []) as Supplier[]);
      setFilteredSuppliers((data || []) as Supplier[]);
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาดในการดึงข้อมูล: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
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
    const q = searchTerm.trim().toLowerCase();
    let list = suppliers;
    if (companyFilter) list = list.filter((s) => (s.company_code || "") === companyFilter);
    if (q) {
      list = list.filter((s) => {
        return (
          (s.vendor_code || "").toLowerCase().includes(q) ||
          (s.code || "").toLowerCase().includes(q) ||
          (s.tax_id || "").toLowerCase().includes(q) ||
          (s.name || "").toLowerCase().includes(q) ||
          (s.contact_person || "").toLowerCase().includes(q) ||
          (s.email || "").toLowerCase().includes(q) ||
          (s.phone || "").toLowerCase().includes(q)
        );
      });
    }
    setFilteredSuppliers(list);
  }, [searchTerm, companyFilter, suppliers]);

  const companies = Array.from(new Set(suppliers.map((s) => s.company_code).filter(Boolean))) as string[];

  const handleExport = () => {
    const exportData = filteredSuppliers.map((s) => ({
      Company: s.company_code || "",
      "Vendor ID": s.vendor_code || s.code || "",
      "Tax ID": s.tax_id || "",
      "Vendor Name": s.name,
      "Contact Person": s.contact_person || "",
      Phone: s.phone || "",
      Email: s.email || "",
      Address: s.address || "",
      "Is Active": s.is_active ? "ใช้งาน" : "ไม่ใช้งาน",
      Notes: s.notes || "",
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    ws["!cols"] = [{ wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 40 }, { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 40 }, { wch: 12 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendor list-Store");
    XLSX.writeFile(wb, `suppliers_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("ส่งออกข้อมูลสำเร็จ");
  };

  if (loading) return <div className="text-center py-8">กำลังโหลด...</div>;

  if (suppliers.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">ยังไม่มีข้อมูลผู้จัดจำหน่าย</div>;
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหา Vendor ID, Tax ID, ชื่อ, ผู้ติดต่อ, อีเมล..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">ทุก Company</option>
          {companies.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <Button onClick={handleExport} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          ส่งออก Excel ({filteredSuppliers.length.toLocaleString()})
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Vendor ID</TableHead>
              <TableHead>Tax ID</TableHead>
              <TableHead>ชื่อผู้จัดจำหน่าย</TableHead>
              <TableHead>ผู้ติดต่อ</TableHead>
              <TableHead>เบอร์โทร</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.paginatedData.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.company_code ? <Badge variant="outline">{s.company_code}</Badge> : "-"}</TableCell>
                <TableCell className="font-mono">{s.vendor_code || s.code}</TableCell>
                <TableCell className="font-mono text-xs">{s.tax_id || "-"}</TableCell>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.contact_person || "-"}</TableCell>
                <TableCell>{s.phone || "-"}</TableCell>
                <TableCell>
                  <Badge variant={s.is_active ? "default" : "secondary"}>
                    {s.is_active ? "ใช้งาน" : "ไม่ใช้งาน"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <SupplierForm onSuccess={fetchSuppliers} supplier={s} />
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(s.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
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
              คุณแน่ใจหรือไม่ว่าต้องการลบผู้จัดจำหน่ายนี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>ลบ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
