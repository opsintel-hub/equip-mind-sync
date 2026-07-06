import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type UserRole = Database["public"]["Enums"]["app_role"];

export interface PermissionPreset {
  id: string;
  template_key: string;
  label: string;
  description: string | null;
  icon: string | null;
  suggested_roles: UserRole[];
  suggested_functions: string[];
  default_dept_can_view: boolean;
  default_dept_can_create: boolean;
  default_dept_can_edit: boolean;
  default_dept_can_delete: boolean;
  display_order: number;
  is_quick_preset?: boolean | null;
}

/**
 * Load all active permission templates. Optionally filter to quick-preset only.
 */
export async function fetchPermissionPresets(quickOnly = false): Promise<PermissionPreset[]> {
  const { data, error } = await (supabase as any)
    .from("permission_templates")
    .select("*")
    .eq("is_active", true)
    .order("display_order");
  if (error) throw error;
  const rows = (data || []) as PermissionPreset[];
  return quickOnly ? rows.filter((r) => r.is_quick_preset !== false) : rows;
}

/**
 * Try to detect which preset the given user currently matches, by comparing
 * their roles + function permissions against every preset. Returns
 * template_key of the best match, or null.
 */
export function detectCurrentPresetKey(
  presets: PermissionPreset[],
  userRoles: UserRole[],
  userFunctions: string[],
): string | null {
  const roleSet = new Set(userRoles);
  const fnSet = new Set(userFunctions);
  for (const p of presets) {
    const pr = new Set(p.suggested_roles);
    const pf = new Set(p.suggested_functions);
    if (pr.size !== roleSet.size) continue;
    let rolesMatch = true;
    pr.forEach((r) => {
      if (!roleSet.has(r)) rolesMatch = false;
    });
    if (!rolesMatch) continue;
    if (pf.size !== fnSet.size) continue;
    let fnMatch = true;
    pf.forEach((f) => {
      if (!fnSet.has(f)) fnMatch = false;
    });
    if (!fnMatch) continue;
    return p.template_key;
  }
  return null;
}

/**
 * Apply a preset to a user: rewrites roles, function permissions, and
 * department scopes atomically-ish (best-effort; individual write errors
 * throw and surface to the caller).
 */
export async function applyPresetToUser(
  userId: string,
  preset: PermissionPreset,
  departments: string[],
): Promise<void> {
  // 1) roles via RPC
  const { error: roleErr } = await supabase.rpc("save_user_roles" as any, {
    _target_user_id: userId,
    _roles: preset.suggested_roles,
  });
  if (roleErr) throw roleErr;

  // 2) function permissions: replace
  const { error: delFnErr } = await supabase
    .from("user_function_permissions")
    .delete()
    .eq("user_id", userId);
  if (delFnErr) throw delFnErr;

  if (preset.suggested_functions.length > 0) {
    const { error: insFnErr } = await supabase
      .from("user_function_permissions")
      .insert(
        preset.suggested_functions.map((fn) => ({
          user_id: userId,
          function_name: fn,
          can_access: true,
        })),
      );
    if (insFnErr) throw insFnErr;
  }

  // 3) department permissions: replace
  const { error: delDeptErr } = await supabase
    .from("user_departments")
    .delete()
    .eq("user_id", userId);
  if (delDeptErr) throw delDeptErr;

  if (departments.length > 0) {
    const rows = departments.map((d) => ({
      user_id: userId,
      department: d,
      can_view: preset.default_dept_can_view,
      can_create: preset.default_dept_can_create,
      can_edit: preset.default_dept_can_edit,
      can_delete: preset.default_dept_can_delete,
    }));
    const { error: insDeptErr } = await supabase
      .from("user_departments")
      .insert(rows);
    if (insDeptErr) throw insDeptErr;
  }
}

/**
 * Short human summary of what a preset grants — for the preview line under
 * the dropdown.
 */
export function presetPermissionSummary(preset: PermissionPreset): string {
  const parts: string[] = [];
  if (preset.default_dept_can_view) parts.push("ดู");
  if (preset.default_dept_can_create) parts.push("สร้าง");
  if (preset.default_dept_can_edit) parts.push("แก้ไข");
  if (preset.default_dept_can_delete) parts.push("ลบ");
  return parts.length ? parts.join(" + ") : "ไม่มีสิทธิ์";
}
