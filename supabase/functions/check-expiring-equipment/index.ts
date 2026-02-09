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

    // ============ Check WAREHOUSE equipment expiry and warranty ============
    console.log("Checking warehouse equipment for expiry/warranty alerts...");
    
    const { data: warehouseEquipment, error: weError } = await supabase
      .from("equipment")
      .select("id, name, code, department, expiry_date, warranty_expiry_date, quantity_in_stock")
      .eq("is_active", true)
      .gt("quantity_in_stock", 0);

    if (weError) {
      console.error("Error fetching warehouse equipment:", weError);
    } else if (warehouseEquipment) {
      for (const eq of warehouseEquipment) {
        // Check expiry date for warehouse items
        if (eq.expiry_date) {
          const expiryDate = new Date(eq.expiry_date);
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          if (daysUntilExpiry <= advanceDays && daysUntilExpiry >= -7) {
            const { data: existing } = await supabase
              .from("notifications")
              .select("id")
              .eq("reference_id", eq.id)
              .eq("category", "warehouse_equipment_expiry")
              .eq("is_read", false)
              .maybeSingle();

            if (!existing) {
              notifications.push({
                title: daysUntilExpiry <= 0 ? "สินค้าในคลังหมดอายุแล้ว" : "สินค้าในคลังใกล้หมดอายุ",
                message: `${eq.name} (${eq.code}) ${eq.department ? `ฝ่าย ${eq.department}` : ""} มีจำนวน ${eq.quantity_in_stock} ชิ้น ${daysUntilExpiry <= 0 ? "หมดอายุแล้ว" : `จะหมดอายุใน ${daysUntilExpiry} วัน`} - ควรเบิกใช้ก่อน`,
                type: daysUntilExpiry <= 0 ? "error" : daysUntilExpiry <= 7 ? "warning" : "info",
                category: "warehouse_equipment_expiry",
                reference_id: eq.id,
                reference_type: "equipment",
              });
            }
          }
        }

        // Check warranty expiry date for warehouse items
        if (eq.warranty_expiry_date) {
          const warrantyDate = new Date(eq.warranty_expiry_date);
          const daysUntilWarranty = Math.ceil((warrantyDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          if (daysUntilWarranty <= advanceDays && daysUntilWarranty >= -7) {
            const { data: existing } = await supabase
              .from("notifications")
              .select("id")
              .eq("reference_id", eq.id)
              .eq("category", "warehouse_warranty_expiry")
              .eq("is_read", false)
              .maybeSingle();

            if (!existing) {
              notifications.push({
                title: daysUntilWarranty <= 0 ? "ประกันสินค้าในคลังหมดแล้ว" : "ประกันสินค้าในคลังใกล้หมด",
                message: `${eq.name} (${eq.code}) ${eq.department ? `ฝ่าย ${eq.department}` : ""} มีจำนวน ${eq.quantity_in_stock} ชิ้น ${daysUntilWarranty <= 0 ? "ประกันหมดแล้ว" : `ประกันจะหมดใน ${daysUntilWarranty} วัน`} - ควรเบิกใช้ก่อน`,
                type: daysUntilWarranty <= 0 ? "error" : daysUntilWarranty <= 7 ? "warning" : "info",
                category: "warehouse_warranty_expiry",
                reference_id: eq.id,
                reference_type: "equipment",
              });
            }
          }
        }
      }
    }
    console.log(`Found ${notifications.length} warehouse equipment alerts`);

    // ============ Check billboard equipment expiry and warranty ============
    console.log("Checking billboard equipment for expiry/warranty alerts...");
    
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

    // ============ Check Billboard PM schedules ============
    console.log("Checking Billboard PM schedules...");
    
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
              title: daysUntilDue <= 0 ? "เลยกำหนด PM ป้ายแล้ว" : "ใกล้ถึงกำหนด PM ป้าย",
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

    // ============ Check Equipment PM schedules and create tasks ============
    console.log("Checking Equipment PM schedules...");
    
    const { data: equipmentPmSchedules, error: epmError } = await supabase
      .from("equipment_pm_schedules")
      .select("id, equipment_id, title, description, next_due_date, advance_notice_days, department, equipment_type")
      .eq("is_active", true);

    if (epmError) {
      console.error("Error fetching Equipment PM schedules:", epmError);
    } else if (equipmentPmSchedules) {
      for (const epm of equipmentPmSchedules) {
        const { data: equipmentData } = await supabase
          .from("equipment")
          .select("id, name, code")
          .eq("id", epm.equipment_id)
          .maybeSingle();

        if (!equipmentData) continue;

        const dueDate = new Date(epm.next_due_date);
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const noticeDays = epm.advance_notice_days || 7;

        // Create PM Task if today >= next_due_date and no pending task exists
        if (daysUntilDue <= 0) {
          // Check if there's already a pending task for this schedule
          const { data: existingTask } = await supabase
            .from("equipment_pm_tasks")
            .select("id")
            .eq("equipment_pm_schedule_id", epm.id)
            .in("status", ["pending", "in_progress"])
            .maybeSingle();

          if (!existingTask) {
            // Generate task number
            const { data: taskNumber } = await supabase.rpc("generate_equipment_pm_task_number");
            
            // Create PM Task
            const { data: newTask, error: taskError } = await supabase
              .from("equipment_pm_tasks")
              .insert({
                task_number: taskNumber || `PMT-${Date.now()}`,
                equipment_pm_schedule_id: epm.id,
                status: "pending",
                due_date: epm.next_due_date,
              })
              .select()
              .single();

            if (taskError) {
              console.error("Error creating PM task:", taskError);
            } else {
              console.log(`Created PM Task: ${newTask.task_number} for schedule ${epm.title}`);
              
              // Create notification for the new task
              notifications.push({
                title: "งาน PM เครื่องมือใหม่",
                message: `สร้างงาน PM: ${epm.title} - ${equipmentData.name} (${equipmentData.code}) ฝ่าย ${epm.department}`,
                type: "warning",
                category: "equipment_pm_task",
                reference_id: newTask.id,
                reference_type: "equipment_pm_task",
              });
            }
          }
        }

        // Send advance notification
        if (daysUntilDue <= noticeDays && daysUntilDue > 0) {
          const { data: existing } = await supabase
            .from("notifications")
            .select("id")
            .eq("reference_id", epm.id)
            .eq("category", "equipment_pm_schedule")
            .eq("is_read", false)
            .maybeSingle();

          if (!existing) {
            notifications.push({
              title: "ใกล้ถึงกำหนด PM เครื่องมือ",
              message: `${epm.title} - ${equipmentData.name} (${equipmentData.code}) ฝ่าย ${epm.department} กำหนดใน ${daysUntilDue} วัน`,
              type: daysUntilDue <= 3 ? "warning" : "info",
              category: "equipment_pm_schedule",
              reference_id: epm.id,
              reference_type: "equipment_pm_schedule",
            });
          }
        } else if (daysUntilDue <= 0 && daysUntilDue >= -7) {
          const { data: existing } = await supabase
            .from("notifications")
            .select("id")
            .eq("reference_id", epm.id)
            .eq("category", "equipment_pm_schedule")
            .eq("is_read", false)
            .maybeSingle();

          if (!existing) {
            notifications.push({
              title: "เลยกำหนด PM เครื่องมือแล้ว",
              message: `${epm.title} - ${equipmentData.name} (${equipmentData.code}) ฝ่าย ${epm.department} เลยกำหนด ${Math.abs(daysUntilDue)} วัน`,
              type: "error",
              category: "equipment_pm_schedule",
              reference_id: epm.id,
              reference_type: "equipment_pm_schedule",
            });
          }
        }
      }
    }

    // ============ Check Old Advertisement Retention Deadlines ============
    console.log("Checking old advertisement retention deadlines...");

    const { data: oldAds, error: oldAdError } = await supabase
      .from("advertisements")
      .select("id, code, name, retention_start_date, retention_days, retention_alert_sent, storage_location")
      .eq("is_active", true)
      .eq("entry_type", "old")
      .in("status", ["in_storage", "received"])
      .not("retention_start_date", "is", null)
      .not("retention_days", "is", null);

    if (oldAdError) {
      console.error("Error fetching old advertisements:", oldAdError);
    } else if (oldAds) {
      for (const ad of oldAds) {
        if (!ad.retention_start_date || !ad.retention_days) continue;

        const startDate = new Date(ad.retention_start_date);
        const deadlineDate = new Date(startDate.getTime() + ad.retention_days * 24 * 60 * 60 * 1000);
        const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Alert when 7 days before deadline, on deadline, and up to 7 days after
        if (daysUntilDeadline <= 7 && daysUntilDeadline >= -7) {
          const { data: existing } = await supabase
            .from("notifications")
            .select("id")
            .eq("reference_id", ad.id)
            .eq("category", "ad_retention")
            .eq("is_read", false)
            .maybeSingle();

          if (!existing) {
            notifications.push({
              title: daysUntilDeadline <= 0 ? "ภาพเก่าครบกำหนดจัดเก็บ" : "ภาพเก่าใกล้ครบกำหนดจัดเก็บ",
              message: `${ad.name} (${ad.code}) ${ad.storage_location ? `ที่ ${ad.storage_location}` : ""} ${daysUntilDeadline <= 0 ? `ครบกำหนด ${ad.retention_days} วันแล้ว เกินมา ${Math.abs(daysUntilDeadline)} วัน` : `จะครบกำหนด ${ad.retention_days} วันใน ${daysUntilDeadline} วัน`} — กรุณาดำเนินการ`,
              type: daysUntilDeadline <= 0 ? "error" : "warning",
              category: "ad_retention",
              reference_id: ad.id,
              reference_type: "advertisement",
            });

            // Update retention_alert_sent flag
            if (!ad.retention_alert_sent) {
              await supabase
                .from("advertisements")
                .update({ retention_alert_sent: true })
                .eq("id", ad.id);
            }
          }
        }
      }
    }
    console.log(`Total notifications after ad retention check: ${notifications.length}`);

    // Insert new notifications
    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (insertError) {
        console.error("Error inserting notifications:", insertError);
      }
    }

    console.log(`Created ${notifications.length} new notifications total`);

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