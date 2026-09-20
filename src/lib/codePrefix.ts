import { supabase } from "@/integrations/supabase/client";

export type CodePrefixKind = "equipment" | "tool" | "media_player";

const SOURCE_TABLE: Record<CodePrefixKind, "equipment" | "tools" | "media_players"> = {
  equipment: "equipment",
  tool: "tools",
  media_player: "media_players",
};

const PREFIX_TABLE: Record<CodePrefixKind, "equipment_code_prefixes" | "tool_code_prefixes" | "media_player_code_prefixes"> = {
  equipment: "equipment_code_prefixes",
  tool: "tool_code_prefixes",
  media_player: "media_player_code_prefixes",
};

export interface PrefixUsage {
  count: number;
  samples: string[];
}

/** นับจำนวนรายการที่ใช้ Prefix นี้อยู่ (ตรงตัวเท่านั้น เช่น "PB" จะไม่นับ "PBUS 0001") */
export async function checkPrefixUsage(kind: CodePrefixKind, prefix: string): Promise<PrefixUsage> {
  const { data, error } = await supabase
    .from(SOURCE_TABLE[kind])
    .select("code")
    .ilike("code", `${prefix}%`)
    .limit(1000);
  if (error) throw error;
  const target = prefix.trim().toUpperCase();
  const matched = (data || [])
    .map((d: any) => d.code as string)
    .filter((code) => {
      const parsed = parseCode(code || "");
      return !!parsed && parsed.prefix.toUpperCase() === target;
    });
  return { count: matched.length, samples: matched.slice(0, 3) };
}

/** ลบจริงถ้ายังไม่ถูกใช้งาน / ปิดการใช้งานถ้ามีรหัสที่ใช้ Prefix นี้อยู่แล้ว */
export async function removeCodePrefix(kind: CodePrefixKind, id: string, hardDelete: boolean) {
  const table = PREFIX_TABLE[kind];
  if (hardDelete) {
    const { error, count } = await supabase.from(table).delete({ count: "exact" }).eq("id", id);
    if (error) throw error;
    if (!count) throw new Error("ไม่มีสิทธิ์ลบ Prefix (ต้องเป็น Super Admin, Admin หรือเจ้าหน้าที่คลัง)");
    return;
  }
  const { error, count } = await supabase
    .from(table)
    .update({ is_active: false }, { count: "exact" })
    .eq("id", id);
  if (error) throw error;
  if (!count) throw new Error("ไม่มีสิทธิ์ปิดการใช้งาน Prefix (ต้องเป็น Super Admin, Admin หรือเจ้าหน้าที่คลัง)");
}

/** แยกรหัสเป็น prefix + เลขรัน รองรับ "BUS 0006" และ "PBUS0006" */
export function parseCode(code: string): { prefix: string; num: number } | null {
  const m = String(code || "").trim().match(/^(.*?)[ -]?(\d{3,})$/);
  if (!m) return null;
  const prefix = m[1].trim();
  if (!prefix) return null;
  return { prefix, num: parseInt(m[2], 10) };
}

/** ซิงก์เลขรันถัดไปของ Prefix ให้สูงกว่ารหัสที่มีอยู่จริงในระบบ */
export async function syncPrefixCounters(kind: CodePrefixKind) {
  const { data, error } = await (supabase.rpc as any)("sync_code_prefix_counters", { _kind: kind });
  if (error) throw error;
  return data;
}
