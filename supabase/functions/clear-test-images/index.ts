import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IMAGE_TARGETS = [
  { bucket: "equipment-images", table: "equipment_images" },
  { bucket: "media-player-images", table: "media_player_images" },
  { bucket: "tool-images", table: "tool_images" },
] as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function listAllFiles(
  client: ReturnType<typeof createClient>,
  bucket: string,
  prefix = "",
): Promise<string[]> {
  const files: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await client.storage.from(bucket).list(prefix, {
      limit: 1000,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id) files.push(path);
      else files.push(...await listAllFiles(client, bucket, path));
    }

    if (data.length < 1000) break;
    offset += data.length;
  }

  return files;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { data: role, error: roleError } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();
    if (roleError) throw roleError;
    if (!role) return json({ error: "Super Admin only" }, 403);

    const deleted: Record<string, number> = {};

    for (const target of IMAGE_TARGETS) {
      const paths = await listAllFiles(admin, target.bucket);
      for (let i = 0; i < paths.length; i += 100) {
        const batch = paths.slice(i, i + 100);
        const { error } = await admin.storage.from(target.bucket).remove(batch);
        if (error) throw new Error(`${target.bucket}: ${error.message}`);
      }

      const { count, error: countError } = await admin
        .from(target.table)
        .select("id", { count: "exact", head: true });
      if (countError) throw countError;

      const { error: deleteError } = await admin
        .from(target.table)
        .delete()
        .not("id", "is", null);
      if (deleteError) throw deleteError;

      deleted[target.table] = count || 0;
      deleted[`${target.bucket}_files`] = paths.length;
    }

    return json({ success: true, deleted });
  } catch (error) {
    console.error("clear-test-images failed", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});