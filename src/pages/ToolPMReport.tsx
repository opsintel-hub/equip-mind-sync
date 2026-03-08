import { useState, useEffect, useMemo, useCallback } from "react";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
import { RefreshCw, Search, FileText, AlertTriangle, CheckCircle, Target, Download } from "lucide-react";
import { toast } from "sonner";
import { format, startOfYear, endOfYear, differenceInDays, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import * as XLSX from "xlsx";
import { useAllowedDepartments } from "@/hooks/useAllowedDepartments";

interface Tool {
  id: string;
  code: string;
  name: string;
  brand: string | null;
  serial_number: string | null;
  department: string | null;
  pm_interval_days: number | null;
  current_quantity: number;
}

interface ToolPMSummary {
  tool: Tool;
  targetCount: number;
  actualCount: number;
  completionRate: number;
  nextDueDate: string | null;
  isOverdue: boolean;
  overdueDays: number;
}

const ToolPMReport = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [pmTasks, setPmTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [allDepartments, setAllDepartments] = useState<string[]>([]);

  const { allowedDepartments, isAdmin, isSingleDepartment, loading: permLoading } = useAllowedDepartments();
  const allowedDeptNames = useMemo(() => allowedDepartments.map(d => d.name), [allowedDepartments]);
  const departments = useMemo(() => {
    return isAdmin ? allDepartments : allDepartments.filter(d => allowedDeptNames.includes(d));
  }, [allDepartments, isAdmin, allowedDeptNames]);

  // Auto-select if single department
  useEffect(() => {
    if (!permLoading && isSingleDepartment && allowedDepartments.length === 1 && selectedDepartment === "all") {
      setSelectedDepartment(allowedDepartments[0].name);
    }
  }, [permLoading, isSingleDepartment, allowedDepartments, selectedDepartment]);

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch tools with PM interval
      const { data: toolsData, error: toolsError } = await supabase
        .from("tools")
        .select("*")
        .eq("is_active", true)
        .not("pm_interval_days", "is", null)
        .order("code");

      if (toolsError) throw toolsError;

      // Fetch PM tasks for the selected year
      const yearStart = startOfYear(new Date(selectedYear, 0, 1)).toISOString();
      const yearEnd = endOfYear(new Date(selectedYear, 11, 31)).toISOString();

      const { data: tasksData, error: tasksError } = await supabase
        .from("tool_pm_tasks")
        .select("*")
        .gte("due_date", yearStart)
        .lte("due_date", yearEnd)
        .order("due_date");

      if (tasksError) throw tasksError;

      // Get unique departments
      const depts = [...new Set(toolsData?.map((t: Tool) => t.department).filter(Boolean) as string[])];
      
      setTools(toolsData || []);
      setPmTasks(tasksData || []);
      setAllDepartments(depts);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setIsLoading(false);
    }
  };

  const pmSummaries = useMemo(() => {
    const today = new Date();
    
    return tools.map((tool) => {
      const pmInterval = tool.pm_interval_days || 30;
      
      // Calculate target PM count for the year
      const daysInYear = 365;
      const targetCount = Math.floor(daysInYear / pmInterval);
      
      // Get completed tasks for this tool in selected year
      const toolTasks = pmTasks.filter(t => t.tool_id === tool.id);
      const completedTasks = toolTasks.filter(t => t.status === "completed");
      
      // Filter by month if selected
      let monthFilteredCompletedTasks = completedTasks;
      if (selectedMonth !== "all") {
        const monthNum = parseInt(selectedMonth);
        monthFilteredCompletedTasks = completedTasks.filter(t => {
          const taskDate = parseISO(t.inspection_date || t.due_date);
          return taskDate.getMonth() === monthNum - 1;
        });
      }
      
      const actualCount = monthFilteredCompletedTasks.length;
      const targetForPeriod = selectedMonth !== "all" ? Math.ceil(targetCount / 12) : targetCount;
      const completionRate = targetForPeriod > 0 ? (actualCount / targetForPeriod) * 100 : 0;
      
      // Find next due date and check if overdue
      const pendingTasks = toolTasks.filter(t => t.status === "pending" || t.status === "in_progress");
      const nextTask = pendingTasks.sort((a, b) => 
        new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      )[0];
      
      const nextDueDate = nextTask?.due_date || null;
      const isOverdue = nextDueDate ? new Date(nextDueDate) < today : false;
      const overdueDays = nextDueDate && isOverdue 
        ? differenceInDays(today, new Date(nextDueDate)) 
        : 0;

      return {
        tool,
        targetCount: targetForPeriod,
        actualCount,
        completionRate: Math.min(completionRate, 100),
        nextDueDate,
        isOverdue,
        overdueDays,
      } as ToolPMSummary;
    });
  }, [tools, pmTasks, selectedMonth]);

  const filteredSummaries = useMemo(() => {
    return pmSummaries.filter((summary) => {
      const matchSearch = 
        summary.tool.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        summary.tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        summary.tool.serial_number?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchDept = selectedDepartment === "all" || 
        summary.tool.department === selectedDepartment;
      
      return matchSearch && matchDept;
    });
  }, [pmSummaries, searchTerm, selectedDepartment]);

  const overdueSummaries = filteredSummaries.filter(s => s.isOverdue);
  const completedSummaries = filteredSummaries.filter(s => s.completionRate >= 100);
  const totalTarget = filteredSummaries.reduce((sum, s) => sum + s.targetCount, 0);
  const totalActual = filteredSummaries.reduce((sum, s) => sum + s.actualCount, 0);
  const overallCompletionRate = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;

  const handleExport = () => {
    const exportData = filteredSummaries.map((s) => ({
      "รหัสเครื่องมือ": s.tool.code,
      "ชื่อเครื่องมือ": s.tool.name,
      "ยี่ห้อ": s.tool.brand || "-",
      "Serial No.": s.tool.serial_number || "-",
      "ฝ่าย": s.tool.department || "-",
      "รอบ PM (วัน)": s.tool.pm_interval_days || "-",
      "เป้าหมาย (ครั้ง)": s.targetCount,
      "ทำจริง (ครั้ง)": s.actualCount,
      "% ความสำเร็จ": s.completionRate.toFixed(1) + "%",
      "กำหนด PM ถัดไป": s.nextDueDate 
        ? format(new Date(s.nextDueDate), "dd/MM/yyyy") 
        : "-",
      "สถานะ": s.isOverdue ? `เกินกำหนด ${s.overdueDays} วัน` : "ปกติ",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "รายงาน PM เครื่องมือ");
    XLSX.writeFile(wb, `pm_tool_report_${selectedYear}.xlsx`);
    toast.success("ส่งออกรายงานสำเร็จ");
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 100) return "bg-green-500";
    if (rate >= 70) return "bg-blue-500";
    if (rate >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  const months = [
    { value: "all", label: "ทั้งปี" },
    { value: "1", label: "มกราคม" },
    { value: "2", label: "กุมภาพันธ์" },
    { value: "3", label: "มีนาคม" },
    { value: "4", label: "เมษายน" },
    { value: "5", label: "พฤษภาคม" },
    { value: "6", label: "มิถุนายน" },
    { value: "7", label: "กรกฎาคม" },
    { value: "8", label: "สิงหาคม" },
    { value: "9", label: "กันยายน" },
    { value: "10", label: "ตุลาคม" },
    { value: "11", label: "พฤศจิกายน" },
    { value: "12", label: "ธันวาคม" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">รายงาน PM เครื่องมือ</h1>
        <p className="text-muted-foreground">
          สรุปผลการ PM เครื่องมือ เทียบเป้าหมายและ Actual พร้อมแสดงรายการที่เกินกำหนด
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Target className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">เป้าหมายรวม</p>
                <p className="text-2xl font-bold">{totalTarget} ครั้ง</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ทำจริง</p>
                <p className="text-2xl font-bold">{totalActual} ครั้ง</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">% ความสำเร็จ</p>
                <p className="text-2xl font-bold">{overallCompletionRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-red-500/10">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">เกินกำหนด</p>
                <p className="text-2xl font-bold text-red-500">{overdueSummaries.length} รายการ</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>ตัวกรอง</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <Label>ปี</Label>
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year + 543}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>เดือน</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ฝ่าย</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment} disabled={isSingleDepartment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {!isSingleDepartment && <SelectItem value="all">ทั้งหมด</SelectItem>}
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ค้นหา</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="รหัส, ชื่อ, Serial..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <div className="flex gap-2">
                <Button variant="outline" onClick={fetchData} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  รีเฟรช
                </Button>
                <Button onClick={handleExport} className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>รายละเอียดเครื่องมือ ({filteredSummaries.length} รายการ)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
          ) : filteredSummaries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">ไม่พบข้อมูล</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>รหัส</TableHead>
                    <TableHead>ชื่อเครื่องมือ</TableHead>
                    <TableHead>ฝ่าย</TableHead>
                    <TableHead className="text-center">รอบ PM</TableHead>
                    <TableHead className="text-center">เป้าหมาย</TableHead>
                    <TableHead className="text-center">ทำจริง</TableHead>
                    <TableHead className="w-[200px]">ความคืบหน้า</TableHead>
                    <TableHead>กำหนดถัดไป</TableHead>
                    <TableHead>สถานะ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSummaries.map((summary) => (
                    <TableRow 
                      key={summary.tool.id}
                      className={summary.isOverdue ? "bg-red-50 dark:bg-red-900/10" : ""}
                    >
                      <TableCell className="font-medium">{summary.tool.code}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{summary.tool.name}</div>
                          {summary.tool.brand && (
                            <div className="text-sm text-muted-foreground">
                              {summary.tool.brand}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{summary.tool.department || "-"}</TableCell>
                      <TableCell className="text-center">
                        ทุก {summary.tool.pm_interval_days} วัน
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {summary.targetCount}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {summary.actualCount}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Progress 
                            value={summary.completionRate} 
                            className="h-2"
                          />
                          <div className="text-xs text-right text-muted-foreground">
                            {summary.completionRate.toFixed(1)}%
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {summary.nextDueDate ? (
                          format(new Date(summary.nextDueDate), "dd/MM/yyyy", { locale: th })
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {summary.isOverdue ? (
                          <Badge variant="destructive">
                            เกินกำหนด {summary.overdueDays} วัน
                          </Badge>
                        ) : summary.completionRate >= 100 ? (
                          <Badge className="bg-green-500">ครบตามเป้า</Badge>
                        ) : (
                          <Badge variant="outline">ปกติ</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <TablePagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ToolPMReport;
