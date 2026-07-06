## บริบทปัจจุบัน (สิ่งที่มีอยู่แล้ว)

ระบบมีโครงสร้างเชื่อมต่อ MSSQL ที่ใช้งานได้บางส่วนอยู่แล้ว:

- **ตาราง `external_db_connections`** — เก็บ config การเชื่อมต่อ (host, port, db, user, password, table, auto_sync)
- **ตาราง `billboard_sync_logs`** — เก็บประวัติ sync (fetched/inserted/updated/skipped/failed + error)
- **ตาราง `billboards`** — ปลายทางของข้อมูล ใช้ `old_code` เป็น match key
- **Edge Function `sync-billboards-mssql`** — มี endpoint `test-connection`, `preview`, `sync` (ใช้ `npm:mssql@11.0.1`)
- **UI `BillboardDbConnection.tsx`** — อยู่ในหน้า Master Data มี form + ปุ่ม test/save/sync + ตารางประวัติ
- **เมนู sidebar** `"จัดการป้ายโฆษณา(Manual)"` ชี้ไปที่ `/billboards` ซึ่งใช้ `BillboardImport.tsx` (614 บรรทัด) เพื่ออัปโหลด Excel

ดังนั้น **ไม่ต้องสร้างตาราง `asset` / `connection_settings` / `sync_logs` ใหม่** ตามสเปกดิบ — ใช้ของเดิมและปรับปรุงให้ครบตามที่ต้องการ เพราะ downstream ทั้งหมด (BillboardSelect, PM, Packages, Ad target, Equipment install) อ่านจาก `billboards` อยู่แล้ว จึงเป็นการ "แทนที่ไร้รอยต่อ" จริง

---

## เป้าหมาย

1. ยกเลิกการนำเข้าแบบ Excel Manual
2. ให้ MSSQL Sync เป็นแหล่งข้อมูลหลักของ `billboards`
3. ทุกเมนูที่ใช้ป้าย (Select, PM, Packages, Ads, Equipment) ทำงานต่อไม่มีสะดุด
4. เสริมความทนทานของการเชื่อม MSSQL ตามสเปก (retry, timeout, TLS options, pool close)

---

## แผนการทำ

### 1. ปรับปรุง Edge Function `sync-billboards-mssql`

- Parse `host:port` ในกรณี user กรอกรวมกัน
- ตั้ง `options`: `encrypt: false`, `trustServerCertificate: true`, `tdsVersion: "7_4"`, `enableArithAbort: true`, `useUTC: true`
- ตั้ง `connectionTimeout: 60000`, `requestTimeout: 300000`
- ตั้ง `pool: { max: 1, min: 0, idleTimeoutMillis: 30000 }`, `stream: false`
- ใส่ **retry 3 ครั้ง** พร้อม exponential backoff (2s, 4s) รอบ `connectMssql`
- ปิด pool ทุกกรณีใน `finally`
- แปลง error message เป็นภาษาไทยที่เข้าใจง่าย (timeout / auth failed / firewall / TLS)
- Batch upsert 200 rows/ครั้ง (ปัจจุบัน 500) เพื่อลด payload

### 2. ปรับหน้า `/billboards` (แทนที่ Manual Import)

- ลบปุ่ม/Dialog "นำเข้า Excel" (`BillboardImport`) ออกจากหน้า `Billboards.tsx`
- เพิ่ม **แถบสถานะ Sync** ด้านบน: เวลาที่ sync ล่าสุด, สถานะสำเร็จ/ล้มเหลว, จำนวนแถว
- เพิ่มปุ่ม **"Sync ทันที"** เรียก `sync-billboards-mssql/sync` ด้วย config ที่บันทึกไว้ (จำกัดสิทธิ์ admin/super_admin)
- ปุ่ม "เพิ่มป้าย" (manual add) ยังคงอยู่สำหรับกรณีป้ายที่ไม่มีใน MSSQL (เช่น 7-Eleven ภายใน) แต่แสดง badge `manual`
- Field ที่มาจาก MSSQL (region, district, territory, media_type ฯลฯ) ให้ read-only ในหน้าแก้ไข ถ้า `sync_source = 'mssql'` เพื่อกัน sync ครั้งถัดไปทับ

### 3. เพิ่ม column `sync_source` ในตาราง `billboards`

Migration: เพิ่ม `sync_source text default 'manual'` และ `last_synced_at timestamptz`
- Edge Function อัปเดต `sync_source = 'mssql'` และ `last_synced_at = now()` ทุกแถวที่ upsert
- ป้ายที่สร้างจาก UI manual จะเป็น `'manual'` ไม่ถูก sync ทับ (แก้ logic upsert ให้ข้ามแถว `sync_source='manual'`)

### 4. ย้าย/เปลี่ยน UI จัดการการเชื่อมต่อ

- ย้าย `BillboardDbConnection` จาก Master Data มาเป็น **Tab ในหน้า `/billboards`** (Tab: "รายการป้าย" / "ตั้งค่าการเชื่อมต่อ" / "ประวัติ Sync") เพื่อรวมทุกอย่างเกี่ยวกับป้ายไว้จุดเดียว
- เปลี่ยนชื่อ sidebar `"จัดการป้ายโฆษณา(Manual)"` → `"ป้ายโฆษณา"`
- ตัด import/export ของ Master Data ที่อ้างถึง component เดิม

### 5. Cron Sync อัตโนมัติ (Auto Sync)

- ใช้ `auto_sync_enabled` + `auto_sync_days` ที่มีอยู่แล้ว
- เพิ่ม `pg_cron` job รายวันเวลา 02:00 เรียก `sync-billboards-mssql/sync` ผ่าน `pg_net` ถ้าวันนั้นตรงกับ `auto_sync_days`
- Trigger type = `'scheduled'` ใน log

### 6. ล้างของเก่า

- ลบ `src/components/billboard/BillboardImport.tsx` (614 บรรทัด) และไฟล์ template Excel ที่เกี่ยวข้อง (ถ้ามีไฟล์ standalone)
- ลบ button `นำเข้า Excel` ในหน้า `Billboards.tsx`
- อัปเดต memory `billboard/core-management-v2` ให้บันทึกว่า MSSQL sync คือแหล่งข้อมูลหลัก

### 7. Downstream ที่ต้องตรวจ (ไม่ต้องแก้ code แค่ verify)

- `BillboardSelect` — อ่าน `billboards` ตามเดิม ✔
- `BillboardPackages` — อ้าง `billboard_id` ตามเดิม ✔
- `ad_target_billboards` — อ้าง `billboard_id` ตามเดิม ✔
- `billboard_equipment` — install อุปกรณ์บนป้าย อ้าง `billboard_id` ✔
- Billboard PM — trigger จาก expiry ✔
- Public view / QR — อ่านตามเดิม ✔

---

## รายละเอียดเชิงเทคนิค

**Migration ที่ต้องรัน:**
```sql
ALTER TABLE public.billboards
  ADD COLUMN IF NOT EXISTS sync_source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_billboards_sync_source ON public.billboards(sync_source);
```
Cron job แยกอีก migration (ไม่รวมกับ SQL structure) ตามแนวทาง `pg_cron` + `pg_net`

**ไฟล์ที่จะแก้:**
- `supabase/functions/sync-billboards-mssql/index.ts` — เพิ่ม retry, options, port parse, Thai error, sync_source
- `src/pages/Billboards.tsx` — เพิ่ม Tabs, ลบ Excel import button
- `src/components/master-data/BillboardDbConnection.tsx` — ย้าย import path (ยังใช้ component เดิม)
- `src/pages/MasterData.tsx` — ลบ BillboardDbConnection ออก
- `src/components/AppSidebar.tsx` — เปลี่ยนชื่อเมนู
- `src/components/billboard/BillboardImport.tsx` — **ลบ**
- `src/components/billboard/BillboardForm.tsx` — ทำ field read-only เมื่อ `sync_source='mssql'`

**ไม่แตะ:**
- Downstream tables/components (ไม่มีการเปลี่ยน schema `billboards` ที่กระทบ)
- Types file (จะ regen อัตโนมัติหลัง migration)

---

## Acceptance Criteria

- กด "ทดสอบเชื่อมต่อ" กับ config `magicticket.magicsigncloud.com:1433 / planb / planb_viewer` แล้วสำเร็จ
- กด "Sync ทันที" ได้ข้อมูล > 8000 แถวเข้า `billboards`
- Sync ครั้งที่ 2 ไม่สร้างซ้ำ (upsert ตาม `old_code`)
- ป้ายที่สร้าง manual ไม่ถูก sync ทับ
- BillboardSelect, PM, Packages, Ads, Equipment install ยังทำงานปกติ
- Error ทุกกรณีมีข้อความไทยเข้าใจง่ายและบันทึกใน `billboard_sync_logs`
- เมนู sidebar และหน้า `/billboards` ไม่มีปุ่ม Excel import แล้ว
