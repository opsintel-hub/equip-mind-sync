// Magic Ticket Integration — Phase 1 (pre-issued requisition flow)
// Routes: GET /pending-usage, GET /document/:doc_no, POST /work-log, POST /work-log/revert,
//         POST /bind-ticket, POST /issue-request (phase 2)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-api-key, content-type, authorization, apikey",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });
const fail = (status: number, code: string, message: string) => json(status, { success: false, code, message, reason: message });

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const apiKey = req.headers.get("x-api-key")?.trim();
  if (!apiKey) return fail(401, "UNAUTHORIZED", "ต้องส่ง header x-api-key");
  const { data: key } = await admin.from("magic_ticket_api_keys")
    .select("id, is_active, allowed_ips").eq("key_hash", await sha256(apiKey)).maybeSingle();
  if (!key?.is_active) return fail(401, "UNAUTHORIZED", "API key ไม่ถูกต้องหรือถูกยกเลิกแล้ว");
  const ips = (key.allowed_ips as string[] | null) || [];
  if (ips.length) {
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "";
    if (!ips.includes(ip)) return fail(403, "IP_NOT_ALLOWED", `IP ${ip || "-"} ไม่อยู่ในรายการที่อนุญาต`);
  }
  admin.from("magic_ticket_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id).then(() => {});

  const url = new URL(req.url);
  const path = url.pathname.replace(/^.*\/magic-ticket/, "").replace(/\/+$/, "") || "/";
  const q = url.searchParams;

  try {
    if (req.method === "GET" && path === "/pending-usage") {
      const { data, error } = await admin.rpc("magic_ticket_pending_usage", {
        p_search: q.get("q") || q.get("search") || null,
        p_ticket_code: q.get("ticket_code") || null,
        p_doc_no: q.get("gi_document_no") || null,
        p_department: q.get("department") || null,
        p_include_consumed: ["true", "1"].includes((q.get("include_consumed") || "").toLowerCase()),
        p_limit: Number(q.get("limit") || 50),
        p_offset: Number(q.get("offset") || 0),
      });
      if (error) throw error;
      return json(200, { success: true, ...(data as object) });
    }

    const docMatch = path.match(/^\/document\/(.+)$/);
    if (req.method === "GET" && docMatch) {
      const docNo = decodeURIComponent(docMatch[1]);
      const { data: header } = await admin.from("goods_issue_pending").select("id").eq("document_no", docNo).maybeSingle();
      if (!header) return fail(404, "DOCUMENT_NOT_FOUND", `ไม่พบเอกสาร ${docNo}`);
      const { data, error } = await admin.rpc("magic_ticket_document_json", { p_pending_id: header.id, p_only_open: false });
      if (error) throw error;
      return json(200, { success: true, document: data });
    }

    const readBody = async () => {
      try { const b = await req.json(); return b && typeof b === "object" && !Array.isArray(b) ? b : null; } catch { return null; }
    };
    const rpcPost = async (fn: string, args: (b: unknown) => Record<string, unknown>) => {
      const b = await readBody();
      if (!b) return fail(400, "VALIDATION_ERROR", "body ต้องเป็น JSON object");
      const { data, error } = await admin.rpc(fn, args(b));
      if (error) throw error;
      const r = data as { http_status: number; body: unknown };
      return json(r.http_status, r.body);
    };
    if (req.method === "POST" && path === "/work-log/revert") return await rpcPost("magic_ticket_revert_event", (p) => ({ p, p_api_key_id: key.id }));
    if (req.method === "POST" && path === "/bind-ticket") return await rpcPost("magic_ticket_bind_ticket", (p) => ({ p }));
    if (req.method === "POST" && path === "/issue-request") return await rpcPost("magic_ticket_issue_request", (p) => ({ p, p_api_key_id: key.id }));

    if (req.method === "POST" && path === "/work-log") {
      let body: unknown;
      try { body = await req.json(); } catch { return fail(400, "VALIDATION_ERROR", "body ต้องเป็น JSON"); }
      if (!body || typeof body !== "object" || Array.isArray(body)) return fail(400, "VALIDATION_ERROR", "ส่งได้ครั้งละ 1 เหตุการณ์ (JSON object)");
      const { data, error } = await admin.rpc("magic_ticket_work_log", { p: body, p_api_key_id: key.id });
      if (error) throw error;
      const result = data as { http_status: number; body: unknown };
      return json(result.http_status, result.body);
    }

    return fail(404, "NOT_FOUND", "ไม่พบ endpoint");
  } catch (e) {
    console.error("magic-ticket error", e);
    return fail(500, "INTERNAL_ERROR", "ระบบขัดข้อง กรุณาลองใหม่ด้วย event_id เดิม");
  }
});
