---
name: MP Workflow Master Data + Swap + Assessment
description: Phase 0 (4 mp_* master tables + SimpleListManager + 4 Selects), Phase 1 (Swap Wizard at /swap with swap_requests/swap_executions), Phase 2 (Assessment Log at /assessment with assessment_logs)
type: feature
---
- Master Data หมวด Media Player ขยายเพิ่ม 4 ตาราง: `mp_symptoms`, `mp_assessment_results`, `mp_swap_reject_reasons`, `mp_claim_results` — จัดการผ่าน `SimpleListManager` (CRUD/sort/soft delete) ใน `/master-data` แท็บ Media Player
- Reusable Selects: `SymptomSelect`, `AssessmentResultSelect`, `SwapRejectReasonSelect`, `ClaimResultSelect` — มีปุ่ม ⚙️ ไปจัดการเฉพาะ Super Admin
- **Phase 1 Swap Wizard** (`/swap`): 2 ตาราง `swap_requests` + `swap_executions`. Wizard 3 ขั้น (เลือก Spare → เลือกเครื่องเก่า + คลังปลายทาง → Approve/Reject). Doc no: `SWP-YYYYMMDD-####`
- **Phase 2 Assessment Log** (`/assessment`): ตาราง `assessment_logs` บันทึกผลการประเมินอุปกรณ์/Media Player ที่ถอนกลับมา (อาการเสีย + ผลประเมิน + คำแนะนำ + ผู้ประเมิน). Subject = media_player หรือ equipment_serial_number. รองรับสถานะ pending/completed. Doc no auto: `ASM-YYYYMMDD-####`. ใช้ `SymptomSelect` + `AssessmentResultSelect`
- กฎสำคัญ: Dropdown/Filter ทุกตัวใน workflow ใหม่ต้องเก็บใน mp_* tables เท่านั้น ห้าม hardcode
- เหลือทำ: Phase 3 Claim Tracker (`/claims` + `claim_records` + warranty validation)
