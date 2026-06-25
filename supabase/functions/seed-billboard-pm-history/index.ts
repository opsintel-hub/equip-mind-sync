import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Require admin/super_admin role for this data-seeding function
    const roleCheck = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roles } = await roleCheck
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const isAdmin = (roles || []).some(
      (r: any) => r.role === "admin" || r.role === "super_admin"
    );
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split("T")[0];

    // Get the "create_ticket" action type id for legacy import label
    const { data: actionType } = await supabase
      .from("pm_action_types")
      .select("id, name")
      .eq("code", "create_ticket")
      .maybeSingle();

    const actionTypeId = actionType?.id || null;
    const actionLabel = "นำเข้าข้อมูลเก่า (Auto-import)";

    // Fetch all billboard_equipment with expiry or warranty dates
    const { data: beData, error: beError } = await supabase
      .from("billboard_equipment")
      .select(`
        billboard_id,
        quantity,
        equipment:equipment_id (
          id, code, name, category, department,
          expiry_date, warranty_expiry_date
        ),
        billboards:billboard_id (
          id, old_code, equipment_id, department, media_type, location_name,
          region, district, territory, route_pm, status
        )
      `);

    if (beError) throw beError;

    // Get all billboard_ids already having pm_history (to skip duplicates)
    const { data: existingHistory } = await supabase
      .from("billboard_pm_history")
      .select("billboard_id, pm_reason");

    const existingSet = new Set(
      (existingHistory || []).map((h: any) => `${h.billboard_id}::${h.pm_reason}`)
    );

    // Get all active snoozes/tickets (these are already handled)
    const { data: actionsData } = await supabase
      .from("billboard_pm_actions")
      .select("billboard_id, action_type, snooze_until");

    const handledBillboards = new Set<string>();
    (actionsData || []).forEach((a: any) => {
      if (a.action_type === "ticket_created") handledBillboards.add(a.billboard_id);
      if (a.action_type === "snoozed" && a.snooze_until >= today) handledBillboards.add(a.billboard_id);
    });

    // Group equipment by billboard
    const billboardMap = new Map<string, {
      billboard: any;
      equipmentItems: any[];
      hasExpiry: boolean;
      hasWarranty: boolean;
    }>();

    (beData || []).forEach((be: any) => {
      const eq = be.equipment;
      const bb = be.billboards;
      if (!eq || !bb) return;
      if (!eq.expiry_date && !eq.warranty_expiry_date) return;
      // Only import items where expiry/warranty has passed
      const expiryPassed = eq.expiry_date && eq.expiry_date < today;
      const warrantyPassed = eq.warranty_expiry_date && eq.warranty_expiry_date < today;
      if (!expiryPassed && !warrantyPassed) return;

      const bbId = be.billboard_id;
      const existing = billboardMap.get(bbId);
      if (existing) {
        existing.equipmentItems.push({
          id: eq.id,
          code: eq.code,
          name: eq.name,
          category: eq.category,
          expiryDate: eq.expiry_date,
          warrantyDate: eq.warranty_expiry_date,
          quantity: be.quantity,
        });
        if (expiryPassed) existing.hasExpiry = true;
        if (warrantyPassed) existing.hasWarranty = true;
      } else {
        billboardMap.set(bbId, {
          billboard: bb,
          equipmentItems: [{
            id: eq.id,
            code: eq.code,
            name: eq.name,
            category: eq.category,
            expiryDate: eq.expiry_date,
            warrantyDate: eq.warranty_expiry_date,
            quantity: be.quantity,
          }],
          hasExpiry: !!expiryPassed,
          hasWarranty: !!warrantyPassed,
        });
      }
    });

    // Build history records to insert
    const toInsert: any[] = [];

    for (const [bbId, data] of billboardMap.entries()) {
      const pmReason = data.hasExpiry && data.hasWarranty ? "both"
        : data.hasExpiry ? "expiry"
        : "warranty_expiry";

      const key = `${bbId}::${pmReason}`;
      if (existingSet.has(key)) {
        console.log(`Skipping ${bbId} - already has history for ${pmReason}`);
        continue;
      }

      toInsert.push({
        billboard_id: bbId,
        action_type_id: actionTypeId,
        action_label: actionLabel,
        pm_reason: pmReason,
        equipment_snapshot: data.equipmentItems,
        billboard_snapshot: data.billboard,
        notes: "นำเข้าอัตโนมัติจากข้อมูลที่มีอยู่ในระบบก่อนการเปิดใช้งานฟีเจอร์ PM",
        actioned_at: new Date().toISOString(),
      });
    }

    let insertedCount = 0;
    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("billboard_pm_history")
        .insert(toInsert);
      if (insertError) throw insertError;
      insertedCount = toInsert.length;
    }

    console.log(`Seeded ${insertedCount} billboard PM history records`);

    return new Response(
      JSON.stringify({
        success: true,
        seeded: insertedCount,
        message: `นำเข้าข้อมูล PM ป้ายเก่าสำเร็จ ${insertedCount} รายการ`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in seed-billboard-pm-history:", error);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
