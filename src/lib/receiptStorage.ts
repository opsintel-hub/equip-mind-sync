import { WarehouseDeptSource, warehouseDepts } from "./warehouseDepartments";

export function receiptStorageDefault(
  itemDepartment: string | null | undefined,
  location: { id: string; warehouse_id: string | null; is_active: boolean; warehouses: (WarehouseDeptSource & { is_active: boolean }) | null } | null,
  allowedDepartments: string[],
) {
  const empty = { department: allowedDepartments.includes(itemDepartment || "") ? itemDepartment || "" : "", warehouseId: "", locationId: "" };
  if (!location?.is_active || !location.warehouse_id || !location.warehouses?.is_active) return empty;
  const permitted = warehouseDepts(location.warehouses).filter(d => allowedDepartments.includes(d));
  const department = permitted.includes(itemDepartment || "") ? itemDepartment || "" : permitted[0];
  return department ? { department, warehouseId: location.warehouse_id, locationId: location.id } : empty;
}

export function transferReceiptQuantity(dispatched: number, received: number) {
  return Math.max(0, Number(dispatched || 0) - Number(received || 0));
}