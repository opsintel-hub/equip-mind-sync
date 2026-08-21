import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface Props {
  value?: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

interface Item { id: string; name: string; description: string | null; }

export function AssessmentResultSelect({ value, onChange, disabled, placeholder = "เลือกผลการประเมิน" }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("mp_assessment_results")
        .select("id,name,description")
        .eq("is_active", true)
        .order("sort_order");
      setItems((data as Item[]) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <SearchableSelect
      options={items.map((i) => ({ value: i.id, label: i.name, description: i.description || undefined }))}
      value={value}
      onValueChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="ค้นหา..."
      emptyMessage="ไม่พบผลการประเมิน — เพิ่มได้ที่ Master Data"
      disabled={disabled}
      isLoading={loading}
    />
  );
}
