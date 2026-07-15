import { supabase } from "@/integrations/supabase/client";

export type CompatibilityMode = "unrestricted" | "multi_partial" | "specific";

export interface CompatibilityBadgeProps {
  label: string;
  className: string;
  icon: string;
}

/** Read badge props for display (shared). */
export function getCompatibilityBadge(
  mode: string | null | undefined,
  count?: number
): CompatibilityBadgeProps {
  if (!mode || mode === "unrestricted") {
    return {
      label: "ทุกป้าย",
      className:
        "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
      icon: "🟢",
    };
  }
  if (mode === "multi_partial") {
    return {
      label: count != null ? `บางป้าย (${count})` : "บางป้าย",
      className:
        "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
      icon: "🟡",
    };
  }
  return {
    label: count != null ? `เฉพาะป้าย (${count})` : "เฉพาะป้าย",
    className:
      "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
    icon: "🔵",
  };
}

/** Fetch the equipment -> Set<billboard_id> map for compatibility. */
export async function fetchEquipmentCompatMap(): Promise<
  Record<string, Set<string>>
> {
  const { data, error } = await supabase
    .from("equipment_billboard_compatibility")
    .select("equipment_id, billboard_id");
  if (error) throw error;
  const map: Record<string, Set<string>> = {};
  (data || []).forEach((row: any) => {
    if (!map[row.equipment_id]) map[row.equipment_id] = new Set();
    map[row.equipment_id].add(row.billboard_id);
  });
  return map;
}

/** Fetch equipment modes only (id -> mode + notes) */
export async function fetchEquipmentCompatModes(): Promise<
  Record<string, { mode: string; notes: string | null }>
> {
  const { data, error } = await supabase
    .from("equipment")
    .select("id, billboard_compatibility_mode, compatibility_notes")
    .eq("is_active", true);
  if (error) throw error;
  const map: Record<string, { mode: string; notes: string | null }> = {};
  (data || []).forEach((r: any) => {
    map[r.id] = {
      mode: r.billboard_compatibility_mode || "unrestricted",
      notes: r.compatibility_notes || null,
    };
  });
  return map;
}

/**
 * Return equipment ids that are compatible with a specific billboard.
 * Rule: mode='unrestricted' OR billboard listed in equipment_billboard_compatibility.
 */
export async function getCompatibleEquipmentIdsForBillboard(
  billboardId: string
): Promise<Set<string>> {
  const [{ data: unrestricted }, { data: specific }] = await Promise.all([
    supabase
      .from("equipment")
      .select("id")
      .eq("is_active", true)
      .or("billboard_compatibility_mode.is.null,billboard_compatibility_mode.eq.unrestricted"),
    supabase
      .from("equipment_billboard_compatibility")
      .select("equipment_id")
      .eq("billboard_id", billboardId),
  ]);
  const s = new Set<string>();
  (unrestricted || []).forEach((r: any) => s.add(r.id));
  (specific || []).forEach((r: any) => s.add(r.equipment_id));
  return s;
}

/**
 * Return billboard ids that a given equipment supports.
 * Returns null when unrestricted (means "all billboards").
 */
export async function getCompatibleBillboardIdsForEquipment(
  equipmentId: string
): Promise<Set<string> | null> {
  const { data: eq } = await supabase
    .from("equipment")
    .select("billboard_compatibility_mode")
    .eq("id", equipmentId)
    .maybeSingle();
  const mode = (eq as any)?.billboard_compatibility_mode || "unrestricted";
  if (mode === "unrestricted") return null;
  const { data } = await supabase
    .from("equipment_billboard_compatibility")
    .select("billboard_id")
    .eq("equipment_id", equipmentId);
  const s = new Set<string>();
  (data || []).forEach((r: any) => s.add(r.billboard_id));
  return s;
}
