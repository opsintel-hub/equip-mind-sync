import { useState, useEffect } from "react";
import { History, RefreshCw, FileSpreadsheet } from "lucide-react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, subMonths } from "date-fns";
import { th } from "date-fns/locale";
import * as XLSX from "xlsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface PMHistory {
  id: string;
  pm_schedule_id: string;
  completed_date: string;
  completed_by: string | null;
  notes: string | null;
  created_at: string;
  pm_schedules?: {
    title: string;
    schedule_type: string;
    billboards?: {
      equipment_id: string;
      location_name: string | null;
    };
  };
  profiles?: {
    full_name: string;
  };
}

interface SummaryStats {
  totalCompleted: number;
  byScheduleType: Record<string, number>;
  byMonth: { month: string; count: number }[];
}

interface Billboard {
  id: string;
  equipment_id: string;
}

export function PMHistoryList() {
  const [history, setHistory] = useState<PMHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("all");
  const [billboardFilter, setBillboardFilter] = useState("all");
  const [scheduleTypeFilter, setScheduleTypeFilter] = useState("all");
  const [billboards, setBillboards] = useState<Billboard[]>([]);
  const [summary, setSummary] = useState<SummaryStats>({
    totalCompleted: 0,
    byScheduleType: {},
    byMonth: [],
  });

  const fetchBillboards = async () => {
    const { data } = await supabase
      .from("billboards")
      .select("id, equipment_id")
      .order("equipment_id");
    setBillboards(data || []);
  };

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("pm_history")
        .select(`
          *,
          pm_schedules(
            title,
            schedule_type,
            billboard_id,
            billboards(equipment_id, location_name)
          ),
          profiles:completed_by(full_name)
        `)
        .order("completed_date", { ascending: false });

      // Apply date filter
      if (dateFilter !== "all") {
        const now = new Date();
        let startDate: Date;
        
        switch (dateFilter) {
          case "1m":
            startDate = subMonths(now, 1);
            break;
          case "3m":
            startDate = subMonths(now, 3);
            break;
          case "6m":
            startDate = subMonths(now, 6);
            break;
          case "12m":
            startDate = subMonths(now, 12);
            break;
          default:
            startDate = subMonths(now, 1);
        }
        
        query = query.gte("completed_date", format(startDate, "yyyy-MM-dd"));
      }

      const { data, error } = await query;

      if (error) throw error;
      
      let historyData = (data as unknown as PMHistory[]) || [];

      // Client-side filtering for billboard and schedule type
      if (billboardFilter !== "all") {
        historyData = historyData.filter(
          (item) => (item.pm_schedules as any)?.billboard_id === billboardFilter
        );
      }

      if (scheduleTypeFilter !== "all") {
        historyData = historyData.filter(
          (item) => item.pm_schedules?.schedule_type === scheduleTypeFilter
        );
      }

      setHistory(historyData);
      calculateSummary(historyData);
    } catch (error: any) {
      console.error("Error fetching PM history:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSummary = (data: PMHistory[]) => {
    const byScheduleType: Record<string, number> = {};
    const byMonthMap: Record<string, number> = {};

    data.forEach((item) => {
      // By schedule type
      const type = item.pm_schedules?.schedule_type || "unknown";
      byScheduleType[type] = (byScheduleType[type] || 0) + 1;

      // By month
      const month = format(new Date(item.completed_date), "yyyy-MM");
      byMonthMap[month] = (byMonthMap[month] || 0) + 1;
    });

    // Convert month map to sorted array
    const byMonth = Object.entries(byMonthMap)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    setSummary({
      totalCompleted: data.length,
      byScheduleType,
      byMonth,
    });
  };

  useEffect(() => {
    fetchBillboards();
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [dateFilter, billboardFilter, scheduleTypeFilter]);

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

  const formatMonthLabel = (month: string) => {
    const date = new Date(month + "-01");
    return format(date, "MMM yy", { locale: th });
  };

  const exportToExcel = () => {
    const exportData = history.map((item, index) => ({
      "ลำดับ": index + 1,
      "ป้ายโฆษณา": item.pm_schedules?.billboards?.equipment_id || "-",
      "สถานที่": item.pm_schedules?.billboards?.location_name || "-",
      "งาน PM": item.pm_schedules?.title || "-",
      "รอบ": getScheduleTypeLabel(item.pm_schedules?.schedule_type || ""),
      "วันที่ทำ": format(new Date(item.completed_date), "d MMM yyyy", { locale: th }),
      "ผู้ทำ": item.profiles?.full_name || "-",
      "หมายเหตุ": item.notes || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PM History");
    XLSX.writeFile(wb, `PM_History_${format(new Date(), "yyyyMMdd")}.xlsx`);
    toast.success("ส่งออกข้อมูลเรียบร้อยแล้ว");
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              PM ที่ทำเสร็จทั้งหมด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalCompleted}</div>
          </CardContent>
        </Card>
        {Object.entries(summary.byScheduleType).slice(0, 3).map(([type, count]) => (
          <Card key={type}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {getScheduleTypeLabel(type)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Chart */}
      {summary.byMonth.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">สถิติการทำ PM รายเดือน</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={summary.byMonth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonthLabel}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip
                  formatter={(value: number) => [value, "จำนวน PM"]}
                  labelFormatter={(label) => formatMonthLabel(label)}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                ประวัติการทำ PM
              </CardTitle>
              <CardDescription>
                รายการบำรุงรักษาที่เสร็จสิ้นแล้วทั้งหมด
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={billboardFilter} onValueChange={setBillboardFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="ป้ายโฆษณา" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกป้าย</SelectItem>
                  {billboards.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.equipment_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={scheduleTypeFilter} onValueChange={setScheduleTypeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="ประเภท" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกประเภท</SelectItem>
                  <SelectItem value="daily">รายวัน</SelectItem>
                  <SelectItem value="weekly">รายสัปดาห์</SelectItem>
                  <SelectItem value="monthly">รายเดือน</SelectItem>
                  <SelectItem value="quarterly">รายไตรมาส</SelectItem>
                  <SelectItem value="yearly">รายปี</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="1m">1 เดือน</SelectItem>
                  <SelectItem value="3m">3 เดือน</SelectItem>
                  <SelectItem value="6m">6 เดือน</SelectItem>
                  <SelectItem value="12m">12 เดือน</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchHistory}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
              <Button variant="outline" onClick={exportToExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              กำลังโหลด...
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              ไม่มีประวัติการทำ PM
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ป้ายโฆษณา</TableHead>
                  <TableHead>งาน PM</TableHead>
                  <TableHead>รอบ</TableHead>
                  <TableHead>วันที่ทำ</TableHead>
                  <TableHead>ผู้ทำ</TableHead>
                  <TableHead>หมายเหตุ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">
                        {item.pm_schedules?.billboards?.equipment_id || "-"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {item.pm_schedules?.billboards?.location_name || "-"}
                      </div>
                    </TableCell>
                    <TableCell>{item.pm_schedules?.title || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getScheduleTypeLabel(item.pm_schedules?.schedule_type || "")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(item.completed_date), "d MMM yyyy", { locale: th })}
                    </TableCell>
                    <TableCell>{item.profiles?.full_name || "-"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {item.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
