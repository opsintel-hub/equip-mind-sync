// Edge Function: sync-billboards-mssql
// Endpoints: /test-connection, /preview, /sync
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import sql from "npm:mssql@11.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ConnectionConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  table: string;
}

async function connectMssql(cfg: ConnectionConfig) {
  const client = new Client({
    user: cfg.username,
    password: cfg.password,
    server: cfg.host,
    port: cfg.port,
    database: cfg.database,
    options: { encrypt: false, trustServerCertificate: true },
  });
  await client.connect();
  return client;
}

async function getAuthUser(req: Request) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Verify super_admin role using service role client
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: roles } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const isSuperAdmin = (roles || []).some((r: any) => r.role === "super_admin");
  if (!isSuperAdmin) throw new Error("Forbidden: super_admin only");

  return { user, adminClient };
}

function parseConfig(body: any): ConnectionConfig {
  const password = body.password ||
    Deno.env.get("MSSQL_BILLBOARD_PASSWORD") || "";
  return {
    host: body.host || "magicticket.magicsigncloud.com",
    port: Number(body.port) || 1433,
    database: body.database || "planb",
    username: body.username || "planb_viewer",
    password,
    table: body.table || "Asset",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    const { user, adminClient } = await getAuthUser(req);
    const cfg = parseConfig(body);

    // ----- TEST CONNECTION -----
    if (path === "test-connection") {
      const client = await connectMssql(cfg);
      try {
        const result = await client.queryObject(
          `SELECT COUNT(*) AS total FROM [${cfg.table}]`,
        );
        const total = (result.rows[0] as any)?.total ?? 0;

        // Get column list (first row)
        const sampleResult = await client.queryObject(
          `SELECT TOP 1 * FROM [${cfg.table}]`,
        );
        const columns = sampleResult.rows.length > 0
          ? Object.keys(sampleResult.rows[0] as any)
          : [];

        return new Response(
          JSON.stringify({
            success: true,
            total_rows: total,
            columns,
            message: `เชื่อมต่อสำเร็จ พบ ${total} แถวในตาราง ${cfg.table}`,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      } finally {
        await client.close();
      }
    }

    // ----- PREVIEW -----
    if (path === "preview") {
      const client = await connectMssql(cfg);
      try {
        const result = await client.queryObject(
          `SELECT TOP 10 * FROM [${cfg.table}]`,
        );
        return new Response(
          JSON.stringify({
            success: true,
            rows: result.rows,
            columns: result.rows.length > 0
              ? Object.keys(result.rows[0] as any)
              : [],
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      } finally {
        await client.close();
      }
    }

    // ----- SYNC -----
    if (path === "sync") {
      const connectionId = body.connection_id;

      // Create log entry
      const { data: logRow } = await adminClient
        .from("billboard_sync_logs")
        .insert({
          connection_id: connectionId,
          triggered_by: user.id,
          trigger_type: body.trigger_type || "manual",
          status: "running",
        })
        .select()
        .single();

      const client = await connectMssql(cfg);
      let inserted = 0, updated = 0, skipped = 0, failed = 0, fetched = 0;
      const errors: string[] = [];

      try {
        const result = await client.queryObject(
          `SELECT * FROM [${cfg.table}]`,
        );
        const rows = result.rows as any[];
        fetched = rows.length;

        // Smart Match field mapping (default)
        const overwriteFields = [
          "region",
          "district",
          "territory",
          "media_type",
          "location_name",
          "media_class",
          "media_segment",
          "size",
          "bkk_upc",
        ];

        for (const row of rows) {
          try {
            // Match by old_code (primary identifier)
            const oldCode = row.OldCode || row.old_code || row.AssetCode ||
              row.Code;
            if (!oldCode) {
              skipped++;
              continue;
            }

            const equipmentId = row.AssetID || row.EquipmentID ||
              row.equipment_id || oldCode;

            // Build mapped object
            const mapped: any = {
              equipment_id: String(equipmentId),
              old_code: String(oldCode),
              region: row.Region ?? null,
              district: row.District ?? null,
              territory: row.Territory ?? null,
              media_type: row.MediaType ?? row.Media_Type ?? null,
              location_name: row.LocationName ?? row.Location ?? null,
              media_class: row.MediaClass ?? null,
              media_segment: row.MediaSegment ?? null,
              size: row.Size ?? null,
              bkk_upc: row.BKK_UPC ?? row.UPC ?? null,
              department: row.Department ?? null,
            };

            // Find existing
            const { data: existing } = await adminClient
              .from("billboards")
              .select("id")
              .eq("old_code", String(oldCode))
              .maybeSingle();

            if (existing) {
              // Update only authoritative fields
              const updateObj: any = {};
              for (const f of overwriteFields) {
                if (mapped[f] !== null && mapped[f] !== undefined) {
                  updateObj[f] = mapped[f];
                }
              }
              if (Object.keys(updateObj).length > 0) {
                const { error } = await adminClient
                  .from("billboards")
                  .update(updateObj)
                  .eq("id", existing.id);
                if (error) throw error;
                updated++;
              } else {
                skipped++;
              }
            } else {
              // Insert new
              const { error } = await adminClient
                .from("billboards")
                .insert({ ...mapped, status: "active" });
              if (error) throw error;
              inserted++;
            }
          } catch (e: any) {
            failed++;
            if (errors.length < 20) errors.push(e.message);
          }
        }

        // Update log
        await adminClient
          .from("billboard_sync_logs")
          .update({
            status: "completed",
            rows_fetched: fetched,
            rows_inserted: inserted,
            rows_updated: updated,
            rows_skipped: skipped,
            rows_failed: failed,
            details: errors.length > 0 ? { errors } : null,
            completed_at: new Date().toISOString(),
          })
          .eq("id", logRow!.id);

        // Update connection last sync
        if (connectionId) {
          await adminClient
            .from("external_db_connections")
            .update({
              last_sync_at: new Date().toISOString(),
              last_sync_status: "success",
            })
            .eq("id", connectionId);
        }

        return new Response(
          JSON.stringify({
            success: true,
            rows_fetched: fetched,
            rows_inserted: inserted,
            rows_updated: updated,
            rows_skipped: skipped,
            rows_failed: failed,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } catch (err: any) {
        await adminClient
          .from("billboard_sync_logs")
          .update({
            status: "failed",
            error_message: err.message,
            rows_fetched: fetched,
            rows_inserted: inserted,
            rows_updated: updated,
            rows_skipped: skipped,
            rows_failed: failed,
            completed_at: new Date().toISOString(),
          })
          .eq("id", logRow!.id);
        throw err;
      } finally {
        await client.close();
      }
    }

    return new Response(
      JSON.stringify({ error: "Unknown endpoint" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    console.error("sync-billboards-mssql error:", err);
    return new Response(
      JSON.stringify({ error: err.message || String(err) }),
      {
        status: err.message?.includes("Unauthorized")
          ? 401
          : err.message?.includes("Forbidden")
          ? 403
          : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
