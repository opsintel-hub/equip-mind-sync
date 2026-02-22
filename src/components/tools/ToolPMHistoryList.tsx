import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, Search, History, FileDown, X, Filter } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import * as XLSX from "xlsx";

interface ToolPMHistory {
  id: string;
  completed_date: string;
  inspector_name: string | null;
  completed_by: string | null;
  notes: string | null;
  tool_pm_task: {
    task_number: string;
    quantity_checked: number | null;
  } | null;
  tool: {
    code: string;
    name: string;
    brand: string | null;
    serial_number: string | null;
    unit: string;
    department: string | null;
  };
  pm_result: { name: string; color: string } | null;
}

export function ToolPMHistoryList() {
  const [history, setHistory] = useState<ToolPMHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterResult, setFilterResult] = useState("all");
  const [filterInspector, setFilterInspector] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("tool_pm_history")
        .select(`
          *,
          tool_pm_task:tool_pm_tasks(task_number, quantity_checked),
          tool:tools(code, name, brand, serial_number, unit, department),
          pm_result:pm_results(name, color)
        `)
        .order("completed_date", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error fetching history:", error);
      toast.error("ไม่สามารถโหลดประวัติ PM ได้");
    } finally {
      setIsLoading(false);
    }
  };

  // Distinct values for filters
  const distinctDepts = useMemo(() =>
    [...new Set(history.map(h => h.tool?.department).filter(Boolean))].sort() as string[],
    [history]
  );

  const distinctResults = useMemo(() =>
    [...new Set(history.map(h => h.pm_result?.name).filter(Boolean))].sort() as string[],
    [history]
  );

  const distinctInspectors = useMemo(() =>
    [...new Set(history.map(h => h.inspector_name).filter(Boolean))].sort() as string[],
    [history]
  );

  const distinctYears = useMemo(() =>
    [...new Set(history.map(h => new Date(h.completed_date).getFullYear().toString()))].sort().reverse(),
    [history]
  );

  const months = [
    { value: "0", label: "มกราคม" },
    { value: "1", label: "กุมภาพันธ์" },
    { value: "2", label: "มีนาคม" },
    { value: "3", label: "เมษายน" },
    { value: "4", label: "พฤษภาคม" },
    { value: "5", label: "มิถุนายน" },
    { value: "6", label: "กรกฎาคม" },
    { value: "7", label: "สิงหาคม" },
    { value: "8", label: "กันยายน" },
    { value: "9", label: "ตุลาคม" },
    { value: "10", label: "พฤศจิกายน" },
    { value: "11", label: "ธันวาคม" },
  ];

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      // Text search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
          item.tool_pm_task?.task_number?.toLowerCase().includes(term) ||
          item.tool.code.toLowerCase().includes(term) ||
          item.tool.name.toLowerCase().includes(term) ||
          item.tool.serial_number?.toLowerCase().includes(term) ||
          item.inspector_name?.toLowerCase().includes(term) ||
          item.tool.brand?.toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }
      // Department filter
      if (filterDept !== "all" && item.tool?.department !== filterDept) return false;
      // Result filter
      if (filterResult !== "all" && item.pm_result?.name !== filterResult) return false;
      // Inspector filter
      if (filterInspector !== "all" && item.inspector_name !== filterInspector) return false;
      // Year filter
      if (filterYear !== "all" && new Date(item.completed_date).getFullYear().toString() !== filterYear) return false;
      // Month filter
      if (filterMonth !== "all" && new Date(item.completed_date).getMonth().toString() !== filterMonth) return false;
      return true;
    });
  }, [history, searchTerm, filterDept, filterResult, filterInspector, filterYear, filterMonth]);

  const hasActiveFilters = filterDept !== "all" || filterResult !== "all" || filterInspector !== "all" || filterYear !== "all" || filterMonth !== "all" || searchTerm !== "";

  const clearFilters = () => {
    setSearchTerm("");
    setFilterDept("all");
    setFilterResult("all");
    setFilterInspector("all");
    setFilterYear("all");
    setFilterMonth("all");
  };

  const getResultBadge = (result: { name: string; color: string } | null) => {
    if (!result) return <Badge variant="outline">-</Badge>;

    const colorMap: Record<string, string> = {
      green: "bg-green-500",
      red: "bg-red-500",
      yellow: "bg-yellow-500",
      gray: "bg-gray-500",
      blue: "bg-blue-500",
      orange: "bg-orange-500",
    };

    return <Badge className={colorMap[result.color] || ""}>{result.name}</Badge>;
  };

  const handleExport = () => {
    const exportData = filteredHistory.map((item) => ({
      หมายเลขงาน: item.tool_pm_task?.task_number || "-",
      รหัสเครื่องมือ: item.tool.code,
      ชื่อเครื่องมือ: item.tool.name,
      ฝ่าย: item.tool.department || "-",
      ยี่ห้อ: item.tool.brand || "-",
      "Serial No.": item.tool.serial_number || "-",
      จำนวนที่ตรวจ: item.tool_pm_task?.quantity_checked
        ? `${item.tool_pm_task.quantity_checked} ${item.tool.unit}`
        : "-",
      ผลการตรวจ: item.pm_result?.name || "-",
      วันที่ตรวจ: format(new Date(item.completed_date), "dd/MM/yyyy HH:mm", {
        locale: th,
      }),
      ผู้ตรวจ: item.inspector_name || "-",
      หมายเหตุ: item.notes || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ประวัติ PM เครื่องมือ");
    XLSX.writeFile(
      wb,
      `tool-pm-history-${format(new Date(), "yyyy-MM-dd")}.xlsx`
    );
    toast.success("ส่งออกข้อมูลสำเร็จ");
  };

  const { paginatedData, currentPage, pageSize, totalPages, totalItems, handlePageChange, handlePageSizeChange } = useTablePagination(filteredHistory);

  return (
    <div className="space-y-4">
      {/* Filters Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              ตัวกรอง
            </span>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                  <X className="w-3 h-3" />ล้างตัวกรอง
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="relative w-full sm:w-[250px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาหมายเลขงาน, รหัส, ชื่อ, ยี่ห้อ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="ฝ่าย" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกฝ่าย</SelectItem>
                {distinctDepts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterResult} onValueChange={setFilterResult}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="ผลการตรวจ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกผลการตรวจ</SelectItem>
                {distinctResults.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterInspector} onValueChange={setFilterInspector}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="ผู้ตรวจ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกผู้ตรวจ</SelectItem>
                {distinctInspectors.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-[120px]"><SelectValue placeholder="ปี" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกปี</SelectItem>
                {distinctYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="เดือน" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกเดือน</SelectItem>
                {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Table Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              ประวัติ PM เครื่องมือ ({filteredHistory.length} รายการ)
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={fetchHistory}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <FileDown className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {hasActiveFilters ? "ไม่พบประวัติตามเงื่อนไขที่เลือก" : "ยังไม่มีประวัติ PM"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>หมายเลขงาน</TableHead>
                    <TableHead>เครื่องมือ</TableHead>
                    <TableHead>ฝ่าย</TableHead>
                    <TableHead>ยี่ห้อ</TableHead>
                    <TableHead>Serial No.</TableHead>
                    <TableHead className="text-center">จำนวนที่ตรวจ</TableHead>
                    <TableHead>ผลการตรวจ</TableHead>
                    <TableHead>วันที่ตรวจ</TableHead>
                    <TableHead>ผู้ตรวจ</TableHead>
                    <TableHead>หมายเหตุ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">
                        {item.tool_pm_task?.task_number || "-"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{item.tool.code}</span>
                          <br />
                          <span className="text-xs text-muted-foreground">{item.tool.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{item.tool.department || "-"}</TableCell>
                      <TableCell className="text-sm">{item.tool.brand || "-"}</TableCell>
                      <TableCell className="text-sm">{item.tool.serial_number || "-"}</TableCell>
                      <TableCell className="text-center text-sm">
                        {item.tool_pm_task?.quantity_checked
                          ? `${item.tool_pm_task.quantity_checked} ${item.tool.unit}`
                          : "-"}
                      </TableCell>
                      <TableCell>{getResultBadge(item.pm_result)}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(item.completed_date), "dd/MM/yyyy HH:mm", { locale: th })}
                      </TableCell>
                      <TableCell className="text-sm">{item.inspector_name || "-"}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">
                        {item.notes || "-"}
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
    </div>
  );
}
