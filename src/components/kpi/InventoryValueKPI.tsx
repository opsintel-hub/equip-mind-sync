import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { th } from "date-fns/locale";

export default function InventoryValueKPI() {
  const { data, isLoading } = useQuery({
    queryKey: ["kpi-inventory-value"],
    queryFn: async () => {
      // Current total value
      const { data: equipment } = await supabase
        .from("equipment")
        .select("quantity_in_stock, unit_price")
        .eq("is_active", true);

      const totalValue = (equipment || []).reduce(
        (s, e) => s + (e.quantity_in_stock || 0) * (e.unit_price || 0),
        0
      );

      // Monthly receipt value (last 6 months)
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(new Date(), 5 - i);
        return { start: startOfMonth(d).toISOString(), end: endOfMonth(d).toISOString(), label: format(d, "MMM yy", { locale: th }) };
      });

      const { data: movements } = await supabase
        .from("stock_movements")
        .select("movement_type, quantity, created_at")
        .gte("created_at", months[0].start)
        .lte("created_at", months[months.length - 1].end);

      const monthlyData = months.map((m) => {
        const inMonth = (movements || []).filter(
          (mv) => mv.created_at >= m.start && mv.created_at <= m.end && mv.movement_type === "receive"
        );
        const value = inMonth.reduce((s, mv) => s + Math.abs(mv.quantity || 0), 0);
        return { name: m.label, มูลค่ารับเข้า: value };
      });

      return { totalValue, monthlyData };
    },
  });

  if (isLoading) return <Skeleton className="h-80 w-full" />;
  if (!data) return null;

  const formatted = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(data.totalValue);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          💰 มูลค่าสินค้าคงคลัง
          <span className="ml-auto text-xl font-bold text-primary">{formatted}</span>
        </CardTitle>
        <p className="text-xs text-muted-foreground">มูลค่ารับเข้ารายเดือน (6 เดือน)</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data.monthlyData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => new Intl.NumberFormat("th-TH").format(v) + " ฿"} />
            <Area type="monotone" dataKey="มูลค่ารับเข้า" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
