/**
 * Helper สำหรับสร้าง dropdown options ของ Media Player
 * โดยรวม records ที่ "code + name" เหมือนกันให้เหลือบรรทัดเดียว
 * และแสดงจำนวนเครื่องรวมในวงเล็บ
 *
 * เนื่องจากระบบใช้โครงสร้าง 1 รหัส : หลายเครื่อง (One Code to Many Units)
 * โดย clone record ใหม่ทุกครั้งที่รับเข้าเพื่อให้แต่ละเครื่องมี S/N ของตัวเอง
 * (ดู: mem://data-model/media-player-unit-individualization)
 *
 * Dropdown เลือก "รหัส" ไม่ควรแสดงทุก record — ผู้ใช้ควรเห็นบรรทัดเดียวต่อรหัส
 * ส่วนการเลือกราย S/N จะใช้ SerialNumberSelect ในขั้นตอนถัดไป
 */

export interface MediaPlayerLike {
  id: string;
  code: string;
  name: string;
  [key: string]: any;
}

export interface DedupedMediaPlayerOption {
  value: string; // id ของ record แรกของแต่ละรหัส (representative)
  label: string;
  searchableText: string;
  count: number;
  representative: MediaPlayerLike;
}

/**
 * รวม Media Player records ตาม code+name ให้เหลือบรรทัดเดียวต่อรหัส
 * - คืน id ของ record แรกของกลุ่มเป็น value (เพื่อ backward compat กับ logic เดิม)
 * - label แสดง "CODE - NAME — คงเหลือในคลัง N เครื่อง" เพื่อบอกชัดเจนว่าเป็นจำนวนใน stock
 */
export function dedupeMediaPlayersByCode<T extends MediaPlayerLike>(
  players: T[]
): DedupedMediaPlayerOption[] {
  const groups = new Map<string, T[]>();
  for (const mp of players) {
    const key = `${mp.code}::${mp.name}`;
    const arr = groups.get(key) ?? [];
    arr.push(mp);
    groups.set(key, arr);
  }

  const result: DedupedMediaPlayerOption[] = [];
  for (const [, items] of groups) {
    const rep = items[0];
    const count = items.length;
    const totalInStock = items.reduce((sum, it: any) => sum + (Number(it.quantity) || 0), 0);
    const baseLabel = `${rep.code} - ${rep.name}`;
    result.push({
      value: rep.id,
      label: `${baseLabel} — คงเหลือในคลัง ${totalInStock} เครื่อง`,
      searchableText: `${rep.code} ${rep.name}`,
      count,
      representative: rep,
    });
  }

  result.sort((a, b) => a.representative.code.localeCompare(b.representative.code));
  return result;
}
