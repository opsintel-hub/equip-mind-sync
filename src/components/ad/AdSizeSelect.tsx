import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface AdSizeSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function AdSizeSelect({ value, onChange, disabled }: AdSizeSelectProps) {
  const { data: sizes, isLoading } = useQuery({
    queryKey: ["ad-sizes-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_sizes")
        .select("id, name, description")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const options = (sizes || []).map((s) => ({
    value: s.id,
    label: s.name,
    description: s.description || undefined,
  }));

  return (
    <SearchableSelect
      options={options}
      value={value}
      onValueChange={onChange}
      placeholder="เลือกขนาดภาพ"
      searchPlaceholder="ค้นหาขนาด..."
      emptyMessage="ไม่พบขนาดภาพ (กรุณาเพิ่มใน Master Data)"
      disabled={disabled}
      isLoading={isLoading}
    />
  );
}
