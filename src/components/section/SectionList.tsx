import { useState, useEffect } from "react";
import { Trash2, AlertCircle, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SectionForm } from "./SectionForm";

interface SectionData {
  id: string;
  name: string;
  description: string | null;
  department_id: string;
  is_active: boolean | null;
  departments: {
    id: string;
    name: string;
  } | null;
}

interface SectionListProps {
  refresh: number;
}

export function SectionList({ refresh }: SectionListProps) {
  const [sections, setSections] = useState<SectionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteSection, setDeleteSection] = useState<SectionData | null>(null);

  useEffect(() => {
    fetchSections();
  }, [refresh]);

  const fetchSections = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("sections")
        .select(`
          id,
          name,
          description,
          department_id,
          is_active,
          departments:department_id (id, name)
        `)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setSections((data as unknown as SectionData[]) || []);
    } catch (error) {
      console.error("Error fetching sections:", error);
      toast.error("ไม่สามารถโหลดข้อมูลแผนกได้");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteSection) return;

    try {
      const { error } = await supabase
        .from("sections")
        .update({ is_active: false })
        .eq("id", deleteSection.id);

      if (error) throw error;
      toast.success("ลบแผนกสำเร็จ");
      setDeleteSection(null);
      fetchSections();
    } catch (error: any) {
      console.error("Error deleting section:", error);
      toast.error(error.message || "ลบแผนกไม่สำเร็จ");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <AlertCircle className="h-12 w-12 mb-4" />
        <p>ยังไม่มีข้อมูลแผนก</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ชื่อแผนก</TableHead>
            <TableHead>ฝ่าย</TableHead>
            <TableHead>รายละเอียด</TableHead>
            <TableHead className="text-right">จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sections.map((section) => (
            <TableRow key={section.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{section.name}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {section.departments?.name || "-"}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {section.description || "-"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <SectionForm editData={section} onSuccess={fetchSections} />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteSection(section)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!deleteSection} onOpenChange={(open) => !open && setDeleteSection(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบแผนก</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบแผนก "{deleteSection?.name}" ใช่หรือไม่?
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
