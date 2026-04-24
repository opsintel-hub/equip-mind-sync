

## แผน: เชื่อมต่อ MS SQL Database ป้ายโฆษณา (One-way Sync)

### ผลทดสอบเบื้องต้น
- **TCP `magicticket.magicsigncloud.com:1433` เปิด ✅** เชื่อมต่อจาก Edge Function ได้โดยตรง ไม่ต้องตั้ง VPN
- เหลือยืนยันแค่ตอน login ว่า user `planb_viewer` มีสิทธิ์อ่านตาราง `Asset` หรือไม่ (จะรู้ตอน "ทดสอบเชื่อมต่อ" ครั้งแรก)

### กลยุทธ์ Conflict Resolution (คำแนะนำ)
ผมแนะนำ **"Smart Match"** เป็นค่า default เพราะปลอดภัยและยืดหยุ่นที่สุด:

| Field group | พฤติกรรม | เหตุผล |
|---|---|---|
| **Authoritative จาก MS SQL** (overwrite ทุกครั้ง) | `region`, `district`, `territory`, `media_type`, `location_name`, `media_class`, `media_segment`, `size`, `bkk_upc` | ข้อมูลโครงสร้างจาก source ภายนอก ควรเป็น truth เดียว |
| **Preserve ใน Lovable** (ห้ามเขียนทับ) | `notes`, `status`, `description`, `extra_1/2/3`, `target_monitoring`, `route_*` | เป็นฟิลด์ operational ที่ทีมแก้ใน Lovable เอง |
| **Insert only ถ้ายังไม่มี** | `equipment_id`, `old_code`, `department` | สร้างใหม่ตอน first sync ห้ามเปลี่ยนทีหลัง (กระทบ FK 10+ ตาราง) |

ผู้ใช้สามารถปรับ rule ในหน้า UI ได้ภายหลัง

---

### สิ่งที่จะสร้าง

#### 1. ตารางใหม่ใน Lovable Cloud
- `external_db_connections` — เก็บ connection config (host, port, database, user, password เข้ารหัส, table name, sync schedule)
- `billboard_sync_logs` — log ผลการ sync แต่ละครั้ง (เวลา, จำนวน inserted/updated/skipped, error)
- `billboard_field_mapping` — กำหนดว่า column ฝั่ง MS SQL จะ map ไป field ไหนใน `billboards` (default mapping seed ไว้)

**Security:** RLS อนุญาตเฉพาะ Super Admin จัดการ connection (รหัสผ่านเก็บใน Supabase secrets ไม่ใช่ในตาราง — ใช้ตารางเก็บแค่ reference key)

#### 2. Edge Function `sync-billboards-mssql`
- ใช้ Deno library `denodrivers/mssql` (TDS protocol native, ไม่ต้อง ODBC)
- **Endpoints:**
  - `POST /test-connection` — ลอง connect + นับ row ในตาราง `Asset` → คืนผลทดสอบ
  - `POST /preview` — ดึง 10 rows แรก แสดงตัวอย่างให้ user ดู
  - `POST /sync` — ดึงทั้งหมด, batch upsert เข้า `billboards` ตาม Smart Match rule, เขียน log
- Deploy แบบ public แต่ตรวจ JWT + role super_admin ใน code

#### 3. Edge Function `auto-sync-scheduler` (ถ้าผู้ใช้เปิด Auto-sync)
- pg_cron ในฐานข้อมูล Supabase ยิง endpoint นี้ทุกวัน 04:00
- เช็ค `external_db_connections.auto_sync_days` ว่าวันนี้อยู่ใน list มั้ย → ถ้าใช่ trigger sync

#### 4. UI: แท็บใหม่ใน `/master-data`
- ชื่อแท็บ: **"เชื่อมต่อ Database ป้าย"** (Super Admin only) — icon `Database`
- หน้าตาตามภาพที่อนุมัติเป๊ะ:
  - **Sub-tab 1: การเชื่อมต่อข้อมูล** (ตามภาพ)
    - Form: ประเภท DB (MS SQL/PostgreSQL), Server, Database, Table, User, Password
    - การ์ด Auto-Sync: toggle + multi-select วันที่ในเดือน (max 4) + เวลา 04:00 fixed
    - ปุ่ม: `ทดสอบเชื่อมต่อ` / `Save & Sync ทันที` / `Sync ข้อมูลเข้าระบบ (Manual)`
  - **Sub-tab 2: สิทธิผู้ใช้งาน** — รายชื่อ Super Admin ที่จัดการ connection ได้
  - **Sub-tab 3 (เพิ่ม): ประวัติการ Sync** — table แสดง log 30 รายการล่าสุด พร้อมจำนวน insert/update/error

#### 5. Field Mapping Editor (เปิดเมื่อกด "ทดสอบเชื่อมต่อ" สำเร็จ)
- Modal แสดง 2 column: **MS SQL columns** (auto-detect จาก SELECT TOP 1) ↔ **Lovable fields**
- Default mapping ตาม Smart Match rule ข้างบน — แก้ได้
- บันทึกใน `billboard_field_mapping`

---

### Flow การใช้งาน
```text
Super Admin → Master Data → "เชื่อมต่อ Database ป้าย"
  ↓ กรอกข้อมูล connection
  ↓ กด [ทดสอบเชื่อมต่อ] → Edge Function ลอง login + นับ row
  ↓ ถ้าผ่าน → เปิด Field Mapping Editor (ครั้งแรก)
  ↓ Save Connection
  ↓ กด [Sync ข้อมูลเข้าระบบ (Manual)] หรือ [Save & Sync ทันที]
  ↓ Edge function ดึงทั้งหมด → batch upsert (500 rows/batch) → log
  ↓ แสดง toast: "Sync สำเร็จ: เพิ่ม 12, อัปเดต 348, ข้าม 5"
```

---

### ข้อพิจารณาด้านความปลอดภัย
1. **รหัสผ่าน MS SQL** — เก็บเป็น Supabase secret ชื่อ `MSSQL_BILLBOARD_PASSWORD` (เพิ่มผ่านตัวเลือก add_secret) ไม่เก็บในตาราง
2. **RLS:** ตาราง `external_db_connections` + `billboard_sync_logs` อนุญาตเฉพาะ `super_admin`
3. **Edge Function:** ตรวจ JWT + verify role ก่อนทำงานทุกครั้ง
4. **Audit:** ทุก sync บันทึก `triggered_by` (user_id) ใน log

---

### ขั้นตอน Implementation
1. **Migration:** สร้าง 3 ตาราง + RLS + seed default field mapping
2. **add_secret:** ขอ `MSSQL_BILLBOARD_PASSWORD` จาก user (รหัสที่ให้มา)
3. **Edge Function `sync-billboards-mssql`** + test connection endpoint
4. **UI:** แท็บใหม่ใน MasterData + 3 sub-tabs
5. **Auto-Sync scheduler** (pg_cron + edge function trigger)
6. **ทดสอบ end-to-end** กับ DB จริง → ปรับ field mapping ตามผล preview

หลังเสร็จ: ผู้ใช้กดปุ่มเดียว = sync ป้ายล่าสุดเข้าระบบ พร้อม log ตรวจสอบย้อนหลังได้

