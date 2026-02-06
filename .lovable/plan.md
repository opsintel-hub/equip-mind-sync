

# แผนการปรับปรุง: เพิ่มการตรวจสอบ Duplicate และ Warning ก่อน Import

## สรุปภาพรวม
ปรับปรุง Billboard Import ให้:
1. ตรวจจับ equipment_id ที่ซ้ำกันในไฟล์ Excel ก่อน Import
2. แสดง Warning Dialog ยืนยันก่อน Import พร้อมสรุปรายละเอียด
3. แปลง Error Message ให้เข้าใจง่าย

---

## ส่วนที่ 1: เพิ่มการตรวจสอบ Duplicate ในไฟล์ Excel

### 1.1 ตรวจจับ equipment_id ซ้ำ
เมื่ออ่านไฟล์ Excel จะตรวจสอบว่ามี equipment_id เดียวกันหลายแถวหรือไม่

```text
ตัวอย่างข้อมูลในไฟล์:
+------+-------------------+
| แถว  | EquipmentID       |
+------+-------------------+
| 3    | A02002-BKK-001    |  ← ถูกต้อง
| 5    | A02002-BKK-001    |  ← ซ้ำกับแถว 3!
| 8    | A02010-BKK-002    |  ← ถูกต้อง
| 12   | A02010-BKK-002    |  ← ซ้ำกับแถว 8!
+------+-------------------+
```

### 1.2 แสดงในตาราง Preview
- แถวแรกของ equipment_id นั้นจะถือว่า "ถูกต้อง" (new หรือ update)
- แถวที่ซ้ำจะ mark เป็น "error" พร้อมบอกว่า "ซ้ำกับแถวที่ X"

```text
+-- Preview Table ------------------------------------------+
| สถานะ      | รหัสป้าย         | ปัญหา                    |
|------------|------------------|--------------------------|
| ✓ เพิ่มใหม่  | A02002-BKK-001  |                          |
| ✗ ซ้ำในไฟล์  | A02002-BKK-001  | ซ้ำกับแถวที่ 3 ในไฟล์ Excel |
| ⚠ อัพเดท   | A02010-BKK-002  |                          |
+-----------------------------------------------------------+
```

---

## ส่วนที่ 2: เพิ่ม Warning Dialog ก่อน Import

### 2.1 แสดง Confirmation Dialog
เมื่อกดปุ่ม "นำเข้า" จะแสดง Dialog ยืนยันก่อน พร้อมสรุปรายละเอียด

```text
+-- ยืนยันการนำเข้าข้อมูล ----------------------------------+
|                                                          |
|  คุณกำลังจะดำเนินการดังนี้:                                 |
|                                                          |
|  ✓ เพิ่มป้ายใหม่:           1,915 รายการ                  |
|  ⚠ อัพเดทป้ายที่มีอยู่:      696 รายการ                    |
|                                                          |
|  ⚠ หมายเหตุ: การอัพเดทจะทับข้อมูลเดิมในระบบ               |
|                                                          |
|                          [ยกเลิก]  [ยืนยันนำเข้า]           |
+----------------------------------------------------------+
```

### 2.2 เงื่อนไขการแสดง Warning พิเศษ
- ถ้ามี Update มากกว่า 100 รายการ → แสดง Warning สีส้ม
- ถ้ามี Error (ซ้ำในไฟล์) → ไม่ให้กด Import จนกว่าจะแก้ไข

---

## ส่วนที่ 3: ปรับปรุง Error Message

### 3.1 แปลง Technical Error
| Error เดิม | ข้อความใหม่ |
|------------|-------------|
| duplicate key value violates unique constraint | รหัสป้าย "XXX" ซ้ำกับข้อมูลในระบบ |
| foreign key violation | ข้อมูลอ้างอิงไม่ถูกต้อง |
| null value in column | ข้อมูลบางช่องที่จำเป็นไม่มีค่า |

### 3.2 แสดงวิธีแก้ไข
```text
+-- เกิดข้อผิดพลาด ----------------------------------------+
|                                                         |
| ✗ รหัสป้าย "A02002-BKK-HKW04" ซ้ำกับข้อมูลในระบบ          |
|                                                         |
| วิธีแก้ไข:                                               |
| • ตรวจสอบว่ารหัสนี้มีอยู่ในระบบแล้ว                        |
| • ถ้าต้องการอัพเดท ให้ลองนำเข้าใหม่                        |
|                                                         |
+---------------------------------------------------------+
```

---

## ส่วนที่ 4: รายละเอียดทางเทคนิค

### 4.1 ไฟล์ที่ต้องแก้ไข
| ไฟล์ | การเปลี่ยนแปลง |
|------|---------------|
| `src/components/billboard/BillboardImport.tsx` | เพิ่ม Duplicate detection, Warning dialog, Error translation |

### 4.2 Logic การตรวจสอบ Duplicate

```typescript
// หา equipment_id ที่ซ้ำในไฟล์ พร้อมเก็บหมายเลขแถว
const equipmentIdRowMap = new Map<string, number>();

jsonData.forEach((row: any, index: number) => {
  const equipmentId = row["EquipmentID"] || "";
  const rowNumber = index + 2; // +2 เพราะ Excel Header = แถว 1
  
  if (equipmentIdRowMap.has(equipmentId)) {
    // ซ้ำ! เก็บข้อมูลแถวที่ซ้ำกับแถวแรก
    duplicateErrors.push({
      rowNumber,
      equipmentId,
      duplicateOfRow: equipmentIdRowMap.get(equipmentId)
    });
  } else {
    equipmentIdRowMap.set(equipmentId, rowNumber);
  }
});
```

### 4.3 Confirmation Dialog Component

```tsx
<AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>ยืนยันการนำเข้าข้อมูล</AlertDialogTitle>
      <AlertDialogDescription>
        คุณกำลังจะดำเนินการดังนี้:
        <ul className="mt-3 space-y-2">
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            เพิ่มป้ายใหม่: {newCount} รายการ
          </li>
          <li className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-warning" />
            อัพเดทป้ายที่มีอยู่: {updateCount} รายการ
          </li>
        </ul>
        {updateCount > 0 && (
          <Alert className="mt-4 bg-warning/10 border-warning">
            การอัพเดทจะทับข้อมูลเดิมในระบบ
          </Alert>
        )}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
      <AlertDialogAction onClick={confirmImport}>
        ยืนยันนำเข้า
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## ส่วนที่ 5: ตัวอย่างหน้าจอหลังปรับปรุง

### 5.1 Preview พร้อมแสดง Duplicate Error

```text
+-- ตรวจสอบข้อมูลก่อนนำเข้า (2616 รายการ) -----------------+
| ✓ เพิ่มใหม่: 1915  ⚠ อัพเดท: 696  ✗ ซ้ำในไฟล์: 5        |
+----------------------------------------------------------+
| สถานะ      | รหัสป้าย         | คำอธิบาย   | ปัญหา        |
|------------|------------------|-----------|-------------|
| ✓ เพิ่มใหม่  | A02002-BKK-001  | EXAT12... |             |
| ✗ ซ้ำในไฟล์  | A02002-BKK-001  | EXAT12... | ซ้ำแถว 3    |
| ⚠ อัพเดท   | A02010-BKK-002  | DS175...  |             |
+----------------------------------------------------------+
|                                                          |
| ⚠ พบรหัสป้ายซ้ำกัน 5 รายการในไฟล์ Excel                   |
|   กรุณาแก้ไขไฟล์และอัปโหลดใหม่ก่อนนำเข้า                   |
|                                                          |
+----------------------------------------------------------+
```

### 5.2 Warning เมื่อมี Error
```text
| ⚠ ไม่สามารถนำเข้าได้เนื่องจากพบ 5 รายการซ้ำในไฟล์          |
|   กรุณาลบแถวที่ซ้ำออกจากไฟล์ Excel แล้วอัปโหลดใหม่         |
```

---

## ส่วนที่ 6: ขั้นตอนการดำเนินงาน

1. **เพิ่ม Duplicate Detection Logic** - ตรวจหา equipment_id ซ้ำในไฟล์ก่อน mapping
2. **เพิ่มคอลัมน์ "ปัญหา" ในตาราง Preview** - แสดง error message ที่เข้าใจง่าย
3. **เพิ่ม Alert Banner** - แสดงเมื่อพบ duplicate พร้อมคำแนะนำ
4. **เพิ่ม Confirmation Dialog** - ยืนยันก่อน Import พร้อมสรุปจำนวน
5. **เพิ่ม Error Translation** - แปลง database error เป็นภาษาไทย
6. **Block Import ถ้ามี Error** - ไม่ให้กด Import จนกว่าจะแก้ไข

---

## ประโยชน์ที่จะได้รับ

- ป้องกันการ Import ข้อมูลซ้ำก่อนเกิด Error
- ผู้ใช้เห็นปัญหาทันทีพร้อมวิธีแก้ไข
- ยืนยันก่อนทำการ Update ข้อมูลจำนวนมาก
- ลดความสับสนจาก Technical error message
- ลด Support case เรื่อง Import error

