

# ปรับปรุงระบบ "นำสินค้าใหม่เข้าระบบ" — รองรับทรัพย์สินรายชิ้น

แผนได้รับการอนุมัติแล้ว พร้อมดำเนินการแก้ไขไฟล์ `src/pages/DeliveryEntry.tsx` ตามรายละเอียดด้านล่าง:

---

## การเปลี่ยนแปลงทั้งหมดอยู่ในไฟล์เดียว: `src/pages/DeliveryEntry.tsx`

### 1. เพิ่ม Asset Fields ใน Interface

**MediaPlayerDeviceEntry** (line ~191): เพิ่ม `asset_code`, `equipment_id_code`, `waiting_asset_code`, `waiting_equipment_id`

**EquipmentUnitEntry** (line ~213): เพิ่ม fields เดียวกัน

### 2. อัปเดต Default Values

ทุกที่ที่สร้าง device/unit entry ใหม่ (initial state, add button, reset) ต้องเพิ่ม default:
```
asset_code: "", equipment_id_code: "", waiting_asset_code: false, waiting_equipment_id: false
```

### 3. UI — Media Player Device Row (line ~1393-1516)

เพิ่มแถวใหม่ใต้แถว S/N ที่มีอยู่ในแต่ละ device:
- **รหัสทรัพย์สิน** + Checkbox "รอรหัส" (disable input เมื่อ checked)
- **Equipment ID** + Checkbox "รอ Equipment ID" (disable input เมื่อ checked)

### 4. UI — Equipment Per-Unit Row (line ~1767-1866)

เพิ่มแถวเดียวกัน แต่แสดงเฉพาะเมื่อ `isAsset === true`

### 5. Asset Section ด้านล่าง (line ~2117-2196)

- **Media Player**: ซ่อน toggle "สินค้านี้เป็นทรัพย์สิน?" + ซ่อนช่อง รหัสทรัพย์สิน/Equipment ID (เพราะอยู่ per-device แล้ว) แต่ยังแสดง "ระยะเวลาค่าเสื่อม" พร้อม force `isAsset = true`
- **Equipment + perUnitMode + isAsset**: ซ่อนช่อง รหัสทรัพย์สิน/Equipment ID (เพราะอยู่ per-unit แล้ว) แต่ยังแสดง toggle + ระยะเวลาค่าเสื่อม
- **Equipment ไม่ใช่ perUnitMode**: แสดงปกติเหมือนเดิม

### 6. handleAddToCart Logic (line ~564-594, 632-666)

- **Media Player**: ดึง `asset_code`, `equipment_id_code`, `waiting_asset_code`, `waiting_equipment_id` จาก `device` entry แทนค่า global, force `is_asset: true`
- **Equipment per-unit**: ดึงจาก `unitEntry` แทนค่า global

### 7. resetItemForm (line ~769-779)

เพิ่ม reset fields ใหม่ใน default device/unit entries

---

## สรุป

| ส่วน | การเปลี่ยนแปลง |
|---|---|
| Media Player | เป็นทรัพย์สินอัตโนมัติ, ช่องกรอกรหัส+Equipment ID ทุก device, ปุ่มรอรหัส |
| Equipment (per-unit + asset) | ช่องกรอกรหัส+Equipment ID ทุก unit เมื่อเป็นทรัพย์สิน |
| Asset section ด้านล่าง | ซ่อนช่องซ้ำ, คงไว้เฉพาะค่าเสื่อม |

