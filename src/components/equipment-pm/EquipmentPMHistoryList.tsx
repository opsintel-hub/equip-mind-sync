import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { toast } from "sonner";
import { format, subMonths } from "date-fns";
import { th } from "date-fns/locale";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, FileText, FileSpreadsheet, Eye, ImageIcon } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface CompletedTask {
  id: string;
  task_number: string;
  status: string;
  due_date: string;
  inspection_date: string | null;
  inspection_result: string | null;
  inspection_notes: string | null;
  observation_details: string | null;
  quantity_checked: number | null;
  inspected_by: string | null;
  equipment_pm_schedule_id: string;
  schedule: {
    title: string;
    department: string;
    equipment_type: string;
    schedule_type: string;
    equipment: {
      code: string;
      name: string;
    } | null;
  } | null;
  images: {
    id: string;
    image_url: string;
    description: string | null;
  }[];
  inspector_profile: {
    full_name: string;
  } | null;
}

interface SummaryStats {
  totalCompleted: number;
  byResult: Record<string, number>;
  byDepartment: Record<string, number>;
  monthlyData: { month: string; passed: number; failed: number; recheck: number }[];
}

const RESULT_LABELS: Record<string, string> = {
  passed: "ผ่าน",
  passed_incomplete: "ผ่านไม่สมบูรณ์",
  failed: "ไม่ผ่าน",
  recheck: "ต้องตรวจซ้ำ",
};

const RESULT_COLORS: Record<string, string> = {
  passed: "bg-green-500",
  passed_incomplete: "bg-yellow-500",
  failed: "bg-red-500",
  recheck: "bg-blue-500",
};

const SCHEDULE_TYPE_LABELS: Record<string, string> = {
  weekly: "รายสัปดาห์",
  biweekly: "2 สัปดาห์",
  monthly: "1 เดือน",
  quarterly: "3 เดือน",
  semi_annual: "6 เดือน",
  annual: "รายปี",
};

const PIE_COLORS = ["#22c55e", "#eab308", "#ef4444", "#3b82f6"];

export function EquipmentPMHistoryList() {
  const [tasks, setTasks] = useState<CompletedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterResult, setFilterResult] = useState("all");
  const [startDate, setStartDate] = useState(
    subMonths(new Date(), 6).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [stats, setStats] = useState<SummaryStats>({
    totalCompleted: 0,
    byResult: {},
    byDepartment: {},
    monthlyData: [],
  });
  const [selectedTask, setSelectedTask] = useState<CompletedTask | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCompletedTasks();
  }, [startDate, endDate]);

  const fetchCompletedTasks = async () => {
    setLoading(true);
    
    // Fetch completed tasks with schedule and equipment info
    const { data: tasksData, error: tasksError } = await supabase
      .from("equipment_pm_tasks")
      .select(`
        id,
        task_number,
        status,
        due_date,
        inspection_date,
        inspection_result,
        inspection_notes,
        observation_details,
        quantity_checked,
        inspected_by,
        equipment_pm_schedule_id
      `)
      .eq("status", "completed")
      .gte("inspection_date", startDate)
      .lte("inspection_date", endDate + "T23:59:59")
      .order("inspection_date", { ascending: false });

    if (tasksError) {
      toast.error("ไม่สามารถโหลดข้อมูลได้");
      setLoading(false);
      return;
    }

    // Fetch related data for each task
    const enrichedTasks: CompletedTask[] = [];
    
    for (const task of tasksData || []) {
      // Fetch schedule with equipment
      const { data: scheduleData } = await supabase
        .from("equipment_pm_schedules")
        .select(`
          title,
          department,
          equipment_type,
          schedule_type,
          equipment:equipment_id (code, name)
        `)
        .eq("id", task.equipment_pm_schedule_id)
        .single();

      // Fetch images
      const { data: imagesData } = await supabase
        .from("equipment_pm_task_images")
        .select("id, image_url, description")
        .eq("equipment_pm_task_id", task.id);

      // Fetch inspector profile
      let inspectorProfile = null;
      if (task.inspected_by) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", task.inspected_by)
          .single();
        inspectorProfile = profileData;
      }

      enrichedTasks.push({
        ...task,
        schedule: scheduleData as CompletedTask["schedule"],
        images: imagesData || [],
        inspector_profile: inspectorProfile,
      });
    }

    setTasks(enrichedTasks);
    calculateStats(enrichedTasks);
    setLoading(false);
  };

  const calculateStats = (data: CompletedTask[]) => {
    const byResult: Record<string, number> = {};
    const byDepartment: Record<string, number> = {};
    const monthlyMap: Record<string, { passed: number; failed: number; recheck: number }> = {};

    data.forEach((item) => {
      // By result
      const result = item.inspection_result || "unknown";
      byResult[result] = (byResult[result] || 0) + 1;

      // By department
      if (item.schedule) {
        const dept = item.schedule.department;
        byDepartment[dept] = (byDepartment[dept] || 0) + 1;
      }

      // Monthly breakdown
      if (item.inspection_date) {
        const month = item.inspection_date.substring(0, 7);
        if (!monthlyMap[month]) {
          monthlyMap[month] = { passed: 0, failed: 0, recheck: 0 };
        }
        if (result === "passed" || result === "passed_incomplete") {
          monthlyMap[month].passed += 1;
        } else if (result === "failed") {
          monthlyMap[month].failed += 1;
        } else if (result === "recheck") {
          monthlyMap[month].recheck += 1;
        }
      }
    });

    const monthlyData = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, counts]) => ({
        month: format(new Date(month + "-01"), "MMM yyyy", { locale: th }),
        ...counts,
      }));

    setStats({
      totalCompleted: data.length,
      byResult,
      byDepartment,
      monthlyData,
    });
  };

  const filteredTasks = tasks.filter((t) => {
    if (filterDepartment !== "all" && t.schedule?.department !== filterDepartment)
      return false;
    if (filterResult !== "all" && t.inspection_result !== filterResult)
      return false;
    return true;
  });

  const { paginatedData, currentPage, pageSize, totalPages, totalItems, handlePageChange, handlePageSizeChange } = useTablePagination(filteredTasks);

  const departments = [...new Set(tasks.map((t) => t.schedule?.department).filter(Boolean))];

  const getResultBadge = (result: string | null) => {
    if (!result) return <Badge variant="secondary">-</Badge>;
    return (
      <Badge className={`${RESULT_COLORS[result] || "bg-gray-500"} text-white`}>
        {RESULT_LABELS[result] || result}
      </Badge>
    );
  };

  const pieChartData = Object.entries(stats.byResult).map(([key, value]) => ({
    name: RESULT_LABELS[key] || key,
    value,
  }));

  const exportToExcel = () => {
    const data = filteredTasks.map((t) => ({
      เลขที่ตั๋ว: t.task_number,
      ฝ่าย: t.schedule?.department || "-",
      ประเภทเครื่องมือ: t.schedule?.equipment_type || "-",
      รหัสเครื่องมือ: t.schedule?.equipment?.code || "-",
      ชื่อเครื่องมือ: t.schedule?.equipment?.name || "-",
      งานPM: t.schedule?.title || "-",
      ความถี่: SCHEDULE_TYPE_LABELS[t.schedule?.schedule_type || ""] || t.schedule?.schedule_type || "-",
      วันที่ตรวจ: t.inspection_date ? format(new Date(t.inspection_date), "d MMMM yyyy", { locale: th }) : "-",
      ผลการตรวจ: RESULT_LABELS[t.inspection_result || ""] || t.inspection_result || "-",
      ผู้ตรวจ: t.inspector_profile?.full_name || "-",
      หมายเหตุ: t.inspection_notes || "-",
      รายละเอียดข้อสังเกต: t.observation_details || "-",
      จำนวนรูปภาพ: t.images.length,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PM Tasks History");
    XLSX.writeFile(wb, `equipment-pm-history-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("ส่งออก Excel สำเร็จ");
  };

  const exportToPDF = async () => {
    if (!reportRef.current) return;

    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`equipment-pm-history-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("ส่งออก PDF สำเร็จ");
    } catch (error) {
      toast.error("ไม่สามารถส่งออก PDF ได้");
    }
  };

  const openDetailDialog = (task: CompletedTask) => {
    setSelectedTask(task);
    setDetailDialogOpen(true);
  };

  const openImageDialog = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageDialogOpen(true);
  };

  return (
    <div className="space-y-6" ref={reportRef}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-lg">ตรวจทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalCompleted}</div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="py-4">
            <CardTitle className="text-lg text-green-700">ผ่าน</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">
              {(stats.byResult["passed"] || 0) + (stats.byResult["passed_incomplete"] || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="py-4">
            <CardTitle className="text-lg text-red-700">ไม่ผ่าน</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700">
              {stats.byResult["failed"] || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="py-4">
            <CardTitle className="text-lg text-blue-700">ตรวจซ้ำ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">
              {stats.byResult["recheck"] || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-lg">อัตราผ่าน</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {stats.totalCompleted > 0
                ? Math.round(
                    (((stats.byResult["passed"] || 0) + (stats.byResult["passed_incomplete"] || 0)) /
                      stats.totalCompleted) *
                      100
                  )
                : 0}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {stats.monthlyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>สถิติ PM รายเดือน</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="passed" name="ผ่าน" fill="#22c55e" stackId="a" />
                    <Bar dataKey="failed" name="ไม่ผ่าน" fill="#ef4444" stackId="a" />
                    <Bar dataKey="recheck" name="ตรวจซ้ำ" fill="#3b82f6" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {pieChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>สัดส่วนผลการตรวจ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* History Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>ประวัติการตรวจ PM เครื่องมือ</CardTitle>
              <CardDescription>
                รายการที่ดำเนินการแล้วพร้อมรูปภาพประกอบ
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchCompletedTasks}>
                <RefreshCw className="h-4 w-4 mr-1" />
                รีเฟรช
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPDF}>
                <FileText className="h-4 w-4 mr-1" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={exportToExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="ทุกฝ่าย" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
                <SelectItem value="all">ทุกฝ่าย</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept!}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterResult} onValueChange={setFilterResult}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="ทุกผลการตรวจ" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
                <SelectItem value="all">ทุกผลการตรวจ</SelectItem>
                {Object.entries(RESULT_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">ตั้งแต่:</span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[160px]"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">ถึง:</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">กำลังโหลด...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              ไม่พบประวัติการตรวจ PM
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เลขที่ตั๋ว</TableHead>
                    <TableHead>ฝ่าย</TableHead>
                    <TableHead>เครื่องมือ</TableHead>
                    <TableHead>งาน PM</TableHead>
                    <TableHead>วันที่ตรวจ</TableHead>
                    <TableHead>ผลการตรวจ</TableHead>
                    <TableHead>ผู้ตรวจ</TableHead>
                    <TableHead>รูปภาพ</TableHead>
                    <TableHead className="text-right">รายละเอียด</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((task) => (
                    <TableRow key={task.id}>
...
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

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              รายละเอียดการตรวจ PM - {selectedTask?.task_number}
            </DialogTitle>
          </DialogHeader>

          {selectedTask && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    เครื่องมือ
                  </label>
                  <p className="font-medium">
                    {selectedTask.schedule?.equipment?.code} -{" "}
                    {selectedTask.schedule?.equipment?.name}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    ฝ่าย
                  </label>
                  <p>{selectedTask.schedule?.department}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    งาน PM
                  </label>
                  <p>{selectedTask.schedule?.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    ความถี่
                  </label>
                  <p>
                    {SCHEDULE_TYPE_LABELS[selectedTask.schedule?.schedule_type || ""] ||
                      selectedTask.schedule?.schedule_type}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    วันที่ตรวจ
                  </label>
                  <p>
                    {selectedTask.inspection_date
                      ? format(
                          new Date(selectedTask.inspection_date),
                          "d MMMM yyyy HH:mm",
                          { locale: th }
                        )
                      : "-"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    ผู้ตรวจ
                  </label>
                  <p>{selectedTask.inspector_profile?.full_name || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    ผลการตรวจ
                  </label>
                  <div className="mt-1">
                    {getResultBadge(selectedTask.inspection_result)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    จำนวนที่ตรวจ
                  </label>
                  <p>{selectedTask.quantity_checked || "-"}</p>
                </div>
              </div>

              {selectedTask.inspection_notes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    หมายเหตุ
                  </label>
                  <p className="mt-1 p-3 bg-muted rounded-md">
                    {selectedTask.inspection_notes}
                  </p>
                </div>
              )}

              {selectedTask.observation_details && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    รายละเอียดข้อสังเกต
                  </label>
                  <p className="mt-1 p-3 bg-muted rounded-md">
                    {selectedTask.observation_details}
                  </p>
                </div>
              )}

              {selectedTask.images.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    รูปภาพประกอบ ({selectedTask.images.length} รูป)
                  </label>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    {selectedTask.images.map((img) => (
                      <div
                        key={img.id}
                        className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border"
                        onClick={() => openImageDialog(img.image_url)}
                      >
                        <img
                          src={img.image_url}
                          alt={img.description || "PM Image"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Viewer Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>รูปภาพ</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="flex justify-center">
              <img
                src={selectedImage}
                alt="PM Task Image"
                className="max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
