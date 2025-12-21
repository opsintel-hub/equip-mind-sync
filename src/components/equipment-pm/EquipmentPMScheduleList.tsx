import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { th } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCw, Pencil, Trash2, CheckCircle } from "lucide-react";
import { EquipmentPMScheduleForm } from "./EquipmentPMScheduleForm";

interface EquipmentPMSchedule {
  id: string;
  equipment_id: string;
  department: string;
  equipment_type: string;
  title: string;
  description: string | null;
  schedule_type: string;
  next_due_date: string;
  last_completed_date: string | null;
  advance_notice_days: number;
  is_active: boolean;
  equipment: {
    code: string;
    name: string;
  } | null;
}

const SCHEDULE_TYPE_LABELS: Record<string, string> = {
  monthly: "1 เดือน",
  quarterly: "3 เดือน",
  "semi-annual": "6 เดือน",
  annual: "รายปี",
};

export function EquipmentPMScheduleList() {
  const [schedules, setSchedules] = useState<EquipmentPMSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState<EquipmentPMSchedule | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<EquipmentPMSchedule | null>(null);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completedDate, setCompletedDate] = useState(new Date().toISOString().split("T")[0]);
  const [completedNotes, setCompletedNotes] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("equipment_pm_schedules")
      .select(`
        *,
        equipment:equipment_id (code, name)
      `)
      .eq("is_active", true)
      .order("next_due_date", { ascending: true });

    if (error) {
      toast.error("ไม่สามารถโหลดข้อมูลได้");
    } else {
      setSchedules(data || []);
    }
    setLoading(false);
  };

  const handleEdit = (schedule: EquipmentPMSchedule) => {
    setEditData(schedule);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedSchedule) return;
    
    const { error } = await supabase
      .from("equipment_pm_schedules")
      .delete()
      .eq("id", selectedSchedule.id);

    if (error) {
      toast.error("ไม่สามารถลบข้อมูลได้");
    } else {
      toast.success("ลบข้อมูลสำเร็จ");
      fetchSchedules();
    }
    setDeleteDialogOpen(false);
    setSelectedSchedule(null);
  };

  const calculateNextDueDate = (currentDate: string, scheduleType: string): string => {
    const date = new Date(currentDate);
    switch (scheduleType) {
      case "monthly":
        date.setMonth(date.getMonth() + 1);
        break;
      case "quarterly":
        date.setMonth(date.getMonth() + 3);
        break;
      case "semi-annual":
        date.setMonth(date.getMonth() + 6);
        break;
      case "annual":
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    return date.toISOString().split("T")[0];
  };

  const handleComplete = async () => {
    if (!selectedSchedule) return;

    try {
      // Insert history record
      const { error: historyError } = await supabase
        .from("equipment_pm_history")
        .insert({
          equipment_pm_schedule_id: selectedSchedule.id,
          completed_date: completedDate,
          notes: completedNotes || null,
        });

      if (historyError) throw historyError;

      // Update schedule with new due date
      const newDueDate = calculateNextDueDate(completedDate, selectedSchedule.schedule_type);
      const { error: updateError } = await supabase
        .from("equipment_pm_schedules")
        .update({
          last_completed_date: completedDate,
          next_due_date: newDueDate,
        })
        .eq("id", selectedSchedule.id);

      if (updateError) throw updateError;

      toast.success("บันทึกการทำ PM สำเร็จ");
      fetchSchedules();
    } catch (error: any) {
      toast.error(error.message || "เกิดข้อผิดพลาด");
    }

    setCompleteDialogOpen(false);
    setSelectedSchedule(null);
    setCompletedNotes("");
  };

  const getStatusBadge = (nextDueDate: string) => {
    const daysUntilDue = differenceInDays(new Date(nextDueDate), new Date());
    
    if (daysUntilDue < 0) {
      return <Badge variant="destructive">เลยกำหนด</Badge>;
    } else if (daysUntilDue <= 7) {
      return <Badge className="bg-orange-500">ใกล้ครบกำหนด</Badge>;
    } else if (daysUntilDue <= 30) {
      return <Badge className="bg-yellow-500">เหลือ {daysUntilDue} วัน</Badge>;
    }
    return <Badge variant="secondary">ปกติ</Badge>;
  };

  const filteredSchedules = schedules.filter((s) => {
    if (filterDepartment !== "all" && s.department !== filterDepartment) return false;
    if (filterType !== "all" && s.equipment_type !== filterType) return false;
    return true;
  });

  const departments = [...new Set(schedules.map((s) => s.department))];
  const equipmentTypes = [...new Set(schedules.map((s) => s.equipment_type))];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                ตารางบำรุงรักษาเครื่องมือ (Equipment PM)
              </CardTitle>
              <CardDescription>
                จัดการตารางบำรุงรักษาเครื่องมือเชิงป้องกัน
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchSchedules}>
                <RefreshCw className="h-4 w-4 mr-1" />
                รีเฟรช
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEditData(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                เพิ่มตาราง PM
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="ทุกฝ่าย" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกฝ่าย</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="ทุกประเภท" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกประเภท</SelectItem>
                {equipmentTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8">กำลังโหลด...</div>
          ) : filteredSchedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              ยังไม่มีตาราง PM
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ฝ่าย</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead>เครื่องมือ</TableHead>
                    <TableHead>งาน PM</TableHead>
                    <TableHead>ความถี่</TableHead>
                    <TableHead>วันครบกำหนด</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>ทำล่าสุด</TableHead>
                    <TableHead className="text-right">การดำเนินการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell>{schedule.department}</TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {schedule.equipment_type}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {schedule.equipment?.code}
                        </div>
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {schedule.equipment?.name}
                        </div>
                      </TableCell>
                      <TableCell>{schedule.title}</TableCell>
                      <TableCell>
                        {SCHEDULE_TYPE_LABELS[schedule.schedule_type] || schedule.schedule_type}
                      </TableCell>
                      <TableCell>
                        {format(new Date(schedule.next_due_date), "d MMM yyyy", {
                          locale: th,
                        })}
                      </TableCell>
                      <TableCell>{getStatusBadge(schedule.next_due_date)}</TableCell>
                      <TableCell>
                        {schedule.last_completed_date
                          ? format(new Date(schedule.last_completed_date), "d MMM yyyy", {
                              locale: th,
                            })
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
                            title="ทำ PM เสร็จ"
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(schedule)}
                            title="แก้ไข"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedSchedule(schedule);
                              setDeleteDialogOpen(true);
                            }}
                            title="ลบ"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <EquipmentPMScheduleForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={fetchSchedules}
        editData={editData}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการลบตาราง PM "{selectedSchedule?.title}" ใช่หรือไม่?
              การดำเนินการนี้ไม่สามารถยกเลิกได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>ลบ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>บันทึกการทำ PM</DialogTitle>
            <DialogDescription>
              บันทึกการทำ PM สำหรับ: {selectedSchedule?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">วันที่ทำ PM</label>
              <Input
                type="date"
                value={completedDate}
                onChange={(e) => setCompletedDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">หมายเหตุ</label>
              <Textarea
                placeholder="หมายเหตุ (ถ้ามี)"
                value={completedNotes}
                onChange={(e) => setCompletedNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleComplete}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
