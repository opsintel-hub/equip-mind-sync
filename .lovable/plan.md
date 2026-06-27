## ปัญหาที่พบ
ในหน้า "บันทึกผลการประเมิน" มี input ที่ทำหน้าที่ซ้ำซ้อนกัน 2 จุด:

1. **"ผลการประเมิน *"** (Dropdown ด้านบน) — มาจาก master data `mp_assessment_results`
   ตัวเลือก: `ซ่อมเองได้ → คืน Spare Pool`, `เคลมประกัน Vendor`, `Write-off (ใช้งานต่อไม่ได้)`, `รอประเมินเพิ่มเติม`
2. **"ผลการตัดสินใจ * (เลือก 1 ใน 3)"** (ปุ่มด้านล่าง) — hard-coded ในโค้ด
   ตัวเลือก: `1. เข้าของเสีย`, `2. ส่งเคลม`, `3. ซ่อมเอง`

โค้ดปัจจุบันบังคับให้ผู้ใช้เลือก "สองครั้งให้ตรงกัน" (เช่น Write-off + เข้าของเสีย) — ถ้าไม่ตรงปุ่มจะ disable ทำให้ผู้ใช้งง และไม่มี action สำหรับ "รอประเมินเพิ่มเติม" เลย

## แนวทางแก้ (UI/UX only)
รวมทั้งสองเป็น **แหล่งตัดสินใจเดียว** โดยใช้ Dropdown "ผลการประเมิน" เป็นตัวขับ outcome ตรง ๆ และลบบล็อกปุ่ม "ผลการตัดสินใจ" ออก

### Mapping ใหม่ (ผลการประเมิน → outcome + เงื่อนไขประกัน)
| ผลการประเมิน | outcome ที่ระบบบันทึก | เงื่อนไขประกัน |
|---|---|---|
| ซ่อมเองได้ → คืน Spare Pool | `self_repair` | เลือกได้เสมอ (ทั้งในและนอกประกัน) |
| เคลมประกัน Vendor | `claim` | **เฉพาะยังในประกัน** — ถ้าหมด/ไม่ทราบ → block + tooltip |
| Write-off (ใช้งานต่อไม่ได้) | `defective` | **เฉพาะหมดประกันเท่านั้น** — ถ้ายังในประกัน/ไม่ทราบ → block + tooltip ให้ไปเช็คข้อมูลประกันก่อน |
| รอประเมินเพิ่มเติม | *(ไม่ปิดงาน)* | บันทึก diagnosis/notes แต่คง `status=pending` ไว้ให้ช่างกลับมาทดสอบเพิ่ม |

### การเปลี่ยน UI
- **ลบ section** "ผลการตัดสินใจ * (เลือก 1 ใน 3)" ทั้งบล็อกออก
- ใต้ Dropdown "ผลการประเมิน" แสดง **inline badge อธิบาย action ที่จะเกิดขึ้น** เช่น
  - เลือก Write-off → badge แดง "จะสร้างใบนำของเสีย (DR) ส่งคลัง"
  - เลือก เคลม → badge ส้ม "จะสร้าง Claim record + ตัด stock เป็น in_claim"
  - เลือก ซ่อมเอง → badge ฟ้า "จะ flip สถานะเป็น under_repair + แสดงฟอร์มบันทึกการซ่อม"
  - เลือก รอประเมินเพิ่มเติม → badge เทา "ยังไม่ปิดงาน — บันทึก draft ไว้ให้กลับมาทำต่อ"
- ถ้าผลที่เลือกขัดกับสถานะประกัน → แสดง **Alert destructive ใต้ Dropdown** บอกเหตุผลแทนการ disable เงียบ ๆ และปุ่ม "บันทึกผล" ถูก disable พร้อม tooltip
- คงฟอร์มเสริมตาม outcome เดิมไว้ (ฟอร์มซ่อมเอง / supplier autofill สำหรับเคลม / checkbox ack สำหรับ defective)

### Backend
- ไม่แตะ schema, RLS, RPC, master data
- `outcome` ที่ส่งเข้า DB ยังเป็นค่าเดิม (`self_repair` / `claim` / `defective`) แค่ตัด state ตัวกลางออก
- กรณี "รอประเมินเพิ่มเติม": บันทึก `assessment_result_id`, `diagnosis_notes`, `notes` แต่ **ไม่** set `status=completed` และ **ไม่** ทำ side-effect (ไม่สร้าง DR/claim, ไม่ flip MP status)

### ไฟล์ที่แก้
- `src/components/assessment/AssessmentCompleteDialog.tsx` ทั้งหมด (ตัด OUTCOME_OPTIONS block, derive `outcome` จาก `assessmentResultName`, รวม warranty guard เข้ากับ dropdown, ใส่ branch "pending re-assessment")

ยืนยันแนวทางนี้ไหมครับ? หรืออยากให้คงปุ่ม "ผลการตัดสินใจ" ไว้แล้วซ่อน Dropdown ด้านบนแทน?