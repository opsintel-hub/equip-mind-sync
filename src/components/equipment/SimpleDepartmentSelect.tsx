import { useEffect } from "react";
import { useAllowedDepartments } from "@/hooks/useAllowedDepartments";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Check, ShieldCheck } from "lucide-react";

interface SimpleDepartmentSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Hide the info badges below the dropdown */
  hideHint?: boolean;
}

export function SimpleDepartmentSelect({ value, onChange, disabled, hideHint }: SimpleDepartmentSelectProps) {
  const { allowedDepartments, isAdmin, isSingleDepartment, loading } = useAllowedDepartments();

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

  const showHint = !hideHint && !loading && allowedDepartments.length > 0;

  return (
    <div className="space-y-1.5">
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
      {showHint && (
        <div className="flex flex-wrap items-center gap-1 text-[11px]">
          {isAdmin ? (
            <Badge variant="outline" className="gap-1 border-primary/40 bg-primary/5 text-primary text-[10px] py-0 px-1.5 h-5">
              <ShieldCheck className="h-3 w-3" /> Super Admin — เห็นทุกฝ่าย
            </Badge>
          ) : isSingleDepartment ? (
            <Badge variant="outline" className="gap-1 border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 text-[10px] py-0 px-1.5 h-5">
              <Check className="h-3 w-3" /> ฝ่ายของคุณ
            </Badge>
          ) : (
            <>
              <span className="text-muted-foreground">สิทธิ์ของคุณ:</span>
              {allowedDepartments.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => !disabled && onChange(d.name)}
                  className={`inline-flex items-center gap-1 rounded border px-1.5 h-5 text-[10px] transition-colors ${
                    value === d.name
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                  }`}
                  disabled={disabled}
                  title={`คลิกเพื่อเลือก ${d.name}`}
                >
                  {value === d.name && <Check className="h-3 w-3" />}
                  {d.name}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
