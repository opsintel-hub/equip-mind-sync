import { useMemo, useState } from "react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  isToday, parseISO, addMonths, subMonths, differenceInDays,
} from "date-fns";
import { th } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const dayNames = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

export interface CalendarItem {
  id: string;
  date: string; // ISO date (yyyy-MM-dd)
  title: string;
  subtitle?: string;
}

interface Props {
  items: CalendarItem[];
  onItemClick?: (id: string) => void;
  /** label shown above calendar (e.g. "หมดประกัน") */
  title?: string;
}

type Bucket = "overdue" | "d14" | "d30" | "future";

function bucketOf(dateStr: string): Bucket {
  const d = differenceInDays(parseISO(dateStr), new Date());
  if (d < 0) return "overdue";
  if (d <= 14) return "d14";
  if (d <= 30) return "d30";
  return "future";
}

const bucketColor: Record<Bucket, string> = {
  overdue: "bg-red-500",
  d14: "bg-orange-500",
  d30: "bg-yellow-500",
  future: "bg-slate-400",
};

const bucketPill: Record<Bucket, string> = {
  overdue: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300 border-red-200",
  d14: "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300 border-orange-200",
  d30: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300 border-yellow-200",
  future: "bg-slate-50 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300 border-slate-200",
};

export function EntityCalendarView({ items, onItemClick, title }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dayDialogDate, setDayDialogDate] = useState<string | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const byDate = useMemo(() => {
    const map: Record<string, CalendarItem[]> = {};
    items.forEach((it) => {
      if (!it.date) return;
      const k = it.date.length > 10 ? format(parseISO(it.date), "yyyy-MM-dd") : it.date;
      (map[k] ||= []).push(it);
    });
    return map;
  }, [items]);

  const openItems = dayDialogDate ? byDate[dayDialogDate] || [] : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-base font-semibold">
          {title ? `${title} — ` : ""}{format(currentMonth, "MMMM yyyy", { locale: th })}
        </h3>
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden border border-border">
        {dayNames.map((n, i) => (
          <div key={i} className="bg-muted/60 p-2 text-center text-xs font-semibold text-muted-foreground">
            {n}
          </div>
        ))}

        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`e-${i}`} className="bg-background min-h-[90px] p-1" />
        ))}

        {daysInMonth.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayItems = byDate[dateStr] || [];
          const counts = { overdue: 0, d14: 0, d30: 0, future: 0 };
          dayItems.forEach((it) => { counts[bucketOf(it.date)]++; });
          const today = isToday(day);

          return (
            <div
              key={dateStr}
              onClick={() => dayItems.length > 0 && setDayDialogDate(dateStr)}
              className={cn(
                "bg-background min-h-[90px] p-1.5 transition-colors",
                dayItems.length > 0 && "cursor-pointer hover:bg-accent/50",
                today && "bg-primary/5",
              )}
            >
              <div className={cn(
                "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                today && "bg-primary text-primary-foreground",
              )}>
                {format(day, "d")}
              </div>
              {dayItems.length > 0 && (
                <>
                  <div className="space-y-0.5">
                    {dayItems.slice(0, 2).map((it) => (
                      <div
                        key={it.id}
                        className={cn(
                          "px-1 py-0.5 rounded text-[10px] leading-tight truncate border",
                          bucketPill[bucketOf(it.date)],
                        )}
                        title={it.title}
                      >
                        {it.title}
                      </div>
                    ))}
                    {dayItems.length > 2 && (
                      <div className="text-[10px] text-muted-foreground pl-1">
                        +{dayItems.length - 2} รายการ
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 mt-1">
                    {(Object.keys(counts) as Bucket[]).map((k) =>
                      counts[k] > 0 ? (
                        <div key={k} className="flex items-center gap-0.5">
                          <div className={cn("w-1.5 h-1.5 rounded-full", bucketColor[k])} />
                          <span className="text-[9px] text-muted-foreground">{counts[k]}</span>
                        </div>
                      ) : null,
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500" />เลยกำหนด</div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-orange-500" />ภายใน 14 วัน</div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />ภายใน 30 วัน</div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-400" />อนาคต</div>
      </div>

      <Dialog open={!!dayDialogDate} onOpenChange={(o) => !o && setDayDialogDate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              รายการวันที่ {dayDialogDate && format(parseISO(dayDialogDate), "d MMMM yyyy", { locale: th })}
              <span className="text-sm text-muted-foreground ml-2">({openItems.length} รายการ)</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {openItems.map((it) => {
              const b = bucketOf(it.date);
              return (
                <button
                  key={it.id}
                  onClick={() => { onItemClick?.(it.id); setDayDialogDate(null); }}
                  className={cn(
                    "w-full text-left border rounded-lg px-3 py-2 transition-colors",
                    onItemClick && "hover:bg-accent cursor-pointer",
                    bucketPill[b],
                  )}
                >
                  <div className="font-medium text-sm">{it.title}</div>
                  {it.subtitle && <div className="text-xs opacity-80">{it.subtitle}</div>}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
