

# แผนการปรับปรุงระบบ: 3 ส่วนหลัก

## ตรวจสอบสถานะปัจจุบัน

### 1. เมนู "ผู้รับเหมา" ในข้อมูลหลัก -- มีอยู่แล้ว!

ระบบมี "ผู้รับเหมา" (Contractors) อยู่ในหน้าข้อมูลหลักแล้ว ตั้งอยู่ระหว่าง "ผู้จัดจำหน่าย" กับ "ฝ่าย" ครบถ้วนทั้งฟอร์มเพิ่ม/แก้ไข, ตาราง, ค้นหา, ส่งออก Excel โดยไม่ต้องทำอะไรเพิ่มเติมในส่วนนี้

**ตำแหน่งเมนูในแท็บ:** อุปกรณ์ | เครื่องมือ | หมวดหมู่ | คลังสินค้า | ตำแหน่ง | ผู้จัดจำหน่าย | **ผู้รับเหมา** | ฝ่าย | แผนก | บริษัท | วัตถุประสงค์เบิก | วัตถุประสงค์รับ

---

### 2. ปัญหาการระบุป้ายโฆษณาตอนเบิกอะไหล่ -- ระบบรองรับอยู่แล้ว

ระบบปัจจุบันรองรับกรณีต่างๆ ได้ดีอยู่แล้ว:

| สถานการณ์ | วิธีจัดการในระบบ |
|-----------|----------------|
| เบิกหลายชิ้นไปหลายป้าย | เพิ่มแต่ละรายการในตะกร้า แต่ละรายการระบุป้ายคนละป้ายได้ |
| 1 ป้ายต้องใช้อะไหล่เดียวกันหลายชิ้น | ระบุ quantity > 1 ในรายการนั้นและเลือกป้ายเดียวกัน |
| เบิกแล้วยังไม่รู้จะไปป้ายไหน | เลือกวัตถุประสงค์ "อะไหล่สำรองซ่อม" (requires_billboard = true, requires_return = true) ไม่ต้องระบุป้ายตอนเบิก ระบุทีหลังได้ที่หน้า "รอระบุป้าย/รอคืน" |
| อะไหล่มี S/N ต้องเบิกทีละชิ้น | ระบบ SerialNumberSelect บังคับ quantity = 1 ต่อ S/N อยู่แล้ว แต่เพิ่มหลาย S/N ลงตะกร้าแยกรายการได้ |

**สรุป: ไม่ต้องปรับแก้ในส่วนนี้** ระบบรองรับครบแล้ว

---

### 3. ระบบจัดการภาพโฆษณา -- ต้องสร้างใหม่ทั้งหมด

นี่คือส่วนที่ต้องสร้างใหม่ ขอแบ่งรายละเอียดเป็นส่วนๆ ดังนี้

---

## ส่วนที่ A: โครงสร้างฐานข้อมูล

### A1. ตาราง Master Data ใหม่

**`ad_sizes` -- ขนาดภาพโฆษณา**

| คอลัมน์ | ประเภท | คำอธิบาย |
|---------|--------|----------|
| id | UUID PK | |
| name | VARCHAR NOT NULL | เช่น "3x6 เมตร" |
| description | TEXT | |
| is_active | BOOLEAN DEFAULT true | |
| created_at, updated_at | TIMESTAMPTZ | |

**`ad_media_types` -- ประเภทสื่อโฆษณา**

| คอลัมน์ | ประเภท | คำอธิบาย |
|---------|--------|----------|
| id | UUID PK | |
| name | VARCHAR NOT NULL | เช่น "Vinyl", "Sticker", "LED" |
| description | TEXT | |
| is_active | BOOLEAN DEFAULT true | |
| created_at, updated_at | TIMESTAMPTZ | |

### A2. ตารางหลัก

**`advertisements` -- ภาพโฆษณา (header)**

| คอลัมน์ | ประเภท | คำอธิบาย |
|---------|--------|----------|
| id | UUID PK | |
| code | VARCHAR UNIQUE | รหัสอัตโนมัติ (AD-YYYYMMDD-XXX) |
| entry_type | VARCHAR NOT NULL | ประเภทการนำเข้า: 'new', 'temporary', 'old' |
| name | VARCHAR NOT NULL | ชื่อภาพโฆษณา (บังคับ) |
| ad_size_id | UUID FK | ขนาดภาพ |
| ad_media_type_id | UUID FK | ประเภทสื่อ |
| target_installation_date | DATE | วันที่ต้องเบิกไปติดตั้ง (เฉพาะ new) |
| installation_team_id | UUID FK -> contractors | ทีมติดตั้ง/ทีมนำเข้า (บังคับ) |
| installation_details | TEXT | รายละเอียดการติดตั้ง (max 300 ตัวอักษร) |
| status | VARCHAR DEFAULT 'pending' | สถานะ: pending, received, in_storage, issued, installed |
| total_quantity | INTEGER DEFAULT 0 | จำนวนรวมทุกเวอร์ชัน (คำนวณอัตโนมัติ) |
| retention_days | INTEGER | ระยะเวลาจัดเก็บ 30/60/90 วัน (เฉพาะ old) |
| retention_start_date | DATE | วันเริ่มนับจัดเก็บ (เฉพาะ old) |
| retention_alert_sent | BOOLEAN DEFAULT false | แจ้งเตือนแล้วหรือยัง |
| storage_location | TEXT | พื้นที่รับฝาก (เฉพาะ temporary) |
| storage_in_datetime | TIMESTAMPTZ | วัน-เวลาเข้า (เฉพาะ temporary) |
| storage_out_datetime | TIMESTAMPTZ | วัน-เวลาออก (เฉพาะ temporary) |
| pickup_contractor_id | UUID FK -> contractors | ผู้มาหยิบ (เฉพาะ temporary) |
| contact_name | VARCHAR | ชื่อผู้รับผิดชอบ (เฉพาะ old) |
| contact_phone | VARCHAR | เบอร์โทร |
| contact_email | VARCHAR | อีเมล |
| department_id | UUID FK | ฝ่าย |
| company_id | UUID FK | บริษัท |
| notes | TEXT | หมายเหตุ |
| is_active | BOOLEAN DEFAULT true | |
| created_by | UUID | ผู้สร้าง |
| created_at, updated_at | TIMESTAMPTZ | |

**`ad_versions` -- เวอร์ชันของภาพ (1 ภาพมีหลายเวอร์ชัน)**

| คอลัมน์ | ประเภท | คำอธิบาย |
|---------|--------|----------|
| id | UUID PK | |
| advertisement_id | UUID FK -> advertisements ON DELETE CASCADE | |
| version_name | VARCHAR NOT NULL | ชื่อเวอร์ชัน เช่น "Version A" |
| quantity | INTEGER NOT NULL DEFAULT 1 | จำนวนชิ้น |
| created_at | TIMESTAMPTZ | |

**`ad_target_billboards` -- ป้ายเป้าหมาย (เลือกได้มากกว่า 1)**

| คอลัมน์ | ประเภท | คำอธิบาย |
|---------|--------|----------|
| id | UUID PK | |
| advertisement_id | UUID FK -> advertisements ON DELETE CASCADE | |
| billboard_id | UUID FK -> billboards | |
| created_at | TIMESTAMPTZ | |

### A3. Storage Bucket

สร้าง Bucket: `ad-files` (public) สำหรับเก็บรูปภาพถ่ายภาพโฆษณาจริงและเอกสารประกอบ

### A4. ตารางสำหรับการเบิก

**`ad_issue_requests` -- คำขอเบิกภาพโฆษณา**

| คอลัมน์ | ประเภท | คำอธิบาย |
|---------|--------|----------|
| id | UUID PK | |
| document_no | VARCHAR | เลขที่เอกสาร (ADI-YYYYMMDD-XXX) |
| advertisement_id | UUID FK -> advertisements | |
| issue_purpose | VARCHAR NOT NULL | 'install', 'inspect', 'csr' |
| old_ad_action | VARCHAR | 'return_to_warehouse', 'no_return', 'return_for_inspect' |
| issued_quantity | INTEGER | จำนวนที่เบิก |
| target_billboard_id | UUID FK -> billboards | ป้ายเป้าหมาย |
| issued_by | UUID | ผู้เบิก |
| issued_at | TIMESTAMPTZ | วันที่เบิก |
| status | VARCHAR DEFAULT 'pending' | pending, issued, completed |
| notes | TEXT | |
| created_by | UUID | |
| created_at, updated_at | TIMESTAMPTZ | |

---

## ส่วนที่ B: หน้าจอและ Flow การทำงาน

### B1. หน้า "จัดการภาพโฆษณา" (`/ad-management`)

**Layout:**
```text
+-- จัดการภาพโฆษณา ------------------------------------------+
|                                                             |
| [Dashboard/ซ่อน] [+ ภาพใหม่] [ขอใช้พื้นที่] [ภาพเก่า]      |
| [จัดการ Master Data]                                         |
|                                                             |
| -- Dashboard (สรุปสถานะ) --                                  |
| [รอรับเข้า: 5]  [อยู่ในคลัง: 12]  [เบิกแล้ว: 28]            |
| [ฝากชั่วคราว: 3]  [ภาพเก่า: 7]                               |
|                                                             |
| -- ตัวกรอง --                                                |
| [ทุกประเภท v]  [ทุกสถานะ v]  [ค้นหา...]                     |
|                                                             |
| -- ตารางรายการ --                                            |
| # | รหัส    | ประเภท  | ชื่อภาพ    | เวอร์ชัน | รวม | สถานะ  |
|---|---------|--------|-----------|---------|-----|--------|
| 1 | AD-001  | ใหม่   | Samsung   | 3 ver.  | 15  | ในคลัง |
| 2 | AD-002  | เก่า   | Toyota    | 2 ver.  | 8   | รอรับ  |
|                                                             |
+-------------------------------------------------------------+
```

### B2. Dialog "ภาพโฆษณาใหม่" (entry_type = 'new')

```text
+-- เพิ่มภาพโฆษณาใหม่ ----------------------------------+
|                                                        |
| ชื่อภาพโฆษณา *                                          |
| [________________________________]                     |
|                                                        |
| -- เวอร์ชันภาพ (เพิ่มได้หลายเวอร์ชัน) --                 |
| +--------------------------------------+               |
| | ชื่อเวอร์ชัน *    | จำนวน *           |               |
| | [Version A      ] | [5             ] |               |
| | [Version B      ] | [3             ] | [ลบ]          |
| +--------------------------------------+               |
| [+ เพิ่มเวอร์ชัน]                                       |
| ================================                       |
| ผลรวมจำนวนภาพทั้งหมด: 8 ชิ้น                            |
| ================================                       |
|                                                        |
| ภาพถ่ายภาพโฆษณาจริง * (สูงสุด 5 ภาพ)                    |
| "ภาพถ่ายจะต้องเห็นภาพโฆษณาที่ชัดเจน                     |
|  สามารถระบุจำนวน และ เวอร์ชันได้"                        |
| [อัปโหลดรูปภาพ...]                                      |
|                                                        |
| ขนาดภาพ *            Media Type *                      |
| [v เลือก/จัดการ...]   [v เลือก/จัดการ...]                |
|                                                        |
| ตำแหน่งป้ายโฆษณา (เลือกได้หลายป้าย, Search ได้)          |
| [v ค้นหาป้ายโฆษณา...]                                    |
|                                                        |
| วันที่ต้องเบิกไปติดตั้ง *                                 |
| [📅 เลือกวันที่...]                                      |
|                                                        |
| ทีมที่จะเบิกนำไปติดตั้ง *                                 |
| [v เลือกผู้รับเหมา...]                                    |
|                                                        |
| เอกสารประกอบการติดตั้ง (PDF/รูปภาพ)                       |
| [📎 อัปโหลด...]  [ดู]                                    |
|                                                        |
| รายละเอียดการติดตั้ง (สูงสุด 300 ตัวอักษร)                |
| [________________________________]  280/300             |
|                                                        |
|                              [ยกเลิก]  [บันทึก]        |
+--------------------------------------------------------+
```

### B3. Dialog "ขอใช้พื้นที่รับฝากชั่วคราว" (entry_type = 'temporary')

```text
+-- ขอใช้พื้นที่รับฝากชั่วคราว ----------------------------+
|                                                        |
| พื้นที่รับฝาก *                                          |
| [________________________________]                     |
|                                                        |
| วัน-เวลาเข้าใช้พื้นที่ *     วัน-เวลายกเลิกใช้พื้นที่ *    |
| [📅 เลือก...]               [📅 เลือก...]               |
|                                                        |
| ผู้มาหยิบ *                                              |
| [v เลือกผู้รับเหมา...]                                    |
|                                                        |
| หมายเหตุ                                                |
| [________________________________]                     |
|                                                        |
|                              [ยกเลิก]  [บันทึก]        |
+--------------------------------------------------------+
```

### B4. Dialog "ภาพโฆษณาเก่า (ปลดจากป้าย)" (entry_type = 'old')

```text
+-- นำเข้าภาพโฆษณาเก่า ------------------------------------+
|                                                        |
| ชื่อภาพโฆษณา *                                          |
| [________________________________]                     |
|                                                        |
| -- เวอร์ชันภาพ --                                        |
| | ชื่อเวอร์ชัน *    | จำนวน *           |               |
| | [Version A      ] | [3             ] |               |
| [+ เพิ่มเวอร์ชัน]                                       |
| ================================                       |
| ผลรวมจำนวนภาพทั้งหมด: 3 ชิ้น                            |
| ================================                       |
|                                                        |
| ภาพถ่ายภาพโฆษณาจริง * (สูงสุด 5 ภาพ)                    |
| "ภาพถ่ายจะต้องเห็นภาพโฆษณาที่ชัดเจน                     |
|  สามารถระบุจำนวน และ เวอร์ชันได้"                        |
| [อัปโหลดรูปภาพ...]                                      |
|                                                        |
| ขนาดภาพ            Media Type                          |
| [v เลือก...]        [v เลือก...]                         |
|                                                        |
| ระยะเวลาจัดเก็บ *                                       |
| ( ) 30 วัน  ( ) 60 วัน  ( ) 90 วัน                     |
|                                                        |
| ทีมที่นำเข้าเพื่อจัดเก็บ *                                |
| [v เลือกผู้รับเหมา...]                                    |
|                                                        |
| ผู้รับผิดชอบการเก็บรักษา                                  |
| ชื่อ *               เบอร์ติดต่อ *                        |
| [________________]   [________________]                |
|                                                        |
|                              [ยกเลิก]  [บันทึก]        |
+--------------------------------------------------------+
```

### B5. การรับเข้าคลัง (ส่วนของพนักงานคลัง)

```text
+-- รับเข้าคลัง ภาพโฆษณา -----------------------------------+
|                                                           |
| -- รายการรอรับเข้า --                                      |
| | รหัส    | ประเภท | ชื่อภาพ   | จำนวน | ทีม     | [รับเข้า]|
| | AD-001  | ใหม่   | Samsung  | 15    | ทีม A   | [รับ]    |
| | AD-003  | เก่า   | Toyota   | 8     | ทีม B   | [รับ]    |
|                                                           |
| เมื่อกดปุ่ม "รับเข้า":                                      |
| - เปลี่ยนสถานะเป็น "in_storage"                             |
| - กรณี "ภาพใหม่": สร้างเอกสารเบิกอัตโนมัติ (status=pending)|
|   แสดงในหน้า "เบิกภาพโฆษณา" ทันที                          |
+-------------------------------------------------------------+
```

### B6. การเบิกภาพโฆษณา

```text
+-- เบิกภาพโฆษณา -------------------------------------------+
|                                                           |
| เลือกภาพโฆษณาที่ต้องการเบิก                                 |
| [v ค้นหาภาพโฆษณา...]                                       |
|                                                           |
| วัตถุประสงค์การเบิก *                                       |
| ( ) เบิกนำไปติดตั้งที่ป้ายโฆษณา                               |
| ( ) เบิกเพื่อตรวจสภาพ                                       |
| ( ) เบิกเพื่อนำไปทำ CSR                                     |
|                                                           |
| จัดการภาพโฆษณาเก่า                                          |
| ( ) ปลดภาพโฆษณาเก่ากลับเข้าคลัง                             |
| ( ) ไม่ต้องนำภาพโฆษณากลับ                                    |
| ( ) ปลดภาพโฆษณาเก่ากลับเพื่อตรวจสอบ                         |
|                                                           |
| จำนวนที่เบิก      ป้ายเป้าหมาย                               |
| [________]        [v เลือกป้าย...]                          |
|                                                           |
|                              [ยกเลิก]  [ยืนยันเบิก]       |
+-------------------------------------------------------------+
```

---

## ส่วนที่ C: เมนูและ Navigation

เพิ่มเมนูในหมวด "ป้ายโฆษณา" ของ Sidebar:

```text
ป้ายโฆษณา
  ├── จัดการป้ายโฆษณา
  ├── จัดการภาพโฆษณา      <-- ใหม่! (รวมทุกฟีเจอร์ในหน้าเดียว)
  └── PM ป้ายโฆษณา
      ├── ตาราง PM ป้าย
      └── ประวัติ PM ป้าย
```

---

## ส่วนที่ D: ระบบแจ้งเตือน

สำหรับภาพโฆษณาเก่า (entry_type = 'old') ที่ครบกำหนดจัดเก็บ:
- สร้าง Edge Function ใหม่ `check-ad-retention` ที่ตรวจสอบทุกวัน
- เมื่อ `retention_start_date + retention_days <= today` ส่งการแจ้งเตือนไปยังเจ้าหน้าที่คลัง
- ใช้ระบบ Notification เดิมที่มีอยู่

---

## ส่วนที่ E: รายละเอียดทางเทคนิค

### E1. ไฟล์ที่ต้องสร้างใหม่

| ไฟล์ | คำอธิบาย |
|------|----------|
| `src/pages/AdManagement.tsx` | หน้าหลัก: Dashboard, ตาราง, ตัวกรอง, Tab รับเข้า/เบิก |
| `src/components/ad/AdNewForm.tsx` | Dialog ฟอร์มภาพโฆษณาใหม่ |
| `src/components/ad/AdTemporaryForm.tsx` | Dialog ฟอร์มขอใช้พื้นที่ชั่วคราว |
| `src/components/ad/AdOldForm.tsx` | Dialog ฟอร์มภาพโฆษณาเก่า |
| `src/components/ad/AdVersionInput.tsx` | Component เพิ่ม/ลบเวอร์ชัน (reusable) |
| `src/components/ad/AdList.tsx` | ตารางรายการภาพโฆษณา |
| `src/components/ad/AdDashboard.tsx` | สรุปสถานะ |
| `src/components/ad/AdMasterDataDialog.tsx` | Dialog จัดการ Ad Sizes + Media Types |
| `src/components/ad/AdReceiveSection.tsx` | ส่วนรับเข้าคลัง (สำหรับพนักงานคลัง) |
| `src/components/ad/AdIssueDialog.tsx` | Dialog เบิกภาพโฆษณา |
| `src/components/ad/AdPhotoUpload.tsx` | Component อัปโหลดรูปภาพ (max 5, มีคำเตือน) |
| `supabase/functions/check-ad-retention/index.ts` | Edge Function แจ้งเตือนครบกำหนด |

### E2. ไฟล์ที่ต้องแก้ไข

| ไฟล์ | การเปลี่ยนแปลง |
|------|---------------|
| `src/App.tsx` | เพิ่ม route `/ad-management` |
| `src/components/AppSidebar.tsx` | เพิ่มเมนู "จัดการภาพโฆษณา" ในหมวดป้ายโฆษณา |

### E3. Database Migration (SQL รวมทั้งหมด)

```sql
-- 1. Master Data
CREATE TABLE ad_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ad_media_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Main Tables
CREATE TABLE advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR NOT NULL UNIQUE,
  entry_type VARCHAR NOT NULL DEFAULT 'new',
  name VARCHAR NOT NULL,
  ad_size_id UUID REFERENCES ad_sizes(id),
  ad_media_type_id UUID REFERENCES ad_media_types(id),
  photo_urls TEXT[],
  supporting_doc_url TEXT,
  target_installation_date DATE,
  installation_team_id UUID REFERENCES contractors(id),
  installation_details TEXT,
  status VARCHAR NOT NULL DEFAULT 'pending',
  total_quantity INTEGER DEFAULT 0,
  retention_days INTEGER,
  retention_start_date DATE,
  retention_alert_sent BOOLEAN DEFAULT false,
  storage_location TEXT,
  storage_in_datetime TIMESTAMPTZ,
  storage_out_datetime TIMESTAMPTZ,
  pickup_contractor_id UUID REFERENCES contractors(id),
  contact_name VARCHAR,
  contact_phone VARCHAR,
  contact_email VARCHAR,
  department_id UUID REFERENCES departments(id),
  company_id UUID REFERENCES companies(id),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ad_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertisement_id UUID NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
  version_name VARCHAR NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ad_target_billboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertisement_id UUID NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
  billboard_id UUID NOT NULL REFERENCES billboards(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ad_issue_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_no VARCHAR NOT NULL,
  advertisement_id UUID NOT NULL REFERENCES advertisements(id),
  issue_purpose VARCHAR NOT NULL DEFAULT 'install',
  old_ad_action VARCHAR,
  issued_quantity INTEGER,
  target_billboard_id UUID REFERENCES billboards(id),
  issued_by UUID,
  issued_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  status VARCHAR NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS
ALTER TABLE ad_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_media_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_target_billboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_issue_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_manage" ON ad_sizes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_manage" ON ad_media_types FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_manage" ON advertisements FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_manage" ON ad_versions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_manage" ON ad_target_billboards FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_manage" ON ad_issue_requests FOR ALL USING (auth.role() = 'authenticated');

-- 4. Storage
INSERT INTO storage.buckets (id, name, public) VALUES ('ad-files', 'ad-files', true);
CREATE POLICY "auth_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ad-files' AND auth.role() = 'authenticated');
CREATE POLICY "public_read" ON storage.objects FOR SELECT USING (bucket_id = 'ad-files');
CREATE POLICY "auth_delete" ON storage.objects FOR DELETE USING (bucket_id = 'ad-files' AND auth.role() = 'authenticated');
```

---

## ส่วนที่ F: ขั้นตอนการดำเนินงาน (แบ่ง 4 เฟส)

เนื่องจากโมดูลนี้มีขนาดใหญ่มาก ขอแบ่งออกเป็น 4 เฟสเพื่อให้สามารถทดสอบได้ทีละส่วน:

**เฟส 1: ฐานข้อมูล + Master Data + โครงหน้าหลัก**
1. สร้างตารางทั้งหมด + Storage Bucket
2. สร้าง `AdMasterDataDialog.tsx` (จัดการขนาดภาพ + ประเภทสื่อ)
3. สร้าง `AdManagement.tsx` หน้าหลัก + Dashboard เบื้องต้น
4. เพิ่ม Route + Sidebar Menu

**เฟส 2: ฟอร์มนำเข้า 3 ประเภท**
5. สร้าง `AdVersionInput.tsx` (Component เพิ่ม/ลบเวอร์ชัน + ผลรวม)
6. สร้าง `AdPhotoUpload.tsx` (อัปโหลดรูป max 5 + คำเตือน)
7. สร้าง `AdNewForm.tsx` (ภาพโฆษณาใหม่)
8. สร้าง `AdTemporaryForm.tsx` (ขอใช้พื้นที่ชั่วคราว)
9. สร้าง `AdOldForm.tsx` (ภาพโฆษณาเก่า)
10. สร้าง `AdList.tsx` (ตารางรายการ + ตัวกรอง)

**เฟส 3: การรับเข้าคลัง + การเบิก**
11. สร้าง `AdReceiveSection.tsx` (Tab รับเข้าคลัง)
12. สร้าง Auto-create issue document logic
13. สร้าง `AdIssueDialog.tsx` (เบิกภาพโฆษณา + ตัวเลือกภาพเก่า)

**เฟส 4: แจ้งเตือน**
14. สร้าง Edge Function `check-ad-retention`
15. ผูกกับระบบ Notification เดิม

---

## สรุป

| หัวข้อ | สถานะ | ต้องทำ |
|--------|-------|--------|
| เมนูผู้รับเหมาในข้อมูลหลัก | มีอยู่แล้ว | ไม่ต้องทำอะไร |
| ปัญหาระบุป้ายตอนเบิก | ระบบรองรับแล้ว | ไม่ต้องทำอะไร |
| ระบบภาพโฆษณา | ต้องสร้างใหม่ | 6 ตาราง, 12+ ไฟล์ใหม่, 1 Edge Function |

แนะนำให้เริ่มจาก **เฟส 1** ก่อน เพื่อวางฐานข้อมูลและโครงหน้าจอ แล้วค่อยเพิ่มฟอร์มและ Logic ในเฟสถัดไป

