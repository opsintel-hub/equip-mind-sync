import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Input } from "@/components/ui/input";
import { RefreshCw, FileText, FileSpreadsheet } from "lucide-react";
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

interface EquipmentPMHistory {
  id: string;
  equipment_pm_schedule_id: string;
  completed_date: string;
  completed_by: string | null;
  notes: string | null;
  created_at: string;
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
}

interface SummaryStats {
  totalCompleted: number;
  byDepartment: Record<string, number>;
  byType: Record<string, number>;
  monthlyData: { month: string; count: number }[];
}

const SCHEDULE_TYPE_LABELS: Record<string, string> = {
  monthly: "1 เดือน",
  quarterly: "3 เดือน",
  "semi-annual": "6 เดือน",
  annual: "รายปี",
};

export function EquipmentPMHistoryList() {
  const [history, setHistory] = useState<EquipmentPMHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [startDate, setStartDate] = useState(
    subMonths(new Date(), 6).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [stats, setStats] = useState<SummaryStats>({
    totalCompleted: 0,
    byDepartment: {},
    byType: {},
    monthlyData: [],
  });
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchHistory();
  }, [startDate, endDate]);

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("equipment_pm_history")
      .select(`
        *,
        schedule:equipment_pm_schedule_id (
          title,
          department,
          equipment_type,
          schedule_type,
          equipment:equipment_id (code, name)
        )
      `)
      .gte("completed_date", startDate)
      .lte("completed_date", endDate)
      .order("completed_date", { ascending: false });

    if (error) {
      toast.error("ไม่สามารถโหลดข้อมูลได้");
    } else {
      setHistory(data || []);
      calculateStats(data || []);
    }
    setLoading(false);
  };

  const calculateStats = (data: EquipmentPMHistory[]) => {
    const byDepartment: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const monthlyMap: Record<string, number> = {};

    data.forEach((item) => {
      if (item.schedule) {
        // By department
        const dept = item.schedule.department;
        byDepartment[dept] = (byDepartment[dept] || 0) + 1;

        // By type
        const type = item.schedule.equipment_type;
        byType[type] = (byType[type] || 0) + 1;
      }

      // Monthly
      const month = item.completed_date.substring(0, 7);
      monthlyMap[month] = (monthlyMap[month] || 0) + 1;
    });

    const monthlyData = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({
        month: format(new Date(month + "-01"), "MMM yyyy", { locale: th }),
        count,
      }));

    setStats({
      totalCompleted: data.length,
      byDepartment,
      byType,
      monthlyData,
    });
  };

  const filteredHistory = history.filter((h) => {
    if (filterDepartment !== "all" && h.schedule?.department !== filterDepartment)
      return false;
    if (filterType !== "all" && h.schedule?.equipment_type !== filterType)
      return false;
    return true;
  });

  const departments = [...new Set(history.map((h) => h.schedule?.department).filter(Boolean))];
  const equipmentTypes = [...new Set(history.map((h) => h.schedule?.equipment_type).filter(Boolean))];

  const exportToExcel = () => {
    const data = filteredHistory.map((h) => ({
      ฝ่าย: h.schedule?.department || "-",
      ประเภทเครื่องมือ: h.schedule?.equipment_type || "-",
      รหัสเครื่องมือ: h.schedule?.equipment?.code || "-",
      ชื่อเครื่องมือ: h.schedule?.equipment?.name || "-",
      งานPM: h.schedule?.title || "-",
      ความถี่: SCHEDULE_TYPE_LABELS[h.schedule?.schedule_type || ""] || h.schedule?.schedule_type || "-",
      วันที่ทำ: format(new Date(h.completed_date), "d MMMM yyyy", { locale: th }),
      หมายเหตุ: h.notes || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Equipment PM History");
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

  return (
    <div className="space-y-6" ref={reportRef}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-lg">PM ที่ทำทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalCompleted}</div>
          </CardContent>
        </Card>

        {Object.entries(stats.byDepartment)
          .slice(0, 3)
          .map(([dept, count]) => (
            <Card key={dept}>
              <CardHeader className="py-4">
                <CardTitle className="text-lg">{dept}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{count}</div>
              </CardContent>
            </Card>
          ))}
      </div>

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
                  <Bar dataKey="count" name="จำนวน PM" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>ประวัติการทำ PM เครื่องมือ</CardTitle>
              <CardDescription>
                รายการบำรุงรักษาเครื่องมือที่ดำเนินการแล้ว
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchHistory}>
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
              <SelectContent>
                <SelectItem value="all">ทุกฝ่าย</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept!}>
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
                  <SelectItem key={type} value={type!}>
                    {type}
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
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              ไม่พบประวัติการทำ PM
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
                    <TableHead>วันที่ทำ</TableHead>
                    <TableHead>หมายเหตุ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.schedule?.department || "-"}</TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {item.schedule?.equipment_type || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {item.schedule?.equipment?.code || "-"}
                        </div>
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {item.schedule?.equipment?.name || "-"}
                        </div>
                      </TableCell>
                      <TableCell>{item.schedule?.title || "-"}</TableCell>
                      <TableCell>
                        {SCHEDULE_TYPE_LABELS[item.schedule?.schedule_type || ""] ||
                          item.schedule?.schedule_type ||
                          "-"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(item.completed_date), "d MMM yyyy", {
                          locale: th,
                        })}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {item.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
