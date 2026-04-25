import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
}

interface TableInfo {
  name: string;
  row_count: number;
  columns: ColumnInfo[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authErr } = await userClient.auth.getClaims(token);
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub;

    // Verify super_admin
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden: super_admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch tables + columns via SQL
    const { data: tableRows, error: tErr } = await admin.rpc("exec_schema_query" as any, {}).then(
      (r) => r,
      () => ({ data: null, error: "rpc_missing" } as any),
    );

    // Fallback: query directly via PostgREST not available for information_schema.
    // Use a minimal approach: query each table for count and pull columns from a SQL function we'll create later.
    // Instead, we use the supabase-js admin client with .from on a custom view -- not present. 
    // So we use a service-role HTTP call to PostgREST against pg_catalog isn't possible either.
    // Workaround: build a single SQL via Postgres meta endpoint isn't available.
    // We'll use the `pg` schema via REST-bypass: call admin.rpc to a function we install.
    // For simplicity, create the function on the fly via migrations later. Here we assume RPC exists.

    if (tErr === "rpc_missing" || !tableRows) {
      return new Response(
        JSON.stringify({
          error: "schema_rpc_missing",
          message: "Database helper function get_public_schema_info is not installed yet.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ tables: tableRows as TableInfo[] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
