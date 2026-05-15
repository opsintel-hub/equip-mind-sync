import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Hourglass, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function PendingAssessmentAlerts() {
  const { data } = useQuery({
    queryKey: ["pending-assessment-counts"],
    queryFn: async () => {
      const [wr, pa, ur, ic] = await Promise.all([
        supabase.from("media_players").select("id", { count: "exact", head: true }).eq("status", "pending_warehouse_return"),
        supabase.from("media_players").select("id", { count: "exact", head: true }).eq("status", "pending_assessment"),
        supabase.from("media_players").select("id", { count: "exact", head: true }).eq("status", "under_repair"),
        supabase.from("media_players").select("id", { count: "exact", head: true }).eq("status", "in_claim"),
      ]);
      return { wr: wr.count || 0, pa: pa.count || 0, ur: ur.count || 0, ic: ic.count || 0 };
    },
    refetchInterval: 60000,
  });

  const total = (data?.wr || 0) + (data?.pa || 0) + (data?.ur || 0) + (data?.ic || 0);
  if (total === 0) return null;

  return (
    <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Hourglass className="w-5 h-5 text-purple-600" />
          เครื่อง/อุปกรณ์ค้างใน Workflow
          <span className="ml-auto text-2xl font-bold text-purple-700">{total}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between"><span>รอเข้าคลัง (Swap)</span><span className="font-semibold text-amber-700">{data?.wr}</span></div>
        <div className="flex justify-between"><span>พักรอประเมิน</span><span className="font-semibold text-purple-700">{data?.pa}</span></div>
        <div className="flex justify-between"><span>กำลังซ่อม</span><span className="font-semibold text-cyan-700">{data?.ur}</span></div>
        <div className="flex justify-between"><span>รอเคลม</span><span className="font-semibold text-rose-700">{data?.ic}</span></div>
        <Button asChild variant="outline" size="sm" className="w-full mt-3">
          <Link to="/assessment-log">ดูบันทึกการประเมิน <ArrowRight className="w-3 h-3 ml-1" /></Link>
        </Button>
      </CardContent>
    </Card>
  );
}
