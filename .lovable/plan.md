## เป้าหมาย

1. เพิ่ม **หมวดหมู่ย่อยเครื่องมือ** ให้ผูกกับหมวดหมู่หลักเครื่องมือ (คล้ายอุปกรณ์)
2. ออกแบบการจัดการหมวดหมู่ที่หน้า **Master Data → หมวดหมู่** ให้แยก "อุปกรณ์" กับ "เครื่องมือ" ชัดเจน ไม่สับสน

---

## Part 1: เพิ่มหมวดหมู่ย่อยของเครื่องมือ

### ฐานข้อมูล (migration)
- สร้างตารางใหม่ `public.tool_subcategories`
  - fields: `name`, `description`, `tool_category_id` (FK → tool_categories), `is_active`
  - มาตรฐาน RLS + GRANT + trigger updated_at ตามระบบ
- เพิ่มคอลัมน์ `tool_subcategory_id` (nullable) ในตาราง `tools`

### UI Component
- สร้าง `src/components/tools/ToolSubcategorySelect.tsx` (โมเดลเดียวกับ `SubcategorySelect.tsx` ของอุปกรณ์):
  - รับ prop `toolCategoryId` เพื่อกรองหมวดหมู่ย่อยตามหมวดหมู่หลักที่เลือก
  - มีปุ่ม ⚙ จัดการ CRUD หมวดหมู่ย่อย (เลือกหมวดหมู่หลักในฟอร์ม)
  - ถ้ายังไม่เลือกหมวดหมู่หลัก → disable + placeholder "เลือกหมวดหมู่เครื่องมือก่อน"

### แก้ ToolForm / ToolEditForm
- ใต้ช่อง "หมวดหมู่เครื่องมือ" ใน grid → เพิ่มช่อง **"หมวดหมู่ย่อยเครื่องมือ"**
- reset ค่า subcategory เมื่อเปลี่ยน category
- บันทึก `tool_subcategory_id` ลง DB

### หน้าอื่นที่แสดง/import
- `ToolList` + Excel export → เพิ่มคอลัมน์ "หมวดหมู่ย่อย"
- `ToolImport` template → เพิ่มคอลัมน์ `tool_subcategory` (match ตามชื่อ + tool_category)

---

## Part 2: ออกแบบหน้า Master Data → "หมวดหมู่" ให้แยกอุปกรณ์กับเครื่องมือ

### ปัญหาปัจจุบัน
Tab "หมวดหมู่" (ภาพที่ 2) แสดงเฉพาะ **หมวดหมู่หลัก/ย่อยของอุปกรณ์** ส่วน **หมวดหมู่เครื่องมือ** ไปแอบอยู่ในปุ่ม ⚙ ของฟอร์มเพิ่มเครื่องมือเท่านั้น → ผู้ใช้หายาก และหลังเพิ่มหมวดหมู่ย่อยเครื่องมือแล้วจะยิ่งซ้อนกัน

### แนวทางออกแบบ (เลือกใช้ Sub-tab ภายในแท็บ "หมวดหมู่")

```text
Master Data
└── แท็บ "หมวดหมู่"
    ├── Sub-tab: [ อุปกรณ์ ]  ← default
    │   ├── การ์ด "หมวดหมู่หลัก (อุปกรณ์)"
    │   └── การ์ด "หมวดหมู่ย่อย (อุปกรณ์)"  → dropdown กรองตามหมวดหลัก
    │
    └── Sub-tab: [ เครื่องมือ ]
        ├── การ์ด "หมวดหมู่หลัก (เครื่องมือ)"
        └── การ์ด "หมวดหมู่ย่อย (เครื่องมือ)"  → dropdown กรองตามหมวดหลัก
```

เหตุผลที่เลือกวิธีนี้:
- ใช้ layout เดิม (การ์ดคู่ หลัก/ย่อย) ที่ผู้ใช้คุ้นแล้ว → คงความคุ้นเคย
- แยก scope ชัดเจนด้วย sub-tab หัวสี ป้องกันสร้าง "หมวดหมู่อุปกรณ์" ผิดไปโผล่ในเครื่องมือ
- ไม่ต้องเพิ่มเมนูใหม่ในไซด์บาร์
- ปุ่ม ⚙ ในฟอร์มเพิ่มเครื่องมือ/อุปกรณ์ยังใช้งานได้ (สำหรับสร้างเร็ว ๆ ระหว่างกรอกฟอร์ม)

### สิ่งที่ต้องแก้
- `src/pages/MasterData.tsx` (หรือ component ของแท็บหมวดหมู่) → เพิ่ม `<Tabs>` ระดับใน ที่มี 2 sub-tab
- ใต้ sub-tab "เครื่องมือ" → render component ใหม่ 2 ตัว:
  - `ToolCategoryList` (การ์ดหมวดหมู่หลักเครื่องมือ + ปุ่มเพิ่ม/แก้/ลบ)
  - `ToolSubcategoryList` (การ์ดหมวดหมู่ย่อยเครื่องมือ + dropdown filter หมวดหมู่หลัก)
- Sub-tab "อุปกรณ์" คงของเดิม

---

## ไฟล์ที่จะสร้าง / แก้

**สร้างใหม่**
- migration: `tool_subcategories` + `tools.tool_subcategory_id`
- `src/components/tools/ToolSubcategorySelect.tsx`
- `src/components/tools/ToolCategoryList.tsx` (การ์ดจัดการหมวดหมู่หลักเครื่องมือ)
- `src/components/tools/ToolSubcategoryList.tsx` (การ์ดจัดการหมวดหมู่ย่อยเครื่องมือ)

**แก้**
- `src/components/tools/ToolForm.tsx` + `ToolEditForm.tsx` → เพิ่มช่องหมวดหมู่ย่อย
- `src/components/tools/ToolList.tsx` → คอลัมน์หมวดหมู่ย่อย
- `src/components/tools/ToolImport.tsx` + template → รองรับ subcategory
- `src/pages/MasterData.tsx` → เพิ่ม sub-tab อุปกรณ์/เครื่องมือ ในแท็บหมวดหมู่

**ไม่แตะ**: ตาราง `categories`/`subcategories` และหน้าอื่นที่ใช้อยู่