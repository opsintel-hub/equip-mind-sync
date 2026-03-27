import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { addDays, format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function ExpiryWarrantyKPI() {
  const { data, isLoading } = useQuery({
    queryKey: ["kpi-expiry-warranty"],
    queryFn: async () => {
      const now = new Date();
      const d30 = addDays(now, 30).toISOString().split("T")[0];
      const d60 = addDays(now, 60).toISOString().split("T")[0];
      const d90 = addDays(now, 90).toISOString().split("T")[0];
      const today = format(now, "yyyy-MM-dd");

      const { data: equipment } = await supabase
        .from("equipment")
        .select("id, code, name, expiry_date, warranty_expiry_date")
        .eq("is_active", true);

      const items = equipment || [];

      const countInRange = (field: "expiry_date" | "warranty_expiry_date", from: string, to: string) =>
        items.filter((e) => {
          const v = e[field];
          return v && v >= from && v <= to;
        }).length;

      const expiredCount = (field: "expiry_date" | "warranty_expiry_date") =>
        items.filter((e) => {
          const v = e[field];
          return v && v < today;
        }).length;

      const chartData = [
        {
          name: "หมดแล้ว",
          หมดอายุ: expiredCount("expiry_date"),
          หมดประกัน: expiredCount("warranty_expiry_date"),
        },
        {
          name: "30 วัน",
          หมดอายุ: countInRange("expiry_date", today, d30),
          หมดประกัน: countInRange("warranty_expiry_date", today, d30),
        },
        {
          name: "60 วัน",
          หมดอายุ: countInRange("expiry_date", d30, d60),
          หมดประกัน: countInRange("warranty_expiry_date", d30, d60),
        },
        {
          name: "90 วัน",
          หมดอายุ: countInRange("expiry_date", d60, d90),
          หมดประกัน: countInRange("warranty_expiry_date", d60, d90),
        },
      ];

      const totalExpiry30 = countInRange("expiry_date", today, d30) + expiredCount("expiry_date");
      const totalWarranty30 = countInRange("warranty_expiry_date", today, d30) + expiredCount("warranty_expiry_date");

      return { chartData, totalExpiry30, totalWarranty30 };
    },
  });

  if (isLoading) return <Skeleton className="h-80 w-full" />;
  if (!data) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          🔔 อุปกรณ์ใกล้หมดอายุ/หมดประกัน
        </CardTitle>
        <div className="flex gap-2 mt-1">
          <Badge variant="destructive">หมดอายุ/ใกล้หมด: {data.totalExpiry30}</Badge>
          <Badge variant="secondary">หมดประกัน/ใกล้หมด: {data.totalWarranty30}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Legend />
            <Bar dataKey="หมดอายุ" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="หมดประกัน" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
