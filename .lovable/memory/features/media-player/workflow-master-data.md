---
name: Asset Workflow (Swap + Assessment + Claim) — Unified for MP & Equipment
description: Phase 0 (4 mp_* master tables), Phase 1 Swap Wizard /swap (auto-select old unit when single match), Phase 2 Assessment /assessment, Phase 3 Claim /claims, Phase 4 Unification — moved menus to "จัดการทรัพย์สิน" group + neutral wording + prefill shortcuts from Defective Returns
type: feature
---
- Master Data หมวด Media Player ขยายเพิ่ม 4 ตาราง: `mp_symptoms`, `mp_assessment_results`, `mp_swap_reject_reasons`, `mp_claim_results` — จัดการผ่าน `SimpleListManager` ใน `/master-data` แท็บ Media Player
- Reusable Selects: `SymptomSelect`, `AssessmentResultSelect`, `SwapRejectReasonSelect`, `ClaimResultSelect` (ปุ่ม ⚙️ เฉพาะ Super Admin)
- **Swap Wizard** (`/swap`): ตาราง `swap_requests` + `swap_executions`. Wizard 3 ขั้น. Doc no: `SWP-YYYYMMDD-####`. **Auto-select เครื่องเก่า** เมื่อป้ายมีอุปกรณ์ชนิดเดียวกับ Spare เพียง 1 ชิ้น หรือป้ายมีอุปกรณ์ติดตั้งอยู่ทั้งหมดแค่ 1 ชิ้น พร้อม banner เตือนเมื่อป้ายไม่มีของชนิดเดียวกัน
- **Assessment Log** (`/assessment`): ตาราง `assessment_logs`. Doc no: `ASM-YYYYMMDD-####`. รับ `location.state.prefill` เพื่อ pre-fill subject + อาการจากหน้าอื่น
- **Claim Tracker** (`/claims`): ตาราง `claim_records`. Workflow pending → submitted → returned → closed. Doc no: `CLM-YYYYMMDD-####`. Auto-fill warranty + supplier. รับ `location.state.prefill` ได้
- **Phase 4 Unification (Asset Workflow)**: รวม Swap/Assessment/Claim ไว้ใต้กลุ่ม Sidebar **"จัดการทรัพย์สิน"** (ย้ายออกจาก Media Player) เพื่อสะท้อนว่ารองรับทั้ง MP + Equipment + อะไหล่ทุกชนิด ปรับ wording หัวข้อหน้าให้เป็นกลาง (Swap อุปกรณ์/MP, บันทึกการประเมินทรัพย์สิน, ติดตามการเคลมทรัพย์สิน). หน้า `DefectiveReturnEntry` มีปุ่ม "ส่งประเมิน" + "ส่งเคลม" ที่ส่ง prefill (subject id, serial, อาการ) ผ่าน `navigate(..., { state: { prefill } })` ไปหน้าปลายทาง
- กฎสำคัญ: Dropdown/Filter ทุกตัวใน workflow ใหม่ต้องเก็บใน mp_* tables เท่านั้น ห้าม hardcode
