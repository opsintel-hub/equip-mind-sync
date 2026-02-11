

# แผนปรับปรุงหน้า "ค้นหาอุปกรณ์ป้ายโฆษณา" ให้สมบูรณ์ยิ่งขึ้น

## ปัญหาที่พบจากการตรวจสอบ

### 1. Movement Type ไม่ครบ
ในระบบมี movement_type ที่ใช้จริง เช่น `install_to_billboard` แต่ในตัวแปล label ไม่มี จะแสดงเป็นชื่อ raw แทน

### 2. Billboard View แสดงเฉพาะป้ายที่มีอุปกรณ์ติดตั้ง
ถ้าต้องการดูป้ายทั้งหมดเพื่อเช็คว่าป้ายไหนยังไม่ได้ติดตั้งอะไรเลย ก็ทำไม่ได้

### 3. ไม่มี Pagination
ข้อมูลปัจจุบันมีไม่เยอะ (34 ป้าย, 21 อุปกรณ์, 5 Media Player) แต่เมื่อเพิ่มขึ้นจะช้า ควรเพิ่ม Pagination ไว้ล่วงหน้า

### 4. Media Player ไม่มีประวัติติดตั้ง/Stock Movement ใน Detail Dialog
เมื่อกดดูรายละเอียด Media Player จะเห็นแค่ว่าติดตั้งอยู่ที่ไหนปัจจุบัน แต่ไม่แสดงประวัติหรือ Stock Movement เพราะ query คืน array ว่าง (return []) สำหรับ media_player type

### 5. ไม่มี Export ข้อมูล
หน้ารายงานอื่นมีปุ่ม Export แต่หน้านี้ยังไม่มี

### 6. ไม่มี Summary Cards ด้านบน
หน้ารายงานอื่นมีการ์ดสรุปภาพรวม (เช่น จำนวนป้ายทั้งหมด / อุปกรณ์ทั้งหมด / หมดอายุ / ใกล้หมดประกัน)

---

## สิ่งที่จะปรับปรุง

### 1. เพิ่ม Movement Type Label ที่ขาด
เพิ่ม `install_to_billboard: "ติดตั้งป้าย"` และ type อื่นที่อาจมีในอนาคต

### 2. เพิ่มตัวเลือก "แสดงป้ายทั้งหมด" ใน Billboard View
เพิ่ม toggle/filter เพื่อแสดงป้ายที่ยังไม่มีอุปกรณ์ติดตั้งด้วย

### 3. เพิ่ม Summary Cards ด้านบนทั้ง 2 Tabs
- **Billboard View**: จำนวนป้ายที่มีอุปกรณ์ / อุปกรณ์หมดอายุ / อุปกรณ์ใกล้หมดประกัน
- **Equipment View**: อุปกรณ์ทั้งหมด / ติดตั้งอยู่ / ในคลัง / ส่งเคลม

### 4. เพิ่ม Media Player History ใน Detail Dialog
ค้นหาประวัติจากตาราง `stock_movements` ที่เชื่อมกับ Media Player ผ่านชื่อหรือ code (เนื่องจาก stock_movements มี equipment_id ที่อาจเชื่อมกับ media_players ด้วย)

### 5. เพิ่ม Pagination (แสดง 20 รายการต่อหน้า)
ทั้ง Billboard View และ Equipment View

### 6. เพิ่มปุ่ม Export Excel
ส่งออกข้อมูลตามที่ filter ไว้

---

## รายละเอียดทางเทคนิค

### ไฟล์ที่ต้องแก้ไข (1 ไฟล์)

| ไฟล์ | การเปลี่ยนแปลง |
|------|---------------|
| `src/pages/EquipmentTrackingReport.tsx` | ปรับปรุงทั้ง 6 ข้อข้างต้น |

### รายละเอียดการแก้ไข

**movementTypeLabel** -- เพิ่ม key:
```
install_to_billboard: "ติดตั้งป้าย"
uninstall_from_billboard: "ถอดจากป้าย"
```

**Billboard View**:
- เพิ่ม Summary Cards 3 ใบ (ป้ายที่มีอุปกรณ์ / มีอุปกรณ์หมดอายุ / มีอุปกรณ์หมดประกัน)
- เพิ่ม checkbox "แสดงป้ายไม่มีอุปกรณ์ด้วย"
- เพิ่ม Pagination (20 ป้าย/หน้า)

**Equipment View**:
- เพิ่ม Summary Cards 4 ใบ (ทั้งหมด / ติดตั้งอยู่ / ในคลัง / ส่งเคลม)
- เพิ่ม Pagination (20 รายการ/หน้า)

**Detail Dialog**:
- แก้ไข query สำหรับ media_player ให้ดึง stock_movements ได้ (ค้นหาโดย equipment_name หรือ equipment_code ที่ตรงกัน)

**Export**:
- เพิ่มปุ่ม Export Excel ใช้ library `xlsx` ที่มีอยู่แล้ว

### ขั้นตอนการดำเนินงาน

1. แก้ไข `EquipmentTrackingReport.tsx` เพิ่ม Summary Cards, Pagination, Export, fix Movement Labels, fix Media Player history

ไม่ต้องทำ Database Migration

