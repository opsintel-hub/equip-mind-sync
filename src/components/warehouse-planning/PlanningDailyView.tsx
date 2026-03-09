import { useMemo } from "react";
import { format, parseISO, addDays, subDays, isToday, isTomorrow } from "date-fns";
import { th } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Store, CalendarClock, Truck, Clock, User, FileText, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PlanningDailyViewProps {
  requests: any[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const timeSlots = [
  "ก่อน 08:00",
  "08:00 - 09:00",
  "09:00 - 10:00",
  "10:00 - 11:00",
  "11:00 - 12:00",
  "12:00 - 13:00",
  "13:00 - 14:00",
  "14:00 - 15:00",
  "15:00 - 16:00",
  "16:00 - 17:00",
  "หลัง 17:00",
];

function getTimeSlotIndex(timeStr: string | null): number {
  if (!timeStr) return -1; // no time = unscheduled
  const hour = parseInt(timeStr.split(":")[0], 10);
  if (isNaN(hour)) return -1;
  if (hour < 8) return 0;
  if (hour >= 17) return 10;
  return hour - 7; // 08->1, 09->2, etc.
}

export function PlanningDailyView({ requests, selectedDate, onDateChange }: PlanningDailyViewProps) {
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const today = isToday(selectedDate);
  const tomorrow = isTomorrow(selectedDate);

  // Filter requests for this date
  const dayRequests = useMemo(() => {
    return requests.filter((r: any) => {
      const rDate = r.pickup_date
        ? format(parseISO(r.pickup_date), "yyyy-MM-dd")
        : format(new Date(r.created_at), "yyyy-MM-dd");
      return rDate === dateStr;
    });
  }, [requests, dateStr]);

  // Group by time slot
  const scheduledBySlot = useMemo(() => {
    const slots: Record<number, any[]> = {};
    const unscheduled: any[] = [];

    dayRequests.forEach((r: any) => {
      if (r.pickup_type === "wait_onsite" || !r.pickup_time) {
        unscheduled.push(r);
      } else {
        const idx = getTimeSlotIndex(r.pickup_time);
        if (idx === -1) {
          unscheduled.push(r);
        } else {
          if (!slots[idx]) slots[idx] = [];
          slots[idx].push(r);
        }
      }
    });

    return { slots, unscheduled };
  }, [dayRequests]);

  const getPickupBadge = (req: any) => {
    switch (req.pickup_type) {
      case "wait_onsite":
        return <Badge variant="destructive" className="gap-1 text-[10px]"><Store className="h-3 w-3" />รอรับที่คลัง</Badge>;
      case "scheduled":
        return <Badge className="bg-orange-100 text-orange-800 gap-1 text-[10px]"><CalendarClock className="h-3 w-3" />นัดรับ</Badge>;
      case "delivery":
        return <Badge className="bg-purple-100 text-purple-800 gap-1 text-[10px]"><Truck className="h-3 w-3" />จัดส่ง</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">ไม่ระบุ</Badge>;
    }
  };

  const RequestCard = ({ req }: { req: any }) => (
    <div className={cn(
      "flex flex-col gap-1.5 p-3 rounded-lg border-l-4 bg-background shadow-sm",
      req.pickup_type === "wait_onsite" && "border-l-red-500 bg-red-50/30 dark:bg-red-950/20",
      req.pickup_type === "scheduled" && "border-l-orange-500 bg-orange-50/30 dark:bg-orange-950/20",
      req.pickup_type === "delivery" && "border-l-purple-500 bg-purple-50/30 dark:bg-purple-950/20"
    )}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {getPickupBadge(req)}
          {req.pickup_time && (
            <span className="text-xs font-medium flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              {req.pickup_time}
            </span>
          )}
        </div>
        <span className="text-xs font-mono text-muted-foreground">{req.document_no}</span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">{req.requester_name || "-"}</span>
        </span>
        {req.requester_department && (
          <span className="text-xs text-muted-foreground">({req.requester_department})</span>
        )}
      </div>
      {req.destination && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {req.destination}
        </div>
      )}
      {req.status === "approved" && (
        <Badge className="bg-emerald-100 text-emerald-800 w-fit text-[10px]">อนุมัติแล้ว</Badge>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Date Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => onDateChange(subDays(selectedDate, 1))}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          วันก่อน
        </Button>
        <div className="text-center">
          <h3 className="text-lg font-semibold">
            {format(selectedDate, "EEEE d MMMM yyyy", { locale: th })}
          </h3>
          <p className="text-xs text-muted-foreground">
            {today ? "📌 วันนี้" : tomorrow ? "📅 พรุ่งนี้" : ""}
            {" — "}
            {dayRequests.length} รายการ
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => onDateChange(addDays(selectedDate, 1))}>
          วันถัดไป
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <Store className="h-4 w-4 text-red-600" />
          <div>
            <p className="text-lg font-bold text-red-700 dark:text-red-400">{dayRequests.filter((r: any) => r.pickup_type === "wait_onsite").length}</p>
            <p className="text-[10px] text-red-600 dark:text-red-400">รอรับที่คลัง</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
          <CalendarClock className="h-4 w-4 text-orange-600" />
          <div>
            <p className="text-lg font-bold text-orange-700 dark:text-orange-400">{dayRequests.filter((r: any) => r.pickup_type === "scheduled").length}</p>
            <p className="text-[10px] text-orange-600 dark:text-orange-400">นัดรับ</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
          <Truck className="h-4 w-4 text-purple-600" />
          <div>
            <p className="text-lg font-bold text-purple-700 dark:text-purple-400">{dayRequests.filter((r: any) => r.pickup_type === "delivery").length}</p>
            <p className="text-[10px] text-purple-600 dark:text-purple-400">จัดส่ง</p>
          </div>
        </div>
      </div>

      {dayRequests.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarClock className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>ไม่มีรายการนัดรับสินค้าในวันนี้</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Unscheduled / Walk-in */}
          {scheduledBySlot.unscheduled.length > 0 && (
            <Card className="border-red-200 dark:border-red-800">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-3">
                  <Store className="h-4 w-4 text-red-600" />
                  <h4 className="font-semibold text-sm text-red-700 dark:text-red-400">
                    รอรับทันที / ไม่ระบุเวลา ({scheduledBySlot.unscheduled.length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {scheduledBySlot.unscheduled.map((req: any) => (
                    <RequestCard key={req.id} req={req} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline slots */}
          <div className="space-y-1">
            {timeSlots.map((label, idx) => {
              const slotRequests = scheduledBySlot.slots[idx] || [];
              const hasItems = slotRequests.length > 0;

              return (
                <div key={idx} className={cn(
                  "flex gap-3 min-h-[48px] rounded-lg transition-colors",
                  hasItems ? "bg-accent/30" : ""
                )}>
                  {/* Time label */}
                  <div className="w-[100px] flex-shrink-0 py-2 px-2 text-right">
                    <span className={cn(
                      "text-xs font-medium",
                      hasItems ? "text-foreground" : "text-muted-foreground/50"
                    )}>
                      {label}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full mt-3 flex-shrink-0",
                      hasItems ? "bg-primary" : "bg-border"
                    )} />
                    <div className="w-px flex-1 bg-border" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 py-1.5 space-y-1.5 pb-3">
                    {slotRequests.map((req: any) => (
                      <RequestCard key={req.id} req={req} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
