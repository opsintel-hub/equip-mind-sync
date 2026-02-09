import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface ContractorSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ContractorSelect({
  value,
  onChange,
  placeholder = "เลือกผู้รับเหมา",
  disabled,
}: ContractorSelectProps) {
  const { data: contractors, isLoading } = useQuery({
    queryKey: ["contractors-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractors")
        .select("id, code, name, contact_person")
        .eq("is_active", true)
        .order("code");
      if (error) throw error;
      return data;
    },
  });

  const options = (contractors || []).map((c) => ({
    value: c.id,
    label: `${c.code} - ${c.name}`,
    description: c.contact_person ? `ติดต่อ: ${c.contact_person}` : undefined,
  }));

  return (
    <SearchableSelect
      options={options}
      value={value}
      onValueChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="ค้นหาผู้รับเหมา..."
      emptyMessage="ไม่พบผู้รับเหมา"
      disabled={disabled}
      isLoading={isLoading}
    />
  );
}
