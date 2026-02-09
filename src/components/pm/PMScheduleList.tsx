import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, CheckCircle, Calendar, RefreshCw } from "lucide-react";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, differenceInDays, addDays, addWeeks, addMonths, addYears } from "date-fns";
import { th } from "date-fns/locale";
import { PMScheduleForm } from "./PMScheduleForm";
import { PMScheduleImport } from "./PMScheduleImport";

interface PMSchedule {
  id: string;
  billboard_id: string;
  title: string;
  description: string | null;
  schedule_type: string;
  next_due_date: string;
  last_completed_date: string | null;
  advance_notice_days: number;
  is_active: boolean;
  billboards?: {
    old_code: string | null;
    equipment_id: string;
    location_name: string | null;
  };
}

export function PMScheduleList() {
  const [schedules, setSchedules] = useState<PMSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState<PMSchedule | null>(null);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<PMSchedule | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [completionDate, setCompletionDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("pm_schedules")
        .select(`
          *,
          billboards(old_code, equipment_id, location_name)
        `)
        .order("next_due_date", { ascending: true });

      if (error) throw error;
      setSchedules((data as PMSchedule[]) || []);
    } catch (error: any) {
      console.error("Error fetching PM schedules:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("pm_schedules").delete().eq("id", id);
      if (error) throw error;
      toast.success("ลบตาราง PM เรียบร้อยแล้ว");
      fetchSchedules();
    } catch (error: any) {
      console.error("Error deleting PM schedule:", error);
      toast.error("เกิดข้อผิดพลาดในการลบ");
    }
  };

  const calculateNextDueDate = (currentDate: string, scheduleType: string): string => {
    const date = new Date(currentDate);
    switch (scheduleType) {
      case "daily":
        return format(addDays(date, 1), "yyyy-MM-dd");
      case "weekly":
        return format(addWeeks(date, 1), "yyyy-MM-dd");
      case "monthly":
        return format(addMonths(date, 1), "yyyy-MM-dd");
      case "quarterly":
        return format(addMonths(date, 3), "yyyy-MM-dd");
      case "yearly":
        return format(addYears(date, 1), "yyyy-MM-dd");
      default:
        return format(addMonths(date, 1), "yyyy-MM-dd");
    }
  };

  const handleComplete = async () => {
    if (!selectedSchedule) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Insert completion history
      const { error: historyError } = await supabase.from("pm_history").insert({
        pm_schedule_id: selectedSchedule.id,
        completed_date: completionDate,
        completed_by: user?.id,
        notes: completionNotes || null,
      });

      if (historyError) throw historyError;

      // Update schedule with next due date
      const nextDueDate = calculateNextDueDate(completionDate, selectedSchedule.schedule_type);
      const { error: updateError } = await supabase
        .from("pm_schedules")
        .update({
          last_completed_date: completionDate,
          next_due_date: nextDueDate,
        })
        .eq("id", selectedSchedule.id);

      if (updateError) throw updateError;

      toast.success("บันทึกการทำ PM เรียบร้อยแล้ว");
      setCompleteDialogOpen(false);
      setCompletionNotes("");
      setCompletionDate(format(new Date(), "yyyy-MM-dd"));
      fetchSchedules();
    } catch (error: any) {
      console.error("Error completing PM:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  const getScheduleTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      daily: "รายวัน",
      weekly: "รายสัปดาห์",
      monthly: "รายเดือน",
      quarterly: "รายไตรมาส",
      yearly: "รายปี",
    };
    return labels[type] || type;
  };

  const getStatusBadge = (nextDueDate: string) => {
    const daysUntil = differenceInDays(new Date(nextDueDate), new Date());

    if (daysUntil < 0) {
      return <Badge variant="destructive">เลยกำหนด {Math.abs(daysUntil)} วัน</Badge>;
    } else if (daysUntil <= 3) {
      return <Badge variant="destructive">อีก {daysUntil} วัน</Badge>;
    } else if (daysUntil <= 7) {
      return <Badge className="bg-yellow-500">อีก {daysUntil} วัน</Badge>;
    } else {
      return <Badge variant="secondary">อีก {daysUntil} วัน</Badge>;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                ตารางบำรุงรักษา (PM Schedule)
              </CardTitle>
              <CardDescription>
                จัดการตารางบำรุงรักษาป้ายโฆษณาเชิงป้องกัน
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={fetchSchedules}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
              <PMScheduleImport onSuccess={fetchSchedules} />
              <Button onClick={() => { setEditData(null); setFormOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มตาราง PM
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              กำลังโหลด...
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              ยังไม่มีตาราง PM
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ป้ายโฆษณา</TableHead>
                  <TableHead>งาน PM</TableHead>
                  <TableHead>รอบ</TableHead>
                  <TableHead>กำหนดถัดไป</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>ทำล่าสุด</TableHead>
                  <TableHead className="text-right">การดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell>
                      <div className="font-medium">
                        {schedule.billboards?.old_code || schedule.billboards?.equipment_id}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {schedule.billboards?.location_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{schedule.title}</div>
                      {schedule.description && (
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {schedule.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{getScheduleTypeLabel(schedule.schedule_type)}</TableCell>
                    <TableCell>
                      {format(new Date(schedule.next_due_date), "d MMM yyyy", { locale: th })}
                    </TableCell>
                    <TableCell>{getStatusBadge(schedule.next_due_date)}</TableCell>
                    <TableCell>
                      {schedule.last_completed_date
                        ? format(new Date(schedule.last_completed_date), "d MMM yyyy", { locale: th })
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedSchedule(schedule);
                            setCompleteDialogOpen(true);
                          }}
                          title="บันทึกการทำ PM"
                        >
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditData(schedule);
                            setFormOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
                              <AlertDialogDescription>
                                คุณต้องการลบตาราง PM "{schedule.title}" ใช่หรือไม่?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(schedule.id)}>
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
          )}
        </CardContent>
      </Card>

      <PMScheduleForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={fetchSchedules}
        editData={editData}
      />

      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>บันทึกการทำ PM</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>งาน PM</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedSchedule?.title} - {selectedSchedule?.billboards?.equipment_id}
              </p>
            </div>
            <div>
              <Label htmlFor="completion_date">วันที่ทำ PM</Label>
              <Input
                id="completion_date"
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="notes">หมายเหตุ</Label>
              <Textarea
                id="notes"
                placeholder="รายละเอียดการทำ PM..."
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleComplete}>
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
