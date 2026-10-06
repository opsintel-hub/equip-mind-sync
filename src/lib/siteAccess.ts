export const SITE_ACCESS_STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending_assignment: { label: "รอคลังระบุจุดวาง", variant: "secondary" },
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
};

export const fmtDT = (s?: string | null) =>
  s ? new Date(s).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "-";
