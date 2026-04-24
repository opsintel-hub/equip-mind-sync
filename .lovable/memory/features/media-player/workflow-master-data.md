---
name: MP Workflow Master Data + Swap Wizard
description: Phase 0 (4 mp_* master tables + SimpleListManager + 4 Selects) and Phase 1 (Swap Wizard at /swap with 2 tables swap_requests/swap_executions, 3-step dialog using BillboardSelect + SymptomSelect + SwapRejectReasonSelect)
type: feature
---
- Master Data หมวด Media Player ขยายเพิ่ม 4 ตาราง: `mp_symptoms`, `mp_assessment_results`, `mp_swap_reject_reasons`, `mp_claim_results` — จัดการผ่าน `SimpleListManager` (CRUD/sort/soft delete) ใน `/master-data` แท็บ Media Player
- Reusable Selects: `SymptomSelect`, `AssessmentResultSelect`, `SwapRejectReasonSelect`, `ClaimResultSelect` — มีปุ่ม ⚙️ ไปจัดการเฉพาะ Super Admin
- **Phase 1 Swap Wizard** (`/swap`): 2 ตาราง `swap_requests` + `swap_executions`. Wizard 3 ขั้น: (1) เลือก Spare จาก media_players หรือ equipment_serial_numbers (2) เลือกเครื่องเก่าจาก billboard_equipment + คลังปลายทาง (3) Approve/Reject พร้อม reject reason. Doc no auto: `SWP-YYYYMMDD-####`
- กฎสำคัญ: Dropdown/Filter ทุกตัวใน workflow ใหม่ต้องเก็บใน mp_* tables เท่านั้น ห้าม hardcode
- เหลือทำ: Phase 2 Assessment (`/assessment` + `assessment_logs`), Phase 3 Claim Tracker (`/claims` + `claim_records` + warranty validation)
