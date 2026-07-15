
# ปรับ UI หมวดหมู่: รวมหลัก-ย่อยเป็น Accordion Tree

## เป้าหมาย
แทนที่การแยก 2 ตาราง (หลัก / ย่อย) ในแต่ละ tab ด้วย **Accordion tree เดียว** ที่แสดงหมวดหมู่ย่อยไหลลงมาใต้หมวดหลัก กด ▼/▶ เพื่อขยาย-ยุบได้ ทำให้เห็นความสัมพันธ์ทันทีในหน้าจอเดียว

## ขอบเขต
ปรับทั้ง 2 tab ใน `MasterData → หมวดหมู่` ให้ใช้ pattern เดียวกัน:
- 📦 หมวดหมู่อุปกรณ์/อะไหล่ (`categories` + `subcategories`)
- 🔧 หมวดหมู่เครื่องมือ (`tool_categories` + `tool_subcategories`)

## หน้าตาที่จะได้

```text
[+ เพิ่มหมวดหมู่หลัก]        [ขยายทั้งหมด] [ยุบทั้งหมด]

▼ 📁 เครื่องมือช่างไฟฟ้า          [3 ย่อย] [ใช้งาน]  [✏️] [🗑️]
   ├─ 🔧 ไขควง                            [ใช้งาน]  [✏️] [🗑️]
   ├─ 🔧 คีม                              [ใช้งาน]  [✏️] [🗑️]
   ├─ 🔧 สว่าน                            [ใช้งาน]  [✏️] [🗑️]
   └─ [+ เพิ่มหมวดหมู่ย่อยในกลุ่มนี้]

▶ 📁 เครื่องมือช่างประปา          [5 ย่อย] [ใช้งาน]  [✏️] [🗑️]
▶ 📁 อุปกรณ์วัด                    [0 ย่อย] [ใช้งาน]  [✏️] [🗑️]
```

## พฤติกรรมหลัก

1. **Accordion** — คลิกหัวกลุ่ม (หรือลูกศร ▼/▶) เพื่อขยาย-ยุบ; ขยายได้หลายกลุ่มพร้อมกัน
2. **ปุ่ม "+ เพิ่มหมวดหมู่ย่อย" inline** ท้ายรายการย่อยของแต่ละกลุ่มที่ขยายอยู่ → เปิด dialog พร้อม **pre-fill หมวดหลัก** ให้อัตโนมัติ (ไม่ต้องเลือก dropdown อีก)
3. **ปุ่ม + เพิ่มหมวดหมู่หลัก** ด้านบนสุด
4. **แก้ไข/ลบ** ทั้งระดับหลักและย่อย ใช้ dialog เดิม (ตรรกะไม่เปลี่ยน)
5. **ป้องกันลบหลัก** ถ้ายังมีย่อยอยู่ (มีอยู่แล้ว)
6. **ปุ่ม ขยายทั้งหมด / ยุบทั้งหมด** ด้านบน
7. **จำสถานะ expand** ใน localStorage (key แยกต่อ tab) เพื่อไม่ต้องขยายใหม่ทุกครั้ง
8. **Badge นับจำนวนย่อย** ที่หัวกลุ่ม

## รายละเอียดทางเทคนิค

**Component ใหม่:**
- `src/components/category/CategoryAccordion.tsx` — reusable accordion tree ใช้ทั้ง equipment และ tools ผ่าน props:
  ```
  parentTable, childTable, childFkColumn, storageKey, labels
  ```
- ใช้ shadcn `Accordion` (`type="multiple"`) เป็นฐาน
- Query: โหลด parents + children พร้อมกัน แล้ว group ฝั่ง client (`children.filter(c => c.parent_id === parent.id)`)

**Dialog เพิ่ม/แก้ไข:**
- ใช้ dialog เดิมของ list components (CategoryList / SubcategoryList / ToolCategoryList / ToolSubcategoryList)
- Sub dialog รับ prop `defaultParentId` เพื่อ pre-fill เวลาเปิดจากปุ่ม inline

**ไฟล์ที่แก้:**
- สร้าง: `src/components/category/CategoryAccordion.tsx`
- แก้: `src/pages/MasterData.tsx` — เปลี่ยนเนื้อหาแต่ละ tab จาก 2 ตารางเป็น `<CategoryAccordion .../>` ตัวเดียว
- ปรับ dialog form ของ Subcategory/ToolSubcategory ให้รองรับ `defaultParentId`
- คงไฟล์เดิม `CategoryList`, `SubcategoryList`, `ToolCategoryList`, `ToolSubcategoryList` ไว้ (อาจ deprecate ทีหลัง) — เพื่อลดความเสี่ยง

## สิ่งที่ไม่ทำ (out of scope)
- ไม่ทำ drag & drop ย้ายหมวดย่อยข้ามหลัก (แก้ผ่านปุ่ม ✏️ ได้อยู่แล้ว)
- ไม่ทำ search box (เพิ่มภายหลังได้ถ้ารายการเยอะขึ้น)
- ไม่แตะ schema ฐานข้อมูล
