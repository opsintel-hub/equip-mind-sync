import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { subMonths } from "date-fns";

const COLORS = {
  done: "hsl(var(--primary))",
  overdue: "hsl(var(--destructive))",
  pending: "hsl(var(--muted-foreground))",
};

export default function BillboardPMComplianceKPI() {
  const { data, isLoading } = useQuery({
    queryKey: ["kpi-billboard-pm-compliance"],
    queryFn: async () => {
      const sixMonthsAgo = subMonths(new Date(), 6).toISOString();

      // Get all active billboards
      const { data: billboards } = await supabase
        .from("billboards")
        .select("id, equipment_id, location_name, region")
        .eq("status", "active");

      // Get PM history in last 6 months
      const { data: pmHistory } = await supabase
        .from("billboard_pm_history")
        .select("billboard_id, actioned_at")
        .gte("actioned_at", sixMonthsAgo);

      // Get pending PM actions (snoozed or not yet done)
      const { data: pmActions } = await supabase
        .from("billboard_pm_actions")
        .select("billboard_id, snooze_until");

      const totalBillboards = (billboards || []).length;
      const pmDoneIds = new Set((pmHistory || []).map((p) => p.billboard_id));
      const pmPendingIds = new Set(
        (pmActions || []).map((a) => a.billboard_id).filter((id) => !pmDoneIds.has(id))
      );

      const doneCount = pmDoneIds.size;
      const pendingCount = pmPendingIds.size;
      const noPMCount = Math.max(0, totalBillboards - doneCount - pendingCount);
      const complianceRate = totalBillboards > 0 ? Math.round((doneCount / totalBillboards) * 100) : 0;

      // Top 5 regions by PM done
      const regionMap = new Map<string, { done: number; total: number }>();
      (billboards || []).forEach((b) => {
        const region = b.region || "ไม่ระบุ";
        const existing = regionMap.get(region) || { done: 0, total: 0 };
        existing.total++;
        if (pmDoneIds.has(b.id)) existing.done++;
        regionMap.set(region, existing);
      });

      const regionStats = Array.from(regionMap.entries())
        .map(([region, stats]) => ({
          region,
          done: stats.done,
          total: stats.total,
          rate: stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      return {
        total: totalBillboards,
        done: doneCount,
        pending: pendingCount,
        noPM: noPMCount,
        complianceRate,
        regionStats,
        chartData: [
          { name: "ทำแล้ว", value: doneCount },
          { name: "รอดำเนินการ", value: pendingCount },
          { name: "ยังไม่มี PM", value: noPMCount },
        ].filter((d) => d.value > 0),
      };
    },
  });

  if (isLoading) return <Skeleton className="h-80 w-full" />;
  if (!data) return null;

  const colorArr = [COLORS.done, COLORS.overdue, COLORS.pending];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          🔧 อัตราการทำ PM ป้ายโฆษณา
          <span className="ml-auto text-2xl font-bold text-primary">{data.complianceRate}%</span>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          PM Compliance Rate (6 เดือนล่าสุด) — ป้ายทั้งหมด {data.total} ป้าย
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          <Badge className="bg-primary/15 text-primary border-primary/30">ทำแล้ว: {data.done}</Badge>
          <Badge variant="destructive">รอดำเนินการ: {data.pending}</Badge>
          <Badge variant="secondary">ยังไม่มี PM: {data.noPM}</Badge>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-[120px] h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={55}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={colorArr[index % colorArr.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {data.regionStats.length > 0 && (
            <div className="flex-1 space-y-1">
              <p className="text-xs font-medium text-muted-foreground mb-1">สรุปตามภูมิภาค:</p>
              {data.regionStats.map((r) => (
                <div key={r.region} className="flex justify-between text-xs py-0.5">
                  <span className="truncate max-w-[60%]">{r.region}</span>
                  <span className="font-medium">{r.done}/{r.total} ({r.rate}%)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
