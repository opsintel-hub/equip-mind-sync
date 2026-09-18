import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { BalanceFilter, LocationBalance, fetchLocationBalances } from "@/lib/locationAllocations";

interface LocationBalanceCardProps {
  filter: BalanceFilter;
  unitLabel?: string;
  title?: string;
}

/** แสดงว่าสินค้าชิ้นนี้อยู่ช่องจัดเก็บไหนบ้าง จำนวนเท่าไร */
export function LocationBalanceCard({
  filter,
  unitLabel = "ชิ้น",
  title = "ตำแหน่งจัดเก็บที่มีของอยู่",
}: LocationBalanceCardProps) {
  const [balances, setBalances] = useState<LocationBalance[]>([]);
  const [loading, setLoading] = useState(true);

  const key = `${filter.equipmentId || ""}|${filter.mediaPlayerId || ""}|${filter.toolId || ""}`;

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      try {
        const data = await fetchLocationBalances(filter);
        if (active) setBalances(data);
      } catch {
        if (active) setBalances([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const total = balances.reduce((s, b) => s + b.quantity, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          {title}
          {!loading && balances.length > 0 && (
            <Badge variant="outline" className="ml-auto">
              รวม {total} {unitLabel} · {balances.length} ช่อง
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
        ) : balances.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            ยังไม่มีการบันทึกการกระจายลงช่องจัดเก็บสำหรับรายการนี้
          </p>
        ) : (
          <div className="rounded-md border divide-y">
            {balances.map((b) => (
              <div key={b.locationId} className="flex items-center gap-2 px-3 py-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {b.zoneCode ? `${b.zoneCode}${b.code}` : b.code} - {b.name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {b.warehouseCode ? `${b.warehouseCode} ${b.warehouseName || ""}` : "ไม่ระบุคลัง"}
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {b.quantity} {unitLabel}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
