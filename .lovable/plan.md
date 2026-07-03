
# เพิ่มข้อมูล Free-text / เหตุผล ที่ยังไม่ได้แสดงใน Source Timeline

หลังจัดระเบียบครั้งก่อน มีข้อมูลสำคัญที่เป็น **free-text / เหตุผล / หมายเหตุ** หลุดหายไป ต้องดึงกลับมาแสดง แต่ยังคงความ "ไม่รก" โดยแยกส่วนหลัก (บรรทัดสรุป) กับส่วน "รายละเอียด/หมายเหตุ" (แสดงต่อในบล็อกเดียวกัน ตัวเล็ก wrap)

## รายการที่ขาดหาย (จากการตรวจ schema เทียบ UI)

### 1. หน้า Assessment Log — Source Timeline
- **SWAP step** ยังขาด: `notes` (หมายเหตุงาน Swap), `technician_phone`
- **ของเสีย step** ยังขาด: `reason` (เหตุผลนำเข้าของเสีย — free-text สำคัญมาก), `item_condition`, `disposal_method`, `disposal_notes`, `rejection_reason` + `rejected_by_name` (กรณีถูก reject กลับ)
- **การ์ดหลักบันทึกประเมิน** ยังขาด: `recommended_action`, `notes` (หมายเหตุทั่วไป), `repair_result`, `repair_cost`, `repair_completed_at`, `external_repair_contact`/`phone`

### 2. หน้า Claim Tracker — Source Timeline
หลังจัดระเบียบเหลือเฉพาะ badge สรุป ต้องเพิ่ม free-text กลับ:
- **SWAP step** ขาด: `description` + `symptom_other` (อาการที่แจ้ง), `priority`, `notes`
- **ของเสีย step** ขาด: `reason` (เหตุผล), `item_condition`, `quantity`, `notes`, `disposal_notes`, `rejection_reason`
- **Assessment step** ขาด: `symptom_description`, `diagnosis_notes`, `recommended_action`, `repair_description`, `repair_result`, `repair_cost`, `repair_completed_at`, `notes`
- **Claim step (ตัวมันเอง)** ปัจจุบันมีแค่ doc_no+status — ต้องเพิ่ม: `submitter_name` + `submitted_at`, `claim_ticket_no`, `symptom_description`, `warranty_notes`, `is_under_warranty`, `notes`, `result_notes`, `cost_amount`, `receiver_name` + `returned_at`, `replacement_serial`, `restock_decision`

## แนวทางแสดงผล (คงความสะอาด)

ใน timeline card แต่ละ step ใช้ pattern เดิม (border-l สี + badge หัว + บรรทัด meta) แล้ว **เพิ่มบล็อก "รายละเอียด" ด้านล่างเป็น full-width** โดย:

```text
[SWAP] SWP-xxxx  03 ก.ค.  ช่าง: xxx  [status]
  อาการที่แจ้ง: ...........
  หมายเหตุ: ...........
```

- ใช้ `<div className="w-full text-[11px]">` สำหรับ free-text field เพื่อให้ขึ้นบรรทัดใหม่เต็มความกว้าง
- แสดง label เป็น muted, ค่าเป็น foreground
- ซ่อน field ที่ว่างเปล่า (conditional render)

## ไฟล์ที่แก้

1. **`src/pages/ClaimTracker.tsx`**
   - `fetchSourceChain`: เพิ่ม select field ที่ขาด (`swap_requests.notes/description/symptom_other/priority`, `defective_returns.reason/item_condition/quantity/notes/disposal_notes/rejection_reason`, `assessment_logs.diagnosis_notes/recommended_action/repair_description/repair_result/repair_cost/repair_completed_at/notes`)
   - Render 4 step แสดง free-text ครบ + Claim step โชว์ `submitter_name/submitted_at/claim_ticket_no/warranty_notes/is_under_warranty/notes/result_notes/cost_amount/receiver_name/returned_at/replacement_serial`

2. **`src/pages/AssessmentLog.tsx`**
   - `LogDetail` interface: เพิ่ม `swap_notes`, `defective_reason`, `defective_item_condition`, `defective_disposal_method`, `defective_disposal_notes`, `defective_rejection_reason`, `defective_rejected_by_name`
   - `fetchLogs`: เพิ่ม select column ที่ขาดจาก `swap_requests` และ `defective_returns`
   - `renderLogCard`:
     - Source Timeline SWAP: เพิ่มบรรทัด "หมายเหตุ"
     - Source Timeline ของเสีย: เพิ่ม "เหตุผล", "สภาพ", "วิธีจัดการ", "หมายเหตุจัดการ", กรณี rejected แสดง "เหตุผลที่ถูก reject"
     - การ์ดหลัก: เพิ่มแถว `recommended_action` (คำแนะนำ), `notes` (หมายเหตุ), ถ้าเป็น self_repair เพิ่ม `repair_result` + `repair_cost` + `repair_completed_at`, ถ้าเป็น claim เพิ่ม vendor contact/phone

## หลักการ

- ไม่เพิ่ม field ที่ไม่มีข้อมูล (ทุก field ต้อง conditional)
- ใช้ font ตัวเล็ก `text-[11px]` สำหรับ free-text ยาวเพื่อไม่รบกวนสายตา
- Free-text แต่ละอันขึ้นบรรทัดใหม่เต็มความกว้างด้วย `w-full`
