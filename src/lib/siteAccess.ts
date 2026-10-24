export const SITE_ACCESS_STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending_assignment: { label: "รออนุมัติ", variant: "secondary" },
  approved: { label: "อนุมัติแล้ว รอเข้า", variant: "default" },
  checked_in: { label: "อยู่ในพื้นที่", variant: "default" },
  completed: { label: "ปิดตั๋วแล้ว", variant: "outline" },
  rejected: { label: "ไม่อนุมัติ", variant: "destructive" },
  cancelled: { label: "ยกเลิก", variant: "outline" },
};

export const SITE_ACCESS_PURPOSE: Record<string, string> = {
  bring_in: "นำของเข้า",
  take_out: "นำของออก",
  both: "นำเข้าและนำออก",
  inspect_parts: "ตรวจเช็คอะไหล่และอุปกรณ์",
  other: "อื่นๆ",
};

export const purposeLabel = (purpose?: string | null, other?: string | null) =>
  purpose === "other" ? `อื่นๆ: ${other || "-"}` : SITE_ACCESS_PURPOSE[purpose || ""] || purpose || "-";

export type LeadTier = "gt48" | "h24_48" | "h12_24" | "lt12";

export const LEAD_TIERS: Record<LeadTier, { label: string; className: string }> = {
  gt48: { label: "จองล่วงหน้ามากกว่า 48 ชม.", className: "bg-success/15 text-success border-success/40" },
  h24_48: { label: "จองล่วงหน้า 24-48 ชม.", className: "bg-warning/15 text-warning border-warning/40" },
  h12_24: { label: "จองล่วงหน้า 12-24 ชม.", className: "bg-orange-500/15 text-orange-600 border-orange-500/40" },
  lt12: { label: "จองล่วงหน้าน้อยกว่า 12 ชม.", className: "bg-destructive/15 text-destructive border-destructive/40" },
};

/** Hours between booking time and planned start. */
export const leadHours = (createdAt?: string | null, plannedStart?: string | null) => {
  if (!createdAt || !plannedStart) return null;
  return (new Date(plannedStart).getTime() - new Date(createdAt).getTime()) / 3_600_000;
};

/** >48 → gt48; 24 ≤ h ≤ 48 → h24_48; 12 ≤ h < 24 → h12_24; < 12 → lt12. */
export const leadTier = (hours: number | null): LeadTier | null => {
  if (hours === null || Number.isNaN(hours)) return null;
  if (hours > 48) return "gt48";
  if (hours >= 24) return "h24_48";
  if (hours >= 12) return "h12_24";
  return "lt12";
};

export const fmtLead = (hours: number | null) => {
  if (hours === null) return "-";
  const h = Math.max(0, hours);
  const d = Math.floor(h / 24), r = Math.floor(h % 24);
  return d ? `${d} วัน ${r} ชม.` : `${r} ชม. ${Math.floor((h * 60) % 60)} นาที`;
};

export const fmtDT = (s?: string | null) =>
  s ? new Date(s).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "-";
