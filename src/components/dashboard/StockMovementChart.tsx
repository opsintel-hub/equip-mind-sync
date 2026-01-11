import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, subMonths, startOfDay, startOfMonth, endOfMonth } from "date-fns";
import { th } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, Calendar } from "lucide-react";

interface StockMovement {
  id: string;
  movement_type: string;
  quantity: number;
  created_at: string;
}

interface ChartData {
  date: string;
  receive: number;
  issue: number;
  transfer_in: number;
  transfer_out: number;
  return_from_billboard: number;
  install_to_billboard: number;
}

interface StockMovementChartProps {
  companyId?: string;
}

export const StockMovementChart = ({ companyId }: StockMovementChartProps) => {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"daily" | "monthly">("daily");
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "3m" | "6m">("30d");

  useEffect(() => {
    fetchData();
  }, [viewMode, dateRange, companyId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Calculate date range
      let startDate: Date;
      const endDate = new Date();
      
      switch (dateRange) {
        case "7d":
          startDate = subDays(endDate, 7);
          break;
        case "30d":
          startDate = subDays(endDate, 30);
          break;
        case "3m":
          startDate = subMonths(endDate, 3);
          break;
        case "6m":
          startDate = subMonths(endDate, 6);
          break;
        default:
          startDate = subDays(endDate, 30);
      }

      let query = supabase
        .from("stock_movements")
        .select("id, movement_type, quantity, created_at")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at");

      if (companyId && companyId !== "all") {
        query = query.eq("company_id", companyId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by date
      const groupedData = new Map<string, ChartData>();
      
      (data || []).forEach((movement: StockMovement) => {
        const date = new Date(movement.created_at);
        const key = viewMode === "daily" 
          ? format(date, "yyyy-MM-dd")
          : format(date, "yyyy-MM");
        
        if (!groupedData.has(key)) {
          groupedData.set(key, {
            date: key,
            receive: 0,
            issue: 0,
            transfer_in: 0,
            transfer_out: 0,
            return_from_billboard: 0,
            install_to_billboard: 0,
          });
        }
        
        const entry = groupedData.get(key)!;
        switch (movement.movement_type) {
          case "receive":
            entry.receive += movement.quantity;
            break;
          case "issue":
            entry.issue += movement.quantity;
            break;
          case "transfer_in":
            entry.transfer_in += movement.quantity;
            break;
          case "transfer_out":
            entry.transfer_out += movement.quantity;
            break;
          case "return_from_billboard":
            entry.return_from_billboard += movement.quantity;
            break;
          case "install_to_billboard":
            entry.install_to_billboard += movement.quantity;
            break;
        }
      });

      // Fill in missing dates
      const result: ChartData[] = [];
      let currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const key = viewMode === "daily" 
          ? format(currentDate, "yyyy-MM-dd")
          : format(currentDate, "yyyy-MM");
        
        if (groupedData.has(key)) {
          result.push(groupedData.get(key)!);
        } else {
          result.push({
            date: key,
            receive: 0,
            issue: 0,
            transfer_in: 0,
            transfer_out: 0,
            return_from_billboard: 0,
            install_to_billboard: 0,
          });
        }
        
        if (viewMode === "daily") {
          currentDate.setDate(currentDate.getDate() + 1);
        } else {
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      }

      // Remove duplicates for monthly view
      const uniqueResult = viewMode === "monthly" 
        ? Array.from(new Map(result.map(item => [item.date, item])).values())
        : result;

      setChartData(uniqueResult);
    } catch (error) {
      console.error("Error fetching stock movements:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateLabel = (date: string) => {
    if (viewMode === "daily") {
      return format(new Date(date), "d MMM", { locale: th });
    }
    return format(new Date(date + "-01"), "MMM yy", { locale: th });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground mb-2">{formatDateLabel(label)}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.fill }} />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium">{entry.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              สรุปการเคลื่อนไหว Stock
            </CardTitle>
            <CardDescription>แยกตามประเภท (รับเข้า/เบิกออก/โอน/คืนจากป้าย)</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as "daily" | "monthly")}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">รายวัน</SelectItem>
                <SelectItem value="monthly">รายเดือน</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as "7d" | "30d" | "3m" | "6m")}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 วัน</SelectItem>
                <SelectItem value="30d">30 วัน</SelectItem>
                <SelectItem value="3m">3 เดือน</SelectItem>
                <SelectItem value="6m">6 เดือน</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">
            กำลังโหลด...
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">
            ไม่มีข้อมูลการเคลื่อนไหว
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDateLabel}
                tick={{ fontSize: 11 }}
                angle={viewMode === "daily" && dateRange !== "7d" ? -45 : 0}
                textAnchor={viewMode === "daily" && dateRange !== "7d" ? "end" : "middle"}
                height={viewMode === "daily" && dateRange !== "7d" ? 60 : 30}
                className="fill-muted-foreground"
              />
              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                height={36}
                formatter={(value) => (
                  <span className="text-sm text-muted-foreground">{value}</span>
                )}
              />
              <Bar dataKey="receive" name="รับเข้า" fill="hsl(var(--success))" stackId="positive" />
              <Bar dataKey="return_from_billboard" name="คืนจากป้าย" fill="hsl(var(--chart-2))" stackId="positive" />
              <Bar dataKey="transfer_in" name="โอนเข้า" fill="hsl(var(--chart-3))" stackId="positive" />
              <Bar dataKey="issue" name="เบิกออก" fill="hsl(var(--warning))" stackId="negative" />
              <Bar dataKey="install_to_billboard" name="ติดตั้งป้าย" fill="hsl(var(--chart-4))" stackId="negative" />
              <Bar dataKey="transfer_out" name="โอนออก" fill="hsl(var(--chart-5))" stackId="negative" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
