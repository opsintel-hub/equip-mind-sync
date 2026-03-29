import { useState, useEffect } from "react";
import KPIToggleBar, { KPI_LIST } from "@/components/kpi/KPIToggleBar";
import StockTurnoverKPI from "@/components/kpi/StockTurnoverKPI";
import MinStockKPI from "@/components/kpi/MinStockKPI";
import MediaPlayerStatusKPI from "@/components/kpi/MediaPlayerStatusKPI";
import InventoryValueKPI from "@/components/kpi/InventoryValueKPI";
import IssuePunctualityKPI from "@/components/kpi/IssuePunctualityKPI";
import DeadStockKPI from "@/components/kpi/DeadStockKPI";
import ExpiryWarrantyKPI from "@/components/kpi/ExpiryWarrantyKPI";
import BillboardPMComplianceKPI from "@/components/kpi/BillboardPMComplianceKPI";
import { format } from "date-fns";
import { th } from "date-fns/locale";

const STORAGE_KEY = "kpi-visible-items";

const KPI_COMPONENTS: Record<string, React.ComponentType> = {
  "stock-turnover": StockTurnoverKPI,
  "min-stock": MinStockKPI,
  "media-player-status": MediaPlayerStatusKPI,
  "inventory-value": InventoryValueKPI,
  "issue-punctuality": IssuePunctualityKPI,
  "dead-stock": DeadStockKPI,
  "expiry-warranty": ExpiryWarrantyKPI,
  "billboard-pm": BillboardPMComplianceKPI,
};

export default function KPIReport() {
  const [visible, setVisible] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return KPI_LIST.map((k) => k.id);
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visible));
  }, [visible]);

  const visibleKPIs = KPI_LIST.filter((k) => visible.includes(k.id));
  const today = format(new Date(), "d MMMM yyyy", { locale: th });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">📊 รายงาน KPI</h1>
          <p className="text-muted-foreground mt-1">
            สรุปตัวชี้วัดประสิทธิภาพการจัดการคลังสินค้าและสินทรัพย์
          </p>
        </div>
        <div className="text-sm text-muted-foreground text-right">
          <p>ข้อมูล ณ วันที่</p>
          <p className="font-semibold text-foreground">{today}</p>
        </div>
      </div>

      {/* Toggle Bar */}
      <KPIToggleBar visible={visible} onChange={setVisible} />

      {/* KPI Grid */}
      {visibleKPIs.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-lg font-medium">กรุณาเลือก KPI ที่ต้องการดู</p>
          <p className="text-sm">คลิกที่แถบด้านบนเพื่อเปิด-ปิดตัวชี้วัดแต่ละข้อ</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {visibleKPIs.map((kpi) => {
          const Component = KPI_COMPONENTS[kpi.id];
          return Component ? <Component key={kpi.id} /> : null;
        })}
      </div>
    </div>
  );
}
