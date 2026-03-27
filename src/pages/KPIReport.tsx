import { useState, useEffect } from "react";
import KPIToggleBar, { KPI_LIST } from "@/components/kpi/KPIToggleBar";
import StockTurnoverKPI from "@/components/kpi/StockTurnoverKPI";
import MinStockKPI from "@/components/kpi/MinStockKPI";
import MediaPlayerStatusKPI from "@/components/kpi/MediaPlayerStatusKPI";
import InventoryValueKPI from "@/components/kpi/InventoryValueKPI";
import IssuePunctualityKPI from "@/components/kpi/IssuePunctualityKPI";
import DeadStockKPI from "@/components/kpi/DeadStockKPI";
import ExpiryWarrantyKPI from "@/components/kpi/ExpiryWarrantyKPI";

const STORAGE_KEY = "kpi-visible-items";

const KPI_COMPONENTS: Record<string, React.ComponentType> = {
  "stock-turnover": StockTurnoverKPI,
  "min-stock": MinStockKPI,
  "media-player-status": MediaPlayerStatusKPI,
  "inventory-value": InventoryValueKPI,
  "issue-punctuality": IssuePunctualityKPI,
  "dead-stock": DeadStockKPI,
  "expiry-warranty": ExpiryWarrantyKPI,
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

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">📊 รายงาน KPI</h1>

      <KPIToggleBar visible={visible} onChange={setVisible} />

      {visibleKPIs.length === 0 && (
        <p className="text-center text-muted-foreground py-12">กรุณาเลือก KPI ที่ต้องการดูจากแถบด้านบน</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {visibleKPIs.map((kpi) => {
          const Component = KPI_COMPONENTS[kpi.id];
          return Component ? <Component key={kpi.id} /> : null;
        })}
      </div>
    </div>
  );
}
