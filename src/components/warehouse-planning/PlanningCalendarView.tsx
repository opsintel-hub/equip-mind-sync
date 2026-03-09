import { useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, isSameDay, parseISO, addMonths, subMonths } from "date-fns";
import { th } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Store, CalendarClock, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PlanningCalendarViewProps {
  requests: any[];
  onSelectDate: (date: Date) => void;
}

const dayNames = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

export function PlanningCalendarView({ requests, onSelectDate }: PlanningCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  // Group requests by date
  const requestsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    requests.forEach((r: any) => {
      const dateStr = r.pickup_date
        ? format(parseISO(r.pickup_date), "yyyy-MM-dd")
        : format(new Date(r.created_at), "yyyy-MM-dd");
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(r);
    });
    return map;
  }, [requests]);

  const getPickupIcon = (type: string) => {
    switch (type) {
      case "wait_onsite": return <Store className="h-3 w-3 text-red-600" />;
      case "scheduled": return <CalendarClock className="h-3 w-3 text-orange-600" />;
      case "delivery": return <Truck className="h-3 w-3 text-purple-600" />;
      default: return null;
    }
  };

  const getPickupDotClass = (type: string) => {
    switch (type) {
      case "wait_onsite": return "bg-red-500";
      case "scheduled": return "bg-orange-500";
      case "delivery": return "bg-purple-500";
      default: return "bg-muted-foreground";
    }
  };

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">
          {format(currentMonth, "MMMM yyyy", { locale: th })}
        </h3>
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden border border-border">
        {/* Day headers */}
        {dayNames.map((name, i) => (
          <div key={i} className="bg-muted/60 p-2 text-center text-xs font-semibold text-muted-foreground">
            {name}
          </div>
        ))}

        {/* Empty cells before month start */}
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-background min-h-[100px] p-1" />
        ))}

        {/* Day cells */}
        {daysInMonth.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayRequests = requestsByDate[dateStr] || [];
          const today = isToday(day);

          // Count by type
          const counts = { wait_onsite: 0, scheduled: 0, delivery: 0 };
          dayRequests.forEach((r: any) => {
            const t = r.pickup_type as keyof typeof counts;
            if (counts[t] !== undefined) counts[t]++;
          });

          return (
            <div
              key={dateStr}
              onClick={() => onSelectDate(day)}
              className={cn(
                "bg-background min-h-[100px] p-1.5 cursor-pointer transition-colors hover:bg-accent/50",
                today && "bg-primary/5"
              )}
            >
              <div className={cn(
                "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                today && "bg-primary text-primary-foreground"
              )}>
                {format(day, "d")}
              </div>

              {dayRequests.length > 0 && (
                <div className="space-y-0.5">
                  {/* Show up to 3 items, then "+N more" */}
                  {dayRequests.slice(0, 3).map((r: any, idx: number) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-center gap-1 px-1 py-0.5 rounded text-[10px] leading-tight truncate",
                        r.pickup_type === "wait_onsite" && "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
                        r.pickup_type === "scheduled" && "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400",
                        r.pickup_type === "delivery" && "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400"
                      )}
                    >
                      {getPickupIcon(r.pickup_type)}
                      <span className="truncate">
                        {r.pickup_time ? `${r.pickup_time} ` : ""}
                        {r.requester_name || r.document_no}
                      </span>
                    </div>
                  ))}
                  {dayRequests.length > 3 && (
                    <div className="text-[10px] text-muted-foreground pl-1">
                      +{dayRequests.length - 3} รายการ
                    </div>
                  )}
                </div>
              )}

              {/* Summary dots at bottom */}
              {dayRequests.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {counts.wait_onsite > 0 && (
                    <div className="flex items-center gap-0.5">
                      <div className={cn("w-1.5 h-1.5 rounded-full", getPickupDotClass("wait_onsite"))} />
                      <span className="text-[9px] text-muted-foreground">{counts.wait_onsite}</span>
                    </div>
                  )}
                  {counts.scheduled > 0 && (
                    <div className="flex items-center gap-0.5">
                      <div className={cn("w-1.5 h-1.5 rounded-full", getPickupDotClass("scheduled"))} />
                      <span className="text-[9px] text-muted-foreground">{counts.scheduled}</span>
                    </div>
                  )}
                  {counts.delivery > 0 && (
                    <div className="flex items-center gap-0.5">
                      <div className={cn("w-1.5 h-1.5 rounded-full", getPickupDotClass("delivery"))} />
                      <span className="text-[9px] text-muted-foreground">{counts.delivery}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span>รอรับที่คลัง</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          <span>นัดรับล่วงหน้า</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          <span>จัดส่ง</span>
        </div>
      </div>
    </div>
  );
}
