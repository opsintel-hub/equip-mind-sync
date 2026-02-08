import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Package, PackageCheck, Warehouse, Archive } from "lucide-react";

interface StatusCount {
  pending: number;
  in_storage: number;
  issued: number;
  temporary: number;
  old: number;
}

interface AdDashboardProps {
  refresh: number;
  onFilterChange?: (filter: { type?: string; status?: string }) => void;
}

export function AdDashboard({ refresh, onFilterChange }: AdDashboardProps) {
  const [counts, setCounts] = useState<StatusCount>({
    pending: 0,
    in_storage: 0,
    issued: 0,
    temporary: 0,
    old: 0,
  });

  useEffect(() => {
    fetchCounts();
  }, [refresh]);

  const fetchCounts = async () => {
    try {
      const { data, error } = await supabase
        .from("advertisements")
        .select("status, entry_type")
        .eq("is_active", true);

      if (error) throw error;

      const result: StatusCount = {
        pending: 0,
        in_storage: 0,
        issued: 0,
        temporary: 0,
        old: 0,
      };

      (data || []).forEach((item) => {
        if (item.status === "pending") result.pending++;
        if (item.status === "in_storage" || item.status === "received") result.in_storage++;
        if (item.status === "issued" || item.status === "installed") result.issued++;
        if (item.entry_type === "temporary") result.temporary++;
        if (item.entry_type === "old") result.old++;
      });

      setCounts(result);
    } catch {
      // silent fail for dashboard
    }
  };

  const cards = [
    {
      label: "รอรับเข้า",
      value: counts.pending,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
      filter: { status: "pending" },
    },
    {
      label: "อยู่ในคลัง",
      value: counts.in_storage,
      icon: Warehouse,
      color: "text-primary",
      bgColor: "bg-primary/10",
      filter: { status: "in_storage" },
    },
    {
      label: "เบิกแล้ว",
      value: counts.issued,
      icon: PackageCheck,
      color: "text-success",
      bgColor: "bg-success/10",
      filter: { status: "issued" },
    },
    {
      label: "ฝากชั่วคราว",
      value: counts.temporary,
      icon: Package,
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
      filter: { type: "temporary" },
    },
    {
      label: "ภาพเก่า",
      value: counts.old,
      icon: Archive,
      color: "text-chart-5",
      bgColor: "bg-chart-5/10",
      filter: { type: "old" },
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((card) => (
        <Card
          key={card.label}
          className="cursor-pointer hover-lift border-border/50"
          onClick={() => onFilterChange?.(card.filter)}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
