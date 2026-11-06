import { warehouseHasDept, type WarehouseDeptSource } from "./warehouseDepartments";

/** An empty selection means all departments within the caller's existing permission scope. */
export function inventoryWarehouseMatchesDepartments(warehouse: WarehouseDeptSource, departments: readonly string[]): boolean {
  return departments.length === 0 || departments.some(department => warehouseHasDept(warehouse, department));
}