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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    const alertDays = 30;

    const { data: settings } = await supabase
      .from("notification_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    const advanceDays = settings?.advance_days || alertDays;

    const notifications: {
      title: string;
      message: string;
      type: string;
      category: string;
      reference_id: string;
      reference_type: string;
    }[] = [];

    // Check billboard equipment expiry and warranty
    const { data: billboardEquipment, error: beError } = await supabase
      .from("billboard_equipment")
      .select(`
        id,
        billboard_id,
        equipment_id,
        quantity,
        installation_date
      `);

    if (beError) {
      console.error("Error fetching billboard equipment:", beError);
    } else if (billboardEquipment) {
      for (const be of billboardEquipment) {
        // Fetch equipment details separately
        const { data: equipmentData } = await supabase
          .from("equipment")
          .select("id, name, code, expiry_date, warranty_expiry_date")
          .eq("id", be.equipment_id)
          .maybeSingle();

        // Fetch billboard details separately
        const { data: billboardData } = await supabase
          .from("billboards")
          .select("equipment_id, location_name")
          .eq("id", be.billboard_id)
          .maybeSingle();

        if (!equipmentData || !billboardData) continue;

        // Check expiry date
        if (equipmentData.expiry_date) {
          const expiryDate = new Date(equipmentData.expiry_date);
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          if (daysUntilExpiry <= advanceDays && daysUntilExpiry >= -7) {
            const { data: existing } = await supabase
              .from("notifications")
              .select("id")
              .eq("reference_id", be.id)
              .eq("category", "equipment_expiry")
              .eq("is_read", false)
              .maybeSingle();

            if (!existing) {
              notifications.push({
                title: daysUntilExpiry <= 0 ? "อุปกรณ์หมดอายุแล้ว" : "อุปกรณ์ใกล้หมดอายุ",
                message: `${equipmentData.name} (${equipmentData.code}) ที่ป้าย ${billboardData.equipment_id} - ${billboardData.location_name || ""} ${daysUntilExpiry <= 0 ? "หมดอายุแล้ว" : `จะหมดอายุใน ${daysUntilExpiry} วัน`}`,
                type: daysUntilExpiry <= 0 ? "error" : daysUntilExpiry <= 7 ? "warning" : "info",
                category: "equipment_expiry",
                reference_id: be.id,
                reference_type: "billboard_equipment",
              });
            }
          }
        }

        // Check warranty expiry date
        if (equipmentData.warranty_expiry_date) {
          const warrantyDate = new Date(equipmentData.warranty_expiry_date);
          const daysUntilWarranty = Math.ceil((warrantyDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          if (daysUntilWarranty <= advanceDays && daysUntilWarranty >= -7) {
            const { data: existing } = await supabase
              .from("notifications")
              .select("id")
              .eq("reference_id", be.id)
              .eq("category", "warranty_expiry")
              .eq("is_read", false)
              .maybeSingle();

            if (!existing) {
              notifications.push({
                title: daysUntilWarranty <= 0 ? "ประกันหมดอายุแล้ว" : "ประกันใกล้หมดอายุ",
                message: `${equipmentData.name} (${equipmentData.code}) ที่ป้าย ${billboardData.equipment_id} - ${billboardData.location_name || ""} ${daysUntilWarranty <= 0 ? "ประกันหมดอายุแล้ว" : `ประกันจะหมดอายุใน ${daysUntilWarranty} วัน`}`,
                type: daysUntilWarranty <= 0 ? "error" : daysUntilWarranty <= 7 ? "warning" : "info",
                category: "warranty_expiry",
                reference_id: be.id,
                reference_type: "billboard_equipment",
              });
            }
          }
        }
      }
    }

    // Check PM schedules
    const { data: pmSchedules, error: pmError } = await supabase
      .from("pm_schedules")
      .select("id, billboard_id, title, description, next_due_date, advance_notice_days")
      .eq("is_active", true);

    if (pmError) {
      console.error("Error fetching PM schedules:", pmError);
    } else if (pmSchedules) {
      for (const pm of pmSchedules) {
        const { data: billboardData } = await supabase
          .from("billboards")
          .select("equipment_id, location_name")
          .eq("id", pm.billboard_id)
          .maybeSingle();

        if (!billboardData) continue;

        const dueDate = new Date(pm.next_due_date);
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const noticeDays = pm.advance_notice_days || 7;

        if (daysUntilDue <= noticeDays && daysUntilDue >= -7) {
          const { data: existing } = await supabase
            .from("notifications")
            .select("id")
            .eq("reference_id", pm.id)
            .eq("category", "pm_schedule")
            .eq("is_read", false)
            .maybeSingle();

          if (!existing) {
            notifications.push({
              title: daysUntilDue <= 0 ? "เลยกำหนด PM แล้ว" : "ใกล้ถึงกำหนด PM",
              message: `${pm.title} - ป้าย ${billboardData.equipment_id} ${billboardData.location_name || ""} ${daysUntilDue <= 0 ? `เลยกำหนด ${Math.abs(daysUntilDue)} วัน` : `กำหนด ${daysUntilDue} วัน`}`,
              type: daysUntilDue <= 0 ? "error" : daysUntilDue <= 3 ? "warning" : "info",
              category: "pm_schedule",
              reference_id: pm.id,
              reference_type: "pm_schedule",
            });
          }
        }
      }
    }

    // Insert new notifications
    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (insertError) {
        console.error("Error inserting notifications:", insertError);
      }
    }

    console.log(`Created ${notifications.length} new notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        notificationsCreated: notifications.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in check-expiring-equipment:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
