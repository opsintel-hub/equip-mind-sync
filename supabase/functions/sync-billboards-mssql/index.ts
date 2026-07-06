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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Translate common MSSQL / network errors into user-friendly Thai messages
function translateError(err: any): string {
  const raw = String(err?.message || err?.code || err || "");
  const lower = raw.toLowerCase();
  if (lower.includes("login failed") || lower.includes("18456")) {
    return `ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (${raw})`;
  }
  if (lower.includes("etimeout") || lower.includes("timeout")) {
    return `เชื่อมต่อ MSSQL เกินเวลา — ตรวจสอบ firewall ฝั่ง server ว่าเปิดพอร์ต 1433 ให้ IP ของระบบ (${raw})`;
  }
  if (
    lower.includes("econnrefused") ||
    lower.includes("enotfound") ||
    lower.includes("ehostunreach")
  ) {
    return `ไม่สามารถเชื่อมต่อไปยัง server ได้ — ตรวจสอบชื่อ host/port และการเปิด TCP/IP (${raw})`;
  }
  if (lower.includes("tls") || lower.includes("ssl") || lower.includes("handshake")) {
    return `TLS handshake ล้มเหลว — server อาจบังคับใช้ SSL ที่ไม่รองรับ (${raw})`;
  }
  if (lower.includes("invalid object name") || lower.includes("208")) {
    return `ไม่พบตารางที่ระบุใน database (${raw})`;
  }
  return raw || "ไม่ทราบสาเหตุ";
}

async function connectMssqlOnce(cfg: ConnectionConfig) {
  return await sql.connect({
    user: cfg.username,
    password: cfg.password,
    server: cfg.host,
    port: cfg.port,
    database: cfg.database,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
      tdsVersion: "7_4",
      useUTC: true,
    },
    pool: { max: 1, min: 0, idleTimeoutMillis: 30000 },
    connectionTimeout: 60000,
    requestTimeout: 300000,
    stream: false,
  });
}

async function connectMssql(cfg: ConnectionConfig) {
  const delays = [0, 2000, 4000]; // 3 attempts, exp backoff
  let lastErr: any = null;
  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt] > 0) await sleep(delays[attempt]);
    try {
      return await connectMssqlOnce(cfg);
    } catch (err) {
      lastErr = err;
      console.warn(`MSSQL connect attempt ${attempt + 1} failed:`, err);
    }
  }
  throw new Error(translateError(lastErr));
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

const ALLOWED_TABLES = new Set(["Asset", "Billboard"]);

function parseConfig(body: any): ConnectionConfig {
  const password = body.password ||
    Deno.env.get("MSSQL_BILLBOARD_PASSWORD") || "";
  const table = body.table || "Asset";
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error("Invalid table name");
  }
  // Support "host:port" written in the host field
  let hostRaw = String(body.host || "magicticket.magicsigncloud.com").trim();
  let port = Number(body.port) || 1433;
  if (hostRaw.includes(":")) {
    const [h, p] = hostRaw.split(":");
    hostRaw = h.trim();
    const parsed = parseInt(p, 10);
    if (!isNaN(parsed) && parsed > 0) port = parsed;
  }
  return {
    host: hostRaw,
    port,
    database: body.database || "planb",
    username: body.username || "planb_viewer",
    password,
    table,
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
        try { await pool.close(); } catch { /* ignore */ }
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
        try { await pool.close(); } catch { /* ignore */ }
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
      const nowIso = new Date().toISOString();

      try {
        const rows = await runQuery(pool, `SELECT * FROM [${cfg.table}]`);
        fetched = rows.length;

        // Close the pool immediately after fetching to free the connection
        try { await pool.close(); } catch { /* ignore */ }

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
            description: row.Description ?? row.Desc ?? null,
            route_pm: row.Route_PM ?? row.RoutePM ?? null,
            route_monitoring: row.Route_Monitoring ?? row.RouteMonitoring ?? null,
            route_install_demolish: row.Route_Install_Demolish ?? row.RouteInstallDemolish ?? null,
            route_report_photo: row.Route_Report_Photo ?? row.RouteReportPhoto ?? null,
            target_monitoring: row.Target_Monitoring ?? row.TargetMonitoring ?? null,
            extra_1: row.Extra1 ?? row.Extra_1 ?? null,
            extra_2: row.Extra2 ?? row.Extra_2 ?? null,
            extra_3: row.Extra3 ?? row.Extra_3 ?? null,
            status: "active",
            sync_source: "mssql",
            last_synced_at: nowIso,
          });
        }

        // Dedupe by old_code (keep the last row from source)
        const dedupMap = new Map<string, any>();
        for (const r of mappedRows) {
          if (dedupMap.has(r.old_code)) skipped++;
          dedupMap.set(r.old_code, r);
        }
        const finalRows = Array.from(dedupMap.values());

        // Fetch existing rows (need sync_source to protect manual entries)
        const existingByOldCode = new Map<string, { old_code: string; equipment_id: string; sync_source: string | null }>();
        const existingByEquipmentId = new Map<string, { old_code: string; equipment_id: string; sync_source: string | null }>();
        const chunkSize = 500;
        const allCodes = finalRows.map((r) => r.old_code);
        const allEquipmentIds = finalRows.map((r) => r.equipment_id);

        for (let i = 0; i < allCodes.length; i += chunkSize) {
          const chunk = allCodes.slice(i, i + chunkSize);
          const { data: existing, error } = await adminClient
            .from("billboards")
            .select("old_code, equipment_id, sync_source")
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
            .select("old_code, equipment_id, sync_source")
            .in("equipment_id", chunk);
          if (error) throw error;
          (existing ?? []).forEach((row: any) => {
            existingByEquipmentId.set(row.equipment_id, row);
          });
        }

        const upsertRows: any[] = [];
        for (const row of finalRows) {
          const existingOldCode = existingByOldCode.get(row.old_code);

          // Protect manual entries — never overwrite
          if (existingOldCode && existingOldCode.sync_source === "manual") {
            skipped++;
            continue;
          }

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
                  `${row.old_code}: คง equipment_id เดิม ${existingOldCode.equipment_id} เพราะ ${occupiedEquipment.old_code} ใช้ ${row.equipment_id} อยู่แล้ว`,
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
                `${row.old_code}: equipment_id ${row.equipment_id} เป็นของ ${occupiedEquipment.old_code} แล้ว`,
              );
            }
            continue;
          }

          inserted++;
          upsertRows.push(row);
        }

        // Batch upsert (200/batch) using OldCode as conflict key
        const batchSize = 200;
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
        const friendly = translateError(err);
        await adminClient
          .from("billboard_sync_logs")
          .update({
            status: "failed",
            error_message: friendly,
            rows_fetched: fetched,
            rows_inserted: inserted,
            rows_updated: updated,
            rows_skipped: skipped,
            rows_failed: failed,
            completed_at: new Date().toISOString(),
          })
          .eq("id", logRow!.id);
        throw new Error(friendly);
      } finally {
        try { await pool.close(); } catch { /* ignore */ }
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
