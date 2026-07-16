import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Trash2, AlertCircle, Download, Search, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EquipmentTransferForm } from "./EquipmentTransferForm";
import { EquipmentEditForm } from "./EquipmentEditForm";
import { EquipmentSNViewer } from "./EquipmentSNViewer";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import * as XLSX from "xlsx";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDeptScope } from "@/hooks/useDeptScope";

interface Equipment {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  category: string;
  subcategory_id?: string | null;
  company_id?: string | null;
  department: string | null;
  brand: string | null;
  unit: string;
  quantity_in_stock: number;
  min_stock_level: number | null;
  expiry_date: string | null;
  warranty_expiry_date: string | null;
  location_id: string | null;
  serial_number?: string | null;
  unit_price: number;
  warehouse_entry_date: string;
  item_condition?: string;
  notes?: string | null;
  volt?: number | null;
  amp?: number | null;
  watt?: number | null;
  lumen?: number | null;
  lux?: number | null;
  locations?: {
    code: string;
    name: string;
  };
  companies?: {
    name: string;
  };
}

interface EquipmentListProps {
  refresh: number;
}

export function EquipmentList({ refresh }: EquipmentListProps) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { isSuperAdmin, viewableDepts, deptKey } = useDeptScope();

  useEffect(() => {
    fetchEquipment();
  }, [refresh, deptKey]);

  const fetchEquipment = async () => {
    try {
      let query = supabase
        .from("equipment")
        .select(`
          *,
          locations (
            code,
            name
          ),
          companies (
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (!isSuperAdmin) {
        const depts = viewableDepts || [];
        query = query.in("department", depts.length > 0 ? depts : ["__no_dept_permission__"]);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEquipment(data || []);
      setFilteredEquipment(data || []);
    } catch (error: any) {
      console.error("Error fetching equipment:", error);
      toast.error("ไม่สามารถโหลดข้อมูลอุปกรณ์ได้");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase.from("equipment").delete().eq("id", deleteId);

      if (error) throw error;

      toast.success("ลบอุปกรณ์สำเร็จ");
      fetchEquipment();
    } catch (error: any) {
      console.error("Error deleting equipment:", error);
      toast.error(error.message || "ลบอุปกรณ์ไม่สำเร็จ");
    } finally {
      setDeleteId(null);
    }
  };

  useEffect(() => {
    if (searchTerm) {
      const filtered = equipment.filter(
        (item) =>
          item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.department && item.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (item.serial_number && item.serial_number.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredEquipment(filtered);
    } else {
      setFilteredEquipment(equipment);
    }
  }, [searchTerm, equipment]);

  const {
    paginatedData: paginatedEquipment,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = useTablePagination(filteredEquipment, 20);

  const handleExport = () => {
    const conditionLabel = (c: string) => {
      switch (c) {
        case 'defective': return 'เสีย/ชำรุด';
        case 'pending_inspection': return 'รอตรวจสอบ';
        default: return 'ปกติ';
      }
    };
    const exportData = filteredEquipment.map((item: any) => ({
      "รหัสอุปกรณ์": item.code,
      "ชื่ออุปกรณ์": item.name,
      "หมวดหมู่": item.category,
      "บริษัท": item.companies?.name || "-",
      "ฝ่าย": item.department || "-",
      "ยี่ห้อ": item.brand || "-",
      "จำนวน": item.quantity_in_stock,
      "หน่วย": item.unit,
      "ตำแหน่งจัดเก็บ": item.locations?.name || "-",
      "สภาพสินค้า": conditionLabel(item.item_condition || 'normal'),
      "โวลท์ (V)": item.volt || "-",
      "แอมป์ (A)": item.amp || "-",
      "วัตต์ (W)": item.watt || "-",
      "ลูเมน (lm)": item.lumen || "-",
      "ลักซ์ (lx)": item.lux || "-",
      "วันหมดอายุ": item.expiry_date || "-",
      "วันหมดประกัน": item.warranty_expiry_date || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Equipment");
    XLSX.writeFile(wb, `equipment_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("ส่งออกข้อมูลสำเร็จ");
  };

  const isLowStock = (item: Equipment) => item.quantity_in_stock <= item.min_stock_level;

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">กำลังโหลดข้อมูล...</div>;
  }

  if (equipment.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-muted-foreground">ยังไม่มีข้อมูลอุปกรณ์</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาด้วยรหัส, ชื่อ, S/N, หมวดหมู่, ฝ่าย, หรือยี่ห้อ..."
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
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รหัส</TableHead>
              <TableHead>ชื่ออุปกรณ์</TableHead>
              <TableHead>หมวดหมู่</TableHead>
              <TableHead>บริษัท</TableHead>
              <TableHead>ฝ่าย</TableHead>
              <TableHead>ยี่ห้อ</TableHead>
              <TableHead>จำนวน</TableHead>
              <TableHead>หน่วย</TableHead>
              <TableHead>ตำแหน่ง</TableHead>
              <TableHead>สภาพ</TableHead>
              <TableHead>วันหมดอายุ</TableHead>
              <TableHead>วันหมดรับประกัน</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
        <TableBody>
          {paginatedEquipment.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.code}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {item.name}
                    {isLowStock(item) && (
                      <Badge variant="destructive" className="text-xs">
                        ใกล้หมด
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell>{item.companies?.name || "-"}</TableCell>
                <TableCell>{item.department || "-"}</TableCell>
                <TableCell>{item.brand || "-"}</TableCell>
                <TableCell>
                  <span className={isLowStock(item) ? "text-destructive font-semibold" : ""}>
                    {item.quantity_in_stock}
                  </span>
                  <span className="text-muted-foreground text-sm"> / {item.min_stock_level}</span>
                </TableCell>
                <TableCell>{item.unit}</TableCell>
                <TableCell>
                  {item.locations ? `${item.locations.code}` : "-"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${
                    item.item_condition === 'defective' ? 'bg-destructive/10 text-destructive border-destructive/30' :
                    item.item_condition === 'pending_inspection' ? 'bg-warning/10 text-warning border-warning/30' :
                    'bg-green-500/10 text-green-600 border-green-500/30'
                  }`}>
                    {item.item_condition === 'defective' ? 'เสีย/ชำรุด' : item.item_condition === 'pending_inspection' ? 'รอตรวจสอบ' : 'ปกติ'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {item.expiry_date ? format(new Date(item.expiry_date), "dd/MM/yyyy") : "-"}
                </TableCell>
                <TableCell>
                  {item.warranty_expiry_date ? format(new Date(item.warranty_expiry_date), "dd/MM/yyyy") : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <EquipmentSNViewer equipmentId={item.id} equipmentCode={item.code} equipmentName={item.name} />
                    <EquipmentTransferForm
                      equipment={item}
                      onSuccess={fetchEquipment}
                    />
                    <EquipmentEditForm
                      equipment={item}
                      onSuccess={fetchEquipment}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      title="ลบ"
                      onClick={() => setDeleteId(item.id)}
                    >
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
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบอุปกรณ์นี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้
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
