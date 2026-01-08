import { useState, useEffect } from "react";
import { Loader2, Trash2, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CompanyForm } from "./CompanyForm";
import { Badge } from "@/components/ui/badge";

interface Department {
  id: string;
  name: string;
}

interface CompanyData {
  id: string;
  code: string;
  name: string;
  department_id: string | null;
  description: string | null;
  is_active: boolean;
  departments: Department | null;
}

interface CompanyListProps {
  refresh: number;
}

export function CompanyList({ refresh }: CompanyListProps) {
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteCompany, setDeleteCompany] = useState<CompanyData | null>(null);

  useEffect(() => {
    fetchCompanies();
  }, [refresh]);

  const fetchCompanies = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("companies")
      .select(`
        id,
        code,
        name,
        department_id,
        description,
        is_active,
        departments (id, name)
      `)
      .eq("is_active", true)
      .order("code");

    if (error) {
      console.error("Error fetching companies:", error);
      toast.error("ไม่สามารถโหลดข้อมูลบริษัทได้");
    } else if (data) {
      setCompanies(data as CompanyData[]);
    }
    setIsLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteCompany) return;

    const { error } = await supabase
      .from("companies")
      .update({ is_active: false })
      .eq("id", deleteCompany.id);

    if (error) {
      console.error("Error deleting company:", error);
      toast.error("ไม่สามารถลบบริษัทได้");
    } else {
      toast.success("ลบบริษัทสำเร็จ");
      fetchCompanies();
    }
    setDeleteCompany(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
        <Building className="h-12 w-12 mb-4" />
        <p>ยังไม่มีข้อมูลบริษัท</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>รหัส</TableHead>
            <TableHead>ชื่อบริษัท</TableHead>
            <TableHead>ฝ่าย</TableHead>
            <TableHead>รายละเอียด</TableHead>
            <TableHead className="w-[100px]">จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => (
            <TableRow key={company.id}>
              <TableCell className="font-medium">{company.code}</TableCell>
              <TableCell>{company.name}</TableCell>
              <TableCell>
                {company.departments ? (
                  <Badge variant="outline">{company.departments.name}</Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {company.description || "-"}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <CompanyForm editData={company} onSuccess={fetchCompanies} />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteCompany(company)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!deleteCompany} onOpenChange={() => setDeleteCompany(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบบริษัท "{deleteCompany?.name}" ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
