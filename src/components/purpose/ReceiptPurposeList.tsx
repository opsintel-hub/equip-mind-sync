import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Package, MapPin, Clock } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ReceiptPurposeForm } from "./ReceiptPurposeForm";

interface ReceiptPurpose {
  id: string;
  name: string;
  description: string | null;
  purpose_type: string;
  max_storage_days: number | null;
  requires_location: boolean;
  is_active: boolean | null;
  created_at: string;
}

interface ReceiptPurposeListProps {
  refresh: number;
  onRefresh: () => void;
}

export function ReceiptPurposeList({ refresh, onRefresh }: ReceiptPurposeListProps) {
  const [purposes, setPurposes] = useState<ReceiptPurpose[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPurposes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("receipt_purposes")
        .select("*")
        .order("purpose_type", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;
      setPurposes(data || []);
    } catch (error: any) {
      toast.error("โหลดข้อมูลไม่สำเร็จ: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurposes();
  }, [refresh]);

  const handleToggleActive = async (id: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from("receipt_purposes")
        .update({ is_active: !currentValue })
        .eq("id", id);

      if (error) throw error;
      toast.success("อัปเดตสถานะสำเร็จ");
      fetchPurposes();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("receipt_purposes").delete().eq("id", id);
      if (error) throw error;
      toast.success("ลบวัตถุประสงค์สำเร็จ");
      fetchPurposes();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>;
  }

  if (purposes.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">ยังไม่มีข้อมูลวัตถุประสงค์</div>;
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>ชื่อวัตถุประสงค์</TableHead>
            <TableHead>ประเภท</TableHead>
            <TableHead>เงื่อนไข</TableHead>
            <TableHead>คำอธิบาย</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead className="w-24">จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {purposes.map((purpose) => (
            <TableRow key={purpose.id}>
              <TableCell className="font-medium">{purpose.name}</TableCell>
              <TableCell>
                <Badge 
                  variant="secondary" 
                  className={purpose.purpose_type === "storage" 
                    ? "bg-yellow-100 text-yellow-800" 
                    : "bg-green-100 text-green-800"
                  }
                >
                  <Package className="h-3 w-3 mr-1" />
                  {purpose.purpose_type === "storage" ? "ฝากเก็บ" : "นำเข้าปกติ"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {purpose.max_storage_days && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      <Clock className="h-3 w-3 mr-1" />
                      {purpose.max_storage_days === 1 
                        ? "ไม่เกิน 24 ชม." 
                        : `ไม่เกิน ${purpose.max_storage_days} วัน`}
                    </Badge>
                  )}
                  {purpose.requires_location && (
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                      <MapPin className="h-3 w-3 mr-1" />
                      ต้องระบุตำแหน่ง
                    </Badge>
                  )}
                  {!purpose.max_storage_days && !purpose.requires_location && (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {purpose.description || "-"}
              </TableCell>
              <TableCell>
                <Switch
                  checked={purpose.is_active || false}
                  onCheckedChange={() => handleToggleActive(purpose.id, purpose.is_active || false)}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <ReceiptPurposeForm purpose={purpose} onSuccess={onRefresh} />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
                        <AlertDialogDescription>
                          คุณต้องการลบวัตถุประสงค์ "{purpose.name}" ใช่หรือไม่?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(purpose.id)}>
                          ลบ
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
