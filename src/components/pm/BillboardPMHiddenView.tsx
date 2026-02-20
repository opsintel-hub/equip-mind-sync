import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface HiddenRecord {
  id: string;
  billboard_id: string;
  snooze_until: string;
  pm_reason: string;
  notes: string | null;
  created_at: string;
  billboards: {
    old_code: string | null;
    equipment_id: string;
    department: string | null;
    media_type: string | null;
    location_name: string | null;
  } | null;
  pm_action_types: {
    name: string;
  } | null;
}

interface BillboardPMHiddenViewProps {
  hiddenRecords: HiddenRecord[];
  onRefresh: () => void;
}

export function BillboardPMHiddenView({ hiddenRecords, onRefresh }: BillboardPMHiddenViewProps) {
  const [visible, setVisible] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUnsnooze = async () => {
    if (!deleteId) return;
    setLoading(true);
    try {
      await supabase.from("billboard_pm_actions").delete().eq("id", deleteId);
      toast.success("ยกเลิกการซ่อนป้ายแล้ว");
      onRefresh();
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        variant={visible ? "default" : "outline"}
        size="sm"
        onClick={() => setVisible(!visible)}
        className="gap-2"
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        {visible ? "ซ่อนรายการที่ถูกซ่อน" : `แสดงรายการที่ซ่อนไว้ทั้งหมด (${hiddenRecords.length})`}
      </Button>

      {visible && hiddenRecords.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-warning/10 border-b border-warning/20 px-4 py-2">
            <p className="text-sm font-medium text-warning-foreground flex items-center gap-2">
              <Eye className="w-4 h-4 text-warning" />
              รายการที่ถูกซ่อนชั่วคราว (เฉพาะผู้ดูแลระบบ)
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Old Code</TableHead>
                <TableHead>Equipment ID</TableHead>
                <TableHead>ฝ่าย</TableHead>
                <TableHead>Media Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>เหตุผล PM</TableHead>
                <TableHead>ซ่อนจนถึง</TableHead>
                <TableHead>หมายเหตุ</TableHead>
                <TableHead>จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hiddenRecords.map(record => {
                const snoozeDate = new Date(record.snooze_until);
                const isExpired = snoozeDate < new Date();
                return (
                  <TableRow key={record.id} className="bg-warning/5">
                    <TableCell className="font-medium">{record.billboards?.old_code || "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{record.billboards?.equipment_id}</TableCell>
                    <TableCell>{record.billboards?.department || "-"}</TableCell>
                    <TableCell>{record.billboards?.media_type || "-"}</TableCell>
                    <TableCell>{record.billboards?.location_name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={record.pm_reason === "expiry" ? "destructive" : "secondary"} className="text-xs">
                        {record.pm_reason === "expiry" ? "หมดอายุ" : "หมดประกัน"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={isExpired ? "destructive" : "outline"} className="text-xs">
                        {format(snoozeDate, "dd/MM/yyyy", { locale: th })}
                        {isExpired && " (หมดแล้ว)"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{record.notes || "-"}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(record.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {visible && hiddenRecords.length === 0 && (
        <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg">
          ไม่มีรายการที่ถูกซ่อน
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการยกเลิกการซ่อน</AlertDialogTitle>
            <AlertDialogDescription>
              ป้ายนี้จะกลับมาแสดงในรายการ "แจ้ง PM ป้ายโฆษณา" อีกครั้ง
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnsnooze} disabled={loading}>
              ยืนยัน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
