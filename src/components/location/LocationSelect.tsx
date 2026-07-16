import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface LocationSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function LocationSelect({ value, onChange, disabled }: LocationSelectProps) {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("id, code, name, zones:zone_id(code, name)")
        .eq("is_active", true)
        .order("code");

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setLoading(false);
    }
  };

  const options = locations
    .slice()
    .sort((a: any, b: any) => {
      const az = a.zones?.code || "zzz";
      const bz = b.zones?.code || "zzz";
      if (az !== bz) return az.localeCompare(bz);
      return (a.code || "").localeCompare(b.code || "");
    })
    .map((location: any) => ({
      value: location.id,
      label: `${location.zones?.code ? `${location.zones.code}${location.code}` : location.code} - ${location.name}${location.zones?.name ? ` (โซน ${location.zones.code} · ${location.zones.name})` : ""}`,
    }));

  return (
    <SearchableSelect
      options={options}
      value={value}
      onValueChange={onChange}
      placeholder="เลือกตำแหน่ง"
      searchPlaceholder="ค้นหาตำแหน่ง..."
      emptyMessage="ไม่พบตำแหน่ง"
      disabled={disabled}
      isLoading={loading}
    />
  );
}
