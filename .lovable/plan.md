# แผน: กระบวนการกำหนดสิทธิ์ (3 ขั้นตอน) + เพิ่มช่องปรับสิทธิใน Dialog แก้ไขผู้ใช้

## ภาพรวมกระบวนการ (สิ่งที่จะสื่อสารในหน้า Admin)

```
[1] ตั้งมาตรฐาน (ครั้งเดียว)      [2] ผู้ใช้สมัคร → Admin ปรับ         [3] ปรับละเอียด/ Bulk
    Tab: คู่มือและแนวทางสิทธิ์         Tab: จัดการผู้ใช้ (Card view)         Tab: จัดการผู้ใช้ (Matrix view)
    - ทบทวน Role/Function             - รีวิวคำขอสมัคร                    - ติ๊ก/ยกเลิกสิทธิ์รายเมนู
    - แก้ Preset ให้ตรงธุรกิจ          - ปรับ Role + ฝ่ายใน Dialog          - Bulk หลายคนพร้อมกัน
                                       - Apply Preset ผ่าน Wizard           - Apply Preset ข้ามคน
```

## ปัญหาปัจจุบัน

Dialog "แก้ไขข้อมูลผู้ใช้" (ภาพที่ 4) มีแค่ ชื่อ / Display / เบอร์ / ฝ่าย
→ Super Admin **แก้บทบาท/สิทธิ์ตรงนั้นไม่ได้** ต้องปิด dialog แล้วกด Wizard อีกที
→ กรณีผู้ใช้สมัครมาแล้วเลือก Job Role ผิด (ภาพที่ 3) ควรแก้ได้ในหน้าเดียว

## สิ่งที่จะทำ

### 1) เพิ่มช่อง "บทบาท/Preset" ใน Edit User Dialog (Multi-Select)

ใน `src/components/admin/UserPermissionManager.tsx` — Dialog บรรทัด 979-1051

เพิ่มระหว่าง "ฝ่าย" กับปุ่ม "บันทึก":

- **ช่อง "บทบาทงาน (Preset)"** — Multi-select (checkbox list) แสดง `permission_templates` ทั้งหมด
  - Pre-check preset ที่ตรงกับสิทธิ์ผู้ใช้ปัจจุบัน (ใช้ `detectCurrentPresetKey`) + preset ที่ผู้ใช้ขอตอนสมัคร (`requested_job_role`) ถ้ายังไม่ตั้ง
  - เลือกได้หลายอัน (เช่น "ผู้เบิก" + "ผู้รับเหมา")
  - Badge แจ้ง "ผู้ใช้ขอสมัครเป็น: <label>" เหมือน field ฝ่าย
- **Behavior ตอน "บันทึก"**:
  - ถ้าเลือก preset ≥1: รวม `suggested_roles` + `suggested_functions` จากทุก preset (union), แล้วเรียก logic เดียวกับ `applyPresetToUser` แต่ merge หลาย preset:
    - `save_user_roles` ด้วย union ของ roles
    - Replace `user_function_permissions` ด้วย union ของ functions
    - Replace `user_departments` ด้วยฝ่ายที่เลือก (ใช้ default flags ของ preset แรก หรือ OR รวมทุก preset)
  - ถ้าไม่เลือก preset ใดเลย: อัปเดตแค่ profile fields (เหมือนเดิม) — ไม่แตะ roles/functions
- **หมายเหตุใต้ช่อง**: "ต้องการปรับแบบละเอียดรายเมนู? สลับไปมุมมอง **Matrix สิทธิ์** ด้านบน"

### 2) ปรับ Hint ในหน้า Card view ให้สื่อกระบวนการ 3 ขั้น

ใน `src/pages/Admin.tsx` (บรรทัดคำอธิบาย viewMode) — เพิ่มข้อความสั้น ๆ:

> "ขั้นตอน: (1) ตั้งมาตรฐานที่ Tab 'คู่มือฯ' → (2) แก้ Role/ฝ่าย/Preset ที่ Dialog แก้ไขผู้ใช้ → (3) ปรับละเอียดหรือ Bulk ที่ Matrix สิทธิ์"

### 3) เพิ่ม Section "ขั้นตอนกำหนดสิทธิ์" ใน Tab "คู่มือและแนวทางสิทธิ์"

เพิ่มการ์ดใหม่ก่อน "ระบบสิทธิ์ 3 ชั้น" แสดง flow 3 ขั้นตอนแบบ visual (ไอคอน + ลูกศร) ตรงกับที่วาดไว้ด้านบนของแผนนี้ เพื่อให้ Super Admin คนใหม่เข้าใจทันที

## รายละเอียดเทคนิค

**ไฟล์แก้:**
- `src/components/admin/UserPermissionManager.tsx`
  - เพิ่ม state: `editSelectedPresets: string[]`
  - โหลด presets ตอนเปิด dialog (ใช้ `fetchPermissionPresets()` ที่มีอยู่)
  - Pre-select ด้วย `detectCurrentPresetKey(presets, userRoles[selectedUser.id], userFunctionsByUser[selectedUser.id])` (ถ้าเจอ = 1 preset), มิฉะนั้นใช้ `requested_job_role`
  - UI: ใช้ `Popover` + `Command` (multi-check) หรือรายการ Checkbox กะทัดรัด — เลือกให้เข้ากับ pattern ที่ใช้ในหน้าอื่น
  - `handleSaveEdit`: หลัง update profile → ถ้ามี preset เลือก, run merge logic ข้างต้น
- `src/pages/Admin.tsx` — ปรับ 1 บรรทัด hint
- `src/pages/Admin.tsx` (Help tab) — เพิ่ม card "ขั้นตอนกำหนดสิทธิ์ 3 ขั้น"

**ไม่แตะ:** DB schema, Matrix component, Wizard component, Card view โครงสร้างเดิม

## ผลที่ได้

- Super Admin แก้ผู้ใช้ 1 คน ได้ครบใน dialog เดียว: ชื่อ + ฝ่าย + **บทบาท/สิทธิ์ (Multi Preset)**
- กระบวนการ 3 ขั้นชัดเจนบนหน้าจอ ผู้ใช้ใหม่เข้าใจว่าเริ่มตรงไหน ไปต่อยังไง
- Wizard/Matrix ยังใช้ได้เหมือนเดิมสำหรับงานละเอียด/Bulk
