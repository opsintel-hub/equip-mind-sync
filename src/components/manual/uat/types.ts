// ─── UAT Test Case Types ───
// ใช้ร่วมกันทุก Module เพื่อให้ผู้ทดสอบมี Format เดียวกัน

export interface UATStep {
  /** ลำดับขั้น */
  no: number;
  /** สิ่งที่ต้องทำ */
  action: string;
  /** ผลลัพธ์ที่คาดหวัง (ขั้นย่อย) — optional */
  expected?: string;
}

export interface UATCase {
  /** รหัส Test Case เช่น INV-TC-01 */
  id: string;
  /** ชื่อ Use Case */
  title: string;
  /** Scenario / Business context */
  scenario: string;
  /** บทบาทผู้ทดสอบ */
  role: string;
  /** เมนูเริ่มต้น */
  menu: string;
  /** เงื่อนไขก่อนทดสอบ */
  preconditions: string[];
  /** ข้อมูลทดสอบที่แนะนำ */
  testData?: string[];
  /** ขั้นตอนการทดสอบ */
  steps: UATStep[];
  /** ผลลัพธ์ที่คาดหวังโดยรวม (Acceptance Criteria) */
  acceptanceCriteria: string[];
  /** จุดที่ต้องตรวจสอบเพิ่มเติม (เชื่อมโยงเมนูอื่น) */
  crossCheck?: { menu: string; verify: string }[];
  /** ระดับความสำคัญ */
  priority: "Critical" | "High" | "Medium" | "Low";
}

export interface UATModule {
  id: string;
  title: string;
  description: string;
  cases: UATCase[];
}
