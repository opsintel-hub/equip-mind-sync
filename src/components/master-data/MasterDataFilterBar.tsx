import { useMemo, useRef, useState, type ReactNode } from "react";
import { Search, X, FilterX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const ALL = "__all__";

export interface FilterDef {
  key: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  width?: string;
}

export interface PreviewItem {
  id: string;
  title: string;
  subtitle?: string;
}

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  placeholder?: string;
  filters?: FilterDef[];
  /** Items matching current search, used for live preview dropdown */
  preview?: PreviewItem[];
  onPreviewSelect?: (item: PreviewItem) => void;
  resultCount?: number;
  totalCount?: number;
  actions?: ReactNode;
}

/** Unique sorted options helper */
export function uniqOptions(values: (string | null | undefined)[]) {
  return Array.from(new Set(values.filter((v): v is string => !!v && v.trim() !== "")))
    .sort((a, b) => a.localeCompare(b, "th"))
    .map((v) => ({ value: v, label: v }));
}

/** Case-insensitive match across fields */
export function matchText(q: string, ...fields: (string | number | null | undefined)[]) {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return fields.some((f) => f != null && String(f).toLowerCase().includes(s));
}

export function MasterDataFilterBar({
  search, onSearchChange, placeholder = "ค้นหา...", filters = [], preview = [],
  onPreviewSelect, resultCount, totalCount, actions,
}: Props) {
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<number>();
  const active = !!search || filters.some((f) => f.value !== ALL);
  const shown = useMemo(() => preview.slice(0, 8), [preview]);

  const clearAll = () => {
    onSearchChange("");
    filters.forEach((f) => f.onChange(ALL));
  };

  return (
    <div className="space-y-2 mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={search}
            onChange={(e) => { onSearchChange(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => { blurTimer.current = window.setTimeout(() => setOpen(false), 150); }}
            onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
            className="pl-10 pr-8"
          />
          {search && (
            <button type="button" aria-label="ล้างคำค้นหา" onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
          {open && search.trim() && (
            <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-80 overflow-auto">
              {shown.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">ไม่พบรายการที่ตรงกับ "{search}"</div>
              ) : (
                <>
                  <div className="px-3 py-1.5 text-xs text-muted-foreground border-b">
                    ตัวอย่างผลค้นหา ({preview.length} รายการ)
                  </div>
                  {shown.map((p) => (
                    <button key={p.id} type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { onPreviewSelect ? onPreviewSelect(p) : onSearchChange(p.title); setOpen(false); }}
                      className="w-full text-left px-3 py-2 hover:bg-accent focus:bg-accent">
                      <div className="text-sm font-medium truncate">{p.title}</div>
                      {p.subtitle && <div className="text-xs text-muted-foreground truncate">{p.subtitle}</div>}
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
        {filters.map((f) => (
          <Select key={f.key} value={f.value} onValueChange={f.onChange}>
            <SelectTrigger className={f.width ?? "w-[170px]"}>
              <SelectValue placeholder={f.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{f.label}: ทั้งหมด</SelectItem>
              {f.options.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
        {active && (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <FilterX className="h-4 w-4 mr-1" /> ล้างตัวกรอง
          </Button>
        )}
        {actions}
      </div>
      {resultCount !== undefined && totalCount !== undefined && active && (
        <p className="text-xs text-muted-foreground">พบ {resultCount} จาก {totalCount} รายการ</p>
      )}
    </div>
  );
}
