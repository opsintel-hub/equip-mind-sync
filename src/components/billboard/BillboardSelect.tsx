import { useEffect, useState } from "react";
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

interface BillboardRow {
  id: string;
  equipment_id: string | null;
  old_code: string | null;
  location_name: string | null;
  department: string | null;
  size: string | null;
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
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const allowedKey = allowedBillboardIds ? [...allowedBillboardIds].sort().join(",") : "any";

  const applyScope = (q: any, searching: boolean) => {
    // When the user actively searches, look across all billboards.
    // Billboard departments do not always match the requester's department.
    if (searching) return q;
    if (department) return q.eq("department", department);
    if (!isSuperAdmin) {
      const depts = viewableDepts || [];
      return q.in("department", depts.length > 0 ? depts : ["__no_dept_permission__"]);
    }
    return q;
  };

  const { data: billboards, isLoading } = useQuery({
    queryKey: ["billboards-select", department || deptKey, allowedKey, debounced],
    queryFn: async () => {
      let query = supabase
        .from("billboards")
        .select("id, equipment_id, old_code, location_name, department, size")
        .eq("status", "active")
        .order("old_code", { ascending: true })
        .limit(debounced.length >= 2 ? 100 : 300);

      query = applyScope(query, debounced.length >= 2);

      if (allowedBillboardIds) {
        if (allowedBillboardIds.length === 0) return [] as BillboardRow[];
        query = query.in("id", allowedBillboardIds);
      }

      if (debounced.length >= 2) {
        const like = `%${debounced.replace(/[%,]/g, " ")}%`;
        query = query.or(
          `old_code.ilike.${like},location_name.ilike.${like},equipment_id.ilike.${like}`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as BillboardRow[];
    },
  });

  // Keep the currently selected billboard visible even if it is not in the current page/search
  const { data: selectedRow } = useQuery({
    queryKey: ["billboard-select-one", value],
    enabled: !!value,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billboards")
        .select("id, equipment_id, old_code, location_name, department, size")
        .eq("id", value)
        .maybeSingle();
      if (error) throw error;
      return data as BillboardRow | null;
    },
  });

  const rows: BillboardRow[] = [...(billboards || [])];
  if (selectedRow && !rows.some((b) => b.id === selectedRow.id)) rows.unshift(selectedRow);

  const options = [
    { value: "__none__", label: "ไม่ระบุ" },
    ...rows.map((b) => ({
      value: b.id,
      label: formatBillboardLabel(b.old_code, b.location_name, b.equipment_id),
      description: [b.department, b.size].filter(Boolean).join(" | ") || undefined,
    })),
  ];

  const emptyMsg =
    allowedBillboardIds && allowedBillboardIds.length === 0
      ? (emptyLabel || "อะไหล่นี้ยังไม่ระบุป้ายที่รองรับ")
      : search.trim().length < 2
        ? "พิมพ์อย่างน้อย 2 ตัวอักษรเพื่อค้นหาป้าย"
        : "ไม่พบป้ายโฆษณา";

  return (
    <SearchableSelect
      options={options}
      value={value || "__none__"}
      onValueChange={(v) => onChange(v === "__none__" ? "" : v)}
      placeholder={placeholder}
      searchPlaceholder="ค้นหาป้าย (รหัสเก่า / สถานที่ / รหัสป้าย)..."
      emptyMessage={emptyMsg}
      disabled={disabled}
      isLoading={isLoading}
      onSearchChange={setSearch}
      shouldFilter={false}
    />
  );
};

export default BillboardSelect;
