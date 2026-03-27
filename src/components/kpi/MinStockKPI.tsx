import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function MinStockKPI() {
  const { data, isLoading } = useQuery({
    queryKey: ["kpi-min-stock"],
    queryFn: async () => {
      const { data: equipment } = await supabase
        .from("equipment")
        .select("id, code, name, quantity_in_stock, min_stock_level")
        .eq("is_active", true)
        .not("min_stock_level", "is", null);

      const items = equipment || [];
      const belowMin = items.filter(
        (e) => e.min_stock_level != null && e.quantity_in_stock <= e.min_stock_level
      );
      const zeroStock = items.filter((e) => e.quantity_in_stock === 0);

      return {
        total: items.length,
        belowMin: belowMin.length,
        zeroStock: zeroStock.length,
        percent: items.length > 0 ? Math.round((belowMin.length / items.length) * 100) : 0,
        topItems: belowMin.slice(0, 5).map((e) => ({
          code: e.code,
          name: e.name,
          stock: e.quantity_in_stock,
          min: e.min_stock_level,
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
          ⚠️ สินค้าต่ำกว่า Min Stock
          <span className="ml-auto text-2xl font-bold text-destructive">{data.belowMin}</span>
          <span className="text-sm text-muted-foreground font-normal">/ {data.total} รายการ</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>ต่ำกว่า Min Stock</span>
            <span className="font-medium">{data.percent}%</span>
          </div>
          <Progress value={data.percent} className="h-3" />
        </div>

        <div className="flex gap-3">
          <Badge variant="destructive">สต็อกเป็น 0: {data.zeroStock} รายการ</Badge>
          <Badge variant="secondary">ต่ำกว่า Min: {data.belowMin} รายการ</Badge>
        </div>

        {data.topItems.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Top 5 สินค้าต่ำกว่า Min Stock:</p>
            {data.topItems.map((item) => (
              <div key={item.code} className="flex justify-between text-xs py-1 border-b last:border-0">
                <span className="truncate max-w-[60%]">{item.code} — {item.name}</span>
                <span className="text-destructive font-medium">{item.stock} / {item.min}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
