

## แผนการเพิ่มฟิลด์ "Size" ในระบบป้ายโฆษณา

### สรุปงานที่ต้องทำ

เพิ่มคอลัมน์ `size` (เช่น "512x320 px") ในตาราง `billboards` ของฐานข้อมูล แล้วอัปเดตทุกหน้าที่เกี่ยวข้องให้รองรับการแสดงผล กรอกข้อมูล นำเข้า และส่งออกฟิลด์นี้

---

### ขั้นตอนที่ 1: เพิ่มคอลัมน์ในฐานข้อมูล

เพิ่มคอลัมน์ `size` (TEXT, nullable) ในตาราง `billboards` ผ่าน database migration

---

### ขั้นตอนที่ 2: อัปเดตไฟล์ที่เกี่ยวข้อง (14 ไฟล์)

#### กลุ่ม A: ฟอร์มกรอกข้อมูล
| ไฟล์ | สิ่งที่ต้องทำ |
|------|-------------|
| `src/components/billboard/BillboardForm.tsx` | เพิ่มฟิลด์ `size` ใน schema, defaultValues, insert/update query, และ form UI |

#### กลุ่ม B: Import / Export Excel
| ไฟล์ | สิ่งที่ต้องทำ |
|------|-------------|
| `src/components/billboard/BillboardImport.tsx` | เพิ่ม `size` ใน ImportRow interface, column mapping (รับค่า `Size`), template download, insert/update data |
| `src/components/billboard/BillboardExport.tsx` | เพิ่ม `Size` ใน exportData mapping |
| `src/components/billboard/BillboardEquipmentExport.tsx` | เพิ่ม `size` ใน select query และ export mapping (ถ้ามี billboard fields) |

#### กลุ่ม C: หน้าตารางรายการ
| ไฟล์ | สิ่งที่ต้องทำ |
|------|-------------|
| `src/pages/Billboards.tsx` | เพิ่มคอลัมน์ "Size" ในตาราง (TableHead + TableCell) |

#### กลุ่ม D: หน้ารายละเอียด
| ไฟล์ | สิ่งที่ต้องทำ |
|------|-------------|
| `src/pages/BillboardDetail.tsx` | เพิ่มแสดง Size ในการ์ด "ข้อมูลสื่อ" |
| `src/pages/BillboardPublicView.tsx` | เพิ่มแสดง Size ในการ์ด "ข้อมูลสื่อ" (หน้า QR public) |

#### กลุ่ม E: หน้ารายงาน / Tracking
| ไฟล์ | สิ่งที่ต้องทำ |
|------|-------------|
| `src/pages/EquipmentTrackingReport.tsx` | เพิ่ม `size` ใน billboard select query และแสดงในตาราง/export |
| `src/pages/BillboardIssueReport.tsx` | เพิ่ม `size` ใน billboard query และตาราง |
| `src/pages/BillboardPMPage.tsx` | เพิ่ม `size` ใน billboard select fields |

#### กลุ่ม F: Component ย่อยที่แสดงข้อมูลป้าย
| ไฟล์ | สิ่งที่ต้องทำ |
|------|-------------|
| `src/components/billboard/BillboardSelect.tsx` | เพิ่ม `size` ใน description (optional) |
| `src/components/billboard/BillboardDisplay.tsx` | เพิ่มแสดง size ถ้ามี |

#### กลุ่ม G: PM Import
| ไฟล์ | สิ่งที่ต้องทำ |
|------|-------------|
| `src/components/pm/PMScheduleImport.tsx` | เพิ่ม `size` ใน billboard select (ถ้าแสดงข้อมูลป้าย) |

---

### รายละเอียดทางเทคนิค

- **Migration SQL**: `ALTER TABLE public.billboards ADD COLUMN size TEXT;`
- **ไม่กระทบข้อมูลเดิม**: คอลัมน์เป็น nullable จึงไม่มีผลกับข้อมูลที่มีอยู่
- **Template Excel**: จะเพิ่มคอลัมน์ `Size` ต่อท้ายคอลัมน์ `Notes` ให้สอดคล้องกับไฟล์ที่ส่งมา
- **Import mapping**: รับค่าจากคอลัมน์ `Size` หรือ `size` ในไฟล์ Excel

