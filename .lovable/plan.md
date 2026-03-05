

## แผนดำเนินการ 3 ข้อ

### ข้อ 1: Dashboard ผู้เบิก — เพิ่มมุมมองตามสินค้า/อะไหล่

**ปัจจุบัน**: หน้า RequesterDashboard ค้นหาด้วยชื่อผู้เบิก แสดงรายการคำขอ
**เพิ่ม**: แท็บใหม่ "มุมมองตามสินค้า" ที่รวมข้อมูลจาก `goods_issue_pending_items` + `goods_issue_pending` เพื่อแสดง:

1. **ตารางสรุปยอดเบิกตามสินค้า** — รวมจาก items ทุก request:
   - Columns: รหัสสินค้า | ชื่อสินค้า | จำนวนเบิกรวม | จำนวนครั้งที่ถูกเบิก | ผู้เบิกล่าสุด | ผู้อนุมัติ | วันที่เบิกล่าสุด
   - เรียงจากจำนวนมากไปน้อยเพื่อเห็นรายการผิดปกติ
   - Filter: ช่วงวันที่, ฝ่าย

2. **ตารางรายละเอียด** — กดที่แถวสินค้าเพื่อดูว่าใครเบิกบ้าง:
   - Columns: ผู้เบิก | ฝ่าย | จำนวน | วันที่ | เลขที่เอกสาร | สถานะ | ผู้อนุมัติ

**แก้ไขไฟล์**: `src/pages/RequesterDashboard.tsx` — เพิ่ม Tab "มุมมองตามสินค้า" ใน Tabs component ที่มีอยู่

---

### ข้อ 2: Update Template Import/Export ทุกอันให้เป็นปัจจุบัน

ตรวจสอบและเพิ่ม columns ใหม่ที่เพิ่งเพิ่มเข้าระบบ:

| ไฟล์ | เพิ่ม columns |
|------|--------------|
| `DeliveryImport.tsx` | `เลขที่ Invoice`, `เลขที่ใบส่งของ`, `Order For Project` |
| `BillboardImport.tsx` | ไม่ต้องแก้ (มี Size แล้ว) |
| `BillboardExport.tsx` | เปลี่ยน column "Status" → "สถานะ" (แก้ข้อ 3 ด้วย) |
| `MediaPlayerImport.tsx` | `delivery_note_number`, `invoice_number` |
| `EquipmentImport.tsx` | `is_asset`, `section`, `company` (ถ้ายังไม่มี) |

---

### ข้อ 3: แก้ชื่อ Column "Status" ในระบบป้ายโฆษณาให้สอดคล้องกัน

**ปัญหา**: Export Excel ใช้ชื่อ column "Status" แต่หน้าจอแสดงเป็น "สถานะ" และค่าแสดงเป็น "ใช้งาน/ไม่ใช้งาน" แต่ใน Excel เป็น "active/inactive"

**แก้ไข**:
- `BillboardExport.tsx`: เปลี่ยนชื่อ column จาก `Status` → `สถานะ` และแปลงค่าเป็นภาษาไทย (active→ใช้งาน, maintenance→บำรุงรักษา, inactive→ไม่ใช้งาน) เพื่อให้ตรงกับหน้าจอ
- `BillboardImport.tsx`: อัปเดต template ให้ใช้ `สถานะ` แทน `Status` และรองรับทั้งค่าภาษาไทยและอังกฤษเมื่อ import กลับ
- `Billboards.tsx` table header: ไม่ต้องแก้ (แสดง "สถานะ" อยู่แล้ว ถูกต้อง)

---

### ไฟล์ที่ต้องแก้ไข

| ไฟล์ | การเปลี่ยนแปลง |
|------|----------------|
| `src/pages/RequesterDashboard.tsx` | เพิ่มแท็บ "มุมมองตามสินค้า" พร้อมตารางสรุปและรายละเอียด |
| `src/components/delivery/DeliveryImport.tsx` | เพิ่ม columns ใหม่ใน template |
| `src/components/media-player/MediaPlayerImport.tsx` | เพิ่ม columns ใหม่ใน template |
| `src/components/billboard/BillboardExport.tsx` | เปลี่ยน Status→สถานะ + แปลงค่าเป็นไทย |
| `src/components/billboard/BillboardImport.tsx` | เปลี่ยน Status→สถานะ + รองรับค่าไทย/อังกฤษ |

**ไม่ต้อง Migration** — ใช้ข้อมูลที่มีอยู่แล้ว

