# ระบบระบุ "ป้ายที่รองรับ" สำหรับอุปกรณ์/อะไหล่ (Final v2 — ใช้ Package ช่วย)

## สรุปคำตอบผู้ใช้
1. **ไม่ backfill** — ของเก่า default `unrestricted`
2. **หน้าแก้เดียว** — `EquipmentEditForm` เป็น single source of truth ทุกเมนูลิงก์มาที่นี่
3. **หน้าเบิก**: แสดงทั้งหมด + badge เตือน + ต้องติ๊กยืนยันเมื่อเบิกข้ามป้าย (บันทึกเหตุผลใน notes)
4. **ใช้ Package ช่วยจัดกลุ่ม** — เลือกได้ทั้ง Package + ป้ายรายตัวในฟิลด์เดียวกัน
5. **หน้าค้นหาอะไหล่ตามป้าย** — เพิ่ม filter เลือกป้ายเพื่อดูว่าอะไหล่ตัวไหนใช้ได้กับป้ายนั้น

## Package ซ้อนกันไม่ชนข้อมูล ✅
ตาราง `billboard_package_items` PK = `(package_id, billboard_id)` — ป้ายเดียวอยู่หลาย Package ได้อิสระ (คนละ row) ไม่กระทบ compatibility เพราะระบบเก็บ **ป้ายที่ resolve แล้ว** ไม่ใช่ package_id (ดูข้อ 1 ด้านล่าง)

---

## 1. Database (Migration)

```sql
ALTER TABLE public.equipment
  ADD COLUMN billboard_compatibility_mode text NOT NULL DEFAULT 'unrestricted'
    CHECK (billboard_compatibility_mode IN ('unrestricted','multi_partial','specific')),
  ADD COLUMN compatibility_notes text;

-- เก็บป้ายที่ resolve แล้ว (จาก Package + ป้ายรายตัว รวมกัน)
CREATE TABLE public.equipment_billboard_compatibility (
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  billboard_id uuid NOT NULL REFERENCES public.billboards(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'manual', -- 'manual' | 'package'
  source_package_id uuid REFERENCES public.billboard_packages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (equipment_id, billboard_id)
);

-- เก็บ Package ที่ผู้ใช้เลือก (เพื่อ re-resolve ได้ถ้าสมาชิก Package เปลี่ยน)
CREATE TABLE public.equipment_compatibility_packages (
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.billboard_packages(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (equipment_id, package_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_billboard_compatibility TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_compatibility_packages TO authenticated;
GRANT ALL ON public.equipment_billboard_compatibility TO service_role;
GRANT ALL ON public.equipment_compatibility_packages TO service_role;

ALTER TABLE public.equipment_billboard_compatibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_compatibility_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read compat" ON public.equipment_billboard_compatibility
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "warehouse/admin write compat" ON public.equipment_billboard_compatibility
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_function_permission(auth.uid(),'goods_receipt'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_function_permission(auth.uid(),'goods_receipt'));

-- (นโยบายเดียวกันสำหรับ equipment_compatibility_packages)
CREATE POLICY "auth read compat pkg" ON public.equipment_compatibility_packages
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "warehouse/admin write compat pkg" ON public.equipment_compatibility_packages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_function_permission(auth.uid(),'goods_receipt'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_function_permission(auth.uid(),'goods_receipt'));

CREATE INDEX idx_ebc_billboard ON public.equipment_billboard_compatibility(billboard_id);
```

### RPC: `save_equipment_compatibility(equipment_id, mode, package_ids[], billboard_ids[], notes)`
- ถ้า `unrestricted` → เคลียร์ทั้ง 2 ตาราง
- อื่นๆ → เขียน `equipment_compatibility_packages` แล้ว **expand** สมาชิกของ package ทั้งหมด + `billboard_ids[]` (manual) รวมเป็น distinct set เขียนลง `equipment_billboard_compatibility` (upsert, source ระบุที่มา)

### Trigger: sync เมื่อสมาชิก Package เปลี่ยน
- Trigger บน `billboard_package_items` (AFTER INSERT/DELETE) → re-resolve ทุก equipment ที่ link Package นั้นให้ตรงกัน อัตโนมัติ (แก้ปัญหา "เพิ่มป้ายใน Pack A ภายหลัง")

### RPC `import_equipment_row` update
เพิ่ม params: `compatibility_mode`, `compatible_billboard_ids uuid[]`, `compatible_package_ids uuid[]`, `compatibility_notes`

---

## 2. UI — หน้าแก้ไขเดียว

### Component ใหม่: `src/components/equipment/BillboardCompatibilityField.tsx`
- **RadioGroup 3 โหมด**: unrestricted / multi_partial / specific
- เมื่อไม่ใช่ unrestricted แสดง 2 selector รวมกัน:
  - **`BillboardPackageMultiSelect`** (ใหม่) — เลือกได้หลาย Package + แสดง preview "จะได้ N ป้าย"
  - **`BillboardMultiSelect`** — ป้ายรายตัวเพิ่มเติม (นอกเหนือจาก Package)
- แสดง **preview รวม** ด้านล่าง: "รวมทั้งสิ้น 47 ป้าย (Package: 42, เพิ่มรายตัว: 5)" + collapse list
- Textarea "หมายเหตุความเข้ากันได้"
- ต้องมีสมาชิกรวม ≥ 1 (นับ resolved) เมื่อไม่ใช่ unrestricted

### เสียบเข้า `EquipmentEditForm` (+ `EquipmentForm` สร้างใหม่ถ้ายังไม่มี)
ทุก entry point ชี้มาที่ฟอร์มเดียว:
- Master Data → Equipment (list ปุ่มดินสอ)
- InventoryReport → ปุ่มดินสอทุกแถว
- StockCard header → "แก้ไขข้อมูลอุปกรณ์"
- EquipmentTrackingReport → ปุ่มดินสอ

---

## 3. แสดงผล (read-only badge)
เพิ่มคอลัมน์/badge ใน:
- EquipmentList, InventoryReport, StockCard, EquipmentTrackingReport, DeadStockReport
- 🟢 "ใช้ได้ทุกป้าย" / 🟡 "บางป้าย (N)" / 🔵 "เฉพาะป้าย (N)"
- Tooltip แสดง Package name + จำนวนป้ายรวม

---

## 4. หน้าเบิก / ค้นหา

### 4.1 IssueRequest (ผู้ขอเลือกป้ายปลายทางแล้ว)
- แสดงอุปกรณ์ทั้งหมด จัดกลุ่ม:
  - **ตรงป้าย** (`unrestricted` หรือมีป้ายนี้ใน compat set) — ปกติ
  - **ไม่ระบุว่ารองรับ** — badge ส้ม + tooltip "อาจใช้ไม่ได้กับป้ายนี้"
- เพิ่มลงตะกร้ารายการส้ม → dialog **"ยืนยันเบิกข้ามป้าย"** (checkbox บังคับ + textarea เหตุผล → บันทึกใน `goods_issue_pending_items.notes`)

### 4.2 InventoryReport / InventoryFilters
- เพิ่ม filter **"ป้ายที่รองรับ"** — เลือกได้ทั้ง Package + ป้ายรายตัว
- Query: `mode='unrestricted' OR EXISTS (compat WHERE billboard_id IN (:resolved_ids))`

### 4.3 GoodsIssue / IssueGoods (ฝั่ง Store)
- Header คำขอเห็น badge ต่อ row + แถบเตือนแดงถ้ามีรายการเบิกข้ามป้าย (พร้อมเหตุผล)

---

## 5. Import Template
- `equipmentTemplate.ts`: เพิ่มคอลัมน์
  - `billboard_compatibility_mode`
  - `compatible_package_names` (คั่น `|`)
  - `compatible_billboard_old_codes` (คั่น `|`)
  - `compatibility_notes`
- `validators.ts`: ถ้า mode ≠ unrestricted ต้องมี package หรือ billboard ≥ 1 (validate names/codes มีจริง)
- Instructions sheet: อธิบาย 3 โหมด + ตัวอย่างใช้ Package

---

## 6. ลำดับ Implementation
1. Migration + RPC `save_equipment_compatibility` + Trigger sync จาก `billboard_package_items`
2. Update `import_equipment_row` RPC
3. `BillboardPackageMultiSelect` + `BillboardCompatibilityField`
4. เสียบใน EquipmentForm + EquipmentEditForm
5. Badge/คอลัมน์ในทุก report + tooltip
6. Route ปุ่มแก้ไขจากทุก entry point → EquipmentEditForm
7. InventoryFilters + query compat
8. IssueRequest badge + dialog ยืนยันเบิกข้ามป้าย
9. GoodsIssue/IssueGoods แสดง badge + warning
10. Import template + validator
11. อัปเดต `mem://features/inventory/*` + `mem://features/billboard/package-management`

---

## 7. ข้อกังวลที่ตอบแล้ว
- **Package ซ้อนกัน**: ไม่ชน — PK `(package_id, billboard_id)`; ตอน resolve เป็น distinct set
- **สมาชิก Package เปลี่ยนภายหลัง**: Trigger auto-sync compat set
- **ลบ Package**: ON DELETE CASCADE ใน `equipment_compatibility_packages` + จะเหลือเฉพาะป้ายที่ระบุ manual (source='manual')
- **Multi_partial กับ Package 100 ป้าย**: 1 คลิกเลือก Package = ครอบ 100 ป้าย ผู้ใช้ไม่ต้องคลิกทีละป้าย

## 8. ขอบเขต (คงเดิม)
- **ไม่แตะ**: `media_players`, `advertisements`, `billboard_equipment` (ตารางติดตั้งจริง)
- **ไม่ backfill** — ของเก่า mode = `unrestricted`
