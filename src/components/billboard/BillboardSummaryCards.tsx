import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, CheckCircle2, Wrench, XCircle, AlertTriangle, ShieldAlert, Building2 } from "lucide-react";

interface BillboardSummaryCardsProps {
  filters: {
    region: string;
    district: string;
    department: string;
    mediaType: string;
    status: string;
    locationName: string;
    equipmentStatus: string;
  };
  searchTerm: string;
}

export function BillboardSummaryCards({ filters, searchTerm }: BillboardSummaryCardsProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["billboard-summary", filters, searchTerm],
    queryFn: async () => {
      // Resolve equipment-status filter -> billboard ids
      let billboardIdFilter: string[] | null = null;
      if (filters.equipmentStatus) {
        const today = new Date().toISOString().split("T")[0];
        const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const { data: be } = await supabase
          .from("billboard_equipment")
          .select("billboard_id, equipment:equipment_id(expiry_date, warranty_expiry_date)");
        const ids = new Set<string>();
        be?.forEach((row) => {
          const eq = row.equipment as { expiry_date: string | null; warranty_expiry_date: string | null } | null;
          if (!eq) return;
          switch (filters.equipmentStatus) {
            case "expired":
              if (eq.expiry_date && eq.expiry_date < today) ids.add(row.billboard_id);
              break;
            case "warranty_expired":
              if (eq.warranty_expiry_date && eq.warranty_expiry_date < today) ids.add(row.billboard_id);
              break;
            case "expiring_soon":
              if (eq.expiry_date && eq.expiry_date >= today && eq.expiry_date <= in30) ids.add(row.billboard_id);
              break;
            case "warranty_expiring_soon":
              if (eq.warranty_expiry_date && eq.warranty_expiry_date >= today && eq.warranty_expiry_date <= in30)
                ids.add(row.billboard_id);
              break;
          }
        });
        billboardIdFilter = Array.from(ids);
        if (billboardIdFilter.length === 0) {
          return { total: 0, active: 0, maintenance: 0, inactive: 0, expired: 0, warrantyExpired: 0, byDepartment: [] };
        }
      }

      // Fetch filtered billboards (id, status, department) — only what we need
      let q = supabase.from("billboards").select("id, status, department");
      if (searchTerm) {
        q = q.or(
          `equipment_id.ilike.%${searchTerm}%,old_code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,location_name.ilike.%${searchTerm}%`,
        );
      }
      if (filters.region) q = q.eq("region", filters.region);
      if (filters.district) q = q.eq("district", filters.district);
      if (filters.department) q = q.eq("department", filters.department);
      if (filters.mediaType) q = q.eq("media_type", filters.mediaType);
      if (filters.status) q = q.eq("status", filters.status);
      if (filters.locationName) q = q.ilike("location_name", `%${filters.locationName}%`);
      if (billboardIdFilter) q = q.in("id", billboardIdFilter);

      const { data: rows, error } = await q.limit(50000);
      if (error) throw error;

      const billboardIds = (rows || []).map((r) => r.id);

      // Compute equipment expiry/warranty counts across the filtered set
      let expired = 0;
      let warrantyExpired = 0;
      if (billboardIds.length > 0) {
        const today = new Date().toISOString().split("T")[0];
        const expiredSet = new Set<string>();
        const warrSet = new Set<string>();

        // chunk to avoid huge .in() lists
        const chunkSize = 500;
        for (let i = 0; i < billboardIds.length; i += chunkSize) {
          const chunk = billboardIds.slice(i, i + chunkSize);
          const { data: be } = await supabase
            .from("billboard_equipment")
            .select("billboard_id, equipment:equipment_id(expiry_date, warranty_expiry_date)")
            .in("billboard_id", chunk);
          be?.forEach((row) => {
            const eq = row.equipment as { expiry_date: string | null; warranty_expiry_date: string | null } | null;
            if (!eq) return;
            if (eq.expiry_date && eq.expiry_date < today) expiredSet.add(row.billboard_id);
            if (eq.warranty_expiry_date && eq.warranty_expiry_date < today) warrSet.add(row.billboard_id);
          });
        }
        expired = expiredSet.size;
        warrantyExpired = warrSet.size;
      }

      const total = rows?.length || 0;
      const active = rows?.filter((r) => r.status === "active").length || 0;
      const maintenance = rows?.filter((r) => r.status === "maintenance").length || 0;
      const inactive = rows?.filter((r) => r.status === "inactive").length || 0;

      // Department breakdown
      const deptMap = new Map<string, number>();
      rows?.forEach((r) => {
        const d = r.department || "ไม่ระบุ";
        deptMap.set(d, (deptMap.get(d) || 0) + 1);
      });
      const byDepartment = Array.from(deptMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      return { total, active, maintenance, inactive, expired, warrantyExpired, byDepartment };
    },
  });

  const cards = [
    { label: "ป้ายทั้งหมด (ตามตัวกรอง)", value: data?.total ?? 0, icon: MapPin, color: "text-primary", bg: "bg-primary/10" },
    { label: "ใช้งาน", value: data?.active ?? 0, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
    { label: "บำรุงรักษา", value: data?.maintenance ?? 0, icon: Wrench, color: "text-warning", bg: "bg-warning/10" },
    { label: "ไม่ใช้งาน", value: data?.inactive ?? 0, icon: XCircle, color: "text-muted-foreground", bg: "bg-muted" },
    { label: "อุปกรณ์หมดอายุ", value: data?.expired ?? 0, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "หมดประกัน", value: data?.warrantyExpired ?? 0, icon: ShieldAlert, color: "text-chart-4", bg: "bg-chart-4/10" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => (
          <Card key={c.label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${c.bg}`}>
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold leading-tight">
                  {isLoading ? "…" : c.value.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground truncate">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Department breakdown bar */}
      {(data?.byDepartment?.length ?? 0) > 0 && (
        <Card className="border-border/50">
          <CardContent className="p-3 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground shrink-0">
              <Building2 className="h-4 w-4" />
              สรุปตามฝ่าย:
            </div>
            <div className="flex flex-wrap gap-2">
              {data!.byDepartment.map((d) => (
                <Badge key={d.name} variant="secondary" className="text-xs font-normal">
                  {d.name}
                  <span className="ml-1.5 font-semibold text-foreground">{d.count.toLocaleString()}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
