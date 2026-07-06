## เป้าหมาย
ลดความยุ่งยากของการตั้งสิทธิ์จาก 3 ขั้น (Role + ฟังก์ชัน + ฝ่าย) ให้เหลือ **1 คลิก** ผ่าน Preset สำเร็จรูป โดยยังเก็บ Wizard เดิมไว้เป็นโหมดขั้นสูง

## หลักการ: Preset คุมทุกอย่างในคลิกเดียว
แต่ละ Preset = แพ็กเกจสิทธิ์ครบชุด ประกอบด้วย 3 ส่วนที่เชื่อมกัน:
1. **Role** — บทบาทพื้นฐาน
2. **ฟังก์ชันที่เปิด** — คุมว่าจะเห็น **เมนู/แท็บ** ไหนบ้าง (Sidebar เช็ค `user_function_permissions` อยู่แล้ว → เมนูโผล่/หายอัตโนมัติ)
3. **สิทธิ์ในฝ่าย** — ดู/สร้าง/แก้/ลบ ในฝ่ายที่รับผิดชอบ

## Preset ที่จะมีให้เลือก

| Preset | Role | เมนูที่เห็น | สิทธิ์ในฝ่าย |
|---|---|---|---|
| **ผู้ดูแลระบบสูงสุด** | super_admin | ทุกเมนู รวม Master Data / OCR / System Settings | ดู+สร้าง+แก้+ลบ ทุกฝ่าย |
| **ผู้ดูแลระบบ (Admin)** | admin | ทุกเมนูปฏิบัติการ (ไม่รวม System Settings บางส่วน) | **ดู+สร้าง เฉพาะฝ่ายที่เลือก (หลายฝ่ายได้) — แก้/ลบ ไม่ได้** |
| **ผู้จัดการฝ่าย** | manager | Dashboard, รายงาน, อนุมัติคำขอ, Approval Center | ดู+แก้ เฉพาะฝ่ายที่เลือก |
| **เจ้าหน้าที่คลัง** | warehouse_staff | รับเข้าคลัง, จ่ายสินค้า, สต็อก, จัดเก็บ, DC, S/N | ดู+สร้าง+แก้ เฉพาะฝ่ายที่เลือก |
| **เจ้าหน้าที่รับเข้า** | receiver | นำสินค้าเข้า (Delivery Entry) เท่านั้น | ดู+สร้าง เฉพาะฝ่ายที่เลือก |
| **ผู้ขอเบิก** | requester | ขอเบิกสินค้า, ดูสถานะคำขอของตัวเอง | ดู+สร้าง เฉพาะฝ่ายที่เลือก |

> เอา **"ผู้ชมอย่างเดียว"** ออกตามที่ขอ
> **Admin ใหม่**: ไม่ใช่ super-user อีกต่อไป → ผูกกับฝ่ายที่เลือก (หลายฝ่ายได้) และแก้/ลบไม่ได้

## ผลกระทบต่อ Admin เดิม
- **RLS/UI ที่เคยเช็ค `has_role(admin)` แล้วเปิดทุกอย่าง** ต้องปรับให้ Admin ถูกจำกัดตามฝ่ายและไม่ให้ทำ update/delete
- สรุปการเปลี่ยน:
  - `has_department_permission()` — ปรับ: **admin ไม่ bypass อัตโนมัติอีกต่อไป** ต้องอ่านจาก `user_departments` เหมือน role อื่น (super_admin ยัง bypass)
  - RLS policies ที่ใช้ `has_role(uid,'admin')` สำหรับ UPDATE/DELETE → เปลี่ยนเป็น `has_role(uid,'super_admin')` เท่านั้น (ตารางหลัก เช่น profiles, media_player_images, goods_issue_pending, purchase_requests, master data)
  - UI ปุ่ม "แก้ไข/ลบ" ที่เช็ค `isAdmin` → เปลี่ยนเป็น `isSuperAdmin`
- **หมายเหตุความปลอดภัย**: การจำกัด Admin แบบนี้จะย้ายภาระ "ผู้ดูแลระบบเต็มรูปแบบ" ไปที่ Super Admin ทั้งหมด — ต้องมี Super Admin อย่างน้อย 1 คนเสมอ (จะเพิ่ม guard ห้ามลบ/ดาวน์เกรด Super Admin คนสุดท้าย)

## UI ที่จะเปลี่ยน

### 1. หน้ารายชื่อผู้ใช้ (UserPermissionManager)
เพิ่มแถบ **"ตั้งสิทธิ์เร็ว"** แทนคอลัมน์ "บทบาท" เดิม:
- **Dropdown Preset** (แสดง Preset ปัจจุบันของ user หรือ "ยังไม่ตั้ง")
- **Multi-select ฝ่าย** (chips) — default = ฝ่ายที่ผู้ใช้ขอตอนสมัคร
- ปุ่ม **"ใช้เลย"** — apply ทันที (เขียน user_roles + user_function_permissions + user_departments)
- ลิงก์เล็ก ๆ **"ตั้งค่าขั้นสูง"** → เปิด Wizard เดิม

Flow: เลือก Preset → เลือกฝ่าย(หลายได้) → กดใช้เลย → toast สำเร็จ

### 2. Preview ก่อนกดใช้
เมื่อเลือก Preset จะแสดง preview inline: "จะเปิดเมนู: รับเข้า, จ่าย, สต็อก... | สิทธิ์ในฝ่าย: ดู+สร้าง+แก้" เพื่อให้ Super Admin เห็นก่อนกด

### 3. หน้าคู่มือ (Help tab)
เพิ่มการ์ด **"Preset สิทธิ์"** ที่แสดงตารางข้างต้นแบบขยาย พร้อมรายชื่อเมนูจริงในแต่ละ Preset

### 4. Wizard เดิม
คงไว้เหมือนเดิม (เปิดผ่านลิงก์ "ตั้งค่าขั้นสูง") — สำหรับเคสพิเศษที่ต้องผสมสิทธิ์เอง

## รายละเอียดเทคนิค

### Data
- ใช้ตาราง `permission_templates` เดิม
- Migration:
  - เพิ่ม `is_quick_preset boolean default true`
  - อัปเดต seed 6 Preset ข้างต้น (พร้อม `suggested_functions` ที่ match กับ `SYSTEM_FUNCTIONS`)
  - ลบ preset "viewer/ผู้ชม" ออก
- แก้ `has_department_permission()`: ตัด admin bypass เหลือแค่ super_admin
- ปรับ RLS policies ที่ให้สิทธิ์ admin update/delete → เปลี่ยนเป็น super_admin เท่านั้น (ทำเป็น migration ใหม่)
- เพิ่ม trigger ป้องกันลบ/ดาวน์เกรด Super Admin คนสุดท้าย

### Code
- Helper ใหม่ `src/lib/permissions.ts` → `applyPresetToUser(userId, presetKey, departments)` ใช้ร่วมกันระหว่าง QuickPreset และ Wizard
- Component ใหม่ `QuickPresetSelector.tsx` ฝังในแถวผู้ใช้ของ `UserPermissionManager`
- `AppSidebar` ไม่ต้องแก้ — ใช้ `useFunctionPermissions` ที่มีอยู่แล้ว
- Sweep components ที่ใช้ `isAdmin` เพื่อ gate ปุ่ม edit/delete → เปลี่ยนเป็น `isSuperAdmin` (จะทำ audit list ตอน build)

## สิ่งที่ **ไม่** เปลี่ยน
- Schema ของ `user_roles`, `user_function_permissions`, `user_departments`
- หน้า Login/signup
- Sidebar และ logic การซ่อนเมนู (ทำงานอัตโนมัติจาก function permissions)
- Wizard เดิม (แค่ย้ายเป็นโหมดขั้นสูง)

## ผลลัพธ์
- เคสปกติ 90%: ตั้งสิทธิ์เสร็จใน 2 คลิก (เลือก Preset + ฝ่าย → ใช้เลย)
- Admin ถูกจำกัดตามฝ่ายและแก้/ลบไม่ได้ตามที่ต้องการ
- เคสพิเศษ: กด "ตั้งค่าขั้นสูง" เข้า Wizard เดิม