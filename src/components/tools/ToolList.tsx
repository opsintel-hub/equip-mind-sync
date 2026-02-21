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
import { RefreshCw, Search, Trash2, Pencil, Wrench, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { ToolEditForm } from "./ToolEditForm";
import * as XLSX from "xlsx";

interface Tool {
  id: string;
  code: string;
  name: string;
  description: string | null;
  department: string | null;
  brand: string | null;
  unit: string;
  current_quantity: number;
  serial_number: string | null;
  unit_price: number;
  pm_interval_days: number;
  has_warranty: boolean;
  warranty_expiry_date: string | null;
  expiry_date: string | null;
  is_active: boolean;
  is_asset: boolean;
  asset_code: string | null;
  responsible_person: string | null;
  is_personal_tool: boolean;
  tool_category_id: string | null;
  company_id: string | null;
  location_id: string | null;
  notes: string | null;
  tool_category: { name: string } | null;
  company: { name: string } | null;
  location: { name: string } | null;
}

interface ToolListProps {
  refreshKey?: number;
}

export function ToolList({ refreshKey }: ToolListProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editTool, setEditTool] = useState<Tool | null>(null);

  useEffect(() => {
    fetchTools();
  }, [refreshKey]);

  const fetchTools = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("tools")
        .select(`
          *,
          tool_category:tool_categories(name),
          company:companies(name),
          location:locations(name)
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTools(data || []);
    } catch (error) {
      console.error("Error fetching tools:", error);
      toast.error("ไม่สามารถโหลดข้อมูลเครื่องมือได้");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from("tools").update({ is_active: false }).eq("id", deleteId);
      if (error) throw error;
      toast.success("ลบเครื่องมือสำเร็จ");
      fetchTools();
    } catch (error) {
      toast.error("ไม่สามารถลบเครื่องมือได้");
    } finally {
      setDeleteId(null);
    }
  };

  const getPMIntervalLabel = (days: number) => {
    switch (days) {
      case 15: return "ทุก 15 วัน";
      case 30: return "ทุก 30 วัน";
      case 60: return "ทุก 60 วัน";
      case 90: return "ทุก 90 วัน";
      case 180: return "ทุก 180 วัน";
      case 365: return "ทุก 1 ปี";
      default: return `ทุก ${days} วัน`;
    }
  };

  const handleExport = () => {
    const exportData = filteredTools.map((tool) => ({
      "รหัส": tool.code,
      "ชื่อเครื่องมือ": tool.name,
      "หมวดหมู่": tool.tool_category?.name || "",
      "ฝ่าย": tool.department || "",
      "ยี่ห้อ": tool.brand || "",
      "Serial No.": tool.serial_number || "",
      "จำนวน": tool.current_quantity,
      "หน่วย": tool.unit,
      "ราคา/ชิ้น": tool.unit_price,
      "ระยะเวลา PM": getPMIntervalLabel(tool.pm_interval_days),
      "เป็นทรัพย์สิน": tool.is_asset ? "ใช่" : "ไม่ใช่",
      "เลขที่ทรัพย์สิน": tool.asset_code || "",
      "ผู้รับผิดชอบ": tool.responsible_person || "",
      "ประจำตัวช่าง": tool.is_personal_tool ? "ใช่" : "ไม่ใช่",
      "ประกัน": tool.has_warranty ? "มี" : "ไม่มี",
      "วันหมดประกัน": tool.warranty_expiry_date || "",
      "หมายเหตุ": tool.notes || "",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tools");
    XLSX.writeFile(wb, `รายการเครื่องมือ_${format(new Date(), "yyyyMMdd")}.xlsx`);
    toast.success("ส่งออก Excel สำเร็จ");
  };

  const filteredTools = tools.filter(
    (tool) =>
      tool.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.responsible_person?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const {
    paginatedData: paginatedTools, currentPage, pageSize, totalPages, totalItems, handlePageChange, handlePageSizeChange,
  } = useTablePagination(filteredTools, 20);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              รายการเครื่องมือ ({filteredTools.length} รายการ)
            </CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="ค้นหารหัส, ชื่อ, Serial, ผู้รับผิดชอบ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
              <Button variant="outline" size="icon" onClick={handleExport} title="Export Excel">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={fetchTools}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
          ) : filteredTools.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "ไม่พบเครื่องมือที่ค้นหา" : "ยังไม่มีเครื่องมือในระบบ"}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>รหัส</TableHead>
                      <TableHead>ชื่อเครื่องมือ</TableHead>
                      <TableHead>หมวดหมู่</TableHead>
                      <TableHead>ฝ่าย</TableHead>
                      <TableHead>ผู้รับผิดชอบ</TableHead>
                      <TableHead className="text-center">จำนวน</TableHead>
                      <TableHead>ระยะเวลา PM</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead className="text-center">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTools.map((tool) => (
                      <TableRow key={tool.id}>
                        <TableCell className="font-medium">{tool.code}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{tool.name}</div>
                            {tool.brand && <div className="text-xs text-muted-foreground">{tool.brand}</div>}
                          </div>
                        </TableCell>
                        <TableCell>{tool.tool_category?.name || <span className="text-muted-foreground">-</span>}</TableCell>
                        <TableCell>{tool.department || <span className="text-muted-foreground">-</span>}</TableCell>
                        <TableCell>{tool.responsible_person || <span className="text-muted-foreground">-</span>}</TableCell>
                        <TableCell className="text-center">{tool.current_quantity} {tool.unit}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getPMIntervalLabel(tool.pm_interval_days)}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {tool.is_asset && <Badge variant="secondary">ทรัพย์สิน</Badge>}
                            {tool.is_personal_tool && <Badge className="bg-blue-500 text-white">ประจำตัวช่าง</Badge>}
                            {!tool.is_asset && !tool.is_personal_tool && <span className="text-muted-foreground text-xs">-</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="icon" title="แก้ไข" onClick={() => setEditTool(tool)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="ลบ" onClick={() => setDeleteId(tool.id)}>
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
            <AlertDialogDescription>คุณต้องการลบเครื่องมือนี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>ลบ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editTool && (
        <ToolEditForm
          tool={editTool}
          open={!!editTool}
          onOpenChange={(open) => { if (!open) setEditTool(null); }}
          onSuccess={() => { setEditTool(null); fetchTools(); }}
        />
      )}
    </>
  );
}
