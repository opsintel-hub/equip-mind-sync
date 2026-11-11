export function bangkokInputToISO(value: string): string {
  const date = new Date(`${value}:00+07:00`);
  if (!Number.isFinite(date.getTime())) throw new Error("วันเวลาไม่ถูกต้อง");
  return date.toISOString();
}
export function inTestWindow(now: string, start: string, end: string): boolean {
  return Date.parse(now) >= Date.parse(start) && Date.parse(now) < Date.parse(end);
}
export function parseTicketCodes(value: string): string[] {
  return [...new Set(value.split(/\s+/).map(v => v.trim()).filter(Boolean))];
}