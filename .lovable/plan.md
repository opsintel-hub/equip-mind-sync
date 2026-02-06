

# แผนการปรับปรุง: เพิ่มช่อง "จำนวนขั้นต่ำ" ในหน้านำสินค้าเข้า

## สรุปปัญหา

เมื่อเจ้าหน้าที่คลังกดรับสินค้าเข้าระบบ (Quick Create) พบช่อง "จำนวนขั้นต่ำ" ที่ต้องกรอก แต่เจ้าหน้าที่คลังไม่ทราบว่าต้องใส่เท่าไหร่ เพราะคนที่รู้คือผู้ขอนำเข้าสินค้า ควรให้ผู้ขอนำเข้าระบุจำนวนขั้นต่ำตั้งแต่ขั้นตอนแรก (Delivery Entry) แล้วส่งค่านี้ไปยังขั้นตอนรับเข้าคลัง (Quick Create) โดยอัตโนมัติ

---

## แนวทางแก้ไข

```text
ผู้ขอนำเข้ากรอกข้อมูลที่หน้า "นำสินค้าเข้า"
    │
    ├─ สินค้ามีในระบบ → ไม่ต้องกรอก (มี min_stock_level อยู่แล้ว)
    │
    └─ สินค้าใหม่ไม่มีในระบบ → แสดงช่อง "จำนวนขั้นต่ำ" ให้กรอก
       │
       └─ บันทึกลง goods_receipt_pending
          │
          └─ ส่งค่าไปยัง Quick Create ที่หน้า "รับเข้าคลัง"
             (Auto-fill ช่อง "จำนวนขั้นต่ำ" ให้อัตโนมัติ)
```

---

## ส่วนที่ 1: UI ที่เปลี่ยนแปลง

### 1.1 หน้า "นำสินค้าเข้า" (Delivery Entry)
เพิ่มช่อง "จำนวนขั้นต่ำ" ในส่วนข้อมูลสินค้าใหม่ (แสดงเฉพาะเมื่อไม่ได้เลือกสินค้าจากระบบ)

```text
+-- ข้อมูลสินค้าใหม่ (ไม่พบในระบบ) -----------------------+
|                                                          |
| ชื่อสินค้า/อะไหล่ *                                        |
| [____________________________________]                   |
|                                                          |
| หมวดหมู่ *              หมวดหมู่ย่อย *                      |
| [▼ เลือกหมวดหมู่...]    [▼ เลือกหมวดหมู่ย่อย...]            |
|                                                          |
| รูปภาพสินค้า * (บังคับอย่างน้อย 1 รูป)                      |
|                                                          |
+----------------------------------------------------------+

จำนวน *       หน่วย       จำนวนขั้นต่ำ        <-- ใหม่!
[___]          [___]       [___]
                           (สำหรับแจ้งเตือนเมื่อ
                            สินค้าใกล้หมด)
```

ช่อง "จำนวนขั้นต่ำ" จะแสดงเฉพาะเมื่อไม่ได้เลือกสินค้าจากระบบ (สินค้าใหม่) เพราะสินค้าที่มีอยู่แล้วจะมีค่า min_stock_level ตั้งไว้แล้ว ช่องนี้ไม่บังคับกรอก (ค่าเริ่มต้นเป็น 0) แต่แนะนำให้กรอก โดยจะแสดงคำอธิบายสั้นๆ ว่า "ระบบจะแจ้งเตือนเมื่อจำนวนสินค้าต่ำกว่าค่านี้"

### 1.2 หน้า "รับเข้าคลัง" (Quick Create)
ช่อง "จำนวนขั้นต่ำ" ใน Equipment Form จะถูก Auto-fill จากค่าที่ผู้ขอนำเข้ากรอกไว้

---

## ส่วนที่ 2: รายละเอียดทางเทคนิค

### 2.1 Database Migration
เพิ่มคอลัมน์ใหม่ในตาราง `goods_receipt_pending`:

```sql
ALTER TABLE goods_receipt_pending
ADD COLUMN temp_min_stock_level INTEGER DEFAULT 0;
```

### 2.2 ไฟล์ที่ต้องแก้ไข

| ไฟล์ | การเปลี่ยนแปลง |
|------|---------------|
| `src/pages/DeliveryEntry.tsx` | เพิ่ม state `minStockLevel`, เพิ่มช่องกรอก, ส่งค่าไป cart item และ DB |
| `src/components/delivery/DeliveryCart.tsx` | เพิ่ม `temp_min_stock_level` ใน DeliveryCartItem interface |
| `src/components/equipment/EquipmentForm.tsx` | เพิ่ม `min_stock_level` ใน EquipmentPrefillData interface |
| `src/pages/ReceiveGoods.tsx` | ส่ง `temp_min_stock_level` ไปยัง prefillData ของ Quick Create |

### 2.3 DeliveryEntry.tsx - เพิ่ม State และ Input

```typescript
// เพิ่ม state
const [minStockLevel, setMinStockLevel] = useState("");

// เพิ่มช่อง input (แสดงเฉพาะสินค้าใหม่)
// วางถัดจากช่อง "จำนวน" และ "หน่วย"

// เพิ่มในตะกร้า
temp_min_stock_level: !selectedEquipmentId ? (parseInt(minStockLevel) || 0) : undefined,

// เพิ่มใน handleSubmitAll
temp_min_stock_level: item.temp_min_stock_level ?? 0,

// เพิ่มใน resetItemForm
setMinStockLevel("");
```

### 2.4 DeliveryCartItem Interface

```typescript
export interface DeliveryCartItem {
  // ... existing fields
  temp_min_stock_level?: number;
}
```

### 2.5 EquipmentPrefillData Interface

```typescript
export interface EquipmentPrefillData {
  // ... existing fields
  min_stock_level?: number;
}
```

### 2.6 ReceiveGoods.tsx - ส่งค่าไป Quick Create

```typescript
prefillData={{
  // ... existing fields
  min_stock_level: selectedReceipt.temp_min_stock_level || undefined,
}}
```

### 2.7 EquipmentForm.tsx - Apply Prefill

```typescript
// ใน useEffect ที่ apply prefill data
if (prefillData.min_stock_level !== undefined) {
  form.setValue("min_stock_level", prefillData.min_stock_level);
}
```

---

## ส่วนที่ 3: ขั้นตอนการดำเนินงาน

1. **Database Migration** - เพิ่มคอลัมน์ `temp_min_stock_level` ในตาราง `goods_receipt_pending`
2. **เพิ่ม DeliveryCartItem field** - เพิ่ม `temp_min_stock_level` ใน interface
3. **เพิ่ม UI ใน DeliveryEntry** - เพิ่ม state, input field, validation, และ submit logic
4. **เพิ่ม EquipmentPrefillData field** - เพิ่ม `min_stock_level` ใน interface
5. **ปรับ ReceiveGoods** - ส่งค่า `temp_min_stock_level` ไปยัง prefillData
6. **ปรับ EquipmentForm** - Apply prefill สำหรับ `min_stock_level`

---

## ประโยชน์ที่จะได้รับ

- ผู้ขอนำเข้าสินค้าซึ่งเป็นคนที่รู้ดีที่สุดว่าสินค้านั้นควรมีจำนวนขั้นต่ำเท่าไหร่ จะเป็นคนกรอกค่านี้ตั้งแต่แรก
- เจ้าหน้าที่คลังไม่ต้องเดาค่าจำนวนขั้นต่ำ เพราะระบบ Auto-fill ให้แล้ว
- ลดขั้นตอนการสื่อสารระหว่างผู้ขอนำเข้าและเจ้าหน้าที่คลัง
