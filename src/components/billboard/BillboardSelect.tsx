import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface BillboardSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const BillboardSelect = ({ value, onChange, placeholder = "เลือกป้ายโฆษณา" }: BillboardSelectProps) => {
  const { data: billboards, isLoading } = useQuery({
    queryKey: ["billboards-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billboards")
        .select("id, equipment_id, location_name, department")
        .eq("status", "active")
        .order("equipment_id", { ascending: true })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  return (
    <Select value={value || "__none__"} onValueChange={(v) => onChange(v === "__none__" ? "" : v)}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
        <SelectItem value="__none__">ไม่ระบุ</SelectItem>
        {isLoading ? (
          <SelectItem value="__loading__" disabled>กำลังโหลด...</SelectItem>
        ) : (
          billboards?.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.equipment_id} {b.location_name ? `- ${b.location_name}` : ""}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
};

export default BillboardSelect;
