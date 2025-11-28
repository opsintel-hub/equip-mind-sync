import { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { LocationForm } from "./LocationForm";

interface Location {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

interface LocationListProps {
  refresh: number;
}

export function LocationList({ refresh }: LocationListProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchLocations();
  }, [refresh]);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .order("code");

      if (error) throw error;
      setLocations(data || []);
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาดในการดึงข้อมูล: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("locations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("ลบตำแหน่งจัดเก็บสำเร็จ");
      fetchLocations();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setDeleteId(null);
    }
  };

  if (loading) {
    return <div className="text-center py-8">กำลังโหลด...</div>;
  }

  if (locations.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        ยังไม่มีข้อมูลตำแหน่งจัดเก็บ
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>รหัส</TableHead>
            <TableHead>ชื่อตำแหน่ง</TableHead>
            <TableHead>รายละเอียด</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead className="text-right">จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {locations.map((location) => (
            <TableRow key={location.id}>
              <TableCell className="font-medium">{location.code}</TableCell>
              <TableCell>{location.name}</TableCell>
              <TableCell className="max-w-md truncate">
                {location.description || "-"}
              </TableCell>
              <TableCell>
                <Badge variant={location.is_active ? "default" : "secondary"}>
                  {location.is_active ? "ใช้งาน" : "ไม่ใช้งาน"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <LocationForm
                    onSuccess={fetchLocations}
                    location={location}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteId(location.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบตำแหน่งจัดเก็บนี้?
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
