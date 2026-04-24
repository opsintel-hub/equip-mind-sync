import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAllowedDepartments } from "@/hooks/useAllowedDepartments";

export interface BillboardFiltersState {
  region: string;
  district: string;
  department: string;
  mediaType: string;
  status: string;
  locationName: string;
  equipmentStatus: string;
  territory: string;
  mediaClass: string;
  mediaSegment: string;
}

interface BillboardFiltersProps {
  filters: BillboardFiltersState;
  onFilterChange: (key: keyof BillboardFiltersState, value: string) => void;
  onClearFilters: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  active: "ใช้งาน",
  maintenance: "บำรุงรักษา",
  inactive: "ไม่ใช้งาน",
};

const EQUIPMENT_STATUS_LABEL: Record<string, string> = {
  expired: "มีอุปกรณ์หมดอายุ",
  warranty_expired: "มีอุปกรณ์หมดประกัน",
  expiring_soon: "ใกล้หมดอายุ (30 วัน)",
  warranty_expiring_soon: "ใกล้หมดประกัน (30 วัน)",
};

const FILTER_LABELS: Record<keyof BillboardFiltersState, string> = {
  region: "Region",
  district: "District",
  department: "Department",
  mediaType: "MediaType",
  status: "Status",
  locationName: "Location",
  equipmentStatus: "Equipment",
  territory: "Territory",
  mediaClass: "MediaClass",
  mediaSegment: "MediaSegment",
};

const BillboardFilters = ({ filters, onFilterChange, onClearFilters }: BillboardFiltersProps) => {
  const { allowedDepartments, isAdmin } = useAllowedDepartments();

  const { data: filterOptions } = useQuery({
    queryKey: ["billboard-filter-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billboards")
        .select("region, district, department, media_type, status, territory, media_class, media_segment");
      if (error) throw error;

      const uniqSorted = (vals: (string | null)[]) =>
        [...new Set(vals.filter(Boolean) as string[])].sort();

      const regions = uniqSorted(data.map((b) => b.region));
      const districts = uniqSorted(data.map((b) => b.district));
      const allDepartments = uniqSorted(data.map((b) => b.department));
      const mediaTypes = uniqSorted(data.map((b) => b.media_type));
      const statuses = uniqSorted(data.map((b) => b.status));
      const territories = uniqSorted(data.map((b) => b.territory));
      const mediaClasses = uniqSorted(data.map((b) => b.media_class));
      const mediaSegments = uniqSorted(data.map((b) => b.media_segment));

      const allowedNames = allowedDepartments.map((d) => d.name);
      const departments = isAdmin ? allDepartments : allDepartments.filter((d) => allowedNames.includes(d));

      return { regions, districts, departments, mediaTypes, statuses, territories, mediaClasses, mediaSegments };
    },
    enabled: allowedDepartments.length > 0 || isAdmin,
  });

  const activeEntries = (Object.entries(filters) as [keyof BillboardFiltersState, string][]).filter(
    ([, v]) => v !== "",
  );
  const hasActiveFilters = activeEntries.length > 0;

  const formatChipValue = (key: keyof BillboardFiltersState, value: string): string => {
    if (key === "status") return STATUS_LABEL[value] ?? value;
    if (key === "equipmentStatus") return EQUIPMENT_STATUS_LABEL[value] ?? value;
    return value;
  };

  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="w-4 h-4" />
          ตัวกรอง:
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="w-4 h-4 mr-1" />
            ล้างทั้งหมด
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {activeEntries.map(([key, value]) => (
            <Badge
              key={key}
              variant="secondary"
              className="gap-1 pl-2 pr-1 py-1 text-xs"
            >
              <span className="text-muted-foreground">{FILTER_LABELS[key]}:</span>
              <span className="font-medium">{formatChipValue(key, value)}</span>
              <button
                type="button"
                onClick={() => onFilterChange(key, "")}
                className="ml-1 rounded-sm hover:bg-muted p-0.5"
                aria-label={`ลบตัวกรอง ${FILTER_LABELS[key]}`}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Region</span>
          <Select value={filters.region || "__all__"} onValueChange={(v) => onFilterChange("region", v === "__all__" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Region" /></SelectTrigger>
            <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
              <SelectItem value="__all__">ทั้งหมด</SelectItem>
              {filterOptions?.regions.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">District</span>
          <Select value={filters.district || "__all__"} onValueChange={(v) => onFilterChange("district", v === "__all__" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="District" /></SelectTrigger>
            <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
              <SelectItem value="__all__">ทั้งหมด</SelectItem>
              {filterOptions?.districts.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Territory</span>
          <Select value={filters.territory || "__all__"} onValueChange={(v) => onFilterChange("territory", v === "__all__" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Territory" /></SelectTrigger>
            <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
              <SelectItem value="__all__">ทั้งหมด</SelectItem>
              {filterOptions?.territories.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Department</span>
          <Select value={filters.department || "__all__"} onValueChange={(v) => onFilterChange("department", v === "__all__" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
              <SelectItem value="__all__">ทั้งหมด</SelectItem>
              {filterOptions?.departments.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">MediaType</span>
          <Select value={filters.mediaType || "__all__"} onValueChange={(v) => onFilterChange("mediaType", v === "__all__" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Media Type" /></SelectTrigger>
            <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
              <SelectItem value="__all__">ทั้งหมด</SelectItem>
              {filterOptions?.mediaTypes.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">MediaClass</span>
          <Select value={filters.mediaClass || "__all__"} onValueChange={(v) => onFilterChange("mediaClass", v === "__all__" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Media Class" /></SelectTrigger>
            <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
              <SelectItem value="__all__">ทั้งหมด</SelectItem>
              {filterOptions?.mediaClasses.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">MediaSegment</span>
          <Select value={filters.mediaSegment || "__all__"} onValueChange={(v) => onFilterChange("mediaSegment", v === "__all__" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Media Segment" /></SelectTrigger>
            <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
              <SelectItem value="__all__">ทั้งหมด</SelectItem>
              {filterOptions?.mediaSegments.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Status</span>
          <Select value={filters.status || "__all__"} onValueChange={(v) => onFilterChange("status", v === "__all__" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="สถานะ" /></SelectTrigger>
            <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
              <SelectItem value="__all__">ทั้งหมด</SelectItem>
              {filterOptions?.statuses.map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABEL[s] ?? s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">LocationName</span>
          <Input
            placeholder="ค้นหาตำแหน่ง..."
            value={filters.locationName}
            onChange={(e) => onFilterChange("locationName", e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">สถานะอุปกรณ์</span>
          <Select value={filters.equipmentStatus || "__all__"} onValueChange={(v) => onFilterChange("equipmentStatus", v === "__all__" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="สถานะอุปกรณ์" /></SelectTrigger>
            <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
              <SelectItem value="__all__">ทั้งหมด</SelectItem>
              <SelectItem value="expired">มีอุปกรณ์หมดอายุ</SelectItem>
              <SelectItem value="warranty_expired">มีอุปกรณ์หมดประกัน</SelectItem>
              <SelectItem value="expiring_soon">ใกล้หมดอายุ (30 วัน)</SelectItem>
              <SelectItem value="warranty_expiring_soon">ใกล้หมดประกัน (30 วัน)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default BillboardFilters;
