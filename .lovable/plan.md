# แผนปรับปรุง 5 ประเด็น

## 1) ยุบปุ่ม Import Excel / เพิ่มเครื่องมือ ให้เหลือที่เดียว (เฉพาะ Admin)

**เป้าหมาย:** ปุ่มอยู่แค่ที่ `ข้อมูลหลัก > เครื่องมือ > รายการเครื่องมือ` และ**เห็นเฉพาะ Admin/Super Admin**

- `src/pages/ToolManagement.tsx` — ลบ/ซ่อนปุ่ม `Import Excel` และ `+ เพิ่มเครื่องมือ` ที่ header หน้าจัดการเครื่องมือ (ภาพที่ 1)
- `src/pages/MasterData.tsx` sub-tab "รายการเครื่องมือ" — ห่อ 2 ปุ่มด้วยการเช็คสิทธิ์: แสดงเมื่อ `isSuperAdmin || hasRole('admin')` เท่านั้น (ใช้ `useIsSuperAdmin` + query `user_roles`)
- Route `/setup/import-tools` — คงไว้แต่ป้องกันด้วย role check ที่ตัว page (redirect ถ้าไม่ใช่ admin)
- ปรับข้อความ empty state ใน `ToolList.tsx` ให้ชี้ว่า "ติดต่อ Admin เพื่อเพิ่มเครื่องมือ" สำหรับ user ทั่วไป

## 2) ผู้ใช้ที่ถูกลบยังเข้าระบบได้ — ตรวจสอบทั้งลูป

**การตรวจสอบก่อนแก้:**
- อ่าน edge function `delete-user` เพื่อยืนยันว่าเรียก `auth.admin.deleteUser()` หรือแค่ตั้ง flag ใน profiles
- ตรวจ `profiles` schema หา column เช่น `is_deleted` / `is_active` / `banned_until`
- ตรวจ session guard ที่ `ProtectedRoute.tsx` และ `useAuth.tsx`

**แนวทางแก้ (จะยืนยันหลังตรวจ):**
- ถ้า edge function ยังไม่ได้ `deleteUser` จริง → เพิ่มการ ban ผู้ใช้ (`banned_until = 'infinity'`) + revoke sessions (`auth.admin.signOut(userId, 'global')`)
- เพิ่ม guard ที่ `ProtectedRoute`: หลัง `getUser()` เช็ค `profiles.is_deleted` ถ้า true → `supabase.auth.signOut()` + redirect `/login`
- เพิ่ม RLS/trigger บน `profiles` เพื่อกัน re-activate

## 3) ย้าย Tab "ตั้งค่า OCR" ออกจากหน้าจัดการผู้ใช้ → ไปเป็น sub-tab ท้าย tabs ในหน้า `ข้อมูลหลัก`

- `src/pages/Admin.tsx` — ลบ tab "ตั้งค่า OCR" และปุ่มลัด (ภาพที่ 4)
- `src/pages/MasterData.tsx` — เพิ่ม tab ใหม่ต่อจาก "จัดการ Media Player" ชื่อ `ตั้งค่า OCR` ที่ render `<OCRConfigManager />` (ภาพที่ 5)
- สิทธิ์: จำกัด tab นี้ให้เห็นเฉพาะ Admin/Super Admin

## 4) เพิ่มช่องค้นหาบริษัท (ภาพที่ 6)

- `src/components/company/CompanyList.tsx` — เพิ่ม `<Input>` ค้นหาด้านบนตาราง filter ตาม: ชื่อบริษัท, รหัส, ฝ่าย (client-side substring, case-insensitive)
- คงปุ่ม `แสดงบริษัทที่ซ่อน` + `+ เพิ่มบริษัท` ไว้ที่เดิม

## 5) OCR: ชื่อบริษัทในไฟล์เป็นภาษาอังกฤษ แต่ใน DB เป็นไทย

**สภาพจริง:** PO ที่แนบ (`PO26070022_เอ็มบีเอ.pdf`) มี supplier เป็นชื่อภาษาอังกฤษ ขณะที่ `companies.name` ใน DB เป็นภาษาไทย → fuzzy match ปัจจุบันหาไม่เจอ

**ทางเลือก (3 วิธี):**

| # | วิธี | ข้อดี | ข้อเสีย |
|---|---|---|---|
| A | เพิ่มคอลัมน์ `name_en` / `aliases` (jsonb) ใน `companies` และให้ OCR match ทั้งไทย+อังกฤษ+alias | ยืดหยุ่นที่สุด รองรับหลายชื่อ/ตัวย่อ/พิมพ์ผิด | ต้องกรอกข้อมูล alias เอง (แต่ทำครั้งเดียว) |
| B | ใช้ AI (Lovable AI) เรียกใน edge function `ocr-purchase-order` ให้แปล/แม็พชื่อ EN→รายการบริษัทไทยใน DB ด้วย embedding หรือ prompt matching | ไม่ต้องกรอก alias มือ | ใช้เครดิต AI ทุกครั้ง, ความแม่นยำขึ้นกับ prompt |
| C | Manual dropdown fallback ใน UI OCR — ถ้า match ไม่ได้ ให้ user เลือกเอง + ปุ่ม "จำ mapping นี้" (บันทึกลง alias) | ง่ายที่สุด, เรียนรู้เพิ่มขึ้นเรื่อยๆ | ครั้งแรก user ต้องเลือกเองทุกบริษัทใหม่ |

**แนะนำ: A + C ผสมกัน**
- เพิ่ม `companies.aliases text[]` (หรือ `name_en text`) — migration เดียว
- Import ครั้งแรก: seed alias อังกฤษให้บริษัทหลักด้วยตาราง mapping ที่มีอยู่ (หรือให้ user กรอกใน company edit dialog)
- OCR: match ตาม `name` OR `aliases` (case-insensitive, substring/token overlap)
- ถ้ายัง match ไม่ได้ → dropdown fallback + ปุ่ม "จำชื่อนี้เป็น alias ของบริษัท X" (auto-append เข้า `aliases`) → ครั้งต่อไป match อัตโนมัติ
- **ประหยัดเครดิตกว่า B** และแม่นยำขึ้นเรื่อยๆ

## ขั้นตอนดำเนินการ

1. อ่านโค้ดยืนยัน: `Admin.tsx`, `MasterData.tsx`, `ToolManagement.tsx`, `CompanyList.tsx`, `ProtectedRoute.tsx`, `useAuth.tsx`, `delete-user/index.ts`, schema `profiles` + `companies`
2. Migration: `companies.aliases text[]` + (ถ้าจำเป็น) `profiles.is_deleted boolean`
3. แก้โค้ดตามข้อ 1–5
4. Verify: build, ทดสอบ flow ลบ user แล้ว login ไม่ได้, OCR match ผ่าน alias

## คำถามยืนยัน

- ข้อ 5: ยืนยันเลือกแนวทาง **A + C** (alias + manual learn) ใช่ไหม? หรืออยากลอง B (AI matching) ด้วย?
