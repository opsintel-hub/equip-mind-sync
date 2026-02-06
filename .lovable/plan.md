
# แผนการปรับปรุง: รองรับการนำเข้าสินค้าใหม่ที่ไม่มีในระบบ

## สรุปปัญหาปัจจุบัน

ปัจจุบันหน้า "นำสินค้าเข้า" (Delivery Entry) บังคับให้ผู้ใช้ต้องเลือกสินค้าจาก Dropdown (`selectedEquipmentId`) ก่อนถึงจะเพิ่มลงตะกร้าได้ ทำให้ไม่สามารถนำเข้าสินค้าใหม่ที่ยังไม่มีในระบบได้

---

## แนวทางแก้ไข: สร้างรหัสสินค้าชั่วคราว

เมื่อผู้ใช้ไม่เลือกสินค้าจาก Dropdown ระบบจะ:
1. สร้างรหัสสินค้าชั่วคราว (เช่น `TEMP-20260206-001`)
2. บังคับให้กรอกข้อมูลจำเป็น: **ชื่อสินค้า + หมวดหมู่ + หมวดหมู่ย่อย + รูปภาพ**
3. ส่งข้อมูลไปยังขั้นตอน "รับเข้าคลัง" เพื่อให้เจ้าหน้าที่คลังสร้างรหัสสินค้าถาวรภายหลัง

---

## ส่วนที่ 1: UI สำหรับกรอกข้อมูลสินค้าใหม่

### 1.1 เพิ่มช่องกรอกชื่อสินค้า (กรณีไม่เลือกจากระบบ)

เมื่อไม่ได้เลือกสินค้าจาก Dropdown จะแสดงส่วนนี้:

```text
+-- ข้อมูลสินค้าใหม่ (ไม่พบในระบบ) -----------------------+
|                                                          |
| ⚠ ท่านกำลังนำเข้าสินค้าใหม่ที่ยังไม่มีในระบบ                |
|   ระบบจะสร้างรหัสชั่วคราวและรอเจ้าหน้าที่คลังอนุมัติ        |
|                                                          |
| ชื่อสินค้า/อะไหล่ *                                        |
| [____________________________________]                   |
|                                                          |
| หมวดหมู่ *              หมวดหมู่ย่อย *                      |
| [▼ เลือกหมวดหมู่...]    [▼ เลือกหมวดหมู่ย่อย...]            |
|                                                          |
| รูปภาพสินค้า *                                             |
| [📷 อัปโหลดรูปภาพ] (บังคับอย่างน้อย 1 รูป)                  |
|                                                          |
+----------------------------------------------------------+
```

### 1.2 Flow การทำงาน

```text
ผู้ใช้ค้นหาสินค้าใน Dropdown
    │
    ├─ พบสินค้า → เลือกได้ตามปกติ
    │
    └─ ไม่พบสินค้า → กรอกข้อมูลด้วยตนเอง
       │
       ├─ กรอกชื่อสินค้า (บังคับ)
       ├─ เลือกหมวดหมู่ (บังคับ)
       ├─ เลือกหมวดหมู่ย่อย (บังคับ)
       ├─ อัปโหลดรูปภาพ (บังคับอย่างน้อย 1 รูป)
       └─ กรอกข้อมูลอื่นๆ (จำนวน, ราคา, ฯลฯ)
```

---

## ส่วนที่ 2: การสร้างรหัสชั่วคราว

### 2.1 รูปแบบรหัสชั่วคราว
```text
TEMP-YYYYMMDD-XXX
TEMP-20260206-001
TEMP-20260206-002
...
```

### 2.2 Logic การสร้างรหัส
```typescript
const generateTempCode = () => {
  const date = new Date();
  const dateStr = format(date, "yyyyMMdd");
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `TEMP-${dateStr}-${random}`;
};
```

---

## ส่วนที่ 3: การ Validate ก่อนเพิ่มลงตะกร้า

### 3.1 กรณีเลือกสินค้าจากระบบ
- ไม่ต้อง Validate เพิ่มเติม (เหมือนเดิม)

### 3.2 กรณีสินค้าใหม่ (ไม่ได้เลือก)
ต้องกรอกครบ:
- ✓ ชื่อสินค้า (บังคับ)
- ✓ หมวดหมู่ (บังคับ)
- ✓ หมวดหมู่ย่อย (บังคับ)
- ✓ รูปภาพอย่างน้อย 1 รูป (บังคับ)
- ✓ จำนวน (บังคับ)
- ✓ ราคาต่อชิ้น (บังคับ)

### 3.3 Error Messages
```typescript
if (!selectedEquipmentId) {
  // New product validation
  if (!equipmentName.trim()) {
    toast.error("กรุณาระบุชื่อสินค้า/อะไหล่");
    return;
  }
  if (!selectedCategoryId) {
    toast.error("กรุณาเลือกหมวดหมู่");
    return;
  }
  if (!selectedSubcategoryId) {
    toast.error("กรุณาเลือกหมวดหมู่ย่อย");
    return;
  }
  if (newProductImages.length === 0) {
    toast.error("กรุณาอัปโหลดรูปภาพสินค้าอย่างน้อย 1 รูป");
    return;
  }
}
```

---

## ส่วนที่ 4: การบันทึกลงฐานข้อมูล

### 4.1 ข้อมูลที่บันทึกลง `goods_receipt_pending`

สำหรับสินค้าใหม่:
```typescript
{
  equipment_id: null,                    // ไม่มี equipment_id เพราะยังไม่มีในระบบ
  equipment_code: "TEMP-20260206-001",   // รหัสชั่วคราว
  equipment_name: "ชื่อสินค้าที่กรอก",      // ชื่อที่ผู้ใช้กรอก
  // ... ข้อมูลอื่นๆ
}
```

### 4.2 การเพิ่มคอลัมน์ใหม่ในฐานข้อมูล

ต้องเพิ่มคอลัมน์เพื่อเก็บข้อมูลสำหรับสินค้าใหม่:
```sql
ALTER TABLE goods_receipt_pending
ADD COLUMN temp_category_id UUID REFERENCES categories(id),
ADD COLUMN temp_subcategory_id UUID REFERENCES subcategories(id),
ADD COLUMN temp_product_images TEXT[];
```

---

## ส่วนที่ 5: การแสดงผลในตะกร้า

### 5.1 Badge "สินค้าใหม่"
สินค้าที่ไม่มี `equipment_id` จะแสดง Badge สีส้ม "สินค้าใหม่" เพื่อแยกจากสินค้าที่มีอยู่ในระบบ (ใช้ logic เดิมที่มีอยู่แล้ว)

```text
| สถานะ                   |
|------------------------|
| ✓ มีในระบบ (เขียว)       | → มี equipment_id
| ⚠ สินค้าใหม่ (ส้ม)       | → ไม่มี equipment_id
```

---

## ส่วนที่ 6: การปรับปรุงหน้า "รับเข้าคลัง"

### 6.1 แสดงข้อมูลสินค้าใหม่
ในหน้า ReceiveGoods แสดงข้อมูลที่ผู้ใช้กรอกมา:
- ชื่อสินค้า
- หมวดหมู่/หมวดหมู่ย่อย (ใหม่)
- รูปภาพสินค้า (ใหม่)

### 6.2 ปุ่ม "สร้างอุปกรณ์ใหม่" (Quick Create)
ฟีเจอร์ที่มีอยู่แล้วจะ Auto-fill ข้อมูลจาก:
- ชื่อสินค้าที่กรอก
- หมวดหมู่ที่เลือก
- หมวดหมู่ย่อยที่เลือก
- รูปภาพที่อัปโหลด

---

## ส่วนที่ 7: รายละเอียดทางเทคนิค

### 7.1 ไฟล์ที่ต้องแก้ไข

| ไฟล์ | การเปลี่ยนแปลง |
|------|---------------|
| `src/pages/DeliveryEntry.tsx` | เพิ่มช่องกรอกชื่อสินค้า, ปรับ validation |
| `src/components/delivery/DeliveryCart.tsx` | เพิ่มการแสดง DeliveryCartItem interface |
| `src/components/receive/ReceiveGroupedItems.tsx` | เพิ่มการแสดงหมวดหมู่และรูปภาพสินค้าใหม่ |
| `src/pages/ReceiveGoods.tsx` | ส่งข้อมูลหมวดหมู่ไปยัง Quick Create |

### 7.2 Database Migration
เพิ่มคอลัมน์ใหม่:
```sql
ALTER TABLE goods_receipt_pending
ADD COLUMN temp_category_id UUID REFERENCES categories(id),
ADD COLUMN temp_subcategory_id UUID REFERENCES subcategories(id),
ADD COLUMN temp_product_images TEXT[];
```

### 7.3 เพิ่ม State ใหม่ใน DeliveryEntry

```typescript
// เพิ่ม state สำหรับชื่อสินค้าที่กรอกเอง
const [manualEquipmentName, setManualEquipmentName] = useState("");
```

### 7.4 ปรับปรุง handleAddToCart

```typescript
const handleAddToCart = () => {
  // ... existing validation

  if (!isMediaPlayerEntry) {
    if (!selectedEquipmentId) {
      // New product validation
      if (!manualEquipmentName.trim()) {
        toast.error("กรุณาระบุชื่อสินค้า/อะไหล่");
        return;
      }
      if (!selectedCategoryId) {
        toast.error("กรุณาเลือกหมวดหมู่");
        return;
      }
      if (!selectedSubcategoryId) {
        toast.error("กรุณาเลือกหมวดหมู่ย่อย");
        return;
      }
      if (newProductImages.length === 0) {
        toast.error("กรุณาอัปโหลดรูปภาพสินค้าอย่างน้อย 1 รูป");
        return;
      }
    }
    
    // ... rest of validation
  }

  // Create cart item
  const newItem: DeliveryCartItem = {
    equipment_id: selectedEquipmentId || null,
    equipment_code: selectedEquipmentId 
      ? equipmentCode 
      : generateTempCode(),  // สร้างรหัสชั่วคราว
    equipment_name: selectedEquipmentId 
      ? (selectedEquipment?.name || "") 
      : manualEquipmentName,  // ใช้ชื่อที่กรอกเอง
    // ... other fields
    temp_category_id: selectedCategoryId || null,
    temp_subcategory_id: selectedSubcategoryId || null,
    temp_product_images: newProductImages,
  };
  
  // ... rest of logic
};
```

### 7.5 ปรับปรุง DeliveryCartItem Interface

```typescript
export interface DeliveryCartItem {
  // ... existing fields
  temp_category_id?: string | null;
  temp_subcategory_id?: string | null;
  temp_product_images?: string[];
}
```

---

## ส่วนที่ 8: ตัวอย่างหน้าจอหลังปรับปรุง

### 8.1 กรณีไม่เลือกสินค้าจาก Dropdown

```text
+-- ข้อมูลสินค้า (รายการที่ 1) -----------------------------+
|                                                          |
| เลือกสินค้า (ถ้ารู้รหัส)                                   |
| [▼ เลือกสินค้าจากระบบ...                    ]            |
|                                                          |
| ⚠ ไม่พบสินค้าในระบบ? กรอกข้อมูลด้านล่างเพื่อนำเข้าสินค้าใหม่ |
|                                                          |
| ชื่อสินค้า/อะไหล่ *                                        |
| [____________________________________]                   |
|                                                          |
| หมวดหมู่ *                   หมวดหมู่ย่อย *                 |
| [▼ เลือกหมวดหมู่...]         [▼ เลือกหมวดหมู่ย่อย...]       |
|                                                          |
| รูปภาพสินค้า * (บังคับอย่างน้อย 1 รูป)                      |
| [📷] [📷] [📷] [📷] [📷]                                   |
|                                                          |
| จำนวน *    หน่วย     Lot Number 1    Lot Number 2         |
| [___]      [___]     [___________]   [___________]        |
|                                                          |
+----------------------------------------------------------+
```

### 8.2 ตะกร้าแสดง Badge "สินค้าใหม่"

```text
+-- ตะกร้าสินค้านำเข้า (3 รายการ) -------------------------+
|                                                         |
| # | สินค้า              | จำนวน | สถานะ                  |
|---|---------------------|-------|------------------------|
| 1 | EQ-001 - ตัวต้านทาน | 100   | ✓ มีในระบบ              |
| 2 | TEMP-... - สายไฟใหม่| 50    | ⚠ สินค้าใหม่            |
| 3 | TEMP-... - น็อตหกเหลี่ยม | 200   | ⚠ สินค้าใหม่        |
|                                                         |
+---------------------------------------------------------+
```

---

## ส่วนที่ 9: ขั้นตอนการดำเนินงาน

1. **Database Migration** - เพิ่มคอลัมน์ temp_category_id, temp_subcategory_id, temp_product_images
2. **ปรับปรุง DeliveryCartItem Interface** - เพิ่ม fields ใหม่
3. **ปรับปรุง DeliveryEntry.tsx** - เพิ่มช่องกรอกชื่อ + ปรับ validation
4. **ปรับปรุง handleSubmitAll** - ส่งข้อมูลหมวดหมู่และรูปภาพไป
5. **ปรับปรุง ReceiveGoods.tsx** - แสดงข้อมูลและส่งไป Quick Create

---

## ประโยชน์ที่จะได้รับ

- ผู้ใช้สามารถนำเข้าสินค้าใหม่ได้โดยไม่ต้องรอสร้างในระบบก่อน
- เจ้าหน้าที่คลังได้รับข้อมูลครบถ้วน (ชื่อ + หมวดหมู่ + รูปภาพ) เพื่อสร้างรหัสสินค้าถาวร
- ลดขั้นตอนการทำงานและเวลาในการนำเข้าสินค้าใหม่
- รักษา Data Integrity ด้วยการบังคับเลือกหมวดหมู่จาก Master Data
