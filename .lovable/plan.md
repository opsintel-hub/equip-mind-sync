# แผน: เพิ่มปุ่ม AI แนะนำหมวดหมู่ในฟอร์มที่ผู้ใช้ใช้จริง

## ปัญหา
ตอนนี้ `CategorySuggestWizard` ถูกวางไว้แค่ที่ **ข้อมูลหลัก > หมวดหมู่** (CategoryAccordion) เท่านั้น จึงหาไม่เจอในหน้าที่ใช้งานจริง:
- ภาพ 1: `ToolForm` (ข้อมูลเครื่องมือ → เพิ่มเครื่องมือ) — ไม่มีปุ่ม AI
- ภาพ 2: `DeliveryEntry` (นำสินค้าใหม่เข้าระบบ) ตรงจุดกรอกสินค้าใหม่ที่ยังไม่มีในระบบ — ไม่มีปุ่ม AI

## สิ่งที่จะทำ

### 1) `src/components/tools/ToolForm.tsx`
- เพิ่มปุ่ม ✨ `CategorySuggestWizard` (entryType="tool", compact icon) วางไว้ท้ายแถวเดียวกับ "หมวดหมู่หลัก / หมวดหมู่ย่อย"
- เมื่อผู้ใช้เลือกผลลัพธ์: lookup ชื่อ main/sub จาก `tool_categories` / `tool_subcategories` แล้ว `form.setValue('tool_category_id', ...)` และ `tool_subcategory_id`
- จัดระเบียบ Popup ให้สวยขึ้น:
  - บีบ spacing ให้สม่ำเสมอ, group header ไอคอนสี ให้ขนาด/สีเสมอกัน
  - ช่อง "หมวดหมู่หลัก / หมวดหมู่ย่อย" เปลี่ยนเป็น 2 คอลัมน์ในบรรทัดเดียว โดยมีปุ่ม AI compact อยู่ท้ายบรรทัด (เหมือน pattern ปุ่มจัดการ Prefix/ยี่ห้อ)
  - ตรวจให้ Dialog scroll ภายใน (max-h + overflow-y-auto) ไม่ให้ปุ่มบันทึกหลุดจอ

### 2) `src/pages/DeliveryEntry.tsx`
- ในบล็อกสินค้าใหม่ (รอบๆ บรรทัด 2315 "หมวดหมู่ย่อย") เพิ่มปุ่ม ✨ `CategorySuggestWizard` (entryType="equipment", compact) วางข้าง label "หมวดหมู่หลัก/ย่อย"
- Callback `onPick(main, sub)` → ค้นหา id จาก state ของ categories/subcategories ที่โหลดอยู่ แล้ว set `selectedCategoryId` + `selectedSubcategoryId`
- ส่ง product name/usage เริ่มต้นจากช่อง "ชื่อสินค้าใหม่" ที่ผู้ใช้กรอก (ถ้ามี) — เพิ่ม prop `defaultProductName` ใน wizard

### 3) `src/components/category/CategorySuggestWizard.tsx` (ปรับเล็กน้อย)
- รับ prop optional `defaultProductName?: string` เพื่อ prefill

## ไฟล์ที่จะแก้
- `src/components/tools/ToolForm.tsx` — เพิ่มปุ่ม AI + จัด layout popup
- `src/pages/DeliveryEntry.tsx` — เพิ่มปุ่ม AI ในส่วนสินค้าใหม่
- `src/components/category/CategorySuggestWizard.tsx` — รับ `defaultProductName`

## ไม่แตะ
- Edge function `suggest-category` และ schema เดิม
- Logic การรับเข้า/บันทึกสินค้า
