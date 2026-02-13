import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, addDays, differenceInDays, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import { Plus, Search, RefreshCw, Calendar, Wrench, PlayCircle, Pause, Edit, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAllowedDepartments } from "@/hooks/useAllowedDepartments";

const ToolPMSchedule = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string>("");

  // Fetch all tools
  const { data: tools = [] } = useQuery({
    queryKey: ["tools-for-pm"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tools")
        .select(`
          *,
          tool_categories (name),
          companies (name),
          locations (name)
        `)
        .eq("is_active", true)
        .order("code");
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch existing PM tasks grouped by tool
  const { data: pmSummary = [], isLoading, refetch } = useQuery({
    queryKey: ["tool-pm-summary"],
    queryFn: async () => {
      // Get all tools with their PM tasks
      const { data: toolsData, error: toolsError } = await supabase
        .from("tools")
        .select(`
          id,
          code,
          name,
          department,
          pm_interval_days,
          current_quantity,
          tool_categories (name),
          companies (name)
        `)
        .eq("is_active", true)
        .order("code");

      if (toolsError) throw toolsError;

      // Get latest PM task for each tool
      const { data: tasksData, error: tasksError } = await supabase
        .from("tool_pm_tasks")
        .select("*")
        .order("due_date", { ascending: false });

      if (tasksError) throw tasksError;

      // Group tasks by tool
      const tasksByTool: Record<string, any[]> = {};
      tasksData?.forEach((task: any) => {
        if (!tasksByTool[task.tool_id]) {
          tasksByTool[task.tool_id] = [];
        }
        tasksByTool[task.tool_id].push(task);
      });

      // Create summary
      return toolsData?.map((tool: any) => {
        const toolTasks = tasksByTool[tool.id] || [];
        const pendingTasks = toolTasks.filter((t: any) => t.status === "pending");
        const inProgressTasks = toolTasks.filter((t: any) => t.status === "in_progress");
        const completedTasks = toolTasks.filter((t: any) => t.status === "completed");
        const latestTask = toolTasks[0];

        return {
          ...tool,
          totalTasks: toolTasks.length,
          pendingCount: pendingTasks.length,
          inProgressCount: inProgressTasks.length,
          completedCount: completedTasks.length,
          latestTask,
          nextDueDate: latestTask?.due_date
        };
      }) || [];
    }
  });

  // Get departments filtered by permissions
  const { allowedDepartments, isAdmin: isAdminDept, isSingleDepartment } = useAllowedDepartments();
  const allowedDeptNames = allowedDepartments.map(d => d.name);
  const allDepts = [...new Set(pmSummary.map((t: any) => t.department).filter(Boolean))];
  const departments = isAdminDept ? allDepts : allDepts.filter(d => allowedDeptNames.includes(d as string));

  // Auto-select if single department
  useEffect(() => {
    if (isSingleDepartment && allowedDepartments.length === 1 && departmentFilter === "all") {
      setDepartmentFilter(allowedDepartments[0].name);
    }
  }, [isSingleDepartment, allowedDepartments, departmentFilter]);

  // Filter tools
  const filteredSummary = pmSummary.filter((tool: any) => {
    const matchesSearch = 
      tool.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = departmentFilter === "all" || tool.department === departmentFilter;
    return matchesSearch && matchesDepartment;
  });

  // Create PM task mutation
  const createPMTask = useMutation({
    mutationFn: async (toolId: string) => {
      const tool = tools.find((t: any) => t.id === toolId);
      if (!tool) throw new Error("ไม่พบเครื่องมือ");

      const dueDate = addDays(new Date(), tool.pm_interval_days || 30);

      const { data, error } = await supabase
        .from("tool_pm_tasks")
        .insert({
          tool_id: toolId,
          due_date: format(dueDate, "yyyy-MM-dd"),
          status: "pending"
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("สร้างงาน PM สำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["tool-pm-summary"] });
      queryClient.invalidateQueries({ queryKey: ["tool-pm-tasks"] });
      setIsCreateDialogOpen(false);
      setSelectedTool("");
    },
    onError: (error: any) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    }
  });

  // Delete PM task mutation
  const deletePMTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("tool_pm_tasks")
        .delete()
        .eq("id", taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ลบงาน PM สำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["tool-pm-summary"] });
      queryClient.invalidateQueries({ queryKey: ["tool-pm-tasks"] });
    },
    onError: (error: any) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    }
  });

  const getStatusBadge = (tool: any) => {
    if (tool.pendingCount === 0 && tool.inProgressCount === 0) {
      return <Badge variant="outline">ไม่มีงาน PM</Badge>;
    }
    if (tool.inProgressCount > 0) {
      return <Badge className="bg-blue-500">กำลังดำเนินการ</Badge>;
    }
    
    // Check if overdue
    if (tool.latestTask?.due_date) {
      const daysUntilDue = differenceInDays(parseISO(tool.latestTask.due_date), new Date());
      if (daysUntilDue < 0) {
        return <Badge variant="destructive">เลยกำหนด {Math.abs(daysUntilDue)} วัน</Badge>;
      }
      if (daysUntilDue <= 7) {
        return <Badge className="bg-yellow-500">ใกล้ถึงกำหนด</Badge>;
      }
    }
    
    return <Badge className="bg-green-500">ปกติ</Badge>;
  };

  const toolsWithoutPM = tools.filter((t: any) => {
    const summary = pmSummary.find((s: any) => s.id === t.id);
    return !summary || (summary.pendingCount === 0 && summary.inProgressCount === 0);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">ตาราง PM เครื่องมือ</h1>
        <p className="text-muted-foreground">
          จัดการตารางการบำรุงรักษาเครื่องมือ สร้างและติดตามงาน PM
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">เครื่องมือทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pmSummary.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">มีงาน PM รอดำเนินการ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {pmSummary.filter((t: any) => t.pendingCount > 0).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">กำลังดำเนินการ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {pmSummary.filter((t: any) => t.inProgressCount > 0).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">เลยกำหนด PM</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {pmSummary.filter((t: any) => {
                if (!t.latestTask?.due_date || t.latestTask?.status === "completed") return false;
                return differenceInDays(parseISO(t.latestTask.due_date), new Date()) < 0;
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions & Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex gap-2">
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    สร้างงาน PM ใหม่
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>สร้างงาน PM ใหม่</DialogTitle>
                    <DialogDescription>
                      เลือกเครื่องมือที่ต้องการสร้างงาน PM
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>เลือกเครื่องมือ</Label>
                      <Select value={selectedTool} onValueChange={setSelectedTool}>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกเครื่องมือ..." />
                        </SelectTrigger>
                        <SelectContent>
                          {toolsWithoutPM.map((tool: any) => (
                            <SelectItem key={tool.id} value={tool.id}>
                              {tool.code} - {tool.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">
                        แสดงเฉพาะเครื่องมือที่ยังไม่มีงาน PM รอดำเนินการ
                      </p>
                    </div>
                    <Button 
                      onClick={() => selectedTool && createPMTask.mutate(selectedTool)}
                      disabled={!selectedTool || createPMTask.isPending}
                      className="w-full"
                    >
                      {createPMTask.isPending ? "กำลังสร้าง..." : "สร้างงาน PM"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                รีเฟรช
              </Button>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหา..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-[200px]"
                />
              </div>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter} disabled={isSingleDepartment}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="เลือกฝ่าย" />
                </SelectTrigger>
                <SelectContent>
                  {!isSingleDepartment && <SelectItem value="all">ทุกฝ่าย</SelectItem>}
                  {departments.map((dept: any) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSummary.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>ไม่พบข้อมูลเครื่องมือ</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>รหัส</TableHead>
                  <TableHead>ชื่อเครื่องมือ</TableHead>
                  <TableHead>ฝ่าย</TableHead>
                  <TableHead>รอบ PM (วัน)</TableHead>
                  <TableHead>งาน PM ทั้งหมด</TableHead>
                  <TableHead>กำหนดถัดไป</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSummary.map((tool: any) => (
                  <TableRow key={tool.id}>
                    <TableCell className="font-medium">{tool.code}</TableCell>
                    <TableCell>{tool.name}</TableCell>
                    <TableCell>{tool.department || "-"}</TableCell>
                    <TableCell>{tool.pm_interval_days || 30} วัน</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-xs">
                          รอ: {tool.pendingCount}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          เสร็จ: {tool.completedCount}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {tool.latestTask?.due_date ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(parseISO(tool.latestTask.due_date), "dd MMM yyyy", { locale: th })}
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(tool)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTool(tool.id);
                            createPMTask.mutate(tool.id);
                          }}
                          disabled={createPMTask.isPending}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        {tool.latestTask && tool.latestTask.status === "pending" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ต้องการลบงาน PM ล่าสุดของ {tool.name} หรือไม่?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deletePMTask.mutate(tool.latestTask.id)}
                                >
                                  ลบ
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* How to use guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            วิธีใช้งานระบบ PM เครื่องมือ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold">ขั้นตอนที่ 1: เพิ่มเครื่องมือ</h4>
              <p className="text-sm text-muted-foreground">
                ไปที่ Master Data → เครื่องมือ เพื่อเพิ่มเครื่องมือใหม่ พร้อมกำหนดรอบ PM (วัน)
              </p>
            </div>
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold">ขั้นตอนที่ 2: สร้างงาน PM</h4>
              <p className="text-sm text-muted-foreground">
                ในหน้านี้ กดปุ่ม "สร้างงาน PM ใหม่" หรือกดปุ่ม + ที่แถวเครื่องมือ
              </p>
            </div>
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold">ขั้นตอนที่ 3: ดำเนินการ PM</h4>
              <p className="text-sm text-muted-foreground">
                ไปที่ "งาน PM" เพื่อดำเนินการตรวจสอบ บันทึกผล และอัพโหลดรูปภาพ
              </p>
            </div>
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold">ขั้นตอนที่ 4: ดูประวัติและรายงาน</h4>
              <p className="text-sm text-muted-foreground">
                ดูประวัติ PM ที่เมนู "ประวัติ PM" และรายงานสรุปที่ "รายงาน PM"
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ToolPMSchedule;
