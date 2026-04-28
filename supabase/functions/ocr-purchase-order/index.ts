import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Default values (fallback if DB config not found) ───────
const DEFAULT_SYSTEM_PROMPT = `คุณเป็นผู้เชี่ยวชาญอ่านเอกสาร Purchase Order (PO) ภาษาไทยและภาษาอังกฤษ
อ่านเอกสาร PO ที่แนบมา และดึงข้อมูลให้ครบตาม function schema ที่กำหนด

กฎสำคัญ:
- วันที่ให้แปลงเป็น YYYY-MM-DD เสมอ (เช่น 15/10/20 → 2020-10-15)
- ราคาให้เป็นตัวเลขล้วน ไม่มี comma (เช่น 350,000 → 350000)
- ถ้าอ่านไม่ได้หรือไม่มีข้อมูลให้ใส่ null
- รองรับ PO หลาย format (Plan B Media, ทั่วไป, บริษัทอื่น)
- Item No คือรหัสสินค้า/รหัสอะไหล่ที่ระบุในตาราง
- Description คือรายละเอียดสินค้า/บริการ
- ดึง Vendor Code (รหัสผู้ขาย) จากหัวเอกสาร
- ดึง PR Number (เลขที่ใบขอซื้อ) จากช่อง Refer PR หรือ PR No.
- buyer_company_name คือ "ชื่อบริษัทผู้ซื้อ/ผู้ออก PO" ที่ปรากฏบน หัวกระดาษ (Letterhead) ด้านบนสุดของเอกสาร เช่น "Plan B Media Public Company Limited", "บริษัท แพลน บี มีเดีย จำกัด (มหาชน)" — ห้ามสับสนกับ Vendor (ผู้ขาย/ผู้รับเงิน) เด็ดขาด ให้ดึงชื่อเต็มตามที่ปรากฏบนหัวกระดาษ`;

const DEFAULT_EXTRACTION_SCHEMA = {
  name: "extract_po_data",
  description: "Extract structured data from Purchase Order PDF document",
  parameters: {
    type: "object",
    properties: {
      po_number: { type: "string", description: "เลขที่ PO เช่น PO20100177" },
      po_date: { type: "string", description: "วันที่ PO ในรูปแบบ YYYY-MM-DD" },
      buyer_company_name: { type: "string", description: "ชื่อบริษัทผู้ซื้อ/ผู้ออก PO ตามที่ปรากฏบนหัวกระดาษ (Letterhead) เช่น 'Plan B Media Public Company Limited' หรือ 'บริษัท แพลน บี มีเดีย จำกัด (มหาชน)' - ห้ามสับสนกับ Vendor" },
      vendor_code: { type: "string", description: "รหัสผู้ขาย/Vendor No เช่น 002402" },
      vendor_name: { type: "string", description: "ชื่อผู้ขาย/บริษัท Vendor" },
      vendor_address: { type: "string", description: "ที่อยู่ Vendor" },
      vendor_phone: { type: "string", description: "เบอร์โทร Vendor" },
      pr_number: { type: "string", description: "เลขที่ PR / Refer PR เช่น PR2010135" },
      department: { type: "string", description: "ชื่อฝ่าย/Department เช่น Online Media" },
      payment_terms: { type: "string", description: "เงื่อนไขชำระเงิน เช่น CASH, 15D" },
      receipt_date: { type: "string", description: "วันรับสินค้า ในรูปแบบ YYYY-MM-DD" },
      contract_ref: { type: "string", description: "อ้างอิงสัญญา/Contract" },
      quote_no: { type: "string", description: "เลขที่ใบเสนอราคา" },
      comment: { type: "string", description: "หมายเหตุ/Comment ในเอกสาร" },
      items: {
        type: "array",
        description: "รายการสินค้า/บริการทั้งหมดในตาราง",
        items: {
          type: "object",
          properties: {
            item_no: { type: "string", description: "รหัสสินค้า/Item No" },
            description: { type: "string", description: "รายละเอียดสินค้า/บริการ" },
            asset_no: { type: "string", description: "เลขทรัพย์สิน/Asset No" },
            quantity: { type: "number", description: "จำนวน" },
            unit: { type: "string", description: "หน่วยนับ เช่น UNIT, PCS, EA" },
            unit_price: { type: "number", description: "ราคาต่อหน่วย (ไม่รวม VAT)" },
            amount: { type: "number", description: "จำนวนเงินรวม (ไม่รวม VAT)" },
          },
          required: ["description", "quantity", "unit"],
        },
      },
      total_excl_vat: { type: "number", description: "ยอดรวมก่อน VAT" },
      vat: { type: "number", description: "VAT 7%" },
      total_incl_vat: { type: "number", description: "ยอดรวมสุทธิ" },
    },
    required: ["po_number", "items"],
  },
};

const DEFAULT_MODEL = "google/gemini-3-flash-preview";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdf_base64 } = await req.json();

    if (!pdf_base64) {
      return new Response(
        JSON.stringify({ error: "กรุณาแนบไฟล์ PDF (pdf_base64)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Read dynamic config from DB ───────────────────────────
    let systemPrompt = DEFAULT_SYSTEM_PROMPT;
    let extractionSchema = DEFAULT_EXTRACTION_SCHEMA;
    let aiModel = DEFAULT_MODEL;

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(supabaseUrl, serviceKey);

      const { data: configRow } = await sb
        .from("system_settings")
        .select("value")
        .eq("key", "ocr_po_config")
        .maybeSingle();

      if (configRow?.value) {
        const cfg = configRow.value as any;
        if (cfg.system_prompt) systemPrompt = cfg.system_prompt;
        if (cfg.extraction_schema) extractionSchema = cfg.extraction_schema;
        if (cfg.model) aiModel = cfg.model;
      }
    } catch (configErr) {
      console.warn("Could not read OCR config from DB, using defaults:", configErr);
    }

    console.log("Processing PO PDF, base64 length:", pdf_base64.length, "model:", aiModel);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "กรุณาอ่านเอกสาร Purchase Order นี้และดึงข้อมูลทั้งหมดตาม schema ที่กำหนด",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${pdf_base64}`,
                },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: extractionSchema,
          },
        ],
        tool_choice: { type: "function", function: { name: extractionSchema.name || "extract_po_data" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "ระบบ AI มีผู้ใช้งานมาก กรุณาลองใหม่ในอีกสักครู่" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "เครดิต AI หมด กรุณาเติมเครดิตที่ Settings > Workspace > Usage" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "ไม่สามารถอ่านเอกสาร PO ได้ กรุณาลองใหม่" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    console.log("AI response received");

    // Extract tool call result
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    const expectedName = extractionSchema.name || "extract_po_data";
    if (!toolCall || toolCall.function.name !== expectedName) {
      const content = result.choices?.[0]?.message?.content;
      if (content) {
        try {
          const parsed = JSON.parse(content);
          return new Response(JSON.stringify({ data: parsed }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch {
          // ignore
        }
      }
      return new Response(
        JSON.stringify({ error: "AI ไม่สามารถดึงข้อมูลจากเอกสารนี้ได้ กรุณาตรวจสอบไฟล์ PO" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log("Extracted PO data:", JSON.stringify(extractedData).substring(0, 200));

    return new Response(JSON.stringify({ data: extractedData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("OCR PO error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
