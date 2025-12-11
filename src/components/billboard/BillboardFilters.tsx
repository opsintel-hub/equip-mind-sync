import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BillboardFiltersProps {
  filters: {
    region: string;
    district: string;
    department: string;
    mediaType: string;
    status: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
}

const BillboardFilters = ({ filters, onFilterChange, onClearFilters }: BillboardFiltersProps) => {
  // Fetch distinct filter values
  const { data: filterOptions } = useQuery({
    queryKey: ["billboard-filter-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billboards")
        .select("region, district, department, media_type, status");
      if (error) throw error;

      const regions = [...new Set(data.map(b => b.region).filter(Boolean))].sort();
      const districts = [...new Set(data.map(b => b.district).filter(Boolean))].sort();
      const departments = [...new Set(data.map(b => b.department).filter(Boolean))].sort();
      const mediaTypes = [...new Set(data.map(b => b.media_type).filter(Boolean))].sort();
      const statuses = [...new Set(data.map(b => b.status).filter(Boolean))].sort();

      return { regions, districts, departments, mediaTypes, statuses };
    },
  });

  const hasActiveFilters = Object.values(filters).some(v => v !== "");

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Filter className="w-4 h-4" />
        ตัวกรอง:
      </div>

      <Select value={filters.region} onValueChange={(v) => onFilterChange("region", v)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Region" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">ทั้งหมด</SelectItem>
          {filterOptions?.regions.map((r) => (
            <SelectItem key={r} value={r!}>{r}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.district} onValueChange={(v) => onFilterChange("district", v)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="District" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">ทั้งหมด</SelectItem>
          {filterOptions?.districts.map((d) => (
            <SelectItem key={d} value={d!}>{d}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.department} onValueChange={(v) => onFilterChange("department", v)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Department" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">ทั้งหมด</SelectItem>
          {filterOptions?.departments.map((d) => (
            <SelectItem key={d} value={d!}>{d}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.mediaType} onValueChange={(v) => onFilterChange("mediaType", v)}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Media Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">ทั้งหมด</SelectItem>
          {filterOptions?.mediaTypes.map((m) => (
            <SelectItem key={m} value={m!}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={(v) => onFilterChange("status", v)}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="สถานะ" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">ทั้งหมด</SelectItem>
          {filterOptions?.statuses.map((s) => (
            <SelectItem key={s} value={s!}>
              {s === "active" ? "ใช้งาน" : s === "maintenance" ? "บำรุงรักษา" : s === "inactive" ? "ไม่ใช้งาน" : s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          <X className="w-4 h-4 mr-1" />
          ล้าง
        </Button>
      )}
    </div>
  );
};

export default BillboardFilters;
