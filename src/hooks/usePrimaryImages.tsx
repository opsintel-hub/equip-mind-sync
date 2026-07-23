import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type ImgTable = "tool_images" | "media_player_images" | "equipment_images";
type FkColumn = "tool_id" | "media_player_id" | "equipment_id";

interface Options {
  /** if true, treat image_url as a storage path in `bucket` and create signed URLs */
  bucket?: string;
}

/**
 * Batch-load "primary" image URL for a list of entity IDs.
 * Returns Map<entityId, url>. Prefers is_primary, falls back to first by display_order.
 * Uses signed URLs when `bucket` is provided.
 */
export function usePrimaryImages(
  table: ImgTable,
  fk: FkColumn,
  ids: string[],
  options: Options = {},
) {
  const [map, setMap] = useState<Record<string, string>>({});
  const key = ids.slice().sort().join(",");

  useEffect(() => {
    let cancelled = false;
    if (!ids.length) { setMap({}); return; }

    (async () => {
      const { data, error } = await supabase
        .from(table as any)
        .select(`${fk}, image_url, is_primary, display_order`)
        .in(fk, ids)
        .order("is_primary", { ascending: false })
        .order("display_order", { ascending: true });
      if (error || !data) return;

      // pick first row per entity (already sorted)
      const picks: Record<string, string> = {};
      for (const row of data as any[]) {
        const eid = row[fk];
        if (!picks[eid]) picks[eid] = row.image_url;
      }

      if (options.bucket) {
        const paths = Object.values(picks);
        if (paths.length) {
          const { data: signed } = await supabase.storage
            .from(options.bucket)
            .createSignedUrls(paths, 60 * 60 * 4);
          const byPath = new Map<string, string>();
          (signed || []).forEach((s) => byPath.set(s.path ?? "", s.signedUrl ?? ""));
          const out: Record<string, string> = {};
          for (const [eid, p] of Object.entries(picks)) {
            const u = byPath.get(p);
            if (u) out[eid] = u;
          }
          if (!cancelled) setMap(out);
        } else if (!cancelled) {
          setMap({});
        }
      } else if (!cancelled) {
        setMap(picks);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, fk, key, options.bucket]);

  return map;
}

/** Set one image row as primary, unset siblings. */
export async function setPrimaryImage(
  table: ImgTable,
  fk: FkColumn,
  entityId: string,
  imageId: string,
) {
  await supabase.from(table as any).update({ is_primary: false }).eq(fk, entityId);
  const { error } = await supabase.from(table as any).update({ is_primary: true }).eq("id", imageId);
  if (error) throw error;
}
