import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { formatBillboardLabel } from "@/lib/billboardUtils";

interface BillboardSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  department?: string; // Filter billboards by department name
}

const BillboardSelect = ({ value, onChange, placeholder = "เลือกป้ายโฆษณา", disabled, department }: BillboardSelectProps) => {
  const { data: billboards, isLoading } = useQuery({
    queryKey: ["billboards-select", department],
    queryFn: async () => {
      let query = supabase
        .from("billboards")
        .select("id, equipment_id, old_code, location_name, department, size")
        .eq("status", "active")
        .order("old_code", { ascending: true })
        .limit(500);
      
      if (department) {
        query = query.eq("department", department);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const options = [
    { value: "__none__", label: "ไม่ระบุ" },
    ...(billboards?.map((b) => ({
      value: b.id,
      label: formatBillboardLabel(b.old_code, b.location_name, b.equipment_id),
      description: [b.department, (b as any).size].filter(Boolean).join(" | ") || undefined,
    })) || []),
  ];

  return (
    <SearchableSelect
      options={options}
      value={value || "__none__"}
      onValueChange={(v) => onChange(v === "__none__" ? "" : v)}
      placeholder={placeholder}
      searchPlaceholder="ค้นหาป้ายโฆษณา..."
      emptyMessage="ไม่พบป้ายโฆษณา"
      disabled={disabled}
      isLoading={isLoading}
    />
  );
};

export default BillboardSelect;
