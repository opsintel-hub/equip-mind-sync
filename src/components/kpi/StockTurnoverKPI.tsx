import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { th } from "date-fns/locale";

export default function StockTurnoverKPI() {
  const { data, isLoading } = useQuery({
    queryKey: ["kpi-stock-turnover"],
    queryFn: async () => {
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(new Date(), 5 - i);
        return { start: startOfMonth(d).toISOString(), end: endOfMonth(d).toISOString(), label: format(d, "MMM yy", { locale: th }) };
      });

      const { data: movements } = await supabase
        .from("stock_movements")
        .select("movement_type, quantity, created_at")
        .gte("created_at", months[0].start)
        .lte("created_at", months[months.length - 1].end);

      return months.map((m) => {
        const inMonth = (movements || []).filter(
          (mv) => mv.created_at >= m.start && mv.created_at <= m.end
        );
        const received = inMonth
          .filter((mv) => mv.movement_type === "receive")
          .reduce((s, mv) => s + (mv.quantity || 0), 0);
        const issued = inMonth
          .filter((mv) => mv.movement_type === "issue")
          .reduce((s, mv) => s + Math.abs(mv.quantity || 0), 0);
        return { name: m.label, รับเข้า: received, เบิกออก: issued };
      });
    },
  });

  if (isLoading) return <Skeleton className="h-80 w-full" />;

  const totalIn = (data || []).reduce((s, d) => s + d.รับเข้า, 0);
  const totalOut = (data || []).reduce((s, d) => s + d.เบิกออก, 0);
  const ratio = totalIn > 0 ? (totalOut / totalIn).toFixed(2) : "-";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          📦 อัตราหมุนเวียนสต็อก
          <span className="ml-auto text-2xl font-bold text-primary">{ratio}x</span>
        </CardTitle>
        <p className="text-xs text-muted-foreground">Turnover Ratio (เบิก/รับ) 6 เดือนล่าสุด</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Legend />
            <Bar dataKey="รับเข้า" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="เบิกออก" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
