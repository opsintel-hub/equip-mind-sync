import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Shield, ShieldAlert, MapPin, Package, CalendarClock } from "lucide-react";
import { differenceInDays, parseISO, addMonths } from "date-fns";
import { MediaPlayerRow, BillboardJourney } from "./types";
import { formatBillboardLabel } from "@/lib/billboardUtils";

interface SummaryCardsProps {
  player: MediaPlayerRow;
  journeys: BillboardJourney[];
}

export function SummaryCards({ player, journeys }: SummaryCardsProps) {
  const usageAgeDays = useMemo(() => {
    if (!player.date_of_receipt) return null;
    return differenceInDays(new Date(), parseISO(player.date_of_receipt));
  }, [player]);

  const warrantyStatus = useMemo(() => {
    if (!player.warranty_expiry_date) return { label: "ไม่ระบุ", variant: "secondary" as const };
    const diff = differenceInDays(parseISO(player.warranty_expiry_date), new Date());
    if (diff < 0) return { label: `หมดประกันแล้ว (${Math.abs(diff)} วัน)`, variant: "destructive" as const };
    if (diff <= 90) return { label: `เหลือ ${diff} วัน`, variant: "outline" as const };
    return { label: `เหลือ ${diff} วัน`, variant: "secondary" as const };
  }, [player]);

  const expiryStatus = useMemo(() => {
    // Calculate expiry from date_of_receipt + usage_lifespan_months
    if (!player.date_of_receipt || !player.usage_lifespan_months) return { label: "ไม่ระบุ", variant: "secondary" as const, icon: "normal" as const };
    const expiryDate = addMonths(parseISO(player.date_of_receipt), player.usage_lifespan_months);
    const diff = differenceInDays(expiryDate, new Date());
    if (diff < 0) return { label: `หมดอายุแล้ว (${Math.abs(diff)} วัน)`, variant: "destructive" as const, icon: "expired" as const };
    if (diff <= 90) return { label: `เหลือ ${diff} วัน`, variant: "outline" as const, icon: "warning" as const };
    return { label: `เหลือ ${diff} วัน`, variant: "secondary" as const, icon: "normal" as const };
  }, [player]);

  const currentBillboard = useMemo(() => {
    if (!player.billboard) return null;
    return formatBillboardLabel(player.billboard.old_code, player.billboard.location_name, player.billboard.equipment_id);
  }, [player]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">อายุใช้งาน</p>
              <p className="text-2xl font-bold">
                {usageAgeDays !== null ? (
                  usageAgeDays >= 365 ? `${(usageAgeDays / 365).toFixed(1)} ปี` : `${usageAgeDays} วัน`
                ) : "ไม่ระบุ"}
              </p>
            </div>
            <Clock className="w-7 h-7 text-primary opacity-70" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">สถานะประกัน</p>
              <Badge variant={warrantyStatus.variant} className="mt-1 text-sm">
                {warrantyStatus.label}
              </Badge>
            </div>
            {warrantyStatus.variant === "destructive" ? (
              <ShieldAlert className="w-7 h-7 text-destructive opacity-70" />
            ) : (
              <Shield className="w-7 h-7 text-primary opacity-70" />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">อายุการใช้งาน</p>
              <Badge variant={expiryStatus.variant} className="mt-1 text-sm">
                {expiryStatus.label}
              </Badge>
            </div>
            <CalendarClock className={`w-7 h-7 opacity-70 ${expiryStatus.icon === "expired" ? "text-destructive" : "text-primary"}`} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">ป้ายปัจจุบัน</p>
              <p className="text-sm font-semibold mt-1 truncate max-w-[180px]">
                {currentBillboard || "ไม่ได้ติดตั้ง"}
              </p>
            </div>
            <MapPin className="w-7 h-7 text-primary opacity-70" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">ประวัติติดตั้ง</p>
              <p className="text-2xl font-bold">{journeys.length} ครั้ง</p>
            </div>
            <Package className="w-7 h-7 text-primary opacity-70" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
