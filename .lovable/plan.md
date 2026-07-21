
# แผนออกแบบ: นำเข้าเครื่องมือ + เบิก/คืนเครื่องมือ (Tool Loan)

ใช้ **โครงสร้างเดิมของ "ยืมอุปกรณ์" (equipment_loans)** ให้มากที่สุด แล้วเพิ่มฟีเจอร์เฉพาะเครื่องมือ เพื่อประหยัดเครดิตและผู้ใช้ไม่ต้องเรียนรู้ UI ใหม่

---

## ภาพรวม Flow

```text
[นำเข้า Excel] → tools (คลัง)
      │
      ▼
[ขอเบิกเครื่องมือ] ── approval_required? ──► [รอ Manager อนุมัติ] ──► [รอคลังจ่าย]
      │                       │
      │ (ไม่ต้องอนุมัติ)       ▼
      ▼                    [รอคลังจ่าย]
[คลังกดจ่าย] → สถานะ issued, holder = ผู้เบิก, ที่อยู่ = "อยู่กับ <ชื่อ>"
      │
      ├─► return_required=true  → [รอคืน] → [คืนคลัง] → in_stock
      └─► return_required=false → [ถือครองถาวร] (ยังรู้ว่าอยู่กับใคร)
```

Warranty: อ่านจาก `tools.warranty_expiry_date` เดิม — โชว์ badge หมด/ใกล้หมดในทุกหน้า (list, cart, holder view)

---

## Section A — นำเข้าเครื่องมือ (Tool Import)

ใช้ pattern `ImportPageShell` เดียวกับ Equipment/Media Player

### 1. Template Excel (`toolTemplate.ts`)
คอลัมน์:
- **บังคับ:** `code*`, `name*`, `category*`, `unit*`, `quantity*`, `department*`
- **ทั่วไป:** `subcategory`, `brand`, `serial_number`, `location_id`, `company_id`, `supplier_id`, `unit_price`
- **ประกัน/ทรัพย์สิน:** `has_warranty` (ใช่/ไม่), `warranty_expiry_date`, `is_asset` (ใช่/ไม่), `asset_code`
- **PM:** `pm_interval_months`, `pm_types` (คั่นด้วย `,` เช่น `visual,calibration`)
- **Flag:** `is_personal_tool` (ใช่/ไม่), `requires_approval` (ใช่/ไม่ — default ไม่), `return_required` (ใช่/ไม่ — default ใช่)
- **หมายเหตุ:** `notes`

Sheet อ้างอิงในไฟล์เดียว: หมวดหมู่/ฝ่าย/บริษัท/Supplier/Location (id + name) เหมือน template อื่น

### 2. RPC `import_tool_row(p jsonb)`
- ตรวจสิทธิ์ admin/super_admin
- กันซ้ำด้วย `code`
- Insert `tools` + stock_movement `receive` เริ่มต้น
- คืน `{success, tool_id, error}`

### 3. Page `src/pages/setup/ImportToolPage.tsx`
เพิ่ม route `/setup/import-tools` และปุ่ม "นำเข้าเครื่องมือ" ที่ **จัดการเครื่องมือ** (คู่กับปุ่ม + เพิ่ม)

---

## Section B — เบิก/คืนเครื่องมือ (Tool Loan)

ตัดสินใจ: **ขยาย `equipment_loans` ให้รองรับ tool** ดีที่สุด (โครง approve/return/tracker พร้อมใช้)

### 1. Schema เพิ่ม (migration)
เพิ่มคอลัมน์ใน `equipment_loans`:
- `tool_id uuid REFERENCES tools(id)` — nullable (คู่กับ `equipment_id` เดิม)
- `item_kind text CHECK (item_kind IN ('equipment','tool')) DEFAULT 'equipment'`
- `purpose text` — วัตถุประสงค์ (Calibrate / PM ตั๋ว TPM-xxxx / งานทั่วไป / อื่นๆ)
- `pm_task_id uuid` — ผูกกับตั๋ว PM (ถ้ามี, nullable)
- `return_required boolean DEFAULT true` — copy จาก `tools.return_required` ตอนสร้าง
- `holder_user_id uuid`, `holder_name text` — คนถือครองจริง (หลังจ่าย)

Constraint: ต้องมี `equipment_id` หรือ `tool_id` อย่างใดอย่างหนึ่ง

### 2. หน้า `EquipmentLoans.tsx` → เพิ่ม Tab
เปลี่ยน title เป็น "ยืม-คืนอุปกรณ์และเครื่องมือ" แล้ว:
- Tab "อุปกรณ์" (เดิม)
- Tab "เครื่องมือ" (ใหม่) — reuse `LoanRequestForm` + `LoanReturnDialog` พร้อม flag `kind="tool"`
- Filter/Pagination/ProcessTracker ใช้ของเดิม

### 3. LoanRequestForm (เพิ่มโหมด tool)
- เลือก tool จาก dropdown (กรองตามฝ่ายผู้ใช้, กรองตามคลังที่มีสิทธิ์)
- ช่อง **วัตถุประสงค์**: dropdown [Calibrate, PM (เลือกตั๋ว), งานทั่วไป, อื่นๆ]
  - ถ้าเลือก PM → SearchableSelect ตั๋ว `tool_pm_tasks` สถานะ pending ของ tool นั้น → auto-fill purpose
- ถ้า `tools.requires_approval = false` → ข้าม Manager approval, ไปสถานะ `pending_issue` เลย
- ถ้า `return_required = false` → แสดง warning "เครื่องมือนี้ไม่ต้องคืน" และไม่บังคับ due_date

### 4. คลังกดจ่าย (Issue)
- ตัด stock, log stock_movement `issue`
- Set `holder_user_id`, `holder_name` = ผู้เบิก
- ถ้า `return_required=false` → สถานะ `holding_permanent` (แทน `issued`)
- ถ้า `return_required=true` → `issued` รอคืน

### 5. คืน (Return)
- ใช้ `LoanReturnDialog` เดิม
- เพิ่มช่อง **สภาพหลังคืน** [ปกติ / ต้อง PM / ต้องซ่อม / ชำรุด]
  - "ต้อง PM" → auto สร้างตั๋ว PM
  - "ชำรุด" → ตัดเข้า WH-DEFECT (ใช้ workflow defective เดิม)

### 6. Tracking รายเครื่อง
- ที่ **จัดการเครื่องมือ** → คอลัมน์ใหม่ **"อยู่ที่ / ผู้ถือ"** — ถ้ามี loan active แสดง badge "อยู่กับ {holder_name}" คลิกไปหน้า loan detail
- ที่ **KPI PM Report** ตัว drill-down: เพิ่ม tab "ประวัติการเบิก" ของ tool นั้น

### 7. Warranty Alert
- Dashboard alert เดิม (`ExpiryWarrantyKPI`) ครอบคลุม `tools.warranty_expiry_date` อยู่แล้ว → ตรวจซ้ำและเพิ่ม toggle "รวมเครื่องมือ" ถ้ายังไม่มี

---

## Section C — เมนู/สิทธิ์

- Sidebar: ใต้ "เครื่องมือ" เพิ่ม
  - "ยืม-คืนเครื่องมือ" (link เข้า EquipmentLoans → tab เครื่องมือ) — ถ้าไม่อยากซ้ำ ใช้ query `?tab=tool`
- Function permission ใหม่:
  - `tool_loan_request` (ผู้เบิก)
  - `tool_loan_issue` (คลังจ่าย)
- Manager approval ใช้สิทธิ์ `manager_approval` เดิม (เฉพาะ tool ที่ `requires_approval=true`)

---

## รายละเอียดเทคนิค

- ไฟล์ใหม่: `src/lib/importTemplates/toolTemplate.ts`, `src/lib/importTemplates/validators.ts` (เพิ่ม `validateToolRows`), `src/pages/setup/ImportToolPage.tsx`, RPC `import_tool_row`
- ไฟล์แก้: `EquipmentLoans.tsx` (เพิ่ม tab kind), `LoanRequestForm.tsx` (โหมด tool + purpose), `LoanReturnDialog.tsx` (สภาพหลังคืน), `ToolList.tsx` (คอลัมน์ holder), `ToolManagement.tsx` (ปุ่ม Import), `AppSidebar.tsx`
- Migration: alter `equipment_loans`, add ENUM/columns บน `tools` (`requires_approval`, `return_required` ถ้ายังไม่มี), grants + policies เดิมครอบคลุมอยู่แล้ว
- ProcessTracker: เพิ่ม preset `getToolLoanSteps`

---

## จุดที่ต้องยืนยัน

1. **แชร์ตาราง `equipment_loans` กับเครื่องมือ** โอเคมั้ย (แนะนำ; ประหยัด/UI คุ้นเคย) หรือให้แยกเป็นตาราง `tool_loans` ใหม่?
2. Default ของเครื่องมือใหม่: `requires_approval=false`, `return_required=true` — ตกลงตามนี้?
3. "เครื่องมือประจำตัวช่าง (is_personal_tool)" → เบิกครั้งเดียวถือยาว = ตั้ง `return_required=false` อัตโนมัติ ใช่มั้ย?
