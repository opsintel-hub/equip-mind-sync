export interface DepartmentScopedCompany {
  department_id?: string | null;
}

/** A company with no department is explicitly available to every department. */
export function companyIsAvailableToDepartments(
  company: DepartmentScopedCompany,
  departmentIds: readonly string[],
): boolean {
  return company.department_id == null || departmentIds.length === 0 || departmentIds.includes(company.department_id);
}

export function companyIsAvailableToDepartment(
  company: DepartmentScopedCompany,
  departmentId?: string | null,
): boolean {
  return companyIsAvailableToDepartments(company, departmentId ? [departmentId] : []);
}