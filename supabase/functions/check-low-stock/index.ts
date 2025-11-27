import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Starting low stock check...");

    // Get all active equipment
    const { data: equipment, error: equipmentError } = await supabase
      .from("equipment")
      .select("id, name, code, department, quantity_in_stock, min_stock_level")
      .eq("is_active", true)
      .not("department", "is", null);

    if (equipmentError) {
      console.error("Error fetching equipment:", equipmentError);
      throw equipmentError;
    }

    console.log(`Found ${equipment?.length || 0} active equipment items`);

    // Filter equipment with low stock
    const lowStockItems = equipment?.filter(
      (item) => item.quantity_in_stock <= item.min_stock_level
    ) || [];

    console.log(`Found ${lowStockItems.length} low stock items`);

    // For each low stock item, check if alert already exists
    const newAlerts = [];
    for (const item of lowStockItems) {
      // Check if there's already an unresolved alert for this equipment
      const { data: existingAlert } = await supabase
        .from("low_stock_alerts")
        .select("id")
        .eq("equipment_id", item.id)
        .eq("is_resolved", false)
        .maybeSingle();

      // Only create new alert if no unresolved alert exists
      if (!existingAlert) {
        newAlerts.push({
          equipment_id: item.id,
          department: item.department,
          equipment_name: item.name,
          equipment_code: item.code,
          current_stock: item.quantity_in_stock,
          min_stock_level: item.min_stock_level,
        });
      }
    }

    console.log(`Creating ${newAlerts.length} new alerts`);

    // Insert new alerts
    if (newAlerts.length > 0) {
      const { error: insertError } = await supabase
        .from("low_stock_alerts")
        .insert(newAlerts);

      if (insertError) {
        console.error("Error inserting alerts:", insertError);
        throw insertError;
      }
    }

    // Auto-resolve alerts for items that now have sufficient stock
    const { data: unresolvedAlerts } = await supabase
      .from("low_stock_alerts")
      .select("id, equipment_id")
      .eq("is_resolved", false);

    const alertsToResolve = [];
    if (unresolvedAlerts) {
      for (const alert of unresolvedAlerts) {
        const currentEquipment = equipment?.find((e) => e.id === alert.equipment_id);
        if (currentEquipment && currentEquipment.quantity_in_stock > currentEquipment.min_stock_level) {
          alertsToResolve.push(alert.id);
        }
      }

      if (alertsToResolve.length > 0) {
        console.log(`Auto-resolving ${alertsToResolve.length} alerts`);
        await supabase
          .from("low_stock_alerts")
          .update({ is_resolved: true, resolved_at: new Date().toISOString() })
          .in("id", alertsToResolve);
      }
    }

    const result = {
      total_equipment: equipment?.length || 0,
      low_stock_items: lowStockItems.length,
      new_alerts_created: newAlerts.length,
      alerts_auto_resolved: alertsToResolve.length,
      timestamp: new Date().toISOString(),
    };

    console.log("Low stock check completed:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in check-low-stock function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
