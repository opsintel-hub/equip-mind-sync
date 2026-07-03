import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Columns3, Lock, Search, RotateCcw, CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";

export type ColumnDef<K extends string = string> = {
  key: K;
  label: string;
  locked?: boolean;
  defaultVisible?: boolean;
  group?: string;
};

interface ColumnChooserProps<K extends string> {
  columns: ColumnDef<K>[];
  visible: K[];
  onChange: (next: K[]) => void;
  defaults?: K[];
  buttonSize?: "sm" | "default";
  align?: "start" | "center" | "end";
  className?: string;
  label?: string;
}

export function ColumnChooser<K extends string>({
  columns,
  visible,
  onChange,
  defaults,
  buttonSize = "sm",
  align = "end",
  className,
  label = "คอลัมน์",
}: ColumnChooserProps<K>) {
  const [q, setQ] = useState("");
  const visibleSet = useMemo(() => new Set(visible), [visible]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return columns;
    return columns.filter((c) => c.label.toLowerCase().includes(s));
  }, [q, columns]);

  const lockedKeys = useMemo(
    () => columns.filter((c) => c.locked).map((c) => c.key),
    [columns]
  );
  const defaultKeys = useMemo(
    () => defaults ?? columns.filter((c) => c.defaultVisible !== false).map((c) => c.key),
    [defaults, columns]
  );

  const toggle = (k: K, locked?: boolean) => {
    if (locked) return;
    if (visibleSet.has(k)) onChange(visible.filter((x) => x !== k));
    else onChange([...visible, k]);
  };

  const selectAll = () => onChange(columns.map((c) => c.key));
  const clearAll = () => onChange(lockedKeys);
  const resetDefault = () => onChange(Array.from(new Set([...lockedKeys, ...defaultKeys])));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size={buttonSize} className={cn("gap-2", className)}>
          <Columns3 className="h-4 w-4" />
          <span className="hidden sm:inline">{label}</span>
          <Badge variant="secondary" className="ml-0.5 h-5 px-1.5 text-[11px] font-medium tabular-nums">
            {visible.length}/{columns.length}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-72 p-0 overflow-hidden">
        {/* Header */}
        <div className="px-3 pt-3 pb-2 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-7 w-7 rounded-md bg-primary/10 text-primary grid place-items-center">
              <Columns3 className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold leading-tight">จัดการคอลัมน์</p>
              <p className="text-[11px] text-muted-foreground leading-tight">
                เลือกคอลัมน์ที่ต้องการแสดง
              </p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหาคอลัมน์..."
              className="h-8 pl-7 text-xs"
            />
          </div>
        </div>

        <Separator />

        {/* List */}
        <div className="max-h-72 overflow-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">ไม่พบคอลัมน์</p>
          ) : (
            filtered.map((c) => {
              const checked = visibleSet.has(c.key);
              return (
                <button
                  key={c.key}
                  type="button"
                  disabled={c.locked}
                  onClick={() => toggle(c.key, c.locked)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors",
                    "hover:bg-accent focus:bg-accent focus:outline-none",
                    c.locked && "opacity-70 cursor-not-allowed hover:bg-transparent"
                  )}
                >
                  <span
                    className={cn(
                      "h-4 w-4 rounded border grid place-items-center transition-colors",
                      checked
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-input bg-background"
                    )}
                  >
                    {checked && <CheckSquare className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  <span className="flex-1 truncate">{c.label}</span>
                  {c.locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                </button>
              );
            })
          )}
        </div>

        <Separator />

        {/* Footer actions */}
        <div className="grid grid-cols-3 gap-1 p-2 bg-muted/30">
          <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={selectAll}>
            <CheckSquare className="h-3 w-3" /> ทั้งหมด
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={resetDefault}>
            <RotateCcw className="h-3 w-3" /> ค่าเริ่มต้น
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={clearAll}>
            <Square className="h-3 w-3" /> ล้าง
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Helper: persist visible cols to localStorage with locked-column guard. */
export function useVisibleCols<K extends string>(
  storageKey: string,
  columns: ColumnDef<K>[]
) {
  const defaults = useMemo(
    () =>
      Array.from(
        new Set([
          ...columns.filter((c) => c.locked).map((c) => c.key),
          ...columns.filter((c) => c.defaultVisible !== false).map((c) => c.key),
        ])
      ),
    [columns]
  );
  const load = (): K[] => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return defaults;
      const arr = JSON.parse(raw) as K[];
      const valid = new Set(columns.map((c) => c.key));
      const kept = arr.filter((k) => valid.has(k));
      const lockedKeys = columns.filter((c) => c.locked).map((c) => c.key);
      return Array.from(new Set([...lockedKeys, ...kept]));
    } catch {
      return defaults;
    }
  };
  const [visible, setVisible] = useState<K[]>(() => load());
  const save = (next: K[]) => {
    setVisible(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  };
  return [visible, save, defaults] as const;
}
