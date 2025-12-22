import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RefreshCw, ClipboardCheck, Image, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface EquipmentPMTask {
  id: string;
  task_number: string;
  status: string;
  inspection_result: string | null;
  inspection_notes: string | null;
  observation_details: string | null;
  quantity_checked: number | null;
  inspection_date: string | null;
  inspected_by: string | null;
  due_date: string;
  parent_task_id: string | null;
  created_at: string;
  equipment_pm_schedule_id: string;
  schedule?: {
    title: string;
    department: string;
    equipment_type: string;
    equipment?: {
      name: string;
      code: string;
    };
  };
  images?: {
    id: string;
    image_url: string;
    description: string | null;
  }[];
  inspector?: {
    full_name: string;
  };
}

const STATUS_LABELS: Record<string, string> = {
  pending: "รอดำเนินการ",
  in_progress: "กำลังดำเนินการ",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
};

const RESULT_LABELS: Record<string, string> = {
  passed: "ผ่าน",
  passed_incomplete: "ผ่านไม่สมบูรณ์",
  failed: "ไม่ผ่าน",
  recheck: "ตรวจสอบใหม่อีกครั้ง",
};

const RESULT_COLORS: Record<string, string> = {
  passed: "bg-green-500",
  passed_incomplete: "bg-yellow-500",
  failed: "bg-red-500",
  recheck: "bg-blue-500",
};

export function EquipmentPMTaskList() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<EquipmentPMTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [inspectionDialogOpen, setInspectionDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<EquipmentPMTask | null>(null);
  
  // Inspection form state
  const [inspectionResult, setInspectionResult] = useState<string>("");
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [observationDetails, setObservationDetails] = useState("");
  const [quantityChecked, setQuantityChecked] = useState("");
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("equipment_pm_tasks")
        .select(`
          *,
          schedule:equipment_pm_schedule_id (
            title,
            department,
            equipment_type,
            equipment:equipment_id (
              name,
              code
            )
          )
        `)
        .order("due_date", { ascending: true });

      if (error) throw error;

      // Fetch images for each task
      const tasksWithImages = await Promise.all(
        (data || []).map(async (task) => {
          const { data: images } = await supabase
            .from("equipment_pm_task_images")
            .select("id, image_url, description")
            .eq("equipment_pm_task_id", task.id);

          // Fetch inspector info
          let inspector = null;
          if (task.inspected_by) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", task.inspected_by)
              .maybeSingle();
            inspector = profile;
          }

          return { ...task, images: images || [], inspector };
        })
      );

      setTasks(tasksWithImages);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("ไม่สามารถโหลดข้อมูลงาน PM ได้");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInspection = (task: EquipmentPMTask) => {
    setSelectedTask(task);
    setInspectionResult(task.inspection_result || "");
    setInspectionNotes(task.inspection_notes || "");
    setObservationDetails(task.observation_details || "");
    setQuantityChecked(task.quantity_checked?.toString() || "");
    setUploadedImages([]);
    setInspectionDialogOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedImages((prev) => [...prev, ...files]);
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (taskId: string): Promise<string[]> => {
    const urls: string[] = [];

    for (const file of uploadedImages) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${taskId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("pm-task-images")
        .upload(fileName, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        continue;
      }

      const { data: publicUrl } = supabase.storage
        .from("pm-task-images")
        .getPublicUrl(fileName);

      urls.push(publicUrl.publicUrl);
    }

    return urls;
  };

  const calculateNextDueDate = (scheduleType: string, currentDate: Date): Date => {
    const next = new Date(currentDate);
    switch (scheduleType) {
      case "weekly":
        next.setDate(next.getDate() + 7);
        break;
      case "biweekly":
        next.setDate(next.getDate() + 14);
        break;
      case "monthly":
        next.setMonth(next.getMonth() + 1);
        break;
      case "quarterly":
        next.setMonth(next.getMonth() + 3);
        break;
      case "semi_annual":
        next.setMonth(next.getMonth() + 6);
        break;
      case "annual":
        next.setFullYear(next.getFullYear() + 1);
        break;
      default:
        next.setMonth(next.getMonth() + 1);
    }
    return next;
  };

  const handleSubmitInspection = async () => {
    if (!selectedTask || !inspectionResult) {
      toast.error("กรุณาเลือกผลการตรวจสอบ");
      return;
    }

    setUploading(true);
    try {
      // Upload images first
      let imageUrls: string[] = [];
      if (uploadedImages.length > 0) {
        imageUrls = await uploadImages(selectedTask.id);
      }

      // Update task with inspection results
      const { error: updateError } = await supabase
        .from("equipment_pm_tasks")
        .update({
          status: inspectionResult === "recheck" ? "pending" : "completed",
          inspection_result: inspectionResult,
          inspection_notes: inspectionNotes,
          observation_details: observationDetails,
          quantity_checked: quantityChecked ? parseInt(quantityChecked) : null,
          inspection_date: new Date().toISOString(),
          inspected_by: user?.id,
        })
        .eq("id", selectedTask.id);

      if (updateError) throw updateError;

      // Insert image records
      if (imageUrls.length > 0) {
        const imageRecords = imageUrls.map((url) => ({
          equipment_pm_task_id: selectedTask.id,
          image_url: url,
          created_by: user?.id,
        }));

        const { error: imageError } = await supabase
          .from("equipment_pm_task_images")
          .insert(imageRecords);

        if (imageError) console.error("Image insert error:", imageError);
      }

      // Handle post-inspection logic based on result
      if (inspectionResult === "passed") {
        // Close task and calculate next PM date
        const { data: scheduleData } = await supabase
          .from("equipment_pm_schedules")
          .select("schedule_type")
          .eq("id", selectedTask.equipment_pm_schedule_id)
          .single();

        if (scheduleData) {
          const nextDueDate = calculateNextDueDate(scheduleData.schedule_type, new Date());
          await supabase
            .from("equipment_pm_schedules")
            .update({
              next_due_date: nextDueDate.toISOString().split("T")[0],
              last_completed_date: new Date().toISOString().split("T")[0],
            })
            .eq("id", selectedTask.equipment_pm_schedule_id);
        }

        toast.success("บันทึกผลการตรวจสอบ PM สำเร็จ - คำนวณรอบถัดไปแล้ว");
      } else if (inspectionResult === "passed_incomplete") {
        // Flag warning and optionally create follow-up
        toast.warning("บันทึกผลการตรวจสอบ PM - ผ่านไม่สมบูรณ์ ควรติดตามผล");
      } else if (inspectionResult === "failed") {
        // Create repair/recheck task
        const { data: taskNumber } = await supabase.rpc("generate_equipment_pm_task_number");
        
        await supabase.from("equipment_pm_tasks").insert({
          task_number: taskNumber || `PMT-${Date.now()}`,
          equipment_pm_schedule_id: selectedTask.equipment_pm_schedule_id,
          parent_task_id: selectedTask.id,
          status: "pending",
          due_date: new Date().toISOString(),
        });

        toast.error("บันทึกผลการตรวจสอบ PM - ไม่ผ่าน สร้างงานซ่อม/ตรวจซ้ำแล้ว");
      } else if (inspectionResult === "recheck") {
        // Create new PM task linked to original
        const { data: taskNumber } = await supabase.rpc("generate_equipment_pm_task_number");
        
        await supabase.from("equipment_pm_tasks").insert({
          task_number: taskNumber || `PMT-${Date.now()}`,
          equipment_pm_schedule_id: selectedTask.equipment_pm_schedule_id,
          parent_task_id: selectedTask.id,
          status: "pending",
          due_date: new Date().toISOString(),
        });

        toast.info("บันทึกผลการตรวจสอบ PM - สร้างงานตรวจซ้ำแล้ว");
      }

      setInspectionDialogOpen(false);
      fetchTasks();
    } catch (error) {
      console.error("Error submitting inspection:", error);
      toast.error("ไม่สามารถบันทึกผลการตรวจสอบได้");
    } finally {
      setUploading(false);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (filterStatus === "all") return true;
    return task.status === filterStatus;
  });

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-500",
      in_progress: "bg-blue-500",
      completed: "bg-green-500",
      cancelled: "bg-gray-500",
    };
    return (
      <Badge className={`${colors[status] || "bg-gray-500"} text-white`}>
        {STATUS_LABELS[status] || status}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>งาน PM เครื่องมือ</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="สถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              <SelectItem value="pending">รอดำเนินการ</SelectItem>
              <SelectItem value="in_progress">กำลังดำเนินการ</SelectItem>
              <SelectItem value="completed">เสร็จสิ้น</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchTasks}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">กำลังโหลด...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            ไม่มีงาน PM
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>เลขงาน</TableHead>
                <TableHead>รายการ PM</TableHead>
                <TableHead>เครื่องมือ</TableHead>
                <TableHead>ฝ่าย</TableHead>
                <TableHead>กำหนดส่ง</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>ผลตรวจ</TableHead>
                <TableHead>ผู้ตรวจ</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-mono text-sm">
                    {task.task_number}
                    {task.parent_task_id && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        งานต่อเนื่อง
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{task.schedule?.title || "-"}</TableCell>
                  <TableCell>
                    {task.schedule?.equipment?.name} ({task.schedule?.equipment?.code})
                  </TableCell>
                  <TableCell>{task.schedule?.department}</TableCell>
                  <TableCell>
                    {format(new Date(task.due_date), "d MMM yyyy", { locale: th })}
                  </TableCell>
                  <TableCell>{getStatusBadge(task.status)}</TableCell>
                  <TableCell>
                    {task.inspection_result ? (
                      <Badge className={`${RESULT_COLORS[task.inspection_result]} text-white`}>
                        {RESULT_LABELS[task.inspection_result]}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{task.inspector?.full_name || "-"}</TableCell>
                  <TableCell className="text-right">
                    {task.status !== "completed" && task.status !== "cancelled" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenInspection(task)}
                      >
                        <ClipboardCheck className="h-4 w-4 mr-1" />
                        บันทึกผล
                      </Button>
                    )}
                    {task.images && task.images.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        <Image className="h-3 w-3 mr-1" />
                        {task.images.length}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Inspection Dialog */}
        <Dialog open={inspectionDialogOpen} onOpenChange={setInspectionDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>บันทึกผลการตรวจสอบ PM</DialogTitle>
            </DialogHeader>
            {selectedTask && (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="font-medium">{selectedTask.task_number}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedTask.schedule?.title} - {selectedTask.schedule?.equipment?.name}
                  </p>
                </div>

                <div className="grid gap-4">
                  <div>
                    <Label>ผลการตรวจสอบ *</Label>
                    <Select value={inspectionResult} onValueChange={setInspectionResult}>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกผลการตรวจสอบ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="passed">ผ่าน - ปิดงาน + คำนวณรอบถัดไป</SelectItem>
                        <SelectItem value="passed_incomplete">ผ่านไม่สมบูรณ์ - Flag เตือน</SelectItem>
                        <SelectItem value="failed">ไม่ผ่าน - สร้างงานซ่อม/Recheck</SelectItem>
                        <SelectItem value="recheck">ตรวจซ้ำ - สร้างงาน PM ใหม่</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>รายละเอียดข้อสังเกต</Label>
                    <Textarea
                      value={observationDetails}
                      onChange={(e) => setObservationDetails(e.target.value)}
                      placeholder="ระบุข้อสังเกตที่พบระหว่างการตรวจสอบ..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>หมายเหตุ</Label>
                    <Textarea
                      value={inspectionNotes}
                      onChange={(e) => setInspectionNotes(e.target.value)}
                      placeholder="หมายเหตุเพิ่มเติม..."
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label>จำนวนที่ตรวจ</Label>
                    <Input
                      type="number"
                      value={quantityChecked}
                      onChange={(e) => setQuantityChecked(e.target.value)}
                      placeholder="จำนวน"
                    />
                  </div>

                  <div>
                    <Label>แนบรูปภาพ</Label>
                    <div className="mt-2">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                      />
                      <label
                        htmlFor="image-upload"
                        className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors"
                      >
                        <Plus className="h-5 w-5" />
                        <span>เลือกรูปภาพ</span>
                      </label>
                    </div>
                    {uploadedImages.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {uploadedImages.map((file, index) => (
                          <div key={index} className="relative">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`upload-${index}`}
                              className="w-full h-20 object-cover rounded"
                            />
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 h-6 w-6"
                              onClick={() => removeImage(index)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Show existing images */}
                  {selectedTask.images && selectedTask.images.length > 0 && (
                    <div>
                      <Label>รูปภาพที่แนบแล้ว</Label>
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {selectedTask.images.map((img) => (
                          <img
                            key={img.id}
                            src={img.image_url}
                            alt="task-image"
                            className="w-full h-20 object-cover rounded"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setInspectionDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button onClick={handleSubmitInspection} disabled={uploading}>
                {uploading ? "กำลังบันทึก..." : "บันทึกผลการตรวจสอบ"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}