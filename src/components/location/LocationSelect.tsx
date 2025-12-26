import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface LocationSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function LocationSelect({ value, onChange }: LocationSelectProps) {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("id, code, name")
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

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="กำลังโหลด..." />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="เลือกตำแหน่ง" />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
        {locations.map((location) => (
          <SelectItem key={location.id} value={location.id}>
            {location.code} - {location.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
