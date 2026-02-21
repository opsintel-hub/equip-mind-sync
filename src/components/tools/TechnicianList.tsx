import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RefreshCw, Search, Trash2, Wrench, Users } from "lucide-react";
import { toast } from "sonner";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { TechnicianToolsDialog } from "./TechnicianToolsDialog";

interface Technician {
  id: string;
  code: string;
  name: string;
  department: string | null;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
  tool_count?: number;
}

interface TechnicianListProps {
  refreshKey?: number;
}

export function TechnicianList({ refreshKey }: TechnicianListProps) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | null>(null);
  const [selectedTechnicianName, setSelectedTechnicianName] = useState("");

  useEffect(() => {
    fetchTechnicians();
  }, [refreshKey]);

  const fetchTechnicians = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("technicians")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get tool counts
      const { data: toolCounts } = await supabase
        .from("technician_tools")
        .select("technician_id");

      const countMap: Record<string, number> = {};
      (toolCounts || []).forEach((t: any) => {
        countMap[t.technician_id] = (countMap[t.technician_id] || 0) + 1;
      });

      setTechnicians((data || []).map(t => ({ ...t, tool_count: countMap[t.id] || 0 })));
    } catch (error) {
      console.error("Error fetching technicians:", error);
      toast.error("ไม่สามารถโหลดข้อมูลช่างได้");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from("technicians").update({ is_active: false }).eq("id", deleteId);
      if (error) throw error;
      toast.success("ลบช่างสำเร็จ");
      fetchTechnicians();
    } catch (error) {
      toast.error("ไม่สามารถลบช่างได้");
    } finally {
      setDeleteId(null);
    }
  };

  const filteredTechnicians = technicians.filter(
    (t) =>
      t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { paginatedData, currentPage, pageSize, totalPages, totalItems, handlePageChange, handlePageSizeChange } =
    useTablePagination(filteredTechnicians, 20);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              รายชื่อช่าง ({filteredTechnicians.length} คน)
            </CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="ค้นหารหัส, ชื่อ, ฝ่าย..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
              <Button variant="outline" size="icon" onClick={fetchTechnicians}><RefreshCw className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
          ) : filteredTechnicians.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "ไม่พบช่างที่ค้นหา" : "ยังไม่มีช่างในระบบ"}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>รหัส</TableHead>
                      <TableHead>ชื่อ-นามสกุล</TableHead>
                      <TableHead>ฝ่าย</TableHead>
                      <TableHead>เบอร์โทร</TableHead>
                      <TableHead className="text-center">เครื่องมือ</TableHead>
                      <TableHead className="text-center">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((tech) => (
                      <TableRow key={tech.id}>
                        <TableCell className="font-medium">{tech.code}</TableCell>
                        <TableCell>{tech.name}</TableCell>
                        <TableCell>{tech.department || <span className="text-muted-foreground">-</span>}</TableCell>
                        <TableCell>{tech.phone || <span className="text-muted-foreground">-</span>}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{tech.tool_count || 0} รายการ</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="icon" title="ดูเครื่องมือ"
                              onClick={() => { setSelectedTechnicianId(tech.id); setSelectedTechnicianName(tech.name); }}>
                              <Wrench className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="ลบ" onClick={() => setDeleteId(tech.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <TablePagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>คุณต้องการลบช่างคนนี้หรือไม่?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>ลบ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedTechnicianId && (
        <TechnicianToolsDialog
          technicianId={selectedTechnicianId}
          technicianName={selectedTechnicianName}
          open={!!selectedTechnicianId}
          onOpenChange={(open) => { if (!open) { setSelectedTechnicianId(null); fetchTechnicians(); } }}
        />
      )}
    </>
  );
}
