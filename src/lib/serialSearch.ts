export interface ReceivedSerialAliasRow {
  equipment_id?: string | null;
  media_player_id?: string | null;
  serial_number?: string | null;
  received_at?: string | null;
  created_at?: string | null;
}

function splitSerialParts(value: string): string[] {
  return value
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function mergeSerialValues(...groups: Array<string | string[] | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const group of groups) {
    if (!group) continue;

    const values = Array.isArray(group) ? group : splitSerialParts(group);

    values.forEach((value) => {
      const trimmed = value.trim();
      if (!trimmed) return;

      const key = trimmed.toLowerCase();
      if (seen.has(key)) return;

      seen.add(key);
      result.push(trimmed);
    });
  }

  return result;
}

export function formatMergedSerials(...groups: Array<string | string[] | null | undefined>): string {
  return mergeSerialValues(...groups).join(" / ");
}

export function matchesSerialSearch(searchTerm: string, ...groups: Array<string | string[] | null | undefined>): boolean {
  const normalizedTerm = searchTerm.trim().toLowerCase();
  if (!normalizedTerm) return true;

  return mergeSerialValues(...groups).some((serial) => serial.toLowerCase().includes(normalizedTerm));
}

export function buildReceivedSerialAliasMap(
  rows: ReceivedSerialAliasRow[],
  idKey: "equipment_id" | "media_player_id",
): Record<string, string[]> {
  const sorted = [...rows].sort((a, b) => {
    const aDate = new Date(a.received_at || a.created_at || 0).getTime();
    const bDate = new Date(b.received_at || b.created_at || 0).getTime();
    return bDate - aDate;
  });

  const map: Record<string, string[]> = {};

  sorted.forEach((row) => {
    const itemId = row[idKey];
    const serial = row.serial_number?.trim();

    if (!itemId || !serial) return;

    map[itemId] = mergeSerialValues(map[itemId], serial);
  });

  return map;
}
