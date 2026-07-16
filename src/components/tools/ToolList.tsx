import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RefreshCw, Search, Trash2, Pencil, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { ToolEditForm } from "./ToolEditForm";
import * as XLSX from "xlsx";
import { useDeptScope } from "@/hooks/useDeptScope";

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
  tool_subcategory_id: string | null;
  company_id: string | null;
  location_id: string | null;
  supplier_id: string | null;
  notes: string | null;
  warehouse_entry_date: string;
  tool_category: { name: string } | null;
  company: { name: string } | null;
  location: { name: string } | null;
  supplier: { name: string } | null;
}

interface ToolListProps {
  refreshKey?: number;
}

export function ToolList({ refreshKey }: ToolListProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editTool, setEditTool] = useState<Tool | null>(null);
  const { isSuperAdmin, viewableDepts, deptKey } = useDeptScope();

  useEffect(() => {
    fetchTools();
  }, [refreshKey, deptKey]);

  const fetchTools = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("tools")
        .select(`
          *,
          tool_category:tool_categories(name),
          company:companies(name),
          location:locations(name),
          supplier:suppliers(name)
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!isSuperAdmin) {
        const depts = viewableDepts || [];
        query = query.in("department", depts.length > 0 ? depts : ["__no_dept_permission__"]);
      }

      const { data, error } = await query;
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
      case 15: return "15 วัน";
      case 30: return "30 วัน";
      case 60: return "60 วัน";
      case 90: return "90 วัน";
      case 180: return "180 วัน";
      case 365: return "1 ปี";
      default: return `${days} วัน`;
    }
  };

  // Unique filter options
  const categories = [...new Set(tools.map(t => t.tool_category?.name).filter(Boolean))] as string[];
  const departments = [...new Set(tools.map(t => t.department).filter(Boolean))] as string[];

  const filteredTools = tools.filter((tool) => {
    const matchSearch =
      tool.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tool.serial_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tool.responsible_person || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tool.brand || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchCategory = categoryFilter === "all" || tool.tool_category?.name === categoryFilter;
    const matchDepartment = departmentFilter === "all" || tool.department === departmentFilter;
    const matchType = typeFilter === "all" ||
      (typeFilter === "asset" && tool.is_asset) ||
      (typeFilter === "personal" && tool.is_personal_tool) ||
      (typeFilter === "warranty" && tool.has_warranty);

    return matchSearch && matchCategory && matchDepartment && matchType;
  });

  const {
    paginatedData: paginatedTools, currentPage, pageSize, totalPages, totalItems, handlePageChange, handlePageSizeChange,
  } = useTablePagination(filteredTools, 20);

  const handleExport = () => {
    const exportData = filteredTools.map((tool) => ({
      "รหัส": tool.code,
      "ชื่อเครื่องมือ": tool.name,
      "หมวดหมู่": tool.tool_category?.name || "",
      "ฝ่าย": tool.department || "",
      "บริษัท": tool.company?.name || "",
      "ยี่ห้อ": tool.brand || "",
      "Serial No.": tool.serial_number || "",
      "จำนวน": tool.current_quantity,
      "หน่วย": tool.unit,
      "ราคา/ชิ้น": tool.unit_price,
      "คลังสินค้า": tool.location?.name || "",
      "ผู้จัดจำหน่าย": tool.supplier?.name || "",
      "ระยะเวลา PM": getPMIntervalLabel(tool.pm_interval_days),
      "เป็นทรัพย์สิน": tool.is_asset ? "ใช่" : "ไม่ใช่",
      "เลขที่ทรัพย์สิน": tool.asset_code || "",
      "ผู้รับผิดชอบ": tool.responsible_person || "",
      "ประจำตัวช่าง": tool.is_personal_tool ? "ใช่" : "ไม่ใช่",
      "มีประกัน": tool.has_warranty ? "มี" : "ไม่มี",
      "วันหมดประกัน": tool.warranty_expiry_date || "",
      "วันหมดอายุ": tool.expiry_date || "",
      "วันที่นำเข้าคลัง": tool.warehouse_entry_date || "",
      "หมายเหตุ": tool.notes || "",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tools");
    XLSX.writeFile(wb, `รายการเครื่องมือ_${format(new Date(), "yyyyMMdd")}.xlsx`);
    toast.success("ส่งออก Excel สำเร็จ");
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="ค้นหารหัส, ชื่อ, S/N, ยี่ห้อ, ผู้รับผิดชอบ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handleExport} title="Export Excel">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={fetchTools}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="ทุกหมวดหมู่" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกหมวดหมู่</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="ทุกฝ่าย" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกฝ่าย</SelectItem>
              {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="ทุกประเภท" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกประเภท</SelectItem>
              <SelectItem value="asset">ทรัพย์สิน</SelectItem>
              <SelectItem value="personal">ประจำตัวช่าง</SelectItem>
              <SelectItem value="warranty">มีประกัน</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">พบ {filteredTools.length} รายการ</p>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
      ) : filteredTools.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchTerm || categoryFilter !== "all" || departmentFilter !== "all" || typeFilter !== "all"
            ? "ไม่พบเครื่องมือที่ตรงกับเงื่อนไข"
            : "ยังไม่มีเครื่องมือในระบบ — กด 'เพิ่มเครื่องมือ' หรือ 'Import Excel' เพื่อเริ่มต้น"}
        </div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="block sm:hidden space-y-3">
            {paginatedTools.map((tool) => (
              <div key={tool.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-medium">{tool.code}</p>
                    <p className="text-sm font-medium text-foreground">{tool.name}</p>
                    {tool.brand && <p className="text-xs text-muted-foreground">{tool.brand}</p>}
                  </div>
                  <div className="flex flex-wrap gap-1 flex-shrink-0">
                    {tool.is_asset && <Badge variant="secondary" className="text-xs">ทรัพย์สิน</Badge>}
                    {tool.is_personal_tool && <Badge className="bg-primary/80 text-primary-foreground text-xs">ช่าง</Badge>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs text-muted-foreground">
                  <div>หมวดหมู่: <span className="text-foreground">{tool.tool_category?.name || "-"}</span></div>
                  <div>ฝ่าย: <span className="text-foreground">{tool.department || "-"}</span></div>
                  <div>จำนวน: <span className="font-medium text-foreground">{tool.current_quantity} {tool.unit}</span></div>
                  <div>ราคา: <span className="text-foreground">{tool.unit_price?.toLocaleString() || 0} ฿</span></div>
                  <div>S/N: <span className="font-mono text-foreground">{tool.serial_number || "-"}</span></div>
                  <div>PM: <span className="text-foreground">{getPMIntervalLabel(tool.pm_interval_days)}</span></div>
                  {tool.responsible_person && <div className="col-span-2">ผู้รับผิดชอบ: {tool.responsible_person}</div>}
                  {tool.warranty_expiry_date && <div className="col-span-2">ประกันถึง: {tool.warranty_expiry_date}</div>}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => setEditTool(tool)}>
                    <Pencil className="h-3.5 w-3.5" /> แก้ไข
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-destructive border-destructive/50" onClick={() => setDeleteId(tool.id)}>
                    <Trash2 className="h-3.5 w-3.5" /> ลบ
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="hidden sm:block overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>รหัส</TableHead>
                  <TableHead>ชื่อเครื่องมือ</TableHead>
                  <TableHead>หมวดหมู่</TableHead>
                  <TableHead>ฝ่าย</TableHead>
                  <TableHead>S/N</TableHead>
                  <TableHead className="text-center">จำนวน</TableHead>
                  <TableHead className="text-right">ราคา/ชิ้น</TableHead>
                  <TableHead>ผู้รับผิดชอบ</TableHead>
                  <TableHead>PM</TableHead>
                  <TableHead>ประกันถึง</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead className="text-center">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTools.map((tool) => (
                  <TableRow key={tool.id}>
                    <TableCell className="font-mono text-sm">{tool.code}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{tool.name}</div>
                        {tool.brand && <div className="text-xs text-muted-foreground">{tool.brand}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{tool.tool_category?.name || <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell className="text-sm">{tool.department || <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell className="font-mono text-sm">{tool.serial_number || <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell className="text-center">{tool.current_quantity} {tool.unit}</TableCell>
                    <TableCell className="text-right text-sm">{tool.unit_price?.toLocaleString() || 0}</TableCell>
                    <TableCell className="text-sm">{tool.responsible_person || <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{getPMIntervalLabel(tool.pm_interval_days)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {tool.warranty_expiry_date || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {tool.is_asset && <Badge variant="secondary" className="text-xs">ทรัพย์สิน</Badge>}
                        {tool.is_personal_tool && <Badge className="bg-primary/80 text-primary-foreground text-xs">ช่าง</Badge>}
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

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-lg">
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
    </div>
  );
}
