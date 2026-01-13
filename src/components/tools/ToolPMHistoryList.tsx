import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, Search, History, FileDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import * as XLSX from "xlsx";

interface ToolPMHistory {
  id: string;
  completed_date: string;
  inspector_name: string | null;
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
  };
  pm_result: { name: string; color: string } | null;
}

export function ToolPMHistoryList() {
  const [history, setHistory] = useState<ToolPMHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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
          tool:tools(code, name, brand, serial_number, unit),
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

  const filteredHistory = history.filter(
    (item) =>
      item.tool_pm_task?.task_number
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      item.tool.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tool.serial_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            ประวัติ PM เครื่องมือ ({filteredHistory.length} รายการ)
          </CardTitle>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาหมายเลขงาน, รหัส, ชื่อ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
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
            {searchTerm ? "ไม่พบประวัติที่ค้นหา" : "ยังไม่มีประวัติ PM"}
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
                  <TableHead className="text-center">จำนวนที่ตรวจ</TableHead>
                  <TableHead>ผลการตรวจ</TableHead>
                  <TableHead>วันที่ตรวจ</TableHead>
                  <TableHead>ผู้ตรวจ</TableHead>
                  <TableHead>หมายเหตุ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.tool_pm_task?.task_number || "-"}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.tool.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.tool.code}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.tool.brand || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.tool.serial_number || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.tool_pm_task?.quantity_checked
                        ? `${item.tool_pm_task.quantity_checked} ${item.tool.unit}`
                        : "-"}
                    </TableCell>
                    <TableCell>{getResultBadge(item.pm_result)}</TableCell>
                    <TableCell>
                      {format(new Date(item.completed_date), "dd/MM/yyyy HH:mm", {
                        locale: th,
                      })}
                    </TableCell>
                    <TableCell>
                      {item.inspector_name || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {item.notes || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
