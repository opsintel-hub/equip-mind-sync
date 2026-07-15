# แผนล้างข้อมูลระบบ (Full Reset)

## ขอบเขต: ลบทั้งหมด เก็บเฉพาะป้ายโฆษณาและผู้ใช้

### สิ่งที่ **จะถูกลบทั้งหมด** (TRUNCATE ... CASCADE)

**กลุ่ม Master Data**
- `categories`, `subcategories`, `brands`, `suppliers`, `companies`, `departments`
- `locations`, `warehouses`, `sections`, `storage_slots`, `sub_storage_slots`
- `units`, `contractors`, `technicians`
- `equipment_code_prefixes`, `tool_code_prefixes`, `media_player_code_prefixes` (รีเซ็ตเลขรัน)
- `media_player_models`, `media_player_names`, `media_player_specifications`, `media_player_statuses`, `cms_types`
- `issue_purposes`, `issue_purpose_categories`, `receipt_purposes`
- `tool_categories`, `tool_pm_types`, `pm_types`, `pm_action_types`, `pm_results`, `pm_schedules`, `pm_history`
- `repair_actions`, `mp_symptoms`, `mp_assessment_results`, `mp_claim_results`, `mp_swap_reject_reasons`

**กลุ่ม Equipment / Tools / Media Player**
- `equipment`, `equipment_serial_numbers`, `equipment_images`
- `equipment_billboard_compatibility`, `equipment_compatibility_packages`
- `equipment_transfers`, `equipment_loans`
- `equipment_pm_tasks`, `equipment_pm_task_images`, `equipment_pm_schedules`, `equipment_pm_history`
- `tools`, `technician_tools`, `tool_pm_tasks`, `tool_pm_task_images`, `tool_pm_history`
- `media_players`, `media_player_images`, `media_player_billboard_history`, `media_player_serial_history`

**กลุ่มธุรกรรม (ทั้งหมด)**
- `stock_movements`, `low_stock_alerts`, `purchase_requests`
- `goods_receipt`, `goods_receipt_pending`
- `goods_issue`, `goods_issue_pending`, `goods_issue_pending_items`
- `delivery_confirmations`, `direct_shipments`, `direct_shipment_items`
- `defective_returns`, `claim_records`, `claim_progress_logs`
- `assessment_logs`, `swap_requests`, `swap_executions`
- `billboard_equipment`, `billboard_equipment_history` (การผูกอุปกรณ์กับป้าย)
- `notifications`, `notification_dismissals`

**รีเซ็ต Sequences** ที่เกี่ยวข้องกับเลขเอกสาร (PR, TPM, PMT, ASM, CLM, SWP, DC ฯลฯ) กลับเป็น 1

### สิ่งที่ **เก็บไว้ไม่แตะ**

- `auth.users` และ `profiles` (ผู้ใช้ทั้งหมด)
- `user_roles`, `user_departments`, `user_function_permissions`, `permission_templates` (สิทธิ์)
- `billboards`, `billboard_packages`, `billboard_package_items` (ป้ายโฆษณา + Package)
- `billboard_pm_actions`, `billboard_pm_history`, `billboard_sync_logs` (ประวัติ PM ป้าย)
- `ad_media_types`, `ad_sizes`, `ad_target_billboards`, `ad_versions`, `advertisements`, `ad_issue_requests` (ระบบโฆษณา)
- `admin_guide_entries`, `system_settings`, `notification_settings`
- `external_db_connections`, `equipment_code_prefixes`? → **ลบตามที่ระบุด้านบน**

### รายละเอียดเทคนิค

- ใช้ `TRUNCATE ... RESTART IDENTITY CASCADE` ครอบคลุมเป็นชุดตามลำดับ FK
- ปิด trigger ชั่วคราวเฉพาะที่จำเป็น (เช่น trigger auto-PR) ระหว่าง truncate
- Reset `equipment_code_prefixes.next_number`, `tool_code_prefixes.next_number`, `media_player_code_prefixes.next_number` → 1 (ถ้าเก็บโครงสร้าง prefix) — **แต่ตามคำขอ = ลบทิ้งเลย** จะไม่มี prefix ให้เลือกจนกว่าจะสร้างใหม่ใน Master Data
- รีเซ็ต sequences: `purchase_request_number_seq`, `tool_pm_task_number_seq`, `equipment_pm_task_number_seq`, `assessment_log_number_seq`, `claim_record_number_seq`, `swap_request_number_seq`

### ผลลัพธ์ที่ผู้ใช้จะเห็นหลังลบ

- ✅ ล็อกอินได้ปกติ, สิทธิ์เดิมยังอยู่
- ✅ ป้ายโฆษณาและ Package ป้ายยังอยู่ครบ
- ✅ ระบบโฆษณา (ads) ยังทำงาน
- ⚠️ **หน้า Master Data ว่างเปล่า** — ต้องสร้าง Category, Prefix, Supplier, Company, Location, Unit ฯลฯ ใหม่ทั้งหมด **ก่อน** จึงจะสร้างอุปกรณ์/MP/เครื่องมือได้
- ⚠️ Dashboard, รายงาน, KPI จะว่าง (0 records) จนกว่าจะมีข้อมูลใหม่
- ⚠️ ป้ายโฆษณาจะไม่มีอุปกรณ์ติดตั้ง (`billboard_equipment` ว่าง)
- ⚠️ ประวัติการเบิก-รับ-เคลม-สลับ ทั้งหมดหายถาวร

### ลำดับหลังลบเสร็จ (แนะนำ)

1. สร้าง Prefix codes ใหม่ใน Master Data → Equipment/Tool/MP Code Prefixes
2. สร้าง Category / Subcategory
3. สร้าง Company, Department, Location (Warehouse → Section → Slot)
4. สร้าง Supplier, Brand, Unit
5. สร้าง Issue/Receipt Purposes, PM Types, Repair Actions
6. เริ่มนำเข้าอุปกรณ์/MP/เครื่องมือใหม่ผ่าน Import Template หรือทีละรายการ

### หลังรัน migration

ผมจะรายงานให้ทราบ:
- จำนวนแถวที่เหลือในแต่ละกลุ่มตาราง (billboards, users, roles, ads ฯลฯ)
- ยืนยันว่าตารางที่ควรว่าง = 0
- แจ้งขั้นตอนต่อไปที่ต้องทำใน Master Data

**⚠️ คำเตือน:** การลบนี้ไม่สามารถ undo ได้ ต้องกด Approve migration เพื่อยืนยัน
