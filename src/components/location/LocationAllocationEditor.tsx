import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Plus, Trash2 } from "lucide-react";
import {
  AllocationLocationInfo,
  LocationAllocation,
  allocationTotal,
  splitVolume,
} from "@/lib/locationAllocations";

interface LocationAllocationEditorProps {
  locations: AllocationLocationInfo[];
  value: LocationAllocation[];
  onChange: (value: LocationAllocation[]) => void;
  /** จำนวนรวมที่ต้องกระจายให้ครบ */
  totalQuantity: number;
  unitLabel?: string;
  /** ปริมาตรรวมที่จะใช้ (m³) สำหรับแสดงการหักพื้นที่รายช่อง */
  totalVolumeCm3?: number | null;
  disabled?: boolean;
}

const locLabel = (loc: AllocationLocationInfo) =>
  `${loc.zone_code ? `${loc.zone_code}${loc.code}` : loc.code} - ${loc.name}`;

export function LocationAllocationEditor({
  locations,
  value,
  onChange,
  totalQuantity,
  unitLabel = "ชิ้น",
  totalVolumeCm3,
  disabled,
}: LocationAllocationEditorProps) {
  const rows = value.length > 0 ? value : [{ locationId: "", quantity: totalQuantity }];
  const assigned = allocationTotal(rows);
  const remainingQty = totalQuantity - assigned;
  const volumes = splitVolume(rows, totalVolumeCm3 ?? null);

  const update = (index: number, patch: Partial<LocationAllocation>) => {
    const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
    onChange(next);
  };

  const addRow = () => {
    onChange([...rows, { locationId: "", quantity: Math.max(remainingQty, 0) }]);
  };

  const removeRow = (index: number) => {
    const next = rows.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [{ locationId: "", quantity: totalQuantity }]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>ตำแหน่งจัดเก็บ * (เลือกได้หลายช่อง)</Label>
        <Badge variant={remainingQty === 0 ? "secondary" : "destructive"}>
          กระจายแล้ว {assigned} / {totalQuantity} {unitLabel}
        </Badge>
      </div>

      <div className="space-y-2">
        {rows.map((row, index) => {
          const used = rows.filter((_, i) => i !== index).map((r) => r.locationId);
          const options = locations
            .filter((loc) => !used.includes(loc.id))
            .map((loc) => {
              const remaining = (loc.volume_cm3 || 0) - (loc.used_volume_cm3 || 0);
              return {
                value: loc.id,
                label: `${locLabel(loc)}${loc.zone_name ? ` (โซน ${loc.zone_code} · ${loc.zone_name})` : ""}`,
                description: `คงเหลือ: ${remaining.toLocaleString("en-US", { maximumFractionDigits: 0 })} m³`,
              };
            });

          const loc = locations.find((l) => l.id === row.locationId);
          const locRemaining = loc ? (loc.volume_cm3 || 0) - (loc.used_volume_cm3 || 0) : null;
          const needVolume = volumes[row.locationId] ?? 0;
          const overCapacity =
            !!loc && !!loc.volume_cm3 && locRemaining !== null && needVolume > locRemaining;

          return (
            <div key={index} className="rounded-md border p-2 space-y-2">
              <div className="flex gap-2 items-start">
                <div className="flex-1">
                  <SearchableSelect
                    options={options}
                    value={row.locationId}
                    onValueChange={(v) => update(index, { locationId: v })}
                    placeholder="ค้นหาตำแหน่งจัดเก็บ..."
                    searchPlaceholder="พิมพ์ค้นหา..."
                    emptyMessage="ไม่มีตำแหน่งจัดเก็บในคลังนี้"
                    disabled={disabled}
                  />
                </div>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  className="w-24"
                  value={row.quantity}
                  disabled={disabled}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  onChange={(e) => update(index, { quantity: Number(e.target.value) })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={disabled || rows.length === 1}
                  onClick={() => removeRow(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {row.locationId && (
                <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3">
                  {locRemaining !== null && loc?.volume_cm3 ? (
                    <span>
                      พื้นที่คงเหลือของช่องนี้:{" "}
                      <span className={overCapacity ? "text-destructive font-medium" : "text-success font-medium"}>
                        {locRemaining.toLocaleString("en-US", { maximumFractionDigits: 2 })} m³
                      </span>
                    </span>
                  ) : null}
                  {needVolume > 0 && (
                    <span>ใช้พื้นที่ {needVolume.toLocaleString("en-US", { maximumFractionDigits: 2 })} m³</span>
                  )}
                  {overCapacity && <span className="text-destructive">⚠️ พื้นที่ไม่พอ</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addRow} disabled={disabled}>
        <Plus className="h-4 w-4" />
        เพิ่มช่องจัดเก็บ
      </Button>

      {remainingQty !== 0 && (
        <div className="text-xs text-destructive">
          {remainingQty > 0
            ? `ยังกระจายไม่ครบอีก ${remainingQty} ${unitLabel}`
            : `กระจายเกินมา ${Math.abs(remainingQty)} ${unitLabel}`}
        </div>
      )}
    </div>
  );
}
