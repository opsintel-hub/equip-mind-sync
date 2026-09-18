import { supabase } from "@/integrations/supabase/client";

export interface LocationAllocation {
  locationId: string;
  quantity: number;
}

export interface AllocationLocationInfo {
  id: string;
  code: string;
  name: string;
  warehouse_id?: string | null;
  zone_code?: string | null;
  zone_name?: string | null;
  volume_cm3?: number | null;
  used_volume_cm3?: number | null;
}

export const allocationTotal = (allocs: LocationAllocation[]) =>
  allocs.reduce((sum, a) => sum + (Number(a.quantity) || 0), 0);

/** ช่องหลัก = ช่องที่เก็บจำนวนมากที่สุด (ใช้กับฟิลด์ location_id เดิม) */
export const primaryLocationId = (allocs: LocationAllocation[]): string => {
  const valid = allocs.filter((a) => a.locationId);
  if (valid.length === 0) return "";
  return valid.slice().sort((a, b) => (Number(b.quantity) || 0) - (Number(a.quantity) || 0))[0].locationId;
};

/** แบ่งปริมาตรรวมตามสัดส่วนจำนวนของแต่ละช่อง */
export const splitVolume = (allocs: LocationAllocation[], totalVolumeCm3: number | null): Record<string, number> => {
  const result: Record<string, number> = {};
  if (!totalVolumeCm3 || totalVolumeCm3 <= 0) return result;
  const total = allocationTotal(allocs);
  if (total <= 0) return result;
  allocs.forEach((a) => {
    if (!a.locationId) return;
    result[a.locationId] = (result[a.locationId] || 0) + (totalVolumeCm3 * (Number(a.quantity) || 0)) / total;
  });
  return result;
};

export interface SaveAllocationsParams {
  allocations: LocationAllocation[];
  warehouseId?: string | null;
  equipmentId?: string | null;
  mediaPlayerId?: string | null;
  toolId?: string | null;
  referenceType?: string;
  referenceId?: string | null;
  referenceDocument?: string | null;
  totalVolumeCm3?: number | null;
  createdBy?: string | null;
  notes?: string | null;
}

/** บันทึกการกระจายของลงหลายช่อง + หักปริมาตรของแต่ละช่องตามจำนวนจริง */
export const saveLocationAllocations = async (params: SaveAllocationsParams) => {
  const allocs = params.allocations.filter((a) => a.locationId && Number(a.quantity) > 0);
  if (allocs.length === 0) return;

  const volumes = splitVolume(allocs, params.totalVolumeCm3 ?? null);

  const rows = allocs.map((a) => ({
    equipment_id: params.equipmentId || null,
    media_player_id: params.mediaPlayerId || null,
    tool_id: params.toolId || null,
    location_id: a.locationId,
    warehouse_id: params.warehouseId || null,
    quantity: Number(a.quantity) || 0,
    volume_cm3: volumes[a.locationId] ?? null,
    reference_type: params.referenceType || null,
    reference_id: params.referenceId || null,
    reference_document: params.referenceDocument || null,
    notes: params.notes || null,
    created_by: params.createdBy || null,
  }));

  const { error } = await supabase.from("stock_location_allocations").insert(rows);
  if (error) throw error;

  // หักพื้นที่ใช้งานของแต่ละช่องตามปริมาตรที่แบ่งไว้
  for (const [locationId, vol] of Object.entries(volumes)) {
    if (!vol || vol <= 0) continue;
    const { data } = await supabase
      .from("locations")
      .select("used_volume_cm3")
      .eq("id", locationId)
      .single();
    await supabase
      .from("locations")
      .update({ used_volume_cm3: (data?.used_volume_cm3 || 0) + vol })
      .eq("id", locationId);
  }
};

export interface LocationBalance {
  locationId: string;
  quantity: number;
  code: string;
  name: string;
  zoneCode?: string | null;
  warehouseCode?: string | null;
  warehouseName?: string | null;
}

export interface BalanceFilter {
  equipmentId?: string | null;
  mediaPlayerId?: string | null;
  toolId?: string | null;
}

/** ยอดคงเหลือแยกตามช่องจัดเก็บ (รวมรายการเข้า/ออกทั้งหมดของสินค้าชิ้นนั้น) */
export const fetchLocationBalances = async (filter: BalanceFilter): Promise<LocationBalance[]> => {
  let query = supabase
    .from("stock_location_allocations")
    .select("location_id, quantity, locations:location_id(code, name, zones:zone_id(code), warehouses:warehouse_id(code, name))");

  if (filter.equipmentId) query = query.eq("equipment_id", filter.equipmentId);
  else if (filter.mediaPlayerId) query = query.eq("media_player_id", filter.mediaPlayerId);
  else if (filter.toolId) query = query.eq("tool_id", filter.toolId);
  else return [];

  const { data, error } = await query;
  if (error) throw error;

  const map = new Map<string, LocationBalance>();
  (data || []).forEach((row: any) => {
    if (!row.location_id) return;
    const existing = map.get(row.location_id);
    if (existing) {
      existing.quantity += Number(row.quantity) || 0;
      return;
    }
    map.set(row.location_id, {
      locationId: row.location_id,
      quantity: Number(row.quantity) || 0,
      code: row.locations?.code || "-",
      name: row.locations?.name || "-",
      zoneCode: row.locations?.zones?.code ?? null,
      warehouseCode: row.locations?.warehouses?.code ?? null,
      warehouseName: row.locations?.warehouses?.name ?? null,
    });
  });

  return Array.from(map.values())
    .filter((b) => b.quantity !== 0)
    .sort((a, b) => b.quantity - a.quantity);
};

/** ตัดของออกจากช่องจัดเก็บ (บันทึกเป็นจำนวนติดลบ + คืนพื้นที่ให้ช่อง) */
export const deductLocationAllocations = async (params: SaveAllocationsParams) => {
  const allocs = params.allocations.filter((a) => a.locationId && Number(a.quantity) > 0);
  if (allocs.length === 0) return;

  const volumes = splitVolume(allocs, params.totalVolumeCm3 ?? null);

  const rows = allocs.map((a) => ({
    equipment_id: params.equipmentId || null,
    media_player_id: params.mediaPlayerId || null,
    tool_id: params.toolId || null,
    location_id: a.locationId,
    warehouse_id: params.warehouseId || null,
    quantity: -(Number(a.quantity) || 0),
    volume_cm3: volumes[a.locationId] ? -volumes[a.locationId] : null,
    reference_type: params.referenceType || null,
    reference_id: params.referenceId || null,
    reference_document: params.referenceDocument || null,
    notes: params.notes || null,
    created_by: params.createdBy || null,
  }));

  const { error } = await supabase.from("stock_location_allocations").insert(rows);
  if (error) throw error;

  for (const [locationId, vol] of Object.entries(volumes)) {
    if (!vol || vol <= 0) continue;
    const { data } = await supabase
      .from("locations")
      .select("used_volume_cm3")
      .eq("id", locationId)
      .single();
    await supabase
      .from("locations")
      .update({ used_volume_cm3: Math.max(0, (data?.used_volume_cm3 || 0) - vol) })
      .eq("id", locationId);
  }
};
