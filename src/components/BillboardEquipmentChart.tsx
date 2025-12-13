import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartExportButton } from "@/components/ChartExportButton";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, subDays, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import { Activity, TrendingUp, TrendingDown } from "lucide-react";

type TimeRange = "7d" | "30d" | "90d" | "12m";

interface ChartDataPoint {
  date: string;
  label: string;
  installations: number;
  uninstallations: number;
}

const BillboardEquipmentChart = () => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  const { data: chartData, isLoading } = useQuery({
    queryKey: ["billboard-equipment-chart", timeRange],
    queryFn: async () => {
      const today = new Date();
      let startDate: Date;
      let groupByMonth = false;

      switch (timeRange) {
        case "7d":
          startDate = subDays(today, 7);
          break;
        case "30d":
          startDate = subDays(today, 30);
          break;
        case "90d":
          startDate = subDays(today, 90);
          break;
        case "12m":
          startDate = subMonths(today, 12);
          groupByMonth = true;
          break;
        default:
          startDate = subDays(today, 30);
      }

      const startDateStr = format(startDate, "yyyy-MM-dd");

      // Fetch installations
      const { data: installations, error: instError } = await supabase
        .from("billboard_equipment")
        .select("installation_date, quantity")
        .gte("installation_date", startDateStr)
        .not("installation_date", "is", null);

      if (instError) throw instError;

      // Fetch uninstallations
      const { data: uninstallations, error: uninstError } = await supabase
        .from("billboard_equipment_history")
        .select("uninstall_date, quantity")
        .gte("uninstall_date", startDateStr);

      if (uninstError) throw uninstError;

      // Create date buckets
      let dataPoints: ChartDataPoint[] = [];

      if (groupByMonth) {
        const months = eachMonthOfInterval({ start: startOfMonth(startDate), end: endOfMonth(today) });
        dataPoints = months.map((month) => ({
          date: format(month, "yyyy-MM"),
          label: format(month, "MMM yy", { locale: th }),
          installations: 0,
          uninstallations: 0,
        }));

        // Aggregate installations by month
        installations?.forEach((item) => {
          if (!item.installation_date) return;
          const monthKey = format(parseISO(item.installation_date), "yyyy-MM");
          const point = dataPoints.find((p) => p.date === monthKey);
          if (point) point.installations += item.quantity || 1;
        });

        // Aggregate uninstallations by month
        uninstallations?.forEach((item) => {
          if (!item.uninstall_date) return;
          const monthKey = format(parseISO(item.uninstall_date), "yyyy-MM");
          const point = dataPoints.find((p) => p.date === monthKey);
          if (point) point.uninstallations += item.quantity || 1;
        });
      } else {
        const days = eachDayOfInterval({ start: startDate, end: today });
        dataPoints = days.map((day) => ({
          date: format(day, "yyyy-MM-dd"),
          label: format(day, "dd/MM", { locale: th }),
          installations: 0,
          uninstallations: 0,
        }));

        // Aggregate installations by day
        installations?.forEach((item) => {
          if (!item.installation_date) return;
          const point = dataPoints.find((p) => p.date === item.installation_date);
          if (point) point.installations += item.quantity || 1;
        });

        // Aggregate uninstallations by day
        uninstallations?.forEach((item) => {
          if (!item.uninstall_date) return;
          const point = dataPoints.find((p) => p.date === item.uninstall_date);
          if (point) point.uninstallations += item.quantity || 1;
        });
      }

      // Calculate totals
      const totalInstallations = dataPoints.reduce((sum, p) => sum + p.installations, 0);
      const totalUninstallations = dataPoints.reduce((sum, p) => sum + p.uninstallations, 0);

      return {
        chartData: dataPoints,
        totalInstallations,
        totalUninstallations,
        netChange: totalInstallations - totalUninstallations,
      };
    },
  });

  const getTimeRangeLabel = (range: TimeRange) => {
    switch (range) {
      case "7d": return "7 วันล่าสุด";
      case "30d": return "30 วันล่าสุด";
      case "90d": return "90 วันล่าสุด";
      case "12m": return "12 เดือนล่าสุด";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            สถิติการติดตั้ง/ถอดอุปกรณ์ในป้ายโฆษณา
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 วันล่าสุด</SelectItem>
                <SelectItem value="30d">30 วันล่าสุด</SelectItem>
                <SelectItem value="90d">90 วันล่าสุด</SelectItem>
                <SelectItem value="12m">12 เดือนล่าสุด</SelectItem>
              </SelectContent>
            </Select>
            <ChartExportButton chartRef={chartRef} filename={`billboard-equipment-${timeRange}`} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-success/10 border border-success/20">
            <div className="flex items-center gap-2 text-success mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">ติดตั้ง</span>
            </div>
            <div className="text-2xl font-semibold text-success">
              {chartData?.totalInstallations || 0}
            </div>
            <p className="text-xs text-muted-foreground">{getTimeRangeLabel(timeRange)}</p>
          </div>
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-2 text-destructive mb-1">
              <TrendingDown className="h-4 w-4" />
              <span className="text-sm font-medium">ถอด</span>
            </div>
            <div className="text-2xl font-semibold text-destructive">
              {chartData?.totalUninstallations || 0}
            </div>
            <p className="text-xs text-muted-foreground">{getTimeRangeLabel(timeRange)}</p>
          </div>
          <div className={`p-4 rounded-lg border ${
            (chartData?.netChange || 0) >= 0 
              ? "bg-primary/10 border-primary/20" 
              : "bg-warning/10 border-warning/20"
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4" />
              <span className="text-sm font-medium">ผลต่าง</span>
            </div>
            <div className={`text-2xl font-semibold ${
              (chartData?.netChange || 0) >= 0 ? "text-primary" : "text-warning"
            }`}>
              {(chartData?.netChange || 0) >= 0 ? "+" : ""}{chartData?.netChange || 0}
            </div>
            <p className="text-xs text-muted-foreground">อุปกรณ์สุทธิ</p>
          </div>
        </div>

        {/* Chart */}
        <div ref={chartRef} className="h-80 w-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              กำลังโหลดข้อมูล...
            </div>
          ) : !chartData?.chartData?.length ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              ไม่มีข้อมูลในช่วงเวลาที่เลือก
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="installations"
                  name="ติดตั้ง"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--success))", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="uninstallations"
                  name="ถอด"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--destructive))", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BillboardEquipmentChart;
