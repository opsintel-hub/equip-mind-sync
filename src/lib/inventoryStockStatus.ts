// Pure helpers for the inventory report's "สถานะ Stock" column.
//
// Rule: stock status must be judged from the ITEM's real total stock, never from
// a single S/N row. Items with several serial numbers are expanded into one row
// per S/N (quantity_in_stock becomes 1 or 0 per row), so comparing that row value
// against the item's min_stock_level wrongly marks every row as "ใกล้หมด".

export type StockTone = "out" | "low" | "normal";

export interface StockQuantityInput {
  /**
   * ยอดคงเหลือจริงรวมของสินค้าจากช่องจัดเก็บ (stock_location_allocations)
   * null = สินค้านี้ไม่มีขอมูลจัดเก็บในช่องจัดเก็บ (ตอง fallback)
   */
  allocationsTotal: number | null;
  /** ยอดคงเหลือรวมของสินค้าจาก master (กอนแตงแถว S/N) */
  itemTotalQuantity: number;
  /** จำนวนของแถวที่แสดง (1/0 สำหรับแถวที่แตงออกมาจาก S/N) */
  rowQuantity: number;
}

/**
 * เลือกจำนวนที่ใชตักดืนสถานะ Stock:
 * 1. ยอดจริงจากช่องจัดเก็บ (ถ้ามี) - ตรงกับที่แสดงในคอลัม "ตำแหน่งจัดเก็บ"
 * 2. ยอดรวมของสินค้าจาก master
 * 3. ยอดของแถวนั้น (กรณที Singular ไมมียอดรวม)
 */
export const resolveStockStatusQuantity = (input: StockQuantityInput): number => {
  if (input.allocationsTotal != null) return Number(input.allocationsTotal) || 0;
  const total = Number(input.itemTotalQuantity) || 0;
  if (total > 0) return total;
  return Number(input.rowQuantity) || 0;
};

/** ตักดืนสถานะจากจำนวนคงเหลือรวม เทียบกับ Min Stock */
export const getStockStatusTone = (qty: number, minStock: number): StockTone => {
  const q = Number(qty) || 0;
  const min = Number(minStock) || 0;
  if (q === 0) return "out";
  if (q <= min) return "low";
  return "normal";
};

export const STOCK_STATUS_LABEL: Record<StockTone, string> = {
  out: "หมด",
  low: "ใกล้หมด",
  normal: "ปกติ",
};
