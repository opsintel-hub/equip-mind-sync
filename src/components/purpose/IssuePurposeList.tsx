import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, MapPin, RotateCcw } from "lucide-react";
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

interface IssuePurpose {
  id: string;
  name: string;
  description: string | null;
  requires_billboard: boolean;
  requires_return: boolean;
  is_active: boolean;
  created_at: string;
}

interface IssuePurposeListProps {
  refresh: number;
}

export function IssuePurposeList({ refresh }: IssuePurposeListProps) {
  const [purposes, setPurposes] = useState<IssuePurpose[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPurposes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("issue_purposes")
        .select("*")
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
        .from("issue_purposes")
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
      const { error } = await supabase.from("issue_purposes").delete().eq("id", id);
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
            <TableHead>คำอธิบาย</TableHead>
            <TableHead>เงื่อนไข</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead className="w-24">จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {purposes.map((purpose) => (
            <TableRow key={purpose.id}>
              <TableCell className="font-medium">{purpose.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {purpose.description || "-"}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {purpose.requires_billboard && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      <MapPin className="h-3 w-3 mr-1" />
                      ต้องระบุป้าย
                    </Badge>
                  )}
                  {purpose.requires_return && (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      <RotateCcw className="h-3 w-3 mr-1" />
                      ต้องรับคืน
                    </Badge>
                  )}
                  {!purpose.requires_billboard && !purpose.requires_return && (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Switch
                  checked={purpose.is_active || false}
                  onCheckedChange={() => handleToggleActive(purpose.id, purpose.is_active || false)}
                />
              </TableCell>
              <TableCell>
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
