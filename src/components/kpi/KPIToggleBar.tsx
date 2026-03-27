import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";

export interface KPIDefinition {
  id: string;
  label: string;
  icon: string;
}

const KPI_LIST: KPIDefinition[] = [
  { id: "stock-turnover", label: "อัตราหมุนเวียนสต็อก", icon: "📦" },
  { id: "min-stock", label: "สินค้าต่ำกว่า Min Stock", icon: "⚠️" },
  { id: "media-player-status", label: "สถานะ Media Player", icon: "📺" },
  { id: "inventory-value", label: "มูลค่าสินค้าคงคลัง", icon: "💰" },
  { id: "issue-punctuality", label: "อัตราเบิกจ่ายตรงเวลา", icon: "⏱️" },
  { id: "dead-stock", label: "Dead Stock", icon: "📉" },
  { id: "expiry-warranty", label: "ใกล้หมดอายุ/ประกัน", icon: "🔔" },
];

interface KPIToggleBarProps {
  visible: string[];
  onChange: (visible: string[]) => void;
}

export { KPI_LIST };

export default function KPIToggleBar({ visible, onChange }: KPIToggleBarProps) {
  const toggleItem = (id: string) => {
    onChange(
      visible.includes(id) ? visible.filter((v) => v !== id) : [...visible, id]
    );
  };

  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">เลือก KPI ที่ต้องการดู:</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onChange(KPI_LIST.map((k) => k.id))}
            >
              เลือกทั้งหมด
            </Button>
            <Button variant="outline" size="sm" onClick={() => onChange([])}>
              ล้างทั้งหมด
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {KPI_LIST.map((kpi) => (
            <label
              key={kpi.id}
              className="flex items-center gap-2 cursor-pointer rounded-lg border px-3 py-2 text-sm hover:bg-accent transition-colors select-none data-[checked=true]:bg-primary/10 data-[checked=true]:border-primary"
              data-checked={visible.includes(kpi.id)}
            >
              <Checkbox
                checked={visible.includes(kpi.id)}
                onCheckedChange={() => toggleItem(kpi.id)}
              />
              <span>{kpi.icon}</span>
              <span>{kpi.label}</span>
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
