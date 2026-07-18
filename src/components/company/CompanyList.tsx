import { useState, useEffect } from "react";
import { Loader2, Trash2, Building, Eye, EyeOff } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  is_hidden: boolean;
  departments: Department | null;
}

interface CompanyListProps {
  refresh: number;
}

export function CompanyList({ refresh }: CompanyListProps) {
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteCompany, setDeleteCompany] = useState<CompanyData | null>(null);
  const [showHidden, setShowHidden] = useState(true);

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
        is_hidden,
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

  const handleToggleHidden = async (company: CompanyData) => {
    const next = !company.is_hidden;
    const { error } = await supabase
      .from("companies")
      .update({ is_hidden: next })
      .eq("id", company.id);

    if (error) {
      console.error("Error toggling hidden:", error);
      toast.error("ไม่สามารถเปลี่ยนสถานะการซ่อนได้");
    } else {
      toast.success(next ? "ซ่อนบริษัทแล้ว" : "แสดงบริษัทแล้ว");
      fetchCompanies();
    }
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

  const hiddenCount = companies.filter((c) => c.is_hidden).length;
  const visibleCompanies = showHidden ? companies : companies.filter((c) => !c.is_hidden);

  return (
    <>
      <div className="flex items-center justify-end gap-2 mb-3">
        <Label htmlFor="show-hidden" className="text-sm text-muted-foreground">
          แสดงบริษัทที่ซ่อน ({hiddenCount})
        </Label>
        <Switch id="show-hidden" checked={showHidden} onCheckedChange={setShowHidden} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>รหัส</TableHead>
            <TableHead>ชื่อบริษัท</TableHead>
            <TableHead>ฝ่าย</TableHead>
            <TableHead>รายละเอียด</TableHead>
            <TableHead className="w-[140px]">จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleCompanies.map((company) => (
            <TableRow key={company.id} className={company.is_hidden ? "opacity-60 bg-muted/30" : ""}>
              <TableCell className="font-medium">{company.code}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span>{company.name}</span>
                  {company.is_hidden && (
                    <Badge variant="outline" className="bg-muted text-muted-foreground border-muted-foreground/30">
                      <EyeOff className="h-3 w-3 mr-1" />
                      ซ่อน
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {company.departments ? (
                  <Badge variant="outline">{company.departments.name}</Badge>
                ) : (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                    🌐 ทุกฝ่าย
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {company.description || "-"}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleHidden(company)}
                    title={company.is_hidden ? "แสดงบริษัทนี้" : "ซ่อนจากการมองเห็น"}
                  >
                    {company.is_hidden ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
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
