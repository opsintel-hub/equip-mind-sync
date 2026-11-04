/**
 * Pure helpers for the department filter dropdown.
 *
 * Normalisation keeps Thai letters/marks and digits, but drops spaces and
 * punctuation so "7 eleven", "7-eleven" and "7eleven" all find
 * "Operation 7-Eleven". Matching is case-insensitive.
 */
export function normalizeDepartmentSearch(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{M}\p{N}]/gu, "");
}

/** Departments whose normalised label contains the normalised query. */
export function filterDepartmentOptions(departments: string[], query: string): string[] {
  const q = normalizeDepartmentSearch(query);
  if (!q) return departments;
  return departments.filter(dept => normalizeDepartmentSearch(dept).includes(q));
}
