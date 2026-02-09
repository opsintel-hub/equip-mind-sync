import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface AdMediaTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function AdMediaTypeSelect({ value, onChange, disabled }: AdMediaTypeSelectProps) {
  const { data: types, isLoading } = useQuery({
    queryKey: ["ad-media-types-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_media_types")
        .select("id, name, description")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const options = (types || []).map((t) => ({
    value: t.id,
    label: t.name,
    description: t.description || undefined,
  }));

  return (
    <SearchableSelect
      options={options}
      value={value}
      onValueChange={onChange}
      placeholder="เลือกประเภทสื่อ"
      searchPlaceholder="ค้นหาประเภทสื่อ..."
      emptyMessage="ไม่พบประเภทสื่อ (กรุณาเพิ่มใน Master Data)"
      disabled={disabled}
      isLoading={isLoading}
    />
  );
}
