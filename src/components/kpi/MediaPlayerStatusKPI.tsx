import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const STATUS_COLORS: Record<string, string> = {
  "Active": "hsl(142, 76%, 36%)",
  "Spare": "hsl(221, 83%, 53%)",
  "ซ่อม": "hsl(0, 84%, 60%)",
  "Claim": "hsl(38, 92%, 50%)",
  "อื่นๆ": "hsl(var(--muted-foreground))",
};

export default function MediaPlayerStatusKPI() {
  const { data, isLoading } = useQuery({
    queryKey: ["kpi-media-player-status"],
    queryFn: async () => {
      const { data: players } = await supabase
        .from("media_players")
        .select("status");

      const counts: Record<string, number> = {};
      (players || []).forEach((p) => {
        const s = p.status || "อื่นๆ";
        counts[s] = (counts[s] || 0) + 1;
      });

      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    },
  });

  if (isLoading) return <Skeleton className="h-80 w-full" />;

  const total = (data || []).reduce((s, d) => s + d.value, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          📺 สถานะ Media Player
          <span className="ml-auto text-2xl font-bold text-primary">{total}</span>
          <span className="text-sm text-muted-foreground font-normal">เครื่อง</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              fontSize={11}
            >
              {(data || []).map((entry) => (
                <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || STATUS_COLORS["อื่นๆ"]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
