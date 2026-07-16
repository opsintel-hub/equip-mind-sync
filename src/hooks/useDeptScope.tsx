import { useDepartmentPermissions } from "./useDepartmentPermissions";

/**
 * Central hook for scoping table queries by department.
 * - Super Admin: unrestricted (returns null lists => no filter)
 * - Everyone else: restricted to their viewable departments
 *
 * Usage:
 *   const { isSuperAdmin, viewableDepts, deptKey, applyDeptFilter } = useDeptScope();
 *   let q = supabase.from("equipment").select("*");
 *   q = applyDeptFilter(q, "department");
 */
export function useDeptScope() {
  const { isSuperAdmin, getViewableDepartments, loading } = useDepartmentPermissions();
  const viewableDepts = isSuperAdmin ? null : getViewableDepartments();

  // Stable cache key: super admin -> "*", empty -> "__none__", otherwise sorted list
  const deptKey = isSuperAdmin
    ? "*"
    : (viewableDepts && viewableDepts.length > 0
        ? [...viewableDepts].sort().join("|")
        : "__none__");

  /**
   * Apply .in("<column>", viewableDepts) unless super admin.
   * If the user has 0 viewable depts, we force an impossible filter so no rows leak.
   */
  const applyDeptFilter = <Q extends { in: (col: any, vals: any[]) => Q; eq?: any }>(
    query: Q,
    column: string = "department",
  ): Q => {
    if (isSuperAdmin) return query;
    const depts = viewableDepts || [];
    if (depts.length === 0) {
      // No permissions -> impossible filter so query returns nothing
      return query.in(column as any, ["__no_dept_permission__"]);
    }
    return query.in(column as any, depts);
  };

  /** Client-side filter for arrays already fetched. */
  const filterByDept = <T extends { department?: string | null }>(rows: T[]): T[] => {
    if (isSuperAdmin) return rows;
    const depts = new Set(viewableDepts || []);
    return rows.filter((r) => r.department && depts.has(r.department));
  };

  return {
    isSuperAdmin,
    viewableDepts,
    deptKey,
    loading,
    applyDeptFilter,
    filterByDept,
  };
}
