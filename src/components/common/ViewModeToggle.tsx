import { useEffect, useState } from "react";
import { LayoutGrid, Rows3, CalendarDays } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type ViewMode = "table" | "card" | "calendar";

interface Props {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
  /** hide calendar option */
  hideCalendar?: boolean;
  className?: string;
}

export function ViewModeToggle({ value, onChange, hideCalendar, className }: Props) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as ViewMode)}
      className={className}
      size="sm"
    >
      <ToggleGroupItem value="table" aria-label="ตาราง" title="มุมมองตาราง">
        <Rows3 className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="card" aria-label="การ์ด" title="มุมมองการ์ด">
        <LayoutGrid className="h-4 w-4" />
      </ToggleGroupItem>
      {!hideCalendar && (
        <ToggleGroupItem value="calendar" aria-label="ปฏิทิน" title="มุมมองปฏิทิน">
          <CalendarDays className="h-4 w-4" />
        </ToggleGroupItem>
      )}
    </ToggleGroup>
  );
}

/** Persist view mode per page in localStorage */
export function useViewMode(pageId: string, defaultMode: ViewMode = "table") {
  const key = `viewMode:${pageId}`;
  const [mode, setMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return defaultMode;
    const v = window.localStorage.getItem(key);
    return (v as ViewMode) || defaultMode;
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, mode);
    } catch {
      /* noop */
    }
  }, [key, mode]);
  return [mode, setMode] as const;
}
