// Pure helpers for the inventory report: aggregate actual stock per storage
// location (from stock_location_allocations) and match warehouse/location
// filters against real balances instead of the item's default location.

export interface AllocationRow {
  equipment_id?: string | null;
  media_player_id?: string | null;
  tool_id?: string | null;
  location_id?: string | null;
  quantity?: number | string | null;
  locations?: {
    code?: string | null;
    name?: string | null;
    warehouse_id?: string | null;
    warehouses?: { id?: string | null; code?: string | null; name?: string | null } | null;
  } | null;
}

export interface StorageBalance {
  locationId: string;
  warehouseId: string | null;
  warehouseCode: string;
  warehouseName: string;
  locationCode: string;
  locationName: string;
  quantity: number;
}

const rowItemId = (row: AllocationRow): string | null =>
  row.equipment_id || row.media_player_id || row.tool_id || null;

/** รวมยอดคงเหลือจริงแยกตามช่องจัดเก็บของแต่ละสินค้า (เฉพาะช่องที่มียอดไม่เป็น 0) */
export const buildStorageBalanceMap = (rows: AllocationRow[]): Record<string, StorageBalance[]> => {
  const byItem = new Map<string, Map<string, StorageBalance>>();
  (rows || []).forEach((row) => {
    const itemId = rowItemId(row);
    if (!itemId || !row.location_id) return;
    if (!byItem.has(itemId)) byItem.set(itemId, new Map());
    const locMap = byItem.get(itemId)!;
    const existing = locMap.get(row.location_id);
    if (existing) {
      existing.quantity += Number(row.quantity) || 0;
      return;
    }
    locMap.set(row.location_id, {
      locationId: row.location_id,
      warehouseId: row.locations?.warehouse_id || row.locations?.warehouses?.id || null,
      warehouseCode: row.locations?.warehouses?.code || "-",
      warehouseName: row.locations?.warehouses?.name || "",
      locationCode: row.locations?.code || "-",
      locationName: row.locations?.name || "",
      quantity: Number(row.quantity) || 0,
    });
  });

  const result: Record<string, StorageBalance[]> = {};
  byItem.forEach((locMap, itemId) => {
    const balances = Array.from(locMap.values())
      .filter((b) => b.quantity !== 0)
      .sort((a, b) => b.quantity - a.quantity);
    if (balances.length > 0) result[itemId] = balances;
  });
  return result;
};

export interface StorageMatchInput {
  /** location_id เริ่มต้นของสินค้า (master) */
  defaultLocationId?: string | null;
  /** warehouse_id ของ location เริ่มต้น */
  defaultWarehouseId?: string | null;
  /** ยอดคงเหลือจริงแยกตามช่อง (จาก buildStorageBalanceMap) */
  balances?: StorageBalance[];
}

/** สินค้าอยู่ในคลังนี้หรือไม่ — ดูจากยอดคงเหลือจริงก่อน แล้วค่อย fallback ไปตำแหน่งเริ่มต้น */
export const matchesWarehouse = (input: StorageMatchInput, warehouseId: string): boolean => {
  if (!warehouseId) return true;
  if (input.balances && input.balances.length > 0) {
    return input.balances.some((b) => b.warehouseId === warehouseId);
  }
  return input.defaultWarehouseId === warehouseId;
};

/** สินค้าอยู่ในตำแหน่งจัดเก็บนี้หรือไม่ — ดูจากยอดคงเหลือจริงก่อน แล้วค่อย fallback ไปตำแหน่งเริ่มต้น */
export const matchesLocation = (input: StorageMatchInput, locationId: string): boolean => {
  if (!locationId) return true;
  if (input.balances && input.balances.length > 0) {
    return input.balances.some((b) => b.locationId === locationId);
  }
  return input.defaultLocationId === locationId;
};

/**
 * จำกัดบรรทัดยอดคงเหลือตามตัวกรองคลัง/ตำแหน่งที่ผู้ใช้เลือก
 * - ไม่เลือกตัวกรอง → คืนทุกบรรทัด (ภาพรวมทั้งระบบ)
 * - เลือกคลัง/ตำแหน่ง → คืนเฉพาะบรรทัดที่ตรง เพื่อให้ยอด/มูลค่าที่แสดงตรงกับคลังนั้นจริง
 */
export const scopedStorageLines = (
  lines: StorageBalance[],
  warehouseId?: string | null,
  locationId?: string | null,
): StorageBalance[] => {
  let result = lines || [];
  if (warehouseId) result = result.filter((l) => l.warehouseId === warehouseId);
  if (locationId) result = result.filter((l) => l.locationId === locationId);
  return result;
};

/** ผลรวมจำนวนของบรรทัดยอดคงเหลือ */
export const sumStorageLines = (lines: StorageBalance[]): number =>
  (lines || []).reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);

/** บรรทัดแสดงผลคลัง/ตำแหน่งสำหรับตารางและ Excel — ใช้ยอดจริงถ้ามี ไม่งั้นใช้ตำแหน่งเริ่มต้น */
export const storageDisplayLines = (
  input: StorageMatchInput & {
    defaultLocation?: { code?: string | null; name?: string | null } | null;
    defaultWarehouse?: { code?: string | null; name?: string | null } | null;
    fallbackQuantity?: number;
  },
): StorageBalance[] => {
  if (input.balances && input.balances.length > 0) return input.balances;
  if (input.defaultLocationId && input.defaultLocation) {
    return [
      {
        locationId: input.defaultLocationId,
        warehouseId: input.defaultWarehouseId || null,
        warehouseCode: input.defaultWarehouse?.code || "-",
        warehouseName: input.defaultWarehouse?.name || "",
        locationCode: input.defaultLocation.code || "-",
        locationName: input.defaultLocation.name || "",
        quantity: input.fallbackQuantity ?? 0,
      },
    ];
  }
  return [];
};
