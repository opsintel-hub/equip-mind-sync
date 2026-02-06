
# แผนการพัฒนา: ผูกวัตถุประสงค์การเบิกกับหมวดหมู่สินค้า

## สรุปภาพรวม
เพิ่มความสามารถในการกำหนดว่าแต่ละวัตถุประสงค์การเบิกสามารถเบิกสินค้าจากหมวดหมู่ใดได้บ้าง เพื่อควบคุมการเบิกให้ถูกต้องและลดข้อผิดพลาด

---

## ส่วนที่ 1: ปรับปรุงฐานข้อมูล

### 1.1 สร้างตาราง Junction Table
สร้างตาราง `issue_purpose_categories` สำหรับเก็บความสัมพันธ์แบบ Many-to-Many

```text
+---------------------------+
| issue_purpose_categories  |
+---------------------------+
| id (UUID, PK)             |
| issue_purpose_id (FK)     |  --> issue_purposes.id
| category_id (FK)          |  --> categories.id
| created_at                |
+---------------------------+
```

### 1.2 เพิ่มคอลัมน์ allow_all_categories
เพิ่มคอลัมน์ใน `issue_purposes` สำหรับกรณี "เบิกได้ทุกหมวดหมู่"

```text
ALTER TABLE issue_purposes ADD COLUMN allow_all_categories BOOLEAN DEFAULT false;
```

---

## ส่วนที่ 2: ปรับปรุง UI หน้าข้อมูลหลัก > วัตถุประสงค์เบิก

### 2.1 ฟอร์มเพิ่ม/แก้ไขวัตถุประสงค์ (IssuePurposeForm)
- เพิ่ม Checkbox "เบิกได้ทุกหมวดหมู่"
- เพิ่ม Multi-Select สำหรับเลือกหมวดหมู่ที่อนุญาต (แสดงเมื่อไม่ติ๊ก "เบิกได้ทุกหมวดหมู่")
- สามารถเลือกหลายหมวดหมู่พร้อมกัน

### 2.2 ตารางแสดงรายการ (IssuePurposeList)
- เพิ่มคอลัมน์ "หมวดหมู่ที่เบิกได้" แสดงเป็น Badge
- แสดง "ทุกหมวดหมู่" ถ้า allow_all_categories = true
- แสดงชื่อหมวดหมู่ที่เลือกไว้

---

## ส่วนที่ 3: ปรับปรุงหน้าขอเบิกสินค้า (IssueRequest)

### 3.1 กรองสินค้าตามหมวดหมู่ที่อนุญาต
เมื่อผู้ใช้เลือกวัตถุประสงค์:
- ถ้า allow_all_categories = true --> แสดงสินค้าทั้งหมด
- ถ้าไม่ --> กรองแสดงเฉพาะสินค้าในหมวดหมู่ที่ผูกไว้

### 3.2 แสดงข้อความแจ้งเตือน
แสดงข้อความบอกผู้ใช้ว่า "วัตถุประสงค์นี้เบิกได้เฉพาะ: [รายชื่อหมวดหมู่]"

---

## ส่วนที่ 4: รายละเอียดทางเทคนิค

### 4.1 Database Migration
```sql
-- สร้างตาราง junction
CREATE TABLE issue_purpose_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_purpose_id UUID NOT NULL REFERENCES issue_purposes(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(issue_purpose_id, category_id)
);

-- เพิ่มคอลัมน์ allow_all
ALTER TABLE issue_purposes 
ADD COLUMN allow_all_categories BOOLEAN DEFAULT false;

-- RLS Policies
ALTER TABLE issue_purpose_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated access" ON issue_purpose_categories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### 4.2 ไฟล์ที่ต้องแก้ไข
| ไฟล์ | การเปลี่ยนแปลง |
|------|---------------|
| `src/components/purpose/IssuePurposeForm.tsx` | เพิ่ม Multi-Select หมวดหมู่ |
| `src/components/purpose/IssuePurposeList.tsx` | เพิ่มคอลัมน์แสดงหมวดหมู่ที่ผูก |
| `src/pages/IssueRequest.tsx` | กรองสินค้าตามหมวดหมู่ที่อนุญาต |

### 4.3 Query สำหรับกรองสินค้า
```typescript
// ดึงหมวดหมู่ที่อนุญาตของวัตถุประสงค์
const { data: allowedCategories } = await supabase
  .from('issue_purpose_categories')
  .select('category_id')
  .eq('issue_purpose_id', selectedPurposeId);

// กรองสินค้าตามหมวดหมู่
const { data: equipment } = await supabase
  .from('equipment')
  .select('*')
  .in('category', allowedCategoryIds);
```

---

## ส่วนที่ 5: ตัวอย่างหน้าจอ

### 5.1 ฟอร์มเพิ่มวัตถุประสงค์ (ปรับปรุง)
```text
+------------------------------------------+
| เพิ่มวัตถุประสงค์การเบิก                   |
+------------------------------------------+
| ชื่อวัตถุประสงค์ *                         |
| [ซ่อมป้ายโฆษณา                         ] |
|                                          |
| คำอธิบาย                                  |
| [เบิกอะไหล่เพื่อซ่อมแซมป้าย              ] |
|                                          |
| เงื่อนไข:                                 |
| [x] ต้องระบุป้ายโฆษณา                     |
| [ ] ต้องรับคืนกลับคลัง                     |
|                                          |
| หมวดหมู่ที่เบิกได้:                        |
| [ ] เบิกได้ทุกหมวดหมู่                     |
|                                          |
| เลือกหมวดหมู่ที่อนุญาต *                   |
| [x] อะไหล่                                |
| [x] อุปกรณ์ไฟฟ้า                          |
| [x] วัสดุก่อสร้าง                          |
| [ ] เครื่องมือ                             |
| [ ] ภาพโฆษณา                             |
| [ ] วัสดุสิ้นเปลือง                        |
|                                          |
|              [ยกเลิก] [บันทึก]             |
+------------------------------------------+
```

### 5.2 ตารางวัตถุประสงค์ (ปรับปรุง)
```text
+----------------+-------------+--------------+-------------------+--------+--------+
| ชื่อวัตถุประสงค์  | คำอธิบาย     | เงื่อนไข       | หมวดหมู่ที่เบิกได้    | สถานะ   | จัดการ  |
+----------------+-------------+--------------+-------------------+--------+--------+
| ซ่อมป้ายโฆษณา   | เบิกเพื่อซ่อม | ต้องระบุป้าย   | อะไหล่, อุปกรณ์ไฟฟ้า | Active | [ลบ]   |
| ใช้งานทั่วไป     | เบิกทั่วไป   | -            | ทุกหมวดหมู่         | Active | [ลบ]   |
+----------------+-------------+--------------+-------------------+--------+--------+
```

---

## ส่วนที่ 6: ขั้นตอนการดำเนินงาน

1. **สร้าง Database Migration** - เพิ่มตารางและคอลัมน์ใหม่
2. **อัปเดต IssuePurposeForm** - เพิ่ม Multi-Select หมวดหมู่
3. **อัปเดต IssuePurposeList** - แสดงหมวดหมู่ที่ผูก
4. **อัปเดต IssueRequest** - กรองสินค้าตามหมวดหมู่ที่อนุญาต
5. **ทดสอบ** - ตรวจสอบการทำงานทั้งหมด

---

## ประโยชน์ที่จะได้รับ

- ควบคุมการเบิกได้ตรงตามวัตถุประสงค์
- ลดข้อผิดพลาดในการเบิกสินค้าผิดประเภท
- รายงานการใช้สินค้าแม่นยำขึ้น
- ง่ายต่อการ Setup และบริหารจัดการ
