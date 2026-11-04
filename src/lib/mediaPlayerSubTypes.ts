export const SEVEN_ELEVEN_DEPT_NAME = "7-Eleven Media";

export const SUB_MEDIA_TYPES = [
  "TOPSHELF_1",
  "TOPSHELF_2",
  "TOPSHELF_3",
  "SPECIAL_1",
  "SPECIAL_2",
  "OVERVAULT_1",
  "OVERVAULT_2",
  "OPENTYPE_1",
  "OPENTYPE_2",
] as const;

export type SubMediaType = string;

/** Live list loaded from Master Data (mp_sub_media_types); falls back to presets. */
let activeSubMediaTypes: string[] = [...SUB_MEDIA_TYPES];
export function setActiveSubMediaTypes(list: string[]) {
  activeSubMediaTypes = list;
}
export function getSubMediaTypes(): string[] {
  return activeSubMediaTypes;
}

export function requiresSubMediaType(department?: string | null): boolean {
  if (!department) return false;
  return department.trim().toLowerCase() === SEVEN_ELEVEN_DEPT_NAME.toLowerCase();
}

export function normalizeSubMediaType(
  department?: string | null,
  value?: string | null,
): SubMediaType | null {
  if (!requiresSubMediaType(department)) return null;
  if (!value) return null;
  const v = String(value).trim().toUpperCase();
  return activeSubMediaTypes.includes(v) ? v : null;
}

export function isValidSubMediaType(value: string): value is SubMediaType {
  return activeSubMediaTypes.includes(value);
}
