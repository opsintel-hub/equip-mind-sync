import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { subDays } from "date-fns";

export default function DeadStockKPI() {
  const { data, isLoading } = useQuery({
    queryKey: ["kpi-dead-stock"],
    queryFn: async () => {
      const cutoff90 = subDays(new Date(), 90).toISOString();
      const cutoff180 = subDays(new Date(), 180).toISOString();

      // Get all active equipment
      const { data: equipment } = await supabase
        .from("equipment")
        .select("id, code, name, quantity_in_stock")
        .eq("is_active", true)
        .gt("quantity_in_stock", 0);

      // Get recent movements
      const { data: movements } = await supabase
        .from("stock_movements")
        .select("equipment_id, created_at")
        .gte("created_at", cutoff180);

      const movedIds = new Set((movements || []).map((m) => m.equipment_id));
      const recentMovedIds = new Set(
        (movements || []).filter((m) => m.created_at >= cutoff90).map((m) => m.equipment_id)
      );

      const items = equipment || [];
      const dead90 = items.filter((e) => !recentMovedIds.has(e.id));
      const dead180 = items.filter((e) => !movedIds.has(e.id));

      return {
        total: items.length,
        dead90: dead90.length,
        dead180: dead180.length,
        pct90: items.length > 0 ? Math.round((dead90.length / items.length) * 100) : 0,
        topDead: dead90.slice(0, 5).map((e) => ({
          code: e.code,
          name: e.name,
          stock: e.quantity_in_stock,
        })),
      };
    },
  });

  if (isLoading) return <Skeleton className="h-80 w-full" />;
  if (!data) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          📉 Dead Stock
          <span className="ml-auto text-2xl font-bold text-orange-600">{data.dead90}</span>
          <span className="text-sm text-muted-foreground font-normal">/ {data.total} รายการ</span>
        </CardTitle>
        <p className="text-xs text-muted-foreground">สินค้าที่ไม่มีความเคลื่อนไหว</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-3">
          <Badge variant="secondary">ไม่เคลื่อนไหว 90+ วัน: {data.dead90} ({data.pct90}%)</Badge>
          <Badge variant="destructive">ไม่เคลื่อนไหว 180+ วัน: {data.dead180}</Badge>
        </div>

        {data.topDead.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Top 5 Dead Stock (90+ วัน):</p>
            {data.topDead.map((item) => (
              <div key={item.code} className="flex justify-between text-xs py-1 border-b last:border-0">
                <span className="truncate max-w-[70%]">{item.code} — {item.name}</span>
                <span className="font-medium">{item.stock} ชิ้น</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
