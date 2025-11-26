import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDepartmentPermissions } from "@/hooks/useDepartmentPermissions";

interface DepartmentFilterProps {
  value: string;
  onChange: (value: string) => void;
  showAll?: boolean;
}

export function DepartmentFilter({ value, onChange, showAll = true }: DepartmentFilterProps) {
  const { getViewableDepartments, isAdmin, loading } = useDepartmentPermissions();
  
  if (loading) {
    return (
      <Select disabled value={value}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="กำลังโหลด..." />
        </SelectTrigger>
      </Select>
    );
  }

  const viewableDepartments = getViewableDepartments();

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="เลือกฝ่าย" />
      </SelectTrigger>
      <SelectContent>
        {(showAll || isAdmin) && <SelectItem value="all">ทุกฝ่าย</SelectItem>}
        {viewableDepartments.map((dept) => (
          <SelectItem key={dept} value={dept}>
            {dept}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
