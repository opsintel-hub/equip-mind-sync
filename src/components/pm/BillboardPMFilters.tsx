import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export interface BillboardPMFilterState {
  pmReason: string;
  timeRange: string;
  department: string;
  mediaType: string;
  region: string;
  district: string;
  territory: string;
  routePM: string;
  routeMonitoring: string;
}

interface BillboardPMFiltersProps {
  filters: BillboardPMFilterState;
  onChange: (filters: BillboardPMFilterState) => void;
  distinctValues: {
    departments: string[];
    mediaTypes: string[];
    regions: string[];
    districts: string[];
    territories: string[];
    routePMs: string[];
    routeMonitorings: string[];
  };
}

export function BillboardPMFilters({ filters, onChange, distinctValues }: BillboardPMFiltersProps) {
  const updateFilter = (key: keyof BillboardPMFilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const clearAll = () => {
    onChange({
      pmReason: "all",
      timeRange: "all",
      department: "all",
      mediaType: "all",
      region: "all",
      district: "all",
      territory: "all",
      routePM: "all",
      routeMonitoring: "all",
    });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== "all");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Select value={filters.pmReason} onValueChange={(v) => updateFilter("pmReason", v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="เหตุผล PM" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">เหตุผลทั้งหมด</SelectItem>
            <SelectItem value="expiry">หมดอายุ</SelectItem>
            <SelectItem value="warranty_expiry">หมดประกัน</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.timeRange} onValueChange={(v) => updateFilter("timeRange", v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="ระยะเวลา" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            <SelectItem value="overdue">หมดไปแล้ว</SelectItem>
            <SelectItem value="30">ภายใน 30 วัน</SelectItem>
            <SelectItem value="60">ภายใน 60 วัน</SelectItem>
            <SelectItem value="90">ภายใน 90 วัน</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.department} onValueChange={(v) => updateFilter("department", v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="ฝ่าย" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกฝ่าย</SelectItem>
            {distinctValues.departments.map(d => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.mediaType} onValueChange={(v) => updateFilter("mediaType", v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Media Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุก Media Type</SelectItem>
            {distinctValues.mediaTypes.map(m => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.region} onValueChange={(v) => updateFilter("region", v)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุก Region</SelectItem>
            {distinctValues.regions.map(r => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.district} onValueChange={(v) => updateFilter("district", v)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="District" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุก District</SelectItem>
            {distinctValues.districts.map(d => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.territory} onValueChange={(v) => updateFilter("territory", v)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Territory" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุก Territory</SelectItem>
            {distinctValues.territories.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.routePM} onValueChange={(v) => updateFilter("routePM", v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Route PM" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุก Route PM</SelectItem>
            {distinctValues.routePMs.map(r => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.routeMonitoring} onValueChange={(v) => updateFilter("routeMonitoring", v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Route Monitoring" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุก Route Monitoring</SelectItem>
            {distinctValues.routeMonitorings.map(r => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={clearAll} className="gap-1">
            <X className="w-3 h-3" />
            ล้างตัวกรอง
          </Button>
        )}
      </div>
    </div>
  );
}
