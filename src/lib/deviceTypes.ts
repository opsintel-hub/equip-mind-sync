export const DEVICE_TYPES = ["MEDIA_PLAYER", "MONITOR"] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  MEDIA_PLAYER: "Media Player",
  MONITOR: "จอภาพ (Monitor)",
};

export const DEVICE_TYPE_SHORT: Record<DeviceType, string> = {
  MEDIA_PLAYER: "Media Player",
  MONITOR: "จอภาพ",
};

export function deviceLabel(t?: string | null): string {
  if (!t) return DEVICE_TYPE_SHORT.MEDIA_PLAYER;
  return DEVICE_TYPE_SHORT[(t as DeviceType)] ?? DEVICE_TYPE_SHORT.MEDIA_PLAYER;
}

export function isMonitor(t?: string | null): boolean {
  return (t || "").toUpperCase() === "MONITOR";
}

export function normalizeDeviceType(t?: string | null): DeviceType {
  const v = String(t || "").toUpperCase();
  return (DEVICE_TYPES as readonly string[]).includes(v) ? (v as DeviceType) : "MEDIA_PLAYER";
}
