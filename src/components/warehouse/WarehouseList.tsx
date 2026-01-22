import { useState, useEffect } from "react";
import { Trash2, AlertCircle, Warehouse, MapPin, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WarehouseForm } from "./WarehouseForm";

interface LocationData {
  id: string;
  code: string;
  name: string;
  storage_area_size: string | null;
  volume_cm3: number | null;
  used_volume_cm3: number | null;
}

interface WarehouseData {
  id: string;
  code: string;
  name: string;
  description: string | null;
  storage_area: string | null;
  department: string | null;
  is_active: boolean | null;
  locations?: LocationData[];
  location_count?: number;
  total_volume_cm3?: number;
  used_volume_cm3?: number;
  remaining_volume_cm3?: number;
}

interface WarehouseListProps {
  refresh: number;
}

export function WarehouseList({ refresh }: WarehouseListProps) {
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteWarehouse, setDeleteWarehouse] = useState<WarehouseData | null>(null);
  const [expandedWarehouses, setExpandedWarehouses] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchWarehouses();
  }, [refresh]);

  const fetchWarehouses = async () => {
    setIsLoading(true);
    try {
      const { data: warehousesData, error: warehousesError } = await supabase
        .from("warehouses")
        .select("*")
        .eq("is_active", true)
        .order("code");

      if (warehousesError) throw warehousesError;

      // Get locations for each warehouse
      const warehousesWithLocations = await Promise.all(
        (warehousesData || []).map(async (warehouse) => {
          const { data: locationsData } = await supabase
            .from("locations")
            .select("id, code, name, storage_area_size, volume_cm3, used_volume_cm3")
            .eq("warehouse_id", warehouse.id)
            .eq("is_active", true);

          const locations = locationsData || [];
          const totalVolume = locations.reduce((sum, loc) => sum + (loc.volume_cm3 || 0), 0);
          const usedVolume = locations.reduce((sum, loc) => sum + (loc.used_volume_cm3 || 0), 0);

          return {
            ...warehouse,
            locations: locations,
            location_count: locations.length,
            total_volume_cm3: totalVolume,
            used_volume_cm3: usedVolume,
            remaining_volume_cm3: totalVolume - usedVolume,
          };
        })
      );

      setWarehouses(warehousesWithLocations);
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
        .from("warehouses")
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

  const toggleExpand = (warehouseId: string) => {
    setExpandedWarehouses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(warehouseId)) {
        newSet.delete(warehouseId);
      } else {
        newSet.add(warehouseId);
      }
      return newSet;
    });
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
            <TableHead className="w-12"></TableHead>
            <TableHead>รหัสคลัง</TableHead>
            <TableHead>ชื่อคลังสินค้า</TableHead>
            <TableHead>ฝ่าย</TableHead>
            <TableHead>ประเภทพื้นที่</TableHead>
            <TableHead className="text-center">จำนวนตำแหน่งจัดเก็บ</TableHead>
            <TableHead className="text-right">พื้นที่ทั้งหมด (m³)</TableHead>
            <TableHead className="text-right">พื้นที่คงเหลือ (m³)</TableHead>
            <TableHead className="text-right">จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {warehouses.map((warehouse) => {
            const isExpanded = expandedWarehouses.has(warehouse.id);
            const hasLocations = (warehouse.locations?.length || 0) > 0;
            
            return (
              <>
                <TableRow key={warehouse.id}>
                  <TableCell>
                    {hasLocations && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => toggleExpand(warehouse.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{warehouse.code}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Warehouse className="h-4 w-4 text-muted-foreground" />
                      {warehouse.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{warehouse.department || "-"}</TableCell>
                  <TableCell>{getStorageAreaBadge(warehouse.storage_area)}</TableCell>
                  <TableCell className="text-center">{warehouse.location_count || 0}</TableCell>
                  <TableCell className="text-right font-medium">
                    {(warehouse.total_volume_cm3 || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={warehouse.remaining_volume_cm3 && warehouse.remaining_volume_cm3 < 0 ? "text-destructive font-medium" : "text-green-600 font-medium"}>
                      {(warehouse.remaining_volume_cm3 || 0).toLocaleString()}
                    </span>
                  </TableCell>
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
                
                {isExpanded && hasLocations && warehouse.locations?.map((location) => (
                  <TableRow key={`loc-${location.id}`} className="bg-muted/30">
                    <TableCell></TableCell>
                    <TableCell className="pl-8">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>└─</span>
                        <MapPin className="h-3 w-3" />
                        {location.code}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{location.name}</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {location.storage_area_size || "-"}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {(location.volume_cm3 || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {((location.volume_cm3 || 0) - (location.used_volume_cm3 || 0)).toLocaleString()}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))}
              </>
            );
          })}
        </TableBody>
      </Table>

      <AlertDialog open={!!deleteWarehouse} onOpenChange={(open) => !open && setDeleteWarehouse(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบคลังสินค้า</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบคลังสินค้า "{deleteWarehouse?.name}" ใช่หรือไม่?
              <br />
              การลบจะไม่ส่งผลกระทบต่อตำแหน่งจัดเก็บที่อยู่ในคลังนี้
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
