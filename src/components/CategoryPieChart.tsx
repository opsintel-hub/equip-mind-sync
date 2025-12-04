import { useState, useEffect } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { PieChartIcon, Filter, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryData {
  name: string;
  value: number;
  count: number;
}

interface Department {
  id: string;
  name: string;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
];

export const CategoryPieChart = () => {
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchCategoryData();
  }, [selectedDepartment, startDate, endDate]);

  const fetchDepartments = async () => {
    const { data } = await supabase
      .from("departments")
      .select("id, name")
      .eq("is_active", true)
      .order("name");
    setDepartments(data || []);
  };

  const fetchCategoryData = async () => {
    setLoading(true);
    try {
      // Get equipment IDs from goods_receipt within date range
      let equipmentIdsInRange: string[] | null = null;
      
      if (startDate || endDate) {
        let grQuery = supabase.from("goods_receipt").select("equipment_id");
        
        if (startDate) {
          grQuery = grQuery.gte("receipt_date", format(startDate, "yyyy-MM-dd"));
        }
        if (endDate) {
          grQuery = grQuery.lte("receipt_date", format(endDate, "yyyy-MM-dd"));
        }
        
        const { data: grData } = await grQuery;
        equipmentIdsInRange = [...new Set((grData || []).map(gr => gr.equipment_id))];
      }

      let query = supabase
        .from("equipment")
        .select("id, category, quantity_in_stock")
        .eq("is_active", true);

      if (selectedDepartment !== "all") {
        query = query.eq("department", selectedDepartment);
      }

      if (equipmentIdsInRange !== null) {
        if (equipmentIdsInRange.length === 0) {
          setCategoryData([]);
          setLoading(false);
          return;
        }
        query = query.in("id", equipmentIdsInRange);
      }

      const { data, error } = await query;

      if (error) throw error;

      const categoryMap = new Map<string, { value: number; count: number }>();
      
      (data || []).forEach((item) => {
        const existing = categoryMap.get(item.category) || { value: 0, count: 0 };
        categoryMap.set(item.category, {
          value: existing.value + (item.quantity_in_stock || 0),
          count: existing.count + 1,
        });
      });

      const chartData: CategoryData[] = Array.from(categoryMap.entries())
        .map(([name, data]) => ({ name, value: data.value, count: data.count }))
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value);

      setCategoryData(chartData);
    } catch (error) {
      console.error("Error fetching category data:", error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSelectedDepartment("all");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const totalQuantity = categoryData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / totalQuantity) * 100).toFixed(1);
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{data.name}</p>
          <p className="text-sm text-muted-foreground">จำนวน: {data.value.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">รายการ: {data.count}</p>
          <p className="text-sm text-muted-foreground">สัดส่วน: {percentage}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="w-5 h-5" />
            สัดส่วนสินค้าแยกตามหมวดหมู่
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="เลือกฝ่าย" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกฝ่าย</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.name}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "dd/MM/yy") : "วันที่เริ่ม"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="p-3 pointer-events-auto" locale={th} />
              </PopoverContent>
            </Popover>

            <span className="text-muted-foreground">-</span>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "dd/MM/yy") : "วันที่สิ้นสุด"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="p-3 pointer-events-auto" locale={th} />
              </PopoverContent>
            </Popover>

            {(selectedDepartment !== "all" || startDate || endDate) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                ล้างตัวกรอง
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            กำลังโหลด...
          </div>
        ) : categoryData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            ไม่มีข้อมูลสินค้า
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {categoryData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend formatter={(value) => <span className="text-foreground text-sm">{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
