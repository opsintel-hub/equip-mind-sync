// Gate Station (PIN kiosk) for security guards — no email account required.
// POST JSON { action, ... } ; header x-station-token for all actions except "login".
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-station-token, content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });
const fail = (status: number, message: string) => json(status, { ok: false, message });

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const SELECT = "id, ticket_no, status, supervisor_id, supervisor_name, supervisor_phone, worker_count, contractor_name, vehicle_plates, purpose, purpose_other, items_description, created_at, assigned_location_note, planned_start_at, planned_end_at, checkin_at, checkout_at, admin_closed_at, admin_closed_by_name, warehouses(name, code), locations:assigned_location_id(code, name)";
const SESSION_HOURS = 12;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return fail(405, "method not allowed");
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let body: any = {};
  try { body = await req.json(); } catch { return fail(400, "invalid body"); }
  const action = String(body.action || "");

  try {
    if (action === "login") {
      const code = String(body.code || "").slice(0, 40);
      const pin = String(body.pin || "");
      if (!/^[0-9]{6}$/.test(pin)) return fail(400, "PIN ต้องเป็นตัวเลข 6 หลัก");
      const { data, error } = await db.rpc("gate_station_verify", { _code: code, _pin: pin });
      if (error) throw error;
      const r = data as any;
      if (!r?.ok) return fail(401, r?.message || "PIN ไม่ถูกต้อง");
      const token = crypto.randomUUID() + crypto.randomUUID();
      const expires = new Date(Date.now() + SESSION_HOURS * 3600_000).toISOString();
      await db.from("gate_station_sessions").delete().lt("expires_at", new Date().toISOString());
      await db.from("gate_station_sessions").insert({ station_id: r.id, token_hash: await sha256(token), expires_at: expires });
      return json(200, { ok: true, token, expires_at: expires, station_name: r.name });
    }

    const token = req.headers.get("x-station-token") || "";
    if (!token) return fail(401, "SESSION_EXPIRED");
    const { data: sess } = await db.from("gate_station_sessions")
      .select("station_id, expires_at, gate_stations(id, name, is_active, created_by)")
      .eq("token_hash", await sha256(token)).maybeSingle();
    const station = (sess as any)?.gate_stations;
    if (!sess || new Date(sess.expires_at) < new Date() || !station?.is_active) return fail(401, "SESSION_EXPIRED");

    if (action === "me") return json(200, { ok: true, station_name: station.name, expires_at: sess.expires_at });

    if (action === "logout") {
      await db.from("gate_station_sessions").delete().eq("token_hash", await sha256(token));
      return json(200, { ok: true });
    }

    if (action === "lookup") {
      const raw = String(body.q || "").trim();
      if (!raw) return fail(400, "ต้องระบุเลขตั๋ว");
      let { data } = await db.from("warehouse_access_tickets").select(SELECT).eq("ticket_no", raw.toUpperCase()).maybeSingle();
      if (!data) {
        const r = await db.from("warehouse_access_tickets").select(SELECT)
          .contains("vehicle_plates", [raw]).in("status", ["approved", "checked_in"])
          .order("planned_start_at", { ascending: true }).limit(1).maybeSingle();
        data = r.data;
      }
      return json(200, { ok: true, ticket: data || null });
    }

    if (action === "inside") {
      const { data } = await db.from("warehouse_access_tickets").select(SELECT)
        .eq("status", "checked_in").order("checkin_at", { ascending: false });
      return json(200, { ok: true, tickets: data || [] });
    }

    if (action === "photos") {
      const { data } = await db.from("warehouse_access_photos").select("id, photo_type, image_url")
        .eq("ticket_id", body.ticket_id).order("created_at");
      return json(200, { ok: true, photos: data || [] });
    }

    if (action === "upload") {
      const type = body.photo_type;
      if (!["placement", "cleanliness"].includes(type)) return fail(400, "ประเภทรูปไม่ถูกต้อง");
      const { data: t } = await db.from("warehouse_access_tickets").select("id, status").eq("id", body.ticket_id).maybeSingle();
      if (!t || t.status !== "checked_in") return fail(400, "ตั๋วนี้ไม่ได้อยู่ในพื้นที่");
      const b64 = String(body.image_base64 || "").replace(/^data:[^,]+,/, "");
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      if (bytes.length > 5 * 1024 * 1024) return fail(400, "รูปใหญ่เกิน 5MB");
      const path = `site-access/${t.id}/${type}-${Date.now()}.jpg`;
      const up = await db.storage.from("delivery-confirmations").upload(path, bytes, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
      const url = db.storage.from("delivery-confirmations").getPublicUrl(path).data.publicUrl;
      const { error } = await db.from("warehouse_access_photos").insert({
        ticket_id: t.id, photo_type: type, image_url: url, uploaded_by: station.created_by, station_id: station.id,
      });
      if (error) throw error;
      return json(200, { ok: true });
    }

    if (action === "stamp") {
      const { data: t } = await db.from("warehouse_access_tickets").select("id, status, supervisor_id").eq("id", body.ticket_id).maybeSingle();
      if (!t) return fail(404, "ไม่พบตั๋ว");
      const now = new Date().toISOString();
      if (body.kind === "checkin") {
        if (t.status !== "approved" || !t.supervisor_id) return fail(400, "ตั๋วยังไม่พร้อมเข้าพื้นที่");
        const { error } = await db.from("warehouse_access_tickets").update({
          status: "checked_in", checkin_at: now, checkin_by: station.created_by, checkin_station_id: station.id,
        }).eq("id", t.id).eq("status", "approved");
        if (error) throw error;
      } else if (body.kind === "checkout") {
        if (t.status !== "checked_in") return fail(400, "ตั๋วยังไม่ได้บันทึกเข้า");
        // Exit photos are optional (0-2)
        const { error } = await db.from("warehouse_access_tickets").update({
          status: "completed", checkout_at: now, checkout_by: station.created_by, checkout_station_id: station.id,
        }).eq("id", t.id).eq("status", "checked_in");
        if (error) throw error;
      } else return fail(400, "action ไม่ถูกต้อง");
      return json(200, { ok: true, at: now });
    }

    return fail(400, "unknown action");
  } catch (e) {
    console.error(e);
    return fail(500, (e as Error).message || "error");
  }
});
