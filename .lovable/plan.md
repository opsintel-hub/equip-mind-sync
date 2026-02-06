

# แผนการปรับปรุง: เพิ่ม Logic ตรวจสอบ OldCode+Location และคำอธิบายวิธีการตรวจสอบ

## สรุปภาพรวม
ปรับปรุง Billboard Import ให้:
1. เมื่อพบ OldCode ซ้ำในไฟล์ → ตรวจ Location ต่อ
   - Location ต่างกัน → Warning (อนุญาตนำเข้าได้หลังยืนยัน)
   - Location เหมือนกัน → Error (Block ไม่ให้นำเข้า)
2. เพิ่มส่วนคำอธิบายวิธีการตรวจสอบของระบบ (Collapsible)

---

## ส่วนที่ 1: เปลี่ยน Logic การตรวจสอบ OldCode ซ้ำ

### 1.1 Logic ใหม่
```text
เมื่อพบ OldCode ซ้ำในไฟล์ Excel:

1. ตรวจสอบ Location ของแถวที่ซ้ำ
   │
   ├─ Location ต่างกัน
   │  └─ Status = "warning" (สีส้ม)
   │  └─ แจ้งเตือนผู้ใช้ แต่อนุญาตให้นำเข้าได้
   │  └─ ใช้ข้อมูลจากแถวแรกที่พบ
   │
   └─ Location เหมือนกัน
      └─ Status = "duplicate" (สีแดง)
      └─ Block ไม่ให้นำเข้า
      └─ ผู้ใช้ต้องแก้ไขไฟล์ก่อน
```

### 1.2 ตัวอย่างการตรวจสอบ
```text
+------+------------+--------------+----------+-----------------------------+
| แถว  | OldCode    | Location     | สถานะ    | หมายเหตุ                     |
+------+------------+--------------+----------+-----------------------------+
| 3    | DS175-001  | สถานีรถไฟ A   | เพิ่มใหม่ | ถูกต้อง                      |
| 5    | DS175-001  | สถานีรถไฟ B   | คำเตือน  | OldCode ซ้ำแถว 3 แต่ Location ต่าง (อนุญาต) |
| 8    | DS175-001  | สถานีรถไฟ A   | ซ้ำในไฟล์ | OldCode+Location ซ้ำแถว 3 (Block!) |
+------+------------+--------------+----------+-----------------------------+
```

---

## ส่วนที่ 2: เพิ่มสถานะใหม่ "warning"

### 2.1 เพิ่ม Type Status
```typescript
// เดิม
status: "new" | "update" | "error" | "duplicate";

// ใหม่
status: "new" | "update" | "error" | "duplicate" | "warning";
```

### 2.2 Badge สำหรับ Warning
```text
| สถานะ       | Badge สี          | ความหมาย                    |
|-------------|-------------------|----------------------------|
| เพิ่มใหม่     | สีเขียว (success)  | OldCode ใหม่ในระบบ           |
| อัพเดท      | สีส้ม (warning)    | OldCode มีในระบบแล้ว         |
| คำเตือน     | สีส้มอ่อน (amber)  | OldCode ซ้ำ แต่ Location ต่าง  |  <-- ใหม่
| ซ้ำในไฟล์    | สีแดง (destructive)| OldCode+Location ซ้ำ (Block) |
| ข้อผิดพลาด   | สีแดงเข้ม          | ข้อมูลไม่ครบ                  |
```

---

## ส่วนที่ 3: เพิ่มคำอธิบายวิธีการตรวจสอบของระบบ

### 3.1 Collapsible Section
เพิ่มส่วนคำอธิบายที่สามารถกดเปิด/ปิดได้

```text
+-- นำเข้าข้อมูลจาก Excel ----------------------------------+
| ระบบจะตรวจสอบรหัส OldCode อัตโนมัติ                       |
|                                                          |
| [▼ วิธีการตรวจสอบของระบบ] (กดเพื่อดู/ซ่อน)                  |
| +--------------------------------------------------------+
| | ขั้นตอนที่ 1: ตรวจสอบ OldCode                           |
| | • ถ้า OldCode มีในฐานข้อมูลแล้ว → อัพเดท (ทับข้อมูลเดิม)  |
| | • ถ้า OldCode ไม่มี → เพิ่มใหม่                          |
| | • ถ้า OldCode ว่าง → ข้อผิดพลาด (ต้องแก้ไข)              |
| |                                                        |
| | ขั้นตอนที่ 2: ตรวจสอบ OldCode ซ้ำในไฟล์                  |
| | • ถ้า OldCode ซ้ำ แต่ Location ต่างกัน → คำเตือน         |
| |   (อนุญาตให้นำเข้าได้ ใช้ข้อมูลจากแถวแรก)                |
| | • ถ้า OldCode ซ้ำ และ Location เหมือนกัน → ซ้ำในไฟล์     |
| |   (ไม่อนุญาต ต้องแก้ไขไฟล์ก่อน)                         |
| +--------------------------------------------------------+
|                                                          |
| [ดาวน์โหลด Template]  [เลือกไฟล์ Excel]                    |
+----------------------------------------------------------+
```

---

## ส่วนที่ 4: รายละเอียดทางเทคนิค

### 4.1 ไฟล์ที่ต้องแก้ไข
| ไฟล์ | การเปลี่ยนแปลง |
|------|---------------|
| `src/components/billboard/BillboardImport.tsx` | เพิ่ม Logic ตรวจ Location, เพิ่ม Collapsible คำอธิบาย |

### 4.2 Logic การตรวจสอบ OldCode + Location

```typescript
// Step 1: เก็บข้อมูล OldCode พร้อม Location และหมายเลขแถว
const oldCodeDataMap = new Map<string, { rowNumber: number; location: string }>();
const duplicateInfo = new Map<number, { 
  duplicateOfRow: number; 
  sameLocation: boolean;
}>();

jsonData.forEach((row: any, index: number) => {
  const oldCode = row["OldCode"] || row["old_code"] || "";
  const location = row["Location"] || row["location_name"] || "";
  const rowNumber = index + 2;
  
  if (oldCode) {
    if (oldCodeDataMap.has(oldCode)) {
      const firstRow = oldCodeDataMap.get(oldCode)!;
      // ตรวจสอบว่า Location ซ้ำด้วยหรือไม่
      const sameLocation = location === firstRow.location;
      duplicateInfo.set(index, {
        duplicateOfRow: firstRow.rowNumber,
        sameLocation,
      });
    } else {
      oldCodeDataMap.set(oldCode, { rowNumber, location });
    }
  }
});

// Step 2: กำหนดสถานะตาม sameLocation
if (duplicateInfo.has(index)) {
  const info = duplicateInfo.get(index)!;
  if (info.sameLocation) {
    // OldCode + Location ซ้ำ → Block
    status = "duplicate";
    errorMessage = `OldCode และ Location ซ้ำกับแถวที่ ${info.duplicateOfRow}`;
  } else {
    // OldCode ซ้ำ แต่ Location ต่าง → Warning
    status = "warning";
    errorMessage = `OldCode ซ้ำกับแถวที่ ${info.duplicateOfRow} (Location ต่างกัน จะใช้แถว ${info.duplicateOfRow})`;
  }
}
```

### 4.3 ปรับ canImport Logic

```typescript
// เดิม: Block ทั้ง duplicate และ error
const hasProblems = errorCount > 0 || duplicateCount > 0;

// ใหม่: Block เฉพาะ duplicate (OldCode+Location ซ้ำ) และ error
// Warning (OldCode ซ้ำ แต่ Location ต่าง) ไม่ Block
const hasBlockingProblems = errorCount > 0 || duplicateCount > 0;
const canImport = (newCount > 0 || updateCount > 0) && !hasBlockingProblems;
```

### 4.4 เพิ่ม Collapsible Component

```typescript
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, HelpCircle } from "lucide-react";

// ภายใน Card Header
<Collapsible>
  <CollapsibleTrigger asChild>
    <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
      <HelpCircle className="h-4 w-4" />
      วิธีการตรวจสอบของระบบ
      <ChevronDown className="h-4 w-4" />
    </Button>
  </CollapsibleTrigger>
  <CollapsibleContent className="mt-4 p-4 bg-muted/50 rounded-lg text-sm space-y-3">
    <div>
      <strong>ขั้นตอนที่ 1: ตรวจสอบ OldCode</strong>
      <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
        <li>ถ้า OldCode มีในฐานข้อมูลแล้ว → อัพเดท (ทับข้อมูลเดิม)</li>
        <li>ถ้า OldCode ไม่มี → เพิ่มใหม่</li>
        <li>ถ้า OldCode ว่าง → ข้อผิดพลาด (ต้องแก้ไข)</li>
      </ul>
    </div>
    <div>
      <strong>ขั้นตอนที่ 2: ตรวจสอบ OldCode ซ้ำในไฟล์</strong>
      <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
        <li>ถ้า OldCode ซ้ำ แต่ Location ต่างกัน → คำเตือน (ใช้ข้อมูลจากแถวแรก)</li>
        <li>ถ้า OldCode ซ้ำ และ Location เหมือนกัน → ซ้ำในไฟล์ (ต้องแก้ไข)</li>
      </ul>
    </div>
  </CollapsibleContent>
</Collapsible>
```

---

## ส่วนที่ 5: ตัวอย่างหน้าจอหลังปรับปรุง

### 5.1 สรุปก่อนนำเข้า (พบ Warning)
```text
+-- ตรวจสอบข้อมูลก่อนนำเข้า (2616 รายการ) ------------------+
| ✓ เพิ่มใหม่: 2590  ⚠ อัพเดท: 9  ⚡ คำเตือน: 12  ✗ ซ้ำ: 5   |
+-----------------------------------------------------------+
|                                                           |
| ⚠ พบ OldCode ซ้ำกัน 12 รายการ (Location ต่างกัน)           |
|   ระบบจะใช้ข้อมูลจากแถวแรกที่พบ และข้ามแถวที่เหลือ          |
|                                                           |
| ✗ พบ OldCode+Location ซ้ำกัน 5 รายการ                      |
|   ไม่สามารถนำเข้าได้ กรุณาแก้ไขไฟล์ก่อน                     |
|                                                           |
+-----------------------------------------------------------+
```

### 5.2 ตาราง Preview พร้อมคอลัมน์ Location
```text
| สถานะ     | OldCode     | Location      | คำอธิบาย | ปัญหา              |
|-----------|-------------|---------------|---------|-------------------|
| ✓ เพิ่มใหม่ | DS175-001   | สถานีรถไฟ A    | ...     |                   |
| ⚡ คำเตือน  | DS175-001   | สถานีรถไฟ B    | ...     | OldCode ซ้ำแถว 3   |
| ✗ ซ้ำในไฟล์ | DS175-001   | สถานีรถไฟ A    | ...     | OldCode+Location ซ้ำ |
```

---

## ส่วนที่ 6: Confirmation Dialog พร้อม Warning

### 6.1 แสดงจำนวนที่จะข้าม
```text
+-- ยืนยันการนำเข้าข้อมูล ----------------------------------+
|                                                          |
|  คุณกำลังจะดำเนินการดังนี้:                                 |
|                                                          |
|  ✓ เพิ่มป้ายใหม่:           2,590 รายการ                  |
|  ⚠ อัพเดทป้ายที่มีอยู่:      9 รายการ                      |
|  ⏭ ข้ามแถวที่ซ้ำ:           12 รายการ                     |  <-- ใหม่
|                                                          |
|  ⚠ หมายเหตุ:                                             |
|  • การอัพเดทจะทับข้อมูลเดิมในระบบ                         |
|  • แถวที่มี OldCode ซ้ำจะใช้ข้อมูลจากแถวแรกเท่านั้น         |
|                                                          |
|                          [ยกเลิก]  [ยืนยันนำเข้า]           |
+----------------------------------------------------------+
```

---

## ส่วนที่ 7: ขั้นตอนการดำเนินงาน

1. **เพิ่ม status "warning"** - สำหรับ OldCode ซ้ำที่ Location ต่างกัน
2. **ปรับ Logic ตรวจสอบ** - เก็บ Location พร้อม OldCode ในการเปรียบเทียบ
3. **เพิ่ม Collapsible คำอธิบาย** - อธิบายวิธีการตรวจสอบทั้งหมด
4. **เพิ่มคอลัมน์ Location** - แสดงในตาราง Preview
5. **ปรับ canImport Logic** - อนุญาต Warning แต่ Block Duplicate
6. **ปรับ Confirmation Dialog** - แสดงจำนวนที่จะข้าม

---

## ประโยชน์ที่จะได้รับ

- รองรับกรณี OldCode ซ้ำแต่คนละ Location (เป็นป้ายคนละตัว)
- Block เฉพาะกรณีที่ซ้ำจริงๆ (OldCode + Location เหมือนกัน)
- มีคำอธิบายชัดเจนให้ผู้ใช้เข้าใจวิธีการตรวจสอบ
- ลดความสับสนและข้อผิดพลาดในการนำเข้าข้อมูล

