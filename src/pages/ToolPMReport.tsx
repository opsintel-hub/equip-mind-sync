import { useState, useEffect, useMemo } from "react";
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefreshCw, Search, AlertTriangle, CheckCircle, Target, Download, Info, Clock, History, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth, differenceInDays, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import * as XLSX from "xlsx";
import { useAllowedDepartments } from "@/hooks/useAllowedDepartments";

interface Tool {
  id: string; code: string; name: string;
  brand: string | null; serial_number: string | null;
  department: string | null; pm_interval_days: number | null;
}

interface Row {
  tool: Tool;
  planned: number;      // target PM in period
  completed: number;    // completed history rows in period
  onTime: number;       // completed_date <= due_date
  late: number;         // completed but late
  avgDaysLate: number;  // avg of late days across late items
  overduePending: number; // pending/in_progress tasks past due
  maxOverdueDays: number;
  compliancePct: number;   // onTime / planned  (capped 0..100)
  coveragePct: number;     // completed / planned
  onTimePct: number;       // onTime / completed
  latestResult: { name: string; color: string } | null;
  nextDue: string | null;
}

const colorMap: Record<string, string> = {
  green: "bg-green-500", red: "bg-red-500", yellow: "bg-yellow-500",
  orange: "bg-orange-500", gray: "bg-gray-500", blue: "bg-blue-500",
};

const ToolPMReport = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [allDepartments, setAllDepartments] = useState<string[]>([]);

  const { allowedDepartments, isAdmin, isSingleDepartment, loading: permLoading } = useAllowedDepartments();
  const allowedDeptNames = useMemo(() => allowedDepartments.map(d => d.name), [allowedDepartments]);
  const departments = useMemo(
    () => isAdmin ? allDepartments : allDepartments.filter(d => allowedDeptNames.includes(d)),
    [allDepartments, isAdmin, allowedDeptNames]
  );

  useEffect(() => {
    if (!permLoading && isSingleDepartment && allowedDepartments.length === 1 && selectedDepartment === "all") {
      setSelectedDepartment(allowedDepartments[0].name);
    }
  }, [permLoading, isSingleDepartment, allowedDepartments, selectedDepartment]);

  useEffect(() => { fetchData(); }, [selectedYear, selectedMonth, isAdmin, allowedDeptNames.join("|")]);

  const periodRange = useMemo(() => {
    if (selectedMonth === "all") {
      return {
        start: startOfYear(new Date(selectedYear, 0, 1)),
        end: endOfYear(new Date(selectedYear, 11, 31)),
        days: 365,
      };
    }
    const m = parseInt(selectedMonth) - 1;
    const start = startOfMonth(new Date(selectedYear, m, 1));
    const end = endOfMonth(new Date(selectedYear, m, 1));
    return { start, end, days: differenceInDays(end, start) + 1 };
  }, [selectedYear, selectedMonth]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      let toolsQ = supabase.from("tools").select("*").eq("is_active", true).not("pm_interval_days", "is", null).order("code");
      if (!isAdmin) toolsQ = toolsQ.in("department", allowedDeptNames.length > 0 ? allowedDeptNames : ["__none__"]);
      const { data: toolsData, error: te } = await toolsQ;
      if (te) throw te;

      const startISO = periodRange.start.toISOString();
      const endISO = periodRange.end.toISOString();

      const [{ data: histData }, { data: pendData }] = await Promise.all([
        supabase.from("tool_pm_history")
          .select("id, tool_id, completed_date, tool_pm_task_id, pm_result:pm_results(name, color), tool_pm_task:tool_pm_tasks(due_date)")
          .gte("completed_date", startISO).lte("completed_date", endISO),
        supabase.from("tool_pm_tasks")
          .select("id, tool_id, due_date, status")
          .in("status", ["pending", "in_progress"]),
      ]);

      const depts = [...new Set((toolsData || []).map((t: any) => t.department).filter(Boolean))] as string[];
      setTools(toolsData || []);
      setHistory(histData || []);
      setPendingTasks(pendData || []);
      setAllDepartments(depts);
    } catch (e) {
      console.error(e);
      toast.error("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setIsLoading(false);
    }
  };

  const rows: Row[] = useMemo(() => {
    const today = new Date();
    const histByTool: Record<string, any[]> = {};
    history.forEach((h: any) => {
      if (!histByTool[h.tool_id]) histByTool[h.tool_id] = [];
      histByTool[h.tool_id].push(h);
    });
    const pendByTool: Record<string, any[]> = {};
    pendingTasks.forEach((t: any) => {
      if (!pendByTool[t.tool_id]) pendByTool[t.tool_id] = [];
      pendByTool[t.tool_id].push(t);
    });

    return tools.map((tool) => {
      const interval = tool.pm_interval_days || 30;
      const planned = Math.max(1, Math.floor(periodRange.days / interval));
      const hist = (histByTool[tool.id] || []).sort((a, b) =>
        new Date(b.completed_date).getTime() - new Date(a.completed_date).getTime()
      );
      const completed = hist.length;

      let onTime = 0, late = 0, lateDaysSum = 0;
      hist.forEach((h) => {
        const due = h.tool_pm_task?.due_date;
        if (!due) { onTime++; return; }
        const diff = differenceInDays(parseISO(h.completed_date), parseISO(due));
        if (diff <= 0) onTime++;
        else { late++; lateDaysSum += diff; }
      });

      const pend = (pendByTool[tool.id] || []);
      const overduePendingList = pend.filter((p: any) => p.due_date && new Date(p.due_date) < today);
      const overduePending = overduePendingList.length;
      const maxOverdueDays = overduePendingList.reduce((m: number, p: any) =>
        Math.max(m, differenceInDays(today, parseISO(p.due_date))), 0);
      const nextDue = pend
        .filter((p: any) => p.due_date)
        .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0]?.due_date || null;

      const compliancePct = Math.min(100, planned > 0 ? (onTime / planned) * 100 : 0);
      const coveragePct = Math.min(100, planned > 0 ? (completed / planned) * 100 : 0);
      const onTimePct = completed > 0 ? (onTime / completed) * 100 : 0;

      return {
        tool, planned, completed, onTime, late,
        avgDaysLate: late > 0 ? lateDaysSum / late : 0,
        overduePending, maxOverdueDays,
        compliancePct, coveragePct, onTimePct,
        latestResult: hist[0]?.pm_result || null,
        nextDue,
      };
    });
  }, [tools, history, pendingTasks, periodRange]);

  const filtered = useMemo(() => rows.filter((r) => {
    const term = searchTerm.toLowerCase();
    const matchSearch = !term ||
      r.tool.code.toLowerCase().includes(term) ||
      r.tool.name.toLowerCase().includes(term) ||
      r.tool.serial_number?.toLowerCase().includes(term);
    const matchDept = selectedDepartment === "all" || r.tool.department === selectedDepartment;
    return matchSearch && matchDept;
  }), [rows, searchTerm, selectedDepartment]);

  const { paginatedData, currentPage, pageSize, totalPages, totalItems, handlePageChange, handlePageSizeChange } =
    useTablePagination(filtered, 20);

  // Aggregates
  const totalPlanned = filtered.reduce((s, r) => s + r.planned, 0);
  const totalCompleted = filtered.reduce((s, r) => s + r.completed, 0);
  const totalOnTime = filtered.reduce((s, r) => s + r.onTime, 0);
  const totalOverduePending = filtered.reduce((s, r) => s + r.overduePending, 0);
  const overallCompliance = totalPlanned > 0 ? (totalOnTime / totalPlanned) * 100 : 0;
  const overallCoverage = totalPlanned > 0 ? (totalCompleted / totalPlanned) * 100 : 0;

  const getComplianceBadge = (pct: number) => {
    if (pct >= 90) return <Badge className="bg-green-500">ดี ({pct.toFixed(0)}%)</Badge>;
    if (pct >= 70) return <Badge className="bg-yellow-500">พอใช้ ({pct.toFixed(0)}%)</Badge>;
    if (pct >= 40) return <Badge className="bg-orange-500">ต้องปรับปรุง ({pct.toFixed(0)}%)</Badge>;
    return <Badge variant="destructive">วิกฤต ({pct.toFixed(0)}%)</Badge>;
  };

  const handleExport = () => {
    const data = filtered.map((r) => ({
      "รหัสเครื่องมือ": r.tool.code,
      "ชื่อเครื่องมือ": r.tool.name,
      "ฝ่าย": r.tool.department || "-",
      "รอบ PM (วัน)": r.tool.pm_interval_days || "-",
      "แผน PM ในช่วง (ครั้ง)": r.planned,
      "ทำแล้ว (ครั้ง)": r.completed,
      "ตรงเวลา (ครั้ง)": r.onTime,
      "เกินกำหนด (ครั้ง)": r.late,
      "เฉลี่ยล่าช้า (วัน)": r.avgDaysLate.toFixed(1),
      "% Compliance (ตรงเวลา/แผน)": r.compliancePct.toFixed(1) + "%",
      "% Coverage (ทำ/แผน)": r.coveragePct.toFixed(1) + "%",
      "% On-time (ตรงเวลา/ทำ)": r.onTimePct.toFixed(1) + "%",
      "งานค้างเกินกำหนด (ตั๋ว)": r.overduePending,
      "ค้างนานสุด (วัน)": r.maxOverdueDays,
      "ผลตรวจล่าสุด": r.latestResult?.name || "ยังไม่เคยตรวจ",
      "กำหนดถัดไป": r.nextDue ? format(new Date(r.nextDue), "dd/MM/yyyy") : "-",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PM Compliance");
    XLSX.writeFile(wb, `tool_pm_compliance_${selectedYear}${selectedMonth !== "all" ? "-" + selectedMonth : ""}.xlsx`);
    toast.success("ส่งออกรายงานสำเร็จ");
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  const months = [
    { value: "all", label: "ทั้งปี" },
    { value: "1", label: "มกราคม" }, { value: "2", label: "กุมภาพันธ์" }, { value: "3", label: "มีนาคม" },
    { value: "4", label: "เมษายน" }, { value: "5", label: "พฤษภาคม" }, { value: "6", label: "มิถุนายน" },
    { value: "7", label: "กรกฎาคม" }, { value: "8", label: "สิงหาคม" }, { value: "9", label: "กันยายน" },
    { value: "10", label: "ตุลาคม" }, { value: "11", label: "พฤศจิกายน" }, { value: "12", label: "ธันวาคม" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">รายงาน PM Compliance เครื่องมือ</h1>
        <p className="text-muted-foreground">
          วัดผลว่าเครื่องมือแต่ละตัว "ตรวจตามรอบ" และ "ทันเวลา" เพียงใด — คนละมุมกับ "ประวัติ PM" (รายรายการที่ทำจริง)
        </p>
      </div>

      {/* Method / Info banner */}
      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="pt-4 pb-4 text-sm space-y-1">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <Info className="h-4 w-4" /> วิธีคิดตัวเลข
          </div>
          <div className="grid md:grid-cols-2 gap-x-6 gap-y-1 pl-6">
            <div>• <b>แผน PM</b> = จำนวนวันในช่วง ÷ รอบ PM ของเครื่องมือนั้น</div>
            <div>• <b>ทำแล้ว</b> = นับจากประวัติ PM ที่ตรวจเสร็จในช่วง</div>
            <div>• <b>ตรงเวลา</b> = วันที่ตรวจ ≤ กำหนด (due date)</div>
            <div>• <b>Compliance %</b> = ตรงเวลา ÷ แผน (ตัวชี้วัดหลัก)</div>
            <div>• <b>Coverage %</b> = ทำแล้ว ÷ แผน (ครอบคลุมแค่ไหน)</div>
            <div>• <b>งานค้างเกินกำหนด</b> = ตั๋วสถานะรอตรวจ/กำลังตรวจ ที่เลย due แล้ว</div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-500/10"><Target className="h-6 w-6 text-blue-500" /></div>
            <div>
              <p className="text-sm text-muted-foreground">แผน PM รวม</p>
              <p className="text-2xl font-bold">{totalPlanned} <span className="text-sm font-normal">ครั้ง</span></p>
              <p className="text-xs text-muted-foreground">ทำแล้ว {totalCompleted} · ตรงเวลา {totalOnTime}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="p-3 rounded-lg bg-green-500/10"><CheckCircle className="h-6 w-6 text-green-500" /></div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Compliance รวม</p>
              <p className="text-2xl font-bold">{overallCompliance.toFixed(1)}%</p>
              <Progress value={overallCompliance} className="h-1.5 mt-1" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="p-3 rounded-lg bg-orange-500/10"><Clock className="h-6 w-6 text-orange-500" /></div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Coverage รวม</p>
              <p className="text-2xl font-bold">{overallCoverage.toFixed(1)}%</p>
              <Progress value={overallCoverage} className="h-1.5 mt-1" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="p-3 rounded-lg bg-red-500/10"><AlertTriangle className="h-6 w-6 text-red-500" /></div>
            <div>
              <p className="text-sm text-muted-foreground">งานค้างเกินกำหนด</p>
              <p className="text-2xl font-bold text-red-500">{totalOverduePending} <span className="text-sm font-normal">ตั๋ว</span></p>
              <p className="text-xs text-muted-foreground">รวมทุกเครื่องที่กรองอยู่</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader><CardTitle>ตัวกรอง</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <Label>ปี</Label>
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => <SelectItem key={y} value={String(y)}>{y + 543}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>เดือน</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {months.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ฝ่าย</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment} disabled={isSingleDepartment}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {!isSingleDepartment && <SelectItem value="all">ทั้งหมด</SelectItem>}
                  {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ค้นหา</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="รหัส, ชื่อ, Serial..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <div className="flex gap-2">
                <Button variant="outline" onClick={fetchData} className="flex-1"><RefreshCw className="h-4 w-4 mr-2" />รีเฟรช</Button>
                <Button onClick={handleExport} className="flex-1"><Download className="h-4 w-4 mr-2" />Export</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader><CardTitle>KPI รายเครื่อง ({filtered.length} รายการ)</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">ไม่พบข้อมูล</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>รหัส / ชื่อ</TableHead>
                      <TableHead>ฝ่าย</TableHead>
                      <TableHead className="text-center">รอบ PM</TableHead>
                      <TableHead className="text-center">แผน</TableHead>
                      <TableHead className="text-center">ทำ</TableHead>
                      <TableHead className="text-center">ตรงเวลา</TableHead>
                      <TableHead className="text-center">ล่าช้า (เฉลี่ยวัน)</TableHead>
                      <TableHead className="w-[180px]">Compliance</TableHead>
                      <TableHead>ผลตรวจล่าสุด</TableHead>
                      <TableHead>งานค้าง</TableHead>
                      <TableHead>กำหนดถัดไป</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((r) => (
                      <TableRow key={r.tool.id} className={r.overduePending > 0 ? "bg-red-50 dark:bg-red-900/10" : ""}>
                        <TableCell>
                          <div className="font-medium">{r.tool.code}</div>
                          <div className="text-xs text-muted-foreground">{r.tool.name}</div>
                        </TableCell>
                        <TableCell className="text-sm">{r.tool.department || "-"}</TableCell>
                        <TableCell className="text-center text-sm">ทุก {r.tool.pm_interval_days} วัน</TableCell>
                        <TableCell className="text-center font-medium">{r.planned}</TableCell>
                        <TableCell className="text-center">{r.completed}</TableCell>
                        <TableCell className="text-center text-green-600 font-medium">{r.onTime}</TableCell>
                        <TableCell className="text-center">
                          {r.late > 0
                            ? <span className="text-orange-600">{r.late} ({r.avgDaysLate.toFixed(1)}d)</span>
                            : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Progress value={r.compliancePct} className="h-2" />
                            <div className="flex justify-between items-center">
                              {getComplianceBadge(r.compliancePct)}
                              <span className="text-xs text-muted-foreground">cov {r.coveragePct.toFixed(0)}%</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {r.latestResult
                            ? <Badge className={colorMap[r.latestResult.color] || "bg-gray-500"}>{r.latestResult.name}</Badge>
                            : <Badge variant="outline">ยังไม่เคยตรวจ</Badge>}
                        </TableCell>
                        <TableCell>
                          {r.overduePending > 0
                            ? <Badge variant="destructive">{r.overduePending} ตั๋ว · {r.maxOverdueDays}d</Badge>
                            : <span className="text-xs text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.nextDue ? format(new Date(r.nextDue), "dd/MM/yyyy", { locale: th }) : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                currentPage={currentPage} totalPages={totalPages} totalItems={totalItems}
                pageSize={pageSize} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ToolPMReport;
