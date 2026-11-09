import { billboardLeft, lineLeft, returnOutstanding, type IssueQuantities } from "./issueQuantities";
import { matchesSerialSearch } from "./serialSearch";

export const AGING_BUCKETS = [
  { value: "today", label: "วันนี้ (0 วัน)" },
  { value: "1-2", label: "1–2 วัน" }, { value: "3-5", label: "3–5 วัน" },
  { value: "6-10", label: "6–10 วัน" }, { value: "11-15", label: "11–15 วัน" },
  { value: "16-30", label: "16–30 วัน" }, { value: ">30", label: ">30 วัน" },
  { value: "unknown", label: "ไม่ทราบวันที่จ่าย" },
];
export const PROBLEM_TYPES = [
  { value: "billboard", label: "รอระบุป้าย" }, { value: "return", label: "รอส่งคืน" },
  { value: "warehouse", label: "รอเข้าคลัง" }, { value: "usage", label: "สินค้ารอใช้งาน" },
  { value: "media_player", label: "มี Media Player ค้าง" },
];
export interface FollowUpFilters {
  departments: string[]; purposes: string[]; ages: string[]; problems: string[];
  serial: string; search: string;
}
export const emptyFollowUpFilters = (): FollowUpFilters => ({ departments: [], purposes: [], ages: [], problems: [], serial: "", search: "" });
export interface FollowUpRow {
  id: string; documentId: string; documentNo: string; department: string; person: string;
  purpose: string; issuedAt: string | null; days: number | null; bucket: string;
  code: string; name: string; serial: string; aliases?: string[]; unit: string; isMediaPlayer: boolean;
  billboardQty: number; returnQty: number; usageQty: number; receiptQty: number;
  receiptKind?: "good" | "defective" | "transfer";
}
export interface FollowUpDepartments {
  equipment: Record<string, string | null>;
  mediaPlayers: Record<string, string | null>;
  /** equipment_id -> is_consumable; consumables close at issue, never tracked. */
  consumables: Record<string, boolean>;
}
/** Presentation ownership only: never use this to authorize writes or change document identity. */
export function followUpDepartment(line: { equipment_id?: string | null; media_player_id?: string | null }, requester: string | null | undefined, owners: FollowUpDepartments): string {
  const owner = line.media_player_id ? owners.mediaPlayers[line.media_player_id] : line.equipment_id ? owners.equipment[line.equipment_id] : null;
  return owner?.trim() || requester?.trim() || "ไม่ระบุฝ่าย";
}
/** Bangkok calendar days; never substitute creation date for missing issue date. */
export function issueAge(issuedAt: string | null | undefined, now = new Date()): number | null {
  if (!issuedAt || !Number.isFinite(new Date(issuedAt).getTime())) return null;
  const day = (date: Date) => Math.floor((date.getTime() + 7 * 60 * 60 * 1000) / 86400000);
  return Math.max(0, day(now) - day(new Date(issuedAt)));
}
export function agingBucket(days: number | null): string {
  if (days === null) return "unknown";
  if (days === 0) return "today";
  if (days <= 2) return "1-2";
  if (days <= 5) return "3-5";
  if (days <= 10) return "6-10";
  if (days <= 15) return "11-15";
  if (days <= 30) return "16-30";
  return ">30";
}
export function followUpQuantities(line: IssueQuantities & { needs_return?: boolean | null }, purpose?: { requires_billboard: boolean; requires_return: boolean } | null, isConsumable = false) {
  // วัสดุสิ้นเปลืองจบตั้งแต่จ่ายของเสมอ ไม่ต้องระบุป้าย ไม่รอคืน ไม่ค้างใช้งาน ไม่ว่าวัตถุประสงค์จะกำหนดไว้เช่นไร
  if (isConsumable) return { billboardQty: 0, returnQty: 0, usageQty: 0, receiptQty: 0 };
  return {
    billboardQty: purpose?.requires_billboard ? billboardLeft(line) : 0,
    returnQty: purpose?.requires_return && line.needs_return !== false ? returnOutstanding(line, purpose.requires_billboard) : 0,
    // วัตถุประสงค์ที่ไม่ต้องระบุป้ายและไม่ต้องส่งคืนถือว่าจบตั้งแต่จ่ายของ ไม่นับเป็นของค้างใช้งาน
    usageQty: purpose && !purpose.requires_billboard && !purpose.requires_return ? 0 : lineLeft(line), receiptQty: 0,
  };
}
export function matchesFollowUp(row: FollowUpRow, filters: FollowUpFilters): boolean {
  const term = filters.search.trim().toLowerCase();
  return (!filters.departments.length || filters.departments.includes(row.department)) &&
    (!filters.purposes.length || filters.purposes.includes(row.purpose)) &&
    (!filters.ages.length || filters.ages.includes(row.bucket)) &&
    (!filters.problems.length || filters.problems.some(p =>
      p === "billboard" ? row.billboardQty > 0 : p === "return" ? row.returnQty > 0 :
      p === "warehouse" ? row.receiptQty > 0 : p === "usage" ? row.usageQty > 0 : row.isMediaPlayer)) &&
    matchesSerialSearch(filters.serial, row.serial, row.aliases) &&
    (!term || [row.documentNo, row.department, row.person, row.purpose, row.code, row.name].some(v => v.toLowerCase().includes(term)));
}
/** A single issued line may have multiple obligations; never add those balances together. */
export const uniqueOutstanding = (row: FollowUpRow) => row.receiptQty || Math.max(row.billboardQty, row.returnQty, row.usageQty);
export function quantityByUnit(rows: FollowUpRow[], field?: "billboardQty" | "returnQty" | "usageQty" | "receiptQty") {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const qty = field ? row[field] : uniqueOutstanding(row);
    if (qty > 0) totals.set(row.unit, (totals.get(row.unit) || 0) + qty);
  }
  return [...totals].map(([unit, qty]) => `${qty.toLocaleString("th-TH")} ${unit}`).join(" · ") || "—";
}
export function summarizeFollowUp(rows: FollowUpRow[]) {
  return { documents: new Set(rows.map(r => r.documentId)).size, lines: rows.length,
    criticalDocuments: new Set(rows.filter(r => r.bucket === ">30").map(r => r.documentId)).size,
    oldest: Math.max(0, ...rows.map(r => r.days || 0)),
    buckets: Object.fromEntries(AGING_BUCKETS.map(b => [b.value, new Set(rows.filter(r => r.bucket === b.value).map(r => r.documentId)).size])),
  };
}