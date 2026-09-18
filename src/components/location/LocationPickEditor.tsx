import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import {
  BalanceFilter,
  LocationAllocation,
  LocationBalance,
  allocationTotal,
  fetchLocationBalances,
} from "@/lib/locationAllocations";

interface LocationPickEditorProps {
  /** สินค้าที่จะหยิบออกจากช่องจัดเก็บ */
  filter: BalanceFilter;
  value: LocationAllocation[];
  onChange: (value: LocationAllocation[]) => void;
  /** จำนวนที่ต้องหยิบรวม */
  totalQuantity: number;
  unitLabel?: string;
  disabled?: boolean;
}

/** เลือกหยิบของจากหลายช่องจัดเก็บ พร้อมระบุจำนวนต่อช่อง (ไม่เกินยอดคงเหลือของช่องนั้น) */
export function LocationPickEditor({
  filter,
  value,
  onChange,
  totalQuantity,
  unitLabel = "ชิ้น",
  disabled,
}: LocationPickEditorProps) {
  const [balances, setBalances] = useState<LocationBalance[]>([]);
  const [loading, setLoading] = useState(false);

  const key = `${filter.equipmentId || ""}|${filter.mediaPlayerId || ""}|${filter.toolId || ""}`;

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!filter.equipmentId && !filter.mediaPlayerId && !filter.toolId) {
        setBalances([]);
        return;
      }
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

  const qtyFor = (locationId: string) =>
    value.find((v) => v.locationId === locationId)?.quantity ?? 0;

  const setQty = (locationId: string, qty: number) => {
    const next = value.filter((v) => v.locationId !== locationId);
    if (qty > 0) next.push({ locationId, quantity: qty });
    onChange(next);
  };

  const assigned = allocationTotal(value);
  const remaining = totalQuantity - assigned;

  const autoFill = () => {
    let left = totalQuantity;
    const next: LocationAllocation[] = [];
    for (const b of balances) {
      if (left <= 0) break;
      const take = Math.min(left, b.quantity);
      if (take > 0) {
        next.push({ locationId: b.locationId, quantity: take });
        left -= take;
      }
    }
    onChange(next);
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">กำลังโหลดยอดคงเหลือรายช่อง...</p>;
  }

  if (balances.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        ยังไม่มีข้อมูลช่องจัดเก็บของสินค้านี้ (ระบบจะใช้ตำแหน่งหลักตามเดิม)
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>หยิบจากช่องจัดเก็บ (เลือกได้หลายช่อง)</Label>
        <div className="flex items-center gap-2">
          <Badge variant={remaining === 0 ? "default" : "outline"}>
            เลือกแล้ว {assigned}/{totalQuantity} {unitLabel}
          </Badge>
          <Button type="button" variant="outline" size="sm" onClick={autoFill} disabled={disabled}>
            เลือกอัตโนมัติ
          </Button>
        </div>
      </div>

      <div className="rounded-md border divide-y">
        {balances.map((b) => (
          <div key={b.locationId} className="flex items-center gap-2 px-3 py-2">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {b.zoneCode ? `${b.zoneCode}${b.code}` : b.code} - {b.name}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {b.warehouseCode ? `${b.warehouseCode} ${b.warehouseName || ""}` : "ไม่ระบุคลัง"} · คงเหลือ {b.quantity} {unitLabel}
              </div>
            </div>
            <Input
              type="number"
              min={0}
              max={b.quantity}
              className="w-24"
              value={qtyFor(b.locationId) || ""}
              placeholder="0"
              disabled={disabled}
              onChange={(e) => {
                const raw = parseFloat(e.target.value);
                const qty = Number.isFinite(raw) ? Math.max(0, Math.min(raw, b.quantity)) : 0;
                setQty(b.locationId, qty);
              }}
            />
          </div>
        ))}
      </div>

      {remaining > 0 && (
        <p className="text-xs text-orange-600">ยังเลือกไม่ครบอีก {remaining} {unitLabel}</p>
      )}
      {remaining < 0 && (
        <p className="text-xs text-destructive">เลือกเกินไป {Math.abs(remaining)} {unitLabel}</p>
      )}
    </div>
  );
}
