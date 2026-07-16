import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, CheckCircle2, Wrench, XCircle, AlertTriangle, ShieldAlert, Building2 } from "lucide-react";
import { useDeptScope } from "@/hooks/useDeptScope";

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

type BillboardRow = { id: string; status: string | null; department: string | null };

export function BillboardSummaryCards({ filters, searchTerm }: BillboardSummaryCardsProps) {
  const { isSuperAdmin, viewableDepts, deptKey } = useDeptScope();
  const scopeDepts = isSuperAdmin ? null : ((viewableDepts && viewableDepts.length > 0) ? viewableDepts : ["__no_dept_permission__"]);

  const { data, isLoading } = useQuery({
    queryKey: ["billboard-summary", filters, searchTerm, deptKey],
    queryFn: async () => {
      // For department breakdown we ignore the `department` filter
      // so users see how the *other* filters slice the data across all departments.
      const filterRows = (q: ReturnType<typeof supabase.from>, includeDept: boolean) => {
        let query = q.select("id, status, department");
        if (searchTerm) {
          query = query.or(
            `equipment_id.ilike.%${searchTerm}%,old_code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,location_name.ilike.%${searchTerm}%`,
          );
        }
        if (filters.region) query = query.eq("region", filters.region);
        if (filters.district) query = query.eq("district", filters.district);
        if (includeDept && filters.department) query = query.eq("department", filters.department);
        if (filters.mediaType) query = query.eq("media_type", filters.mediaType);
        if (filters.status) query = query.eq("status", filters.status);
        if (filters.locationName) query = query.ilike("location_name", `%${filters.locationName}%`);
        if (scopeDepts) query = query.in("department", scopeDepts);
        return query;
      };

      // Equipment-status filter -> billboard ids (paginated)
      let billboardIdFilter: string[] | null = null;
      if (filters.equipmentStatus) {
        const selected = filters.equipmentStatus.split(",").filter(Boolean);
        const today = new Date().toISOString().split("T")[0];
        const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const ids = new Set<string>();
        const pageSize = 1000;
        let from = 0;
        while (true) {
          const { data: be, error } = await supabase
            .from("billboard_equipment")
            .select("billboard_id, equipment:equipment_id(expiry_date, warranty_expiry_date)")
            .range(from, from + pageSize - 1);
          if (error) throw error;
          if (!be || be.length === 0) break;
          be.forEach((row) => {
            const eq = row.equipment as { expiry_date: string | null; warranty_expiry_date: string | null } | null;
            if (!eq) return;
            const matches =
              (selected.includes("expired") && eq.expiry_date && eq.expiry_date < today) ||
              (selected.includes("warranty_expired") && eq.warranty_expiry_date && eq.warranty_expiry_date < today) ||
              (selected.includes("expiring_soon") && eq.expiry_date && eq.expiry_date >= today && eq.expiry_date <= in30) ||
              (selected.includes("warranty_expiring_soon") && eq.warranty_expiry_date && eq.warranty_expiry_date >= today && eq.warranty_expiry_date <= in30);
            if (matches) ids.add(row.billboard_id);
          });
          if (be.length < pageSize) break;
          from += pageSize;
        }
        billboardIdFilter = Array.from(ids);
        if (billboardIdFilter.length === 0) {
          return { total: 0, active: 0, maintenance: 0, inactive: 0, expired: 0, warrantyExpired: 0, byDepartment: [] };
        }
      }


      const fetchAll = async (includeDept: boolean): Promise<BillboardRow[]> => {
        const all: BillboardRow[] = [];
        const pageSize = 1000;
        let offset = 0;
        while (true) {
          let q = filterRows(supabase.from("billboards"), includeDept);
          if (billboardIdFilter) q = q.in("id", billboardIdFilter);
          const { data: rows, error } = await q.range(offset, offset + pageSize - 1);
          if (error) throw error;
          if (!rows || rows.length === 0) break;
          all.push(...(rows as BillboardRow[]));
          if (rows.length < pageSize) break;
          offset += pageSize;
        }
        return all;
      };

      // Main filtered set (respects all filters incl. department) for the 6 stat cards
      const filteredRows = await fetchAll(true);
      // Department breakdown set (ignores department filter)
      const deptScopeRows = filters.department ? await fetchAll(false) : filteredRows;

      // Equipment expiry/warranty over filtered set
      let expired = 0;
      let warrantyExpired = 0;
      const ids = filteredRows.map((r) => r.id);
      if (ids.length > 0) {
        const today = new Date().toISOString().split("T")[0];
        const expiredSet = new Set<string>();
        const warrSet = new Set<string>();
        const chunkSize = 200;
        const pageSize = 1000;
        for (let i = 0; i < ids.length; i += chunkSize) {
          const chunk = ids.slice(i, i + chunkSize);
          let off = 0;
          while (true) {
            const { data: be, error } = await supabase
              .from("billboard_equipment")
              .select("billboard_id, equipment:equipment_id(expiry_date, warranty_expiry_date)")
              .in("billboard_id", chunk)
              .range(off, off + pageSize - 1);
            if (error) throw error;
            if (!be || be.length === 0) break;
            be.forEach((row) => {
              const eq = row.equipment as { expiry_date: string | null; warranty_expiry_date: string | null } | null;
              if (!eq) return;
              if (eq.expiry_date && eq.expiry_date < today) expiredSet.add(row.billboard_id);
              if (eq.warranty_expiry_date && eq.warranty_expiry_date < today) warrSet.add(row.billboard_id);
            });
            if (be.length < pageSize) break;
            off += pageSize;
          }
        }
        expired = expiredSet.size;
        warrantyExpired = warrSet.size;
      }

      const total = filteredRows.length;
      const active = filteredRows.filter((r) => r.status === "active").length;
      const maintenance = filteredRows.filter((r) => r.status === "maintenance").length;
      const inactive = filteredRows.filter((r) => r.status === "inactive").length;

      const deptMap = new Map<string, number>();
      deptScopeRows.forEach((r) => {
        const d = r.department || "ไม่ระบุ";
        deptMap.set(d, (deptMap.get(d) || 0) + 1);
      });
      const byDepartment = Array.from(deptMap.entries())
        .map(([name, count]) => ({ name, count, isSelected: filters.department === name }))
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

      {(data?.byDepartment?.length ?? 0) > 0 && (
        <Card className="border-border/50">
          <CardContent className="p-3 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground shrink-0">
              <Building2 className="h-4 w-4" />
              สรุปตามฝ่าย{filters.department ? " (ทุกฝ่ายภายใต้ตัวกรองอื่น)" : ""}:
            </div>
            <div className="flex flex-wrap gap-2">
              {data!.byDepartment.map((d) => (
                <Badge
                  key={d.name}
                  variant={d.isSelected ? "default" : "secondary"}
                  className="text-xs font-normal"
                >
                  {d.name}
                  <span className="ml-1.5 font-semibold">{d.count.toLocaleString()}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
