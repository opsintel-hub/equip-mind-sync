import { useEffect } from "react";
import { useDepartmentPermissions } from "@/hooks/useDepartmentPermissions";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface DepartmentFilterProps {
  value: string;
  onChange: (value: string) => void;
  showAll?: boolean;
}

export function DepartmentFilter({ value, onChange, showAll = true }: DepartmentFilterProps) {
  const { getViewableDepartments, isAdmin, loading } = useDepartmentPermissions();

  const viewableDepartments = getViewableDepartments();

  // Auto-select if only one department and not admin
  useEffect(() => {
    if (!loading && !isAdmin && viewableDepartments.length === 1 && value !== viewableDepartments[0]) {
      onChange(viewableDepartments[0]);
    }
  }, [loading, isAdmin, viewableDepartments, value, onChange]);

  const isSingleDepartment = !isAdmin && viewableDepartments.length === 1;

  const options = [
    ...((showAll || isAdmin) && !isSingleDepartment ? [{ value: "all", label: "ทุกฝ่าย" }] : []),
    ...viewableDepartments.map((dept) => ({
      value: dept,
      label: dept,
    })),
  ];

  return (
    <div className="w-[200px]">
      <SearchableSelect
        options={options}
        value={value}
        onValueChange={onChange}
        placeholder="เลือกฝ่าย"
        searchPlaceholder="ค้นหาฝ่าย..."
        emptyMessage="ไม่พบฝ่าย"
        isLoading={loading}
        triggerClassName="w-full"
        disabled={isSingleDepartment}
      />
    </div>
  );
}