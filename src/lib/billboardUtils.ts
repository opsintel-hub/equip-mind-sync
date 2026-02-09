/**
 * Format billboard label consistently across the system.
 * Order: Old Code → Location → Equipment ID
 */
export function formatBillboardLabel(
  oldCode?: string | null,
  locationName?: string | null,
  equipmentId?: string | null
): string {
  const parts: string[] = [];
  if (oldCode) parts.push(oldCode);
  if (locationName) parts.push(locationName);
  if (equipmentId && equipmentId !== oldCode) parts.push(equipmentId);
  return parts.join(" - ") || "-";
}
