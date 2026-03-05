import { useEffect } from "react";
import { useDepartmentPermissions } from "@/hooks/useDepartmentPermissions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";

interface DepartmentMultiFilterProps {
  value: string[];
  onChange: (value: string[]) => void;
  showAll?: boolean;
}

export function DepartmentMultiFilter({ value, onChange, showAll = true }: DepartmentMultiFilterProps) {
  const { getViewableDepartments, isAdmin, loading } = useDepartmentPermissions();

  const viewableDepartments = getViewableDepartments();

  // Auto-select if only one department and not admin
  useEffect(() => {
    if (!loading && !isAdmin && viewableDepartments.length === 1) {
      if (value.length === 0 || (value.length === 1 && value[0] !== viewableDepartments[0])) {
        onChange([viewableDepartments[0]]);
      }
    }
  }, [loading, isAdmin, viewableDepartments, value, onChange]);

  const isSingleDepartment = !isAdmin && viewableDepartments.length === 1;

  const toggle = (dept: string) => {
    if (value.includes(dept)) {
      onChange(value.filter(v => v !== dept));
    } else {
      onChange([...value, dept]);
    }
  };

  const selectAll = () => onChange([]);
  const isAllSelected = value.length === 0;

  const displayLabel = loading
    ? "กำลังโหลด..."
    : isSingleDepartment
    ? viewableDepartments[0]
    : isAllSelected
    ? "ทุกฝ่าย"
    : value.length === 1
    ? value[0]
    : `${value.length} ฝ่าย`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-[200px] justify-between text-left font-normal h-9 text-sm"
          disabled={isSingleDepartment || loading}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-50 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2 z-[200]" align="start">
        <ScrollArea className="max-h-64">
          <div className="space-y-1">
            {(showAll || isAdmin) && (
              <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm font-medium">
                <Checkbox checked={isAllSelected} onCheckedChange={() => selectAll()} />
                <span>ทุกฝ่าย</span>
              </label>
            )}
            {viewableDepartments.map(dept => (
              <label key={dept} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm">
                <Checkbox
                  checked={isAllSelected || value.includes(dept)}
                  onCheckedChange={() => {
                    if (isAllSelected) {
                      // If "all" was selected, clicking a specific one means select only that one
                      onChange([dept]);
                    } else {
                      toggle(dept);
                    }
                  }}
                />
                <span>{dept}</span>
              </label>
            ))}
          </div>
        </ScrollArea>
        {value.length > 0 && (
          <Button variant="ghost" size="sm" className="w-full mt-1 text-xs" onClick={selectAll}>
            เลือกทุกฝ่าย
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
