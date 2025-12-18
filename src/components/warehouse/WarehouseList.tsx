import { useState, useEffect } from "react";
import { Trash2, AlertCircle, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WarehouseForm } from "./WarehouseForm";

interface WarehouseData {
  id: string;
  code: string;
  name: string;
  description: string | null;
  storage_area: string | null;
  department: string | null;
  is_active: boolean | null;
  equipment_count?: number;
  total_quantity?: number;
}

interface WarehouseListProps {
  refresh: number;
}

export function WarehouseList({ refresh }: WarehouseListProps) {
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteWarehouse, setDeleteWarehouse] = useState<WarehouseData | null>(null);

  useEffect(() => {
    fetchWarehouses();
  }, [refresh]);

  const fetchWarehouses = async () => {
    setIsLoading(true);
    try {
      const { data: locationsData, error: locationsError } = await supabase
        .from("locations")
        .select("*")
        .eq("is_active", true)
        .order("code");

      if (locationsError) throw locationsError;

      // Get equipment counts for each warehouse
      const warehousesWithCounts = await Promise.all(
        (locationsData || []).map(async (location) => {
          const { data: equipmentData } = await supabase
            .from("equipment")
            .select("id, quantity_in_stock")
            .eq("location_id", location.id)
            .eq("is_active", true);

          return {
            ...location,
            equipment_count: equipmentData?.length || 0,
            total_quantity: equipmentData?.reduce((sum, eq) => sum + (eq.quantity_in_stock || 0), 0) || 0,
          };
        })
      );

      setWarehouses(warehousesWithCounts);
    } catch (error) {
      console.error("Error fetching warehouses:", error);
      toast.error("ไม่สามารถโหลดข้อมูลคลังสินค้าได้");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteWarehouse) return;

    try {
      const { error } = await supabase
        .from("locations")
        .update({ is_active: false })
        .eq("id", deleteWarehouse.id);

      if (error) throw error;
      toast.success("ลบคลังสินค้าสำเร็จ");
      setDeleteWarehouse(null);
      fetchWarehouses();
    } catch (error: any) {
      console.error("Error deleting warehouse:", error);
      toast.error(error.message || "ลบคลังสินค้าไม่สำเร็จ");
    }
  };

  const getStorageAreaBadge = (area: string | null) => {
    switch (area) {
      case "Indoor":
        return <Badge variant="default" className="bg-blue-500">ภายในอาคาร</Badge>;
      case "Outdoor":
        return <Badge variant="default" className="bg-green-500">ภายนอกอาคาร</Badge>;
      case "Semi-outdoor":
        return <Badge variant="default" className="bg-yellow-500">กึ่งภายนอก</Badge>;
      default:
        return <Badge variant="secondary">ไม่ระบุ</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (warehouses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <AlertCircle className="h-12 w-12 mb-4" />
        <p>ยังไม่มีข้อมูลคลังสินค้า</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>รหัสคลัง</TableHead>
            <TableHead>ชื่อคลังสินค้า</TableHead>
            <TableHead>ฝ่าย</TableHead>
            <TableHead>ประเภทพื้นที่</TableHead>
            <TableHead className="text-right">จำนวนรายการสินค้า</TableHead>
            <TableHead className="text-right">จำนวนสินค้ารวม</TableHead>
            <TableHead className="text-right">จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {warehouses.map((warehouse) => (
            <TableRow key={warehouse.id}>
              <TableCell className="font-medium">{warehouse.code}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Warehouse className="h-4 w-4 text-muted-foreground" />
                  {warehouse.name}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{warehouse.department || "-"}</TableCell>
              <TableCell>{getStorageAreaBadge(warehouse.storage_area)}</TableCell>
              <TableCell className="text-right">{warehouse.equipment_count}</TableCell>
              <TableCell className="text-right">{warehouse.total_quantity?.toLocaleString()}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <WarehouseForm editData={warehouse} onSuccess={fetchWarehouses} />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteWarehouse(warehouse)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!deleteWarehouse} onOpenChange={(open) => !open && setDeleteWarehouse(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบคลังสินค้า</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบคลังสินค้า "{deleteWarehouse?.name}" ใช่หรือไม่?
              <br />
              การลบจะไม่ส่งผลกระทบต่ออุปกรณ์ที่เก็บอยู่ในคลังนี้
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
