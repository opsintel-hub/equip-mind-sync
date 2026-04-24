import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useDepartmentPermissions } from "@/hooks/useDepartmentPermissions";

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
  const { isSuperAdmin } = useDepartmentPermissions();

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
    <div className="flex gap-2">
      <div className="flex-1">
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
      </div>
      {isSuperAdmin && (
        <Button asChild variant="outline" size="icon" type="button" title="จัดการรายการ">
          <Link to="/master-data" target="_blank">
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
      )}
    </div>
  );
}
