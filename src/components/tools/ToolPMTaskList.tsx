import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { RefreshCw, Search, ClipboardCheck, Camera, User, ImageIcon, X, Upload, FileDown, Filter, UserCog } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { th } from "date-fns/locale";
import * as XLSX from "xlsx";


interface PMResult {
  id: string;
  name: string;
  color: string;
}

interface PMType {
  pm_type: {
    id: string;
    name: string;
  };
}

interface ToolPMTask {
  id: string;
  task_number: string;
  due_date: string;
  status: string;
  inspection_date: string | null;
  inspector_name: string | null;
  inspection_notes: string | null;
  quantity_checked: number | null;
  tool: {
    id: string;
    code: string;
    name: string;
    brand: string | null;
    serial_number: string | null;
    current_quantity: number;
    unit: string;
    is_personal_tool: boolean;
    department: string | null;
  };

  pm_result: { id: string; name: string; color: string } | null;
}

export function ToolPMTaskList() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<ToolPMTask[]>([]);
  const [pmResults, setPmResults] = useState<PMResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTask, setSelectedTask] = useState<ToolPMTask | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [toolPMTypes, setToolPMTypes] = useState<string[]>([]);

  // Form state
  const [inspectorName, setInspectorName] = useState("");
  const [pmResultId, setPmResultId] = useState("");
  const [quantityChecked, setQuantityChecked] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Image upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [imageDescription, setImageDescription] = useState("");

  useEffect(() => {
    fetchTasks();
    fetchPMResults();
  }, []);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("tool_pm_tasks")
        .select(`
          *,
          tool:tools(id, code, name, brand, serial_number, current_quantity, unit, is_personal_tool, department),
          pm_result:pm_results(id, name, color)
        `)
        .in("status", ["pending", "in_progress"])
        .order("due_date", { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("ไม่สามารถโหลดข้อมูลงาน PM ได้");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPMResults = async () => {
    const { data, error } = await supabase
      .from("pm_results")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error fetching PM results:", error);
      return;
    }
    setPmResults(data || []);
  };

  const fetchToolPMTypes = async (toolId: string) => {
    const { data, error } = await supabase
      .from("tool_pm_types")
      .select(`
        pm_type:pm_types(id, name)
      `)
      .eq("tool_id", toolId);

    if (error) {
      console.error("Error fetching tool PM types:", error);
      return;
    }

    const types = (data || []).map((d: any) => d.pm_type?.name).filter(Boolean);
    setToolPMTypes(types);
  };

  const openInspectionDialog = async (task: ToolPMTask) => {
    setSelectedTask(task);
    setInspectorName("");
    setPmResultId("");
    setQuantityChecked(String(task.tool.current_quantity));
    setNotes("");
    setSelectedFiles([]);
    setPreviews([]);
    setImageDescription("");
    await fetchToolPMTypes(task.tool.id);
    setIsDialogOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const newFiles = files.slice(0, 5 - selectedFiles.length);
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setSelectedFiles(prev => [...prev, ...newFiles]);
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitInspection = async () => {
    if (!selectedTask) return;
    if (!pmResultId) {
      toast.error("กรุณาเลือกผลการตรวจสอบ");
      return;
    }

    // Enforce photo for personal tools
    if (selectedTask.tool.is_personal_tool && selectedFiles.length === 0) {
      toast.error("เครื่องมือประจำตัวช่าง ต้องแนบรูปอย่างน้อย 1 รูปก่อนปิดตั๋ว PM");
      return;
    }

    setIsSubmitting(true);
    try {
      // Update task
      const { error } = await supabase
        .from("tool_pm_tasks")
        .update({
          status: "completed",
          pm_result_id: pmResultId,
          inspection_date: new Date().toISOString(),
          inspected_by: user?.id || null,
          inspector_name: inspectorName || user?.email || "ไม่ระบุ",
          inspection_notes: notes || null,
          quantity_checked: parseInt(quantityChecked) || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedTask.id);

      if (error) throw error;

      // Insert into history so it shows in the "ประวัติ PM เครื่องมือ" report
      const { error: historyError } = await supabase
        .from("tool_pm_history")
        .insert({
          tool_pm_task_id: selectedTask.id,
          tool_id: selectedTask.tool.id,
          completed_date: new Date().toISOString(),
          completed_by: user?.id || null,
          inspector_name: inspectorName || user?.email || "ไม่ระบุ",
          pm_result_id: pmResultId,
          notes: notes || null,
        });
      if (historyError) console.error("History insert error:", historyError);

      // Upload images if any
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${selectedTask.id}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

          // Try to upload to storage
          await supabase.storage
            .from('pm-images')
            .upload(fileName, file);

          const { data: urlData } = supabase.storage
            .from('pm-images')
            .getPublicUrl(fileName);

          // Save to database
          await supabase
            .from('tool_pm_task_images')
            .insert({
              tool_pm_task_id: selectedTask.id,
              image_url: urlData.publicUrl || fileName,
              description: imageDescription || null,
            });
        }
      }

      toast.success("บันทึกผลการตรวจสอบสำเร็จ");
      setIsDialogOpen(false);
      
      // Cleanup previews
      previews.forEach(p => URL.revokeObjectURL(p));
      
      fetchTasks();
    } catch (error) {
      console.error("Error submitting inspection:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึกผลการตรวจสอบ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (dueDate: string, status: string) => {
    if (status === "completed") {
      return <Badge className="bg-green-500">เสร็จสิ้น</Badge>;
    }

    const today = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return <Badge variant="destructive">เกินกำหนด {Math.abs(diffDays)} วัน</Badge>;
    } else if (diffDays === 0) {
      return <Badge variant="destructive">ถึงกำหนดวันนี้</Badge>;
    } else if (diffDays <= 3) {
      return <Badge className="bg-yellow-500">อีก {diffDays} วัน</Badge>;
    } else if (diffDays <= 7) {
      return <Badge className="bg-blue-500">อีก {diffDays} วัน</Badge>;
    }
    return <Badge variant="outline">อีก {diffDays} วัน</Badge>;
  };

  const filteredTasks = tasks.filter(
    (task) =>
      task.task_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.tool.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.tool.serial_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { paginatedData, currentPage, pageSize, totalPages, totalItems, handlePageChange, handlePageSizeChange } = useTablePagination(filteredTasks);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              งาน PM เครื่องมือ ({filteredTasks.length} รายการ)
            </CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาหมายเลขงาน, รหัส, ชื่อ, S/N..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="icon" onClick={fetchTasks}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "ไม่พบงาน PM ที่ค้นหา" : "ไม่มีงาน PM ที่รอดำเนินการ"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>หมายเลขงาน</TableHead>
                    <TableHead>เครื่องมือ</TableHead>
                    <TableHead>ยี่ห้อ</TableHead>
                    <TableHead>Serial No.</TableHead>
                    <TableHead className="text-center">จำนวน</TableHead>
                    <TableHead>กำหนด PM</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="text-center">ดำเนินการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.task_number}</TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{task.tool.code}</span>
                          <br />
                          <span className="text-sm text-muted-foreground">{task.tool.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{task.tool.brand || "-"}</TableCell>
                      <TableCell>{task.tool.serial_number || "-"}</TableCell>
                      <TableCell className="text-center">{task.tool.current_quantity} {task.tool.unit}</TableCell>
                      <TableCell>
                        {format(new Date(task.due_date), "dd MMM yyyy", { locale: th })}
                      </TableCell>
                      <TableCell>{getStatusBadge(task.due_date, task.status)}</TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" onClick={() => openInspectionDialog(task)}>
                          <ClipboardCheck className="h-4 w-4 mr-1" />
                          ตรวจสอบ
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inspection Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>บันทึกผลการตรวจสอบ PM</DialogTitle>
          </DialogHeader>

          {selectedTask && (
            <div className="space-y-4">
              {/* Tool Info */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">หมายเลขงาน:</span>{" "}
                    <span className="font-medium">{selectedTask.task_number}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">รหัสเครื่องมือ:</span>{" "}
                    <span className="font-medium">{selectedTask.tool.code}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">ชื่อเครื่องมือ:</span>{" "}
                    <span className="font-medium">{selectedTask.tool.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ยี่ห้อ:</span>{" "}
                    <span className="font-medium">{selectedTask.tool.brand || "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Serial No.:</span>{" "}
                    <span className="font-medium">
                      {selectedTask.tool.serial_number || "-"}
                    </span>
                  </div>
                </div>

                {toolPMTypes.length > 0 && (
                  <div>
                    <span className="text-muted-foreground text-sm">ประเภทการ PM:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {toolPMTypes.map((type, idx) => (
                        <Badge key={idx} variant="secondary">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>ผลการตรวจสอบ *</Label>
                  <Select value={pmResultId} onValueChange={setPmResultId}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกผลการตรวจสอบ" />
                    </SelectTrigger>
                    <SelectContent>
                      {pmResults.map((result) => (
                        <SelectItem key={result.id} value={result.id}>
                          {result.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>จำนวนที่ตรวจ</Label>
                  <Input
                    type="number"
                    value={quantityChecked}
                    onChange={(e) => setQuantityChecked(e.target.value)}
                    min={0}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    ชื่อผู้ตรวจ
                  </Label>
                  <Input
                    value={inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    placeholder={user?.email || "กรอกชื่อผู้ตรวจ"}
                  />
                  <p className="text-xs text-muted-foreground">
                    หากไม่กรอก จะใช้ชื่อผู้ใช้ที่ Login อยู่
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>หมายเหตุ / ข้อสังเกต</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="กรอกหมายเหตุหรือข้อสังเกตจากการตรวจสอบ"
                    rows={3}
                  />
                </div>

                {/* Image Upload Section */}
                <div className="space-y-2 border-t pt-4">
                  <Label className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    เพิ่มรูปภาพ (สูงสุด 5 รูป)
                  </Label>
                  
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="pm-image-upload"
                    disabled={selectedFiles.length >= 5}
                  />
                  <label htmlFor="pm-image-upload">
                    <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                      <ImageIcon className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        คลิกเพื่อเลือกรูปภาพ
                      </p>
                    </div>
                  </label>

                  {previews.length > 0 && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        {previews.map((preview, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-20 object-cover rounded-lg border"
                            />
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <Input
                        value={imageDescription}
                        onChange={(e) => setImageDescription(e.target.value)}
                        placeholder="คำอธิบายรูปภาพ (ไม่บังคับ)"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              ยกเลิก
            </Button>
            {selectedTask?.tool.is_personal_tool && selectedFiles.length === 0 && (
              <p className="text-xs text-destructive mr-auto flex items-center">
                ⚠️ เครื่องมือประจำตัวช่าง ต้องแนบรูปอย่างน้อย 1 รูป
              </p>
            )}
            <Button
              onClick={handleSubmitInspection}
              disabled={isSubmitting || (selectedTask?.tool.is_personal_tool && selectedFiles.length === 0)}
            >
              {isSubmitting ? "กำลังบันทึก..." : "บันทึกผลการตรวจ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
