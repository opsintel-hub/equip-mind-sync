import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { PieChartIcon, Filter } from "lucide-react";

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

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchCategoryData();
  }, [selectedDepartment]);

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
      let query = supabase
        .from("equipment")
        .select("category, quantity_in_stock")
        .eq("is_active", true);

      if (selectedDepartment !== "all") {
        query = query.eq("department", selectedDepartment);
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
        .map(([name, data]) => ({
          name,
          value: data.value,
          count: data.count,
        }))
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value);

      setCategoryData(chartData);
    } catch (error) {
      console.error("Error fetching category data:", error);
    } finally {
      setLoading(false);
    }
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="w-5 h-5" />
            สัดส่วนสินค้าแยกตามหมวดหมู่
          </CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[180px]">
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
              <Legend
                formatter={(value) => <span className="text-foreground text-sm">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
