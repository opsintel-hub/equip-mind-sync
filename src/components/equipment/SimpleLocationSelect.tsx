import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Location {
  id: string;
  code: string;
  name: string;
}

interface SimpleLocationSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function SimpleLocationSelect({ value, onChange, disabled }: SimpleLocationSelectProps) {
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    const fetchLocations = async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id, code, name")
        .eq("is_active", true)
        .order("code");

      if (error) {
        console.error("Error fetching locations:", error);
        toast.error("ไม่สามารถโหลดข้อมูลคลังสินค้าได้");
      } else {
        setLocations(data || []);
      }
    };

    fetchLocations();
  }, []);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="เลือกคลังสินค้า" />
      </SelectTrigger>
      <SelectContent className="z-[9999]" position="popper" sideOffset={4}>
        {locations.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            ยังไม่มีคลังสินค้า กรุณาเพิ่มจากหน้าข้อมูลหลัก
          </div>
        ) : (
          locations.map((loc) => (
            <SelectItem key={loc.id} value={loc.id}>
              {loc.code} - {loc.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
