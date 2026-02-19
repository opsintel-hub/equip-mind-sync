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
import { ContractorForm } from "./ContractorForm";
import * as XLSX from "xlsx";

interface Contractor {
  id: string;
  code: string;
  name: string;
  entity_type: string;
  tax_id: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

interface ContractorListProps {
  refresh: number;
}

export function ContractorList({ refresh }: ContractorListProps) {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [filteredContractors, setFilteredContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const pagination = useTablePagination(filteredContractors);

  useEffect(() => {
    fetchContractors();
  }, [refresh]);

  const fetchContractors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("contractors")
        .select("*")
        .order("code");

      if (error) throw error;
      setContractors(data || []);
      setFilteredContractors(data || []);
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาดในการดึงข้อมูล: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("contractors")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("ลบผู้รับเหมาสำเร็จ");
      fetchContractors();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setDeleteId(null);
    }
  };

  useEffect(() => {
    if (searchTerm) {
      const filtered = contractors.filter(
        (contractor) =>
          contractor.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contractor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (contractor.tax_id && contractor.tax_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (contractor.contact_person && contractor.contact_person.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (contractor.email && contractor.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredContractors(filtered);
    } else {
      setFilteredContractors(contractors);
    }
  }, [searchTerm, contractors]);

  const handleExport = () => {
    const exportData = filteredContractors.map((contractor) => ({
      "รหัส": contractor.code,
      "ชื่อผู้รับเหมา": contractor.name,
      "ประเภทบุคคล": contractor.entity_type === "corporate" ? "นิติบุคคล" : "บุคคลธรรมดา",
      "เลขผู้เสียภาษี/บัตรประชาชน": contractor.tax_id || "-",
      "ผู้ติดต่อ": contractor.contact_person || "-",
      "เบอร์โทร": contractor.phone || "-",
      "อีเมล": contractor.email || "-",
      "ที่อยู่": contractor.address || "-",
      "สถานะ": contractor.is_active ? "ใช้งาน" : "ไม่ใช้งาน",
      "หมายเหตุ": contractor.notes || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contractors");
    XLSX.writeFile(wb, `contractors_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("ส่งออกข้อมูลสำเร็จ");
  };

  const getEntityTypeBadge = (entityType: string) => {
    if (entityType === "corporate") {
      return <Badge variant="default">นิติบุคคล</Badge>;
    }
    return <Badge variant="secondary">บุคคลธรรมดา</Badge>;
  };

  if (loading) {
    return <div className="text-center py-8">กำลังโหลด...</div>;
  }

  if (contractors.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        ยังไม่มีข้อมูลผู้รับเหมา
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาด้วยรหัส, ชื่อ, เลขผู้เสียภาษี, ผู้ติดต่อ, หรืออีเมล..."
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
            <TableHead>รหัส</TableHead>
            <TableHead>ชื่อผู้รับเหมา</TableHead>
            <TableHead>ประเภทบุคคล</TableHead>
            <TableHead>เลขผู้เสียภาษี/บัตรประชาชน</TableHead>
            <TableHead>ผู้ติดต่อ</TableHead>
            <TableHead>เบอร์โทร</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead className="text-right">จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(() => {
            const { paginatedData, currentPage, pageSize: ps, totalPages, totalItems, handlePageChange, handlePageSizeChange } = pagination;
            return paginatedData.map((contractor) => (
              <TableRow key={contractor.id}>
                <TableCell className="font-medium">{contractor.code}</TableCell>
                <TableCell>{contractor.name}</TableCell>
                <TableCell>{getEntityTypeBadge(contractor.entity_type)}</TableCell>
                <TableCell>{contractor.tax_id || "-"}</TableCell>
                <TableCell>{contractor.contact_person || "-"}</TableCell>
                <TableCell>{contractor.phone || "-"}</TableCell>
                <TableCell>
                  <Badge variant={contractor.is_active ? "default" : "secondary"}>
                    {contractor.is_active ? "ใช้งาน" : "ไม่ใช้งาน"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <ContractorForm
                      onSuccess={fetchContractors}
                      contractor={contractor}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(contractor.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ));
          })()}
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
              คุณแน่ใจหรือไม่ว่าต้องการลบผู้รับเหมานี้?
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
