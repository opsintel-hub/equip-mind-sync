export interface GrantedFunction {
  function_name: string;
  can_access: boolean;
}

/** Delegated access is explicit, even for department administrators. */
export function canAccessFunction(
  functionName: string,
  permissions: GrantedFunction[],
  isAdmin: boolean,
  isSuperAdmin: boolean,
  superAdminOnly: readonly string[],
): boolean {
  if (isSuperAdmin) return true;
  if (superAdminOnly.includes(functionName)) return false;
  if (functionName === "site_access_manage") {
    return permissions.some(p => p.function_name === functionName && p.can_access);
  }
  if (isAdmin) return true;
  return permissions.some(p => p.function_name === functionName && p.can_access);
}