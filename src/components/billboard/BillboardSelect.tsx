import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { formatBillboardLabel } from "@/lib/billboardUtils";
import { useDeptScope } from "@/hooks/useDeptScope";

interface BillboardSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Explicit dept filter. If omitted, uses viewer's own viewable depts (Super Admin sees all). */
  department?: string;
  /**
   * If provided, only billboards whose id is in this list are shown.
   * Use for equipment-compatibility-based filtering.
   */
  allowedBillboardIds?: string[] | null;
  /** Show "no compatible billboard" empty message instead of the default. */
  emptyLabel?: string;
}

const BillboardSelect = ({
  value,
  onChange,
  placeholder = "เลือกป้ายโฆษณา",
  disabled,
  department,
  allowedBillboardIds,
  emptyLabel,
}: BillboardSelectProps) => {
  const { isSuperAdmin, viewableDepts, deptKey } = useDeptScope();

  const allowedKey = allowedBillboardIds ? [...allowedBillboardIds].sort().join(",") : "any";

  const { data: billboards, isLoading } = useQuery({
    queryKey: ["billboards-select", department || deptKey, allowedKey],
    queryFn: async () => {
      let query = supabase
        .from("billboards")
        .select("id, equipment_id, old_code, location_name, department, size")
        .eq("status", "active")
        .order("old_code", { ascending: true })
        .limit(1000);

      if (department) {
        query = query.eq("department", department);
      } else if (!isSuperAdmin) {
        const depts = viewableDepts || [];
        query = query.in("department", depts.length > 0 ? depts : ["__no_dept_permission__"]);
      }

      if (allowedBillboardIds) {
        if (allowedBillboardIds.length === 0) return [];
        query = query.in("id", allowedBillboardIds);
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

  const emptyMsg =
    allowedBillboardIds && allowedBillboardIds.length === 0
      ? (emptyLabel || "อะไหล่นี้ยังไม่ระบุป้ายที่รองรับ")
      : "ไม่พบป้ายโฆษณา";

  return (
    <SearchableSelect
      options={options}
      value={value || "__none__"}
      onValueChange={(v) => onChange(v === "__none__" ? "" : v)}
      placeholder={placeholder}
      searchPlaceholder="ค้นหาป้ายโฆษณา..."
      emptyMessage={emptyMsg}
      disabled={disabled}
      isLoading={isLoading}
    />
  );
};

export default BillboardSelect;
