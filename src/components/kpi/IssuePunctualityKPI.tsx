import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Badge } from "@/components/ui/badge";

export default function IssuePunctualityKPI() {
  const { data, isLoading } = useQuery({
    queryKey: ["kpi-issue-punctuality"],
    queryFn: async () => {
      const { data: issues } = await supabase
        .from("goods_issue_pending")
        .select("status, created_at, issued_at");

      const items = issues || [];
      const total = items.length;
      const completed = items.filter((i) => i.status === "completed" || i.status === "issued");
      const pending = items.filter((i) => i.status === "pending" || i.status === "approved");
      const waiting = items.filter((i) => i.status === "waiting_stock");

      return {
        total,
        completed: completed.length,
        pending: pending.length,
        waiting: waiting.length,
        completedPct: total > 0 ? Math.round((completed.length / total) * 100) : 0,
        chartData: [
          { name: "เบิกแล้ว", value: completed.length },
          { name: "รออนุมัติ", value: pending.length },
          { name: "รอสต็อก", value: waiting.length },
        ].filter((d) => d.value > 0),
      };
    },
  });

  if (isLoading) return <Skeleton className="h-80 w-full" />;
  if (!data) return null;

  const colors = ["hsl(142, 76%, 36%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)"];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          ⏱️ อัตราเบิกจ่าย
          <span className="ml-auto text-2xl font-bold text-primary">{data.completedPct}%</span>
        </CardTitle>
        <p className="text-xs text-muted-foreground">สัดส่วนคำขอเบิกทั้งหมด {data.total} รายการ</p>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-3">
          <Badge className="bg-green-600">เบิกแล้ว: {data.completed}</Badge>
          <Badge variant="secondary">รออนุมัติ: {data.pending}</Badge>
          <Badge variant="destructive">รอสต็อก: {data.waiting}</Badge>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data.chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={75}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              fontSize={11}
            >
              {data.chartData.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
