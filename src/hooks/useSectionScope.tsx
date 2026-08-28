import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useDepartmentPermissions } from "./useDepartmentPermissions";

export type SectionScopeType =
  | "equipment_category"
  | "equipment_subcategory"
  | "tool_category"
  | "tool_subcategory"
  | "mp_device_type";

export interface SectionScopeRow {
  section_id: string;
  scope_type: SectionScopeType;
  ref_id: string | null;
  ref_text: string | null;
}

/**
 * Section-level (แผนก) scoping on top of department (ฝ่าย) scoping.
 *
 * - Super Admin: unrestricted.
 * - User with no section assignment: unrestricted at section level (legacy behaviour).
 * - Otherwise: only items whose category/subcategory/device type is covered by
 *   one of the user's sections are visible.
 */
export function useSectionScope() {
  const { user } = useAuth();
  const { isSuperAdmin, loading: permLoading } = useDepartmentPermissions();

  const { data, isLoading } = useQuery({
    queryKey: ["user-section-scope", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [secRes, scopeRes] = await Promise.all([
        supabase.from("user_sections" as any).select("section_id, can_view").eq("user_id", user!.id),
        supabase.rpc("get_user_section_scopes" as any, { _user_id: user!.id }),
      ]);
      if (secRes.error) throw secRes.error;
      if (scopeRes.error) throw scopeRes.error;
      const sectionIds = ((secRes.data || []) as any[])
        .filter((r) => r.can_view)
        .map((r) => r.section_id as string);
      return { sectionIds, scopes: (scopeRes.data || []) as unknown as SectionScopeRow[] };
    },
  });

  const sectionIds = data?.sectionIds || [];
  const scopes = data?.scopes || [];
  const loading = permLoading || (!!user?.id && isLoading);

  const pick = (t: SectionScopeType, field: "ref_id" | "ref_text") =>
    scopes.filter((s) => s.scope_type === t).map((s) => s[field]).filter(Boolean) as string[];

  const equipmentCategories = pick("equipment_category", "ref_text");
  const equipmentSubcategoryIds = pick("equipment_subcategory", "ref_id");
  const toolCategoryIds = pick("tool_category", "ref_id");
  const toolSubcategoryIds = pick("tool_subcategory", "ref_id");
  const deviceTypes = pick("mp_device_type", "ref_text");

  /** true => no section restriction applies to this user */
  const unrestricted = isSuperAdmin || sectionIds.length === 0 || scopes.length === 0;

  const scopeKey = unrestricted
    ? "*"
    : [
        equipmentCategories.join(","),
        equipmentSubcategoryIds.join(","),
        toolCategoryIds.join(","),
        toolSubcategoryIds.join(","),
        deviceTypes.join(","),
      ].join("|");

  const applyEquipmentScope = <Q extends { in: (col: any, vals: any[]) => Q; or?: any }>(query: Q): Q => {
    if (unrestricted) return query;
    if (equipmentCategories.length === 0 && equipmentSubcategoryIds.length === 0) {
      return query.in("id" as any, ["00000000-0000-0000-0000-000000000000"]);
    }
    if (equipmentSubcategoryIds.length === 0) return query.in("category" as any, equipmentCategories);
    if (equipmentCategories.length === 0) return query.in("subcategory_id" as any, equipmentSubcategoryIds);
    const orExpr = `category.in.(${equipmentCategories
      .map((c) => `"${c.replace(/"/g, '\\"')}"`)
      .join(",")}),subcategory_id.in.(${equipmentSubcategoryIds.join(",")})`;
    return (query as any).or(orExpr) as Q;
  };

  const applyToolScope = <Q extends { in: (col: any, vals: any[]) => Q; or?: any }>(query: Q): Q => {
    if (unrestricted) return query;
    if (toolCategoryIds.length === 0 && toolSubcategoryIds.length === 0) {
      return query.in("id" as any, ["00000000-0000-0000-0000-000000000000"]);
    }
    if (toolSubcategoryIds.length === 0) return query.in("tool_category_id" as any, toolCategoryIds);
    if (toolCategoryIds.length === 0) return query.in("tool_subcategory_id" as any, toolSubcategoryIds);
    return (query as any).or(
      `tool_category_id.in.(${toolCategoryIds.join(",")}),tool_subcategory_id.in.(${toolSubcategoryIds.join(",")})`,
    ) as Q;
  };

  const applyMediaPlayerScope = <Q extends { in: (col: any, vals: any[]) => Q }>(query: Q): Q => {
    if (unrestricted) return query;
    if (deviceTypes.length === 0) return query.in("id" as any, ["00000000-0000-0000-0000-000000000000"]);
    return query.in("device_type" as any, deviceTypes);
  };

  /** Client-side filters for rows already fetched. */
  const matchEquipment = (row: { category?: string | null; subcategory_id?: string | null }): boolean => {
    if (unrestricted) return true;
    if (row.category && equipmentCategories.includes(row.category)) return true;
    if (row.subcategory_id && equipmentSubcategoryIds.includes(row.subcategory_id)) return true;
    return false;
  };

  const matchTool = (row: { tool_category_id?: string | null; tool_subcategory_id?: string | null }): boolean => {
    if (unrestricted) return true;
    if (row.tool_category_id && toolCategoryIds.includes(row.tool_category_id)) return true;
    if (row.tool_subcategory_id && toolSubcategoryIds.includes(row.tool_subcategory_id)) return true;
    return false;
  };

  const matchMediaPlayer = (row: { device_type?: string | null }): boolean => {
    if (unrestricted) return true;
    return !!row.device_type && deviceTypes.includes(row.device_type);
  };

  return {
    loading,
    isSuperAdmin,
    unrestricted,
    sectionIds,
    scopes,
    equipmentCategories,
    equipmentSubcategoryIds,
    toolCategoryIds,
    toolSubcategoryIds,
    deviceTypes,
    scopeKey,
    applyEquipmentScope,
    applyToolScope,
    applyMediaPlayerScope,
    matchEquipment,
    matchTool,
    matchMediaPlayer,
  };
}
