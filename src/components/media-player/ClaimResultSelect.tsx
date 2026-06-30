import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useDepartmentPermissions } from "@/hooks/useDepartmentPermissions";

export type ClaimResultKind =
  | "refurb_return"
  | "replacement"
  | "write_off"
  | "vendor_rejected"
  | "in_progress"
  | null;

interface Props {
  value?: string;
  onChange: (id: string, kind: ClaimResultKind) => void;
  disabled?: boolean;
  placeholder?: string;
}

interface Item {
  id: string;
  name: string;
  description: string | null;
  result_kind: ClaimResultKind;
}

const KIND_HINT: Record<NonNullable<ClaimResultKind>, string> = {
  refurb_return: "เครื่องกลับเข้าคลังสภาพ Refurbished",
  replacement: "Vendor ส่งเครื่องใหม่มาแทน (ต้องกรอก S/N ใหม่)",
  write_off: "ตัดทรัพย์สินออกจากระบบ (Write-off)",
  vendor_rejected: "Vendor ปฏิเสธการเคลม — ต้องเลือกวิธีจัดการต่อ",
  in_progress: "ยังอยู่ระหว่างดำเนินการ — ไม่ flip สถานะเครื่อง",
};

export function ClaimResultSelect({ value, onChange, disabled, placeholder = "เลือกผลการเคลม" }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const { isSuperAdmin } = useDepartmentPermissions();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("mp_claim_results")
        .select("id,name,description,result_kind")
        .eq("is_active", true)
        .order("sort_order");
      setItems((data as Item[]) || []);
      setLoading(false);
    })();
  }, []);

  const handleChange = (id: string) => {
    const item = items.find((i) => i.id === id);
    onChange(id, (item?.result_kind ?? null) as ClaimResultKind);
  };

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <SearchableSelect
          options={items.map((i) => ({
            value: i.id,
            label: i.name,
            description: i.description || (i.result_kind ? KIND_HINT[i.result_kind] : undefined),
          }))}
          value={value}
          onValueChange={handleChange}
          placeholder={placeholder}
          searchPlaceholder="ค้นหา..."
          emptyMessage="ไม่พบผลการเคลม — เพิ่มได้ที่ Master Data"
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
