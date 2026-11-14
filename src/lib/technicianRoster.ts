export interface RosterRow { code?: string; name: string; department: string; phone?: string; notes?: string; is_active?: boolean }
export const normalizeRosterName = (value: unknown) => String(value ?? "").trim().replace(/\s+/g, " ");
export function parseRoster(rows: Record<string, unknown>[], departments: string[]): RosterRow[] {
  const seen = new Set<string>();
  return rows.map((r, i) => {
    const name = normalizeRosterName(r["ชื่อ-นามสกุล"] ?? r["Full Name"] ?? [r["First Name"], r["Last Name"]].filter(Boolean).join(" "));
    const department = normalizeRosterName(r["ฝ่าย"] ?? r.Department);
    if (!name || !departments.includes(department)) throw new Error(`แถว ${i + 2}: ชื่อว่างหรือฝ่ายอยู่นอกสิทธิ์ (${department})`);
    const code = normalizeRosterName(r["รหัสช่าง"]);
    const key = `${department}|${name.toLocaleLowerCase()}`;
    if (seen.has(key) || (code && seen.has(`code:${code}`))) throw new Error(`แถว ${i + 2}: รายชื่อหรือรหัสซ้ำในไฟล์`);
    seen.add(key); if (code) seen.add(`code:${code}`);
    const result: RosterRow = { name, department, ...(code ? { code } : {}) };
    if ("เบอร์โทร" in r) result.phone = normalizeRosterName(r["เบอร์โทร"]);
    if ("หมายเหตุ" in r) result.notes = normalizeRosterName(r["หมายเหตุ"]);
    const status = normalizeRosterName(r["สถานะ"]);
    if (status) {
      if (!["ใช้งาน", "ปิดใช้งาน"].includes(status)) throw new Error(`แถว ${i + 2}: สถานะไม่ถูกต้อง`);
      result.is_active = status === "ใช้งาน";
    }
    return result;
  });
}
export function rosterDepartments(isSuperAdmin: boolean, all: string[], permissions: {department: string; can_view: boolean; can_create: boolean; can_edit: boolean}[], action: "view" | "create" | "edit") {
  return isSuperAdmin ? all : permissions.filter(p => p[`can_${action}`]).map(p => p.department);
}