import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface Section {
  id: string;
  name: string;
  description: string | null;
  department_id: string;
  departments: {
    id: string;
    name: string;
  } | null;
}

interface SectionSelectProps {
  value: string;
  onChange: (value: string) => void;
  departmentId?: string; // Optional filter by department
  /** Department name (when the form stores the name instead of the id) */
  departmentName?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function SectionSelect({ 
  value, 
  onChange, 
  departmentId, 
  departmentName,
  disabled, 
  placeholder = "เลือกแผนก" 
}: SectionSelectProps) {
  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["sections-select", departmentId, departmentName],
    queryFn: async () => {
      let query = supabase
        .from("sections")
        .select(`
          id,
          name,
          description,
          department_id,
          departments:department_id (id, name)
        `)
        .eq("is_active", true)
        .order("name");

      if (departmentId) {
        query = query.eq("department_id", departmentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      const rows = (data as unknown as Section[]) || [];
      return !departmentId && departmentName
        ? rows.filter((s) => s.departments?.name === departmentName)
        : rows;
    },
  });

  const isScoped = Boolean(departmentId || departmentName);

  // Clear a selection that falls outside the current department scope
  useEffect(() => {
    if (isLoading || !isScoped || !value) return;
    if (!sections.some((s) => s.id === value)) onChange("");
  }, [isLoading, isScoped, value, sections]);

  const options = sections.map((section) => ({
    value: section.id,
    label: section.name,
    description: isScoped ? undefined : section.departments?.name || undefined,
  }));

  return (
    <SearchableSelect
      options={options}
      value={value}
      onValueChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="ค้นหาแผนก..."
      emptyMessage={isScoped ? "ไม่มีข้อมูลในฝ่ายนี้" : "ไม่พบแผนก"}
      disabled={disabled}
      isLoading={isLoading}
    />
  );
}
