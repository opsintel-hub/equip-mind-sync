import { useEffect } from "react";
import { useAllowedDepartments } from "@/hooks/useAllowedDepartments";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface SimpleDepartmentSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function SimpleDepartmentSelect({ value, onChange, disabled }: SimpleDepartmentSelectProps) {
  const { allowedDepartments, isSingleDepartment, loading } = useAllowedDepartments();

  // Auto-select if only one department
  useEffect(() => {
    if (!loading && isSingleDepartment && allowedDepartments.length === 1 && value !== allowedDepartments[0].name) {
      onChange(allowedDepartments[0].name);
    }
  }, [loading, isSingleDepartment, allowedDepartments, value, onChange]);

  const options = allowedDepartments.map((dept) => ({
    value: dept.name,
    label: dept.name,
    description: dept.description || undefined,
  }));

  return (
    <SearchableSelect
      options={options}
      value={value}
      onValueChange={onChange}
      placeholder="เลือกฝ่าย"
      searchPlaceholder="ค้นหาฝ่าย..."
      emptyMessage="ไม่พบฝ่าย"
      disabled={disabled || isSingleDepartment}
      isLoading={loading}
    />
  );
}
