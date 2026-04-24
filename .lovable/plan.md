

## แผนเพิ่มเติม: ระบบ Master Data รองรับ Workflow ใหม่ (Swap / Assessment / Claim)

### สถานะปัจจุบัน
- **ยังไม่ได้สร้าง code** ของ Swap/Assessment/Claim — เพิ่งเสร็จขั้นวางแผน
- **Master Data หมวด Media Player** ปัจจุบันมีจัดการแค่: Status, Model, Specification, Name, CMS Type (จัดการผ่านปุ่ม ⚙️ ในฟอร์ม)
- ผู้ใช้เพิ่มข้อกำหนดใหม่: **ทุก Dropdown/Filter ที่ใช้ใน Workflow ใหม่ต้องเพิ่มเข้าไปใน Master Data หมวด Media Player ให้ Super Admin จัดการได้**

---

### Master Data ใหม่ที่ต้องสร้าง (4 ชุด)

```text
หน้า Master Data → แท็บ "จัดการ Media Player" (ขยายเพิ่ม)
┌────────────────────────────────────────────────────────┐
│ [เดิม] Status / Model / Spec / Name / CMS Type         │
│ ─────────────────────────────────────────────────────  │
│ [ใหม่] ▼ ตัวเลือกระบบ Workflow                          │
│                                                         │
│  ① อาการเสีย (Symptoms)                                 │
│     เช่น "จอดับ", "ไม่มีสัญญาณ", "Boot ไม่ขึ้น"        │
│     ใช้ใน: Swap Request, Assessment Diagnosis           │
│                                                         │
│  ② ผลการประเมิน (Assessment Results)                    │
│     เช่น "ซ่อมเองได้", "ส่งซ่อม", "เคลม", "Write-off" │
│     ใช้ใน: Assessment Workflow                          │
│                                                         │
│  ③ เหตุผลการ Reject Swap (Reject Reasons)              │
│     เช่น "Spare เสียเช่นกัน", "ผิดสเปก", "ไม่จำเป็น"   │
│     ใช้ใน: Swap Wizard ขั้น Confirm                    │
│                                                         │
│  ④ ผลการเคลม (Claim Results)                            │
│     เช่น "ซ่อมสำเร็จ", "ซ่อมไม่ได้", "เปลี่ยนเครื่อง" │
│     ใช้ใน: Claim Tracker ขั้นรับกลับ                   │
└────────────────────────────────────────────────────────┘
```

### โครงสร้างตาราง Master Data (Pattern เดียวกันทั้ง 4)

ทุกตารางใช้โครงสร้างเดียวกันเพื่อ reuse component ได้:

```sql
CREATE TABLE public.{name} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- RLS: Super Admin manage, authenticated read
```

| ตาราง | ใช้กับ Workflow |
|------|----------------|
| `mp_symptoms` | Swap Request + Assessment |
| `mp_assessment_results` | Assessment |
| `mp_swap_reject_reasons` | Swap Wizard |
| `mp_claim_results` | Claim Tracker |

---

### Component ที่ต้องสร้าง (Reusable Pattern)

**1. Generic CRUD Component**: `src/components/master-data/SimpleListManager.tsx`
- Props: `tableName`, `title`, `description`, `columns`
- รองรับ: เพิ่ม / แก้ไข / ลบ (soft delete) / sort
- ใช้กับทั้ง 4 ตาราง โดยส่ง `tableName` ต่างกัน — ลดงานเขียน UI ซ้ำ

**2. Reusable SearchableSelect**: 4 ตัว
- `SymptomSelect.tsx` — ใช้ใน Swap Request, Assessment
- `AssessmentResultSelect.tsx` — ใช้ใน Assessment
- `SwapRejectReasonSelect.tsx` — ใช้ใน Swap Wizard
- `ClaimResultSelect.tsx` — ใช้ใน Claim Tracker

ทุกตัวใช้ `SearchableSelect` เดิม + ปุ่ม "⚙️ จัดการรายการ" สำหรับเปิด dialog เพิ่ม/แก้ (เหมือน `StatusSelect.tsx` ปัจจุบัน) — Super Admin เห็นปุ่มนี้, User ทั่วไปเห็นเฉพาะ dropdown

---

### แก้ไข `src/pages/MasterData.tsx`

ขยายแท็บ "จัดการ Media Player" ให้มี 2 sub-section:

```text
┌─ TabsContent: media_player ────────────────────┐
│  ┌─ Section 1: ข้อมูล Media Player ───────────┐│
│  │  <MediaPlayerEntry />  (เดิม)              ││
│  └─────────────────────────────────────────────┘│
│  ┌─ Section 2: ตัวเลือก Workflow (ใหม่) ──────┐│
│  │  <SimpleListManager table="mp_symptoms" />  ││
│  │  <SimpleListManager table="mp_assessment_results" />│
│  │  <SimpleListManager table="mp_swap_reject_reasons" />│
│  │  <SimpleListManager table="mp_claim_results" />│
│  └─────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

แสดงเป็น 4 Card เรียงต่อกัน — แต่ละ Card มีปุ่ม "เพิ่มรายการ" ของตัวเอง

---

### แผน Implementation (ลำดับและสถานะ)

| Phase | งาน | สถานะ | หมายเหตุ |
|-------|-----|-------|---------|
| **0. Master Data รองรับล่วงหน้า** | สร้าง 4 ตาราง + Generic UI ใน Master Data | ⏳ เริ่มทำก่อน | ทำให้ Super Admin มีของพร้อมใช้ก่อน workflow มา |
| **1. Swap Wizard** | ตาราง `swap_requests` + `swap_executions` + UI 3-step | ⏳ ตามมา | ใช้ `SymptomSelect` + `SwapRejectReasonSelect` |
| **2. Assessment** | ตาราง `assessment_logs` + UI | ⏳ ตามมา | ใช้ `SymptomSelect` + `AssessmentResultSelect` |
| **3. Claim Tracker** | ตาราง `claim_records` + UI | ⏳ ตามมา | ใช้ `ClaimResultSelect` + auto warranty check |
| **4. Theme (optional)** | ปรับ tokens ใน `index.css` | ⏳ ทีหลัง | เฉพาะถ้าผู้ใช้ขอ |

**กฎสำคัญตามที่ผู้ใช้กำหนด**:
- ทุกครั้งที่สร้าง dropdown/filter ใหม่ในขั้น Phase 1-3 → **ต้องเพิ่มเข้า Master Data หมวด Media Player ก่อน** ห้าม hardcode option
- ถ้าทำไม่เสร็จในรอบเดียว → **แจ้ง progress** ทุกครั้งว่าเสร็จอะไร เหลืออะไร

---

### สิ่งที่จะลงมือทำในรอบถัดไป (Phase 0)

1. Migration: สร้าง 4 ตาราง + RLS + seed ค่า default ที่ใช้บ่อย
2. สร้าง `src/components/master-data/SimpleListManager.tsx` (CRUD reusable)
3. สร้าง 4 Select components (`SymptomSelect`, `AssessmentResultSelect`, `SwapRejectReasonSelect`, `ClaimResultSelect`)
4. แก้ `src/pages/MasterData.tsx` — ขยายแท็บ "จัดการ Media Player"
5. รายงาน progress ก่อนเริ่ม Phase 1 (Swap Wizard)

หลังเสร็จ Phase 0 จะมี Master Data ครบที่ Super Admin จัดการได้ → พร้อมเริ่ม Phase 1 (Swap Wizard) ได้ทันที

