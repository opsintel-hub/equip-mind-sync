export interface PurposeScope {
  allowed_department_ids?: string[] | null;
  allowed_section_ids?: string[] | null;
}

/**
 * Whether a requester (department + optional section) may use an issue purpose.
 * - No departments selected => everyone.
 * - Department must be selected.
 * - If any selected sections belong to that department, the requester's section must be one of them;
 *   otherwise the whole department is allowed.
 */
export function purposeAllowedFor(
  purpose: PurposeScope,
  departmentId: string | null | undefined,
  sectionId: string | null | undefined,
  sectionDepartment: Record<string, string>,
  bypass = false,
): boolean {
  if (bypass) return true;
  const depts = purpose.allowed_department_ids || [];
  if (depts.length === 0) return true;
  if (!departmentId || !depts.includes(departmentId)) return false;
  const sectionsInDept = (purpose.allowed_section_ids || []).filter((s) => sectionDepartment[s] === departmentId);
  if (sectionsInDept.length === 0) return true;
  return !!sectionId && sectionsInDept.includes(sectionId);
}
