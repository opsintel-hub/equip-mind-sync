import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Pencil, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

interface Equipment {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  quantity_in_stock: number;
  min_stock_level: number;
  expiry_date: string | null;
  warranty_expiry_date: string | null;
  location_id: string | null;
  locations?: {
    code: string;
    name: string;
  };
}

interface EquipmentListProps {
  refresh: number;
}

export function EquipmentList({ refresh }: EquipmentListProps) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchEquipment();
  }, [refresh]);

  const fetchEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from("equipment")
        .select(`
          *,
          locations (
            code,
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEquipment(data || []);
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
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รหัส</TableHead>
              <TableHead>ชื่ออุปกรณ์</TableHead>
              <TableHead>หมวดหมู่</TableHead>
              <TableHead>จำนวน</TableHead>
              <TableHead>หน่วย</TableHead>
              <TableHead>ตำแหน่ง</TableHead>
              <TableHead>วันหมดอายุ</TableHead>
              <TableHead>วันหมดรับประกัน</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {equipment.map((item) => (
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
                  {item.expiry_date ? format(new Date(item.expiry_date), "dd/MM/yyyy") : "-"}
                </TableCell>
                <TableCell>
                  {item.warranty_expiry_date ? format(new Date(item.warranty_expiry_date), "dd/MM/yyyy") : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" title="แก้ไข">
                      <Pencil className="h-4 w-4" />
                    </Button>
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
