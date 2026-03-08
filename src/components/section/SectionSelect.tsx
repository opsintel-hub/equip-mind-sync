import { useState, useEffect } from "react";
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
  disabled?: boolean;
  placeholder?: string;
}

export function SectionSelect({ 
  value, 
  onChange, 
  departmentId, 
  disabled, 
  placeholder = "เลือกแผนก" 
}: SectionSelectProps) {
  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["sections-select", departmentId],
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
      return (data as unknown as Section[]) || [];
    },
  });

  const options = sections.map((section) => ({
    value: section.id,
    label: section.name,
    description: section.departments?.name || undefined,
  }));

  return (
    <SearchableSelect
      options={options}
      value={value}
      onValueChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="ค้นหาแผนก..."
      emptyMessage="ไม่พบแผนก"
      disabled={disabled}
      isLoading={isLoading}
    />
  );
}
