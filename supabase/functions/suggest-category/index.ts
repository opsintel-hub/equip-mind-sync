import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CategoryLite {
  id: string;
  name: string;
  description?: string | null;
  keywords?: string[] | null;
  examples?: string | null;
  usage_hint?: string | null;
  parent_id?: string | null;
  parent_name?: string | null;
}

interface Payload {
  mode?: "suggest" | "enrich";
  // suggest mode
  product_name?: string;
  usage?: string;
  entry_type?: "equipment" | "tool";
  categories?: CategoryLite[]; // main categories
  subcategories?: CategoryLite[]; // sub, with parent_id/parent_name
  // enrich mode
  category_name?: string;
  parent_name?: string;
  kind?: "main" | "sub";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: Payload = await req.json();
    const mode = body.mode ?? "suggest";

    if (mode === "enrich") {
      return await handleEnrich(body, LOVABLE_API_KEY);
    }
    return await handleSuggest(body, LOVABLE_API_KEY);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleSuggest(body: Payload, key: string) {
  const {
    product_name = "",
    usage = "",
    entry_type = "equipment",
    categories = [],
    subcategories = [],
  } = body;

  if (!product_name.trim() && !usage.trim()) {
    return new Response(
      JSON.stringify({ error: "กรุณากรอกชื่อสินค้า หรือลักษณะการใช้งาน" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const catalog = categories
    .map((c) => {
      const subs = subcategories.filter((s) => s.parent_id === c.id);
      const subText = subs.length
        ? subs
            .map(
              (s) =>
                `    • ${s.name}${s.keywords?.length ? ` [คำค้น: ${s.keywords.join(", ")}]` : ""}${
                  s.examples ? ` (ตัวอย่าง: ${s.examples})` : ""
                }${s.usage_hint ? ` — ${s.usage_hint}` : ""}`,
            )
            .join("\n")
        : "    (ไม่มีหมวดย่อย)";
      return `- ${c.name}${c.keywords?.length ? ` [คำค้น: ${c.keywords.join(", ")}]` : ""}${
        c.examples ? ` (ตัวอย่าง: ${c.examples})` : ""
      }${c.usage_hint ? ` — ${c.usage_hint}` : ""}\n${subText}`;
    })
    .join("\n");

  const systemPrompt = `คุณเป็นผู้ช่วยจัดหมวดหมู่คลังสินค้าของบริษัทป้ายโฆษณา
หน้าที่: จากข้อมูลสินค้าที่ผู้ใช้ระบุ ให้แนะนำ "หมวดหมู่หลัก" และ "หมวดหมู่ย่อย" ที่เหมาะสมที่สุด 3 อันดับ
โดยต้อง"เลือกจากรายการที่มีอยู่เท่านั้น" ห้ามคิดชื่อหมวดหมู่ใหม่
ตอบกลับเป็น JSON ตาม schema ที่กำหนด พร้อมเหตุผลสั้น ๆ ภาษาไทย และค่า confidence 0-100`;

  const userPrompt = `ประเภทของ: ${entry_type === "tool" ? "เครื่องมือช่าง" : "อุปกรณ์/อะไหล่"}
ชื่อ/รุ่นสินค้า: ${product_name || "(ไม่ระบุ)"}
ลักษณะการใช้งาน: ${usage || "(ไม่ระบุ)"}

รายการหมวดหมู่ที่มีในระบบ:
${catalog || "(ยังไม่มี)"}

แนะนำ 3 อันดับที่เหมาะสมที่สุด (หากรายการมีน้อยกว่า 3 ให้แนะนำเท่าที่มี)`;

  const schema = {
    name: "suggest_categories",
    description: "แนะนำหมวดหมู่ที่เหมาะสม 3 อันดับ",
    parameters: {
      type: "object",
      properties: {
        suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              main_category: { type: "string", description: "ชื่อหมวดหมู่หลัก (ตรงกับรายการ)" },
              sub_category: { type: "string", description: "ชื่อหมวดหมู่ย่อย (ตรงกับรายการ) หรือ '' ถ้าไม่มี" },
              confidence: { type: "number", description: "ความมั่นใจ 0-100" },
              reason: { type: "string", description: "เหตุผลสั้น ๆ 1 บรรทัด" },
            },
            required: ["main_category", "confidence", "reason"],
          },
        },
        no_match: { type: "boolean", description: "true ถ้าไม่มีหมวดใดเข้าเกณฑ์เลย" },
        suggested_new: { type: "string", description: "ถ้า no_match=true แนะนำชื่อหมวดใหม่ที่ควรเพิ่ม" },
      },
      required: ["suggestions"],
    },
  };

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [{ type: "function", function: schema }],
      tool_choice: { type: "function", function: { name: "suggest_categories" } },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return new Response(JSON.stringify({ error: `AI gateway error: ${res.status} ${text}` }), {
      status: res.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const data = await res.json();
  const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
  const args = toolCall ? JSON.parse(toolCall.function.arguments) : { suggestions: [] };

  return new Response(JSON.stringify(args), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleEnrich(body: Payload, key: string) {
  const { category_name = "", parent_name, kind = "main" } = body;
  if (!category_name.trim()) {
    return new Response(JSON.stringify({ error: "category_name required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const systemPrompt = `คุณเป็นผู้ช่วยจัดข้อมูลหมวดหมู่คลังสินค้าของบริษัทป้ายโฆษณา
หน้าที่: จากชื่อหมวดหมู่ที่ให้มา สร้าง metadata 3 ช่องเป็นภาษาไทย เพื่อช่วยจำแนกสินค้าเข้าหมวดนี้ได้ถูกต้อง
ตอบเป็น JSON ตาม schema ที่กำหนดเท่านั้น`;

  const userPrompt = `ประเภท: ${kind === "sub" ? "หมวดหมู่ย่อย" : "หมวดหมู่หลัก"}
${parent_name ? `อยู่ภายใต้หมวดหมู่หลัก: ${parent_name}\n` : ""}ชื่อหมวดหมู่: ${category_name}

สร้าง:
1. keywords: คำค้นหา 5-10 คำ (ทั้งไทยและอังกฤษถ้ามี)
2. examples: ตัวอย่างสินค้าจริง 3-5 อย่าง คั่นด้วยจุลภาค
3. usage_hint: ลักษณะการใช้งาน/คุณสมบัติ 1-2 ประโยคสั้น`;

  const schema = {
    name: "enrich_category",
    description: "สร้าง metadata สำหรับหมวดหมู่",
    parameters: {
      type: "object",
      properties: {
        keywords: { type: "array", items: { type: "string" } },
        examples: { type: "string" },
        usage_hint: { type: "string" },
      },
      required: ["keywords", "examples", "usage_hint"],
    },
  };

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [{ type: "function", function: schema }],
      tool_choice: { type: "function", function: { name: "enrich_category" } },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return new Response(JSON.stringify({ error: `AI gateway error: ${res.status} ${text}` }), {
      status: res.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const data = await res.json();
  const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
  const args = toolCall ? JSON.parse(toolCall.function.arguments) : {};

  return new Response(JSON.stringify(args), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
