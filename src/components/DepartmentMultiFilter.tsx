import { useEffect, useMemo, useRef, useState } from "react";
import { useDepartmentPermissions } from "@/hooks/useDepartmentPermissions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, Search, X } from "lucide-react";
import { filterDepartmentOptions } from "@/lib/departmentFilter";

interface DepartmentMultiFilterProps {
  value: string[];
  onChange: (value: string[]) => void;
  showAll?: boolean;
  allowedDepartments?: string[];
}

export function DepartmentMultiFilter({ value, onChange, showAll = true, allowedDepartments }: DepartmentMultiFilterProps) {
  const { getViewableDepartments, isAdmin, loading } = useDepartmentPermissions();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [moreBelow, setMoreBelow] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const viewableDepartments = getViewableDepartments().filter(d => !allowedDepartments || allowedDepartments.includes(d));

  // Auto-select if only one department and not admin
  useEffect(() => {
    if (!loading && !isAdmin && viewableDepartments.length === 1) {
      if (value.length === 0 || (value.length === 1 && value[0] !== viewableDepartments[0])) {
        onChange([viewableDepartments[0]]);
      }
    }
  }, [loading, isAdmin, viewableDepartments, value, onChange]);

  // Clear the search box whenever the dropdown closes
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const isSingleDepartment = !isAdmin && viewableDepartments.length === 1;
  const searching = query.trim().length > 0;
  const matches = useMemo(
    () => filterDepartmentOptions(viewableDepartments, query),
    [viewableDepartments, query],
  );

  const refreshScrollHint = () => {
    const el = listRef.current;
    if (!el) {
      setMoreBelow(false);
      return;
    }
    setMoreBelow(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  };

  // Recompute the "scroll for more" hint whenever the list content changes
  useEffect(() => {
    const id = window.requestAnimationFrame(refreshScrollHint);
    return () => window.cancelAnimationFrame(id);
  }, [matches, open]);

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
    <Popover open={open} onOpenChange={setOpen}>
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
      <PopoverContent className="w-64 p-2 z-[200]" align="start">
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            aria-label="ค้นหาฝ่าย"
            placeholder="ค้นหาฝ่าย..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="h-8 pl-8 pr-8 text-sm"
          />
          {searching && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="ลางคำค้นหา"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="relative">
          <div
            ref={listRef}
            onScroll={refreshScrollHint}
            className="max-h-[420px] overflow-y-auto filter-scrollbar pr-1 space-y-1"
          >
            {!searching && (showAll || isAdmin) && (
              <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm font-medium">
                <Checkbox checked={isAllSelected} onCheckedChange={() => selectAll()} />
                <span>ทุกฝ่าย</span>
              </label>
            )}
            {matches.map(dept => (
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
            {searching && matches.length === 0 && (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                ไม่พบฝ่ายที่ตรงกกัน
              </p>
            )}
          </div>

          {moreBelow && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center">
              <span className="flex items-center gap-1 rounded-full bg-background/95 px-2 py-0.5 text-[11px] text-muted-foreground shadow ring-1 ring-border">
                <ChevronDown className="h-3 w-3" />
                เลื่อนลงดูตอไป
              </span>
            </div>
          )}
        </div>

        {searching && (
          <p className="px-1 pt-1 text-[11px] text-muted-foreground">
            พบ {matches.length} จาก {viewableDepartments.length} ฝ่าย
          </p>
        )}

        {value.length > 0 && (
          <Button variant="ghost" size="sm" className="w-full mt-1 text-xs" onClick={selectAll}>
            เลือกทุกฝ่าย
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
