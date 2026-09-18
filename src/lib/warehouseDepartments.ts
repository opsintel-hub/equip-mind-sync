/** ฝ่ายที่ใช้คลังร่วมกัน — รองรับข้อมูลเดิมที่เก็บฝ่ายเดียวในคอลัมน์ department */
export interface WarehouseDeptSource {
  department?: string | null;
  departments?: string[] | null;
}

export function warehouseDepts(w: WarehouseDeptSource | null | undefined): string[] {
  if (!w) return [];
  const list = (w.departments || []).filter((d) => !!d && d.trim() !== "");
  if (list.length > 0) return list;
  return w.department && w.department.trim() !== "" ? [w.department] : [];
}

export function warehouseHasDept(w: WarehouseDeptSource, dept: string): boolean {
  if (!dept) return true;
  return warehouseDepts(w).includes(dept);
}

export function warehouseDeptLabel(w: WarehouseDeptSource): string {
  const list = warehouseDepts(w);
  return list.length > 0 ? list.join(", ") : "-";
}
