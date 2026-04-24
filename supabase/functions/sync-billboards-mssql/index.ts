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
  const pool = await sql.connect({
    user: cfg.username,
    password: cfg.password,
    server: cfg.host,
    port: cfg.port,
    database: cfg.database,
    options: { encrypt: false, trustServerCertificate: true },
    connectionTimeout: 15000,
    requestTimeout: 60000,
  });
  return pool;
}

async function runQuery(pool: any, query: string): Promise<any[]> {
  const result = await pool.request().query(query);
  return result.recordset || [];
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
      const pool = await connectMssql(cfg);
      try {
        const totalRows = await runQuery(
          pool,
          `SELECT COUNT(*) AS total FROM [${cfg.table}]`,
        );
        const total = (totalRows[0] as any)?.total ?? 0;

        const sampleRows = await runQuery(
          pool,
          `SELECT TOP 1 * FROM [${cfg.table}]`,
        );
        const columns = sampleRows.length > 0
          ? Object.keys(sampleRows[0] as any)
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
        await pool.close();
      }
    }

    // ----- PREVIEW -----
    if (path === "preview") {
      const pool = await connectMssql(cfg);
      try {
        const rows = await runQuery(
          pool,
          `SELECT TOP 10 * FROM [${cfg.table}]`,
        );
        return new Response(
          JSON.stringify({
            success: true,
            rows,
            columns: rows.length > 0 ? Object.keys(rows[0] as any) : [],
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      } finally {
        await pool.close();
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

      const pool = await connectMssql(cfg);
      let inserted = 0, updated = 0, skipped = 0, failed = 0, fetched = 0;
      const errors: string[] = [];

      try {
        const rows = await runQuery(pool, `SELECT * FROM [${cfg.table}]`);
        fetched = rows.length;

        // Build mapped rows — OldCode is the PRIMARY match key
        const mappedRows: any[] = [];
        for (const row of rows) {
          const oldCode = row.OldCode || row.old_code || row.AssetCode || row.Code;
          if (!oldCode || String(oldCode).trim() === "") {
            skipped++;
            continue;
          }

          const equipmentId = row.AssetID || row.EquipmentID || row.equipment_id || oldCode;
          mappedRows.push({
            equipment_id: String(equipmentId).trim(),
            old_code: String(oldCode).trim(),
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
            status: "active",
          });
        }

        // Dedupe by old_code (keep the last row from source)
        const dedupMap = new Map<string, any>();
        for (const r of mappedRows) {
          if (dedupMap.has(r.old_code)) skipped++;
          dedupMap.set(r.old_code, r);
        }
        const finalRows = Array.from(dedupMap.values());

        // Fetch existing rows by old_code to classify insert vs update
        const existingByOldCode = new Map<string, { old_code: string; equipment_id: string }>();
        const existingByEquipmentId = new Map<string, { old_code: string; equipment_id: string }>();
        const chunkSize = 500;
        const allCodes = finalRows.map((r) => r.old_code);
        const allEquipmentIds = finalRows.map((r) => r.equipment_id);

        for (let i = 0; i < allCodes.length; i += chunkSize) {
          const chunk = allCodes.slice(i, i + chunkSize);
          const { data: existing, error } = await adminClient
            .from("billboards")
            .select("old_code, equipment_id")
            .in("old_code", chunk);
          if (error) throw error;
          (existing ?? []).forEach((row: any) => {
            existingByOldCode.set(row.old_code, row);
            existingByEquipmentId.set(row.equipment_id, row);
          });
        }

        for (let i = 0; i < allEquipmentIds.length; i += chunkSize) {
          const chunk = allEquipmentIds.slice(i, i + chunkSize);
          const { data: existing, error } = await adminClient
            .from("billboards")
            .select("old_code, equipment_id")
            .in("equipment_id", chunk);
          if (error) throw error;
          (existing ?? []).forEach((row: any) => {
            existingByEquipmentId.set(row.equipment_id, row);
          });
        }

        const upsertRows: any[] = [];
        for (const row of finalRows) {
          const existingOldCode = existingByOldCode.get(row.old_code);

          if (existingOldCode) {
            // OldCode is the canonical match key.
            // Keep the current equipment_id if the new one would collide with another OldCode.
            const occupiedEquipment = existingByEquipmentId.get(row.equipment_id);
            if (
              occupiedEquipment &&
              occupiedEquipment.old_code !== row.old_code &&
              existingOldCode.equipment_id !== row.equipment_id
            ) {
              row.equipment_id = existingOldCode.equipment_id;
              if (errors.length < 20) {
                errors.push(
                  `${row.old_code}: kept existing equipment_id ${existingOldCode.equipment_id} because ${occupiedEquipment.old_code} already uses ${row.equipment_id}`,
                );
              }
            }
            updated++;
            upsertRows.push(row);
            continue;
          }

          const occupiedEquipment = existingByEquipmentId.get(row.equipment_id);
          if (occupiedEquipment && occupiedEquipment.old_code !== row.old_code) {
            failed++;
            if (errors.length < 20) {
              errors.push(
                `${row.old_code}: equipment_id ${row.equipment_id} already belongs to ${occupiedEquipment.old_code}`,
              );
            }
            continue;
          }

          inserted++;
          upsertRows.push(row);
        }

        // Fast batch upsert using OldCode only
        const batchSize = 500;
        for (let i = 0; i < upsertRows.length; i += batchSize) {
          const batch = upsertRows.slice(i, i + batchSize);
          const { error } = await adminClient
            .from("billboards")
            .upsert(batch, { onConflict: "old_code" });
          if (error) throw error;
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
        await pool.close();
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
