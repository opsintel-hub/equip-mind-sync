

## แผนปรับปรุง 4 ส่วนหลัก

### ส่วนที่ 1: Dashboard สำหรับเจ้าหน้าที่คลัง (หน้าวางแผนจัดเตรียมสินค้า)

สร้างหน้าใหม่ **"แผนจัดเตรียมสินค้า"** (Warehouse Pickup Planning) ให้เจ้าหน้าที่คลังดูภาพรวมงานที่ต้องเตรียมได้ง่ายๆ

**แนวทาง:**
- สร้างหน้าใหม่ `src/pages/WarehousePickupPlanning.tsx`
- เพิ่มเมนูในหมวด "คลังสินค้า" ของ Sidebar พร้อมสิทธิ์ `goods_issue`
- ดึงข้อมูลจาก `goods_issue_pending` ที่ status = `pending` หรือ `approved`

**UI ประกอบด้วย:**
1. **Summary Cards** — แสดง 3 กล่องสรุป:
   - 🏪 รอรับที่คลัง (ด่วน!) — จำนวนรายการ wait_onsite ที่ต้องเตรียมทันที
   - 📅 นัดรับวันนี้/พรุ่งนี้ — จำนวนรายการ scheduled ที่ pickup_date ใกล้ถึง
   - 🚚 รอจัดส่ง — จำนวนรายการ delivery ที่ยังไม่ได้จ่าย

2. **ตาราง Timeline** — เรียงตามความเร่งด่วน:
   - `wait_onsite` → แสดงสีแดง (ด่วนสุด)
   - `scheduled` ที่ pickup_date = วันนี้ → สีส้ม
   - `scheduled` ที่ pickup_date = พรุ่งนี้ → สีเหลือง
   - `delivery` → สีม่วง
   - Columns: รูปแบบการรับ | วันเวลานัดรับ | เลขที่เอกสาร | ผู้ขอเบิก/ฝ่าย | จำนวนรายการ | ปลายทาง | สถานะ

3. **Filters** — กรองตาม: รูปแบบการรับ, วันที่, ฝ่าย, สถานะ

---

### ส่วนที่ 2: เพิ่ม Columns & Filters ในหน้ายืนยันรับสินค้า + อนุมัติเบิกทรัพย์สิน

**DeliveryConfirmation.tsx — เพิ่ม:**
- Columns: ฝ่ายผู้ขอ, จำนวน/หน่วย, วันที่ขอเบิก, รูปแบบการรับ (pickup_type badge)
- Filters: กรองตามสถานะ (รอยืนยัน/ยืนยันแล้ว/แจ้งปัญหา), กรองตามฝ่าย, กรองตามช่วงวันที่

**ManagerApproval.tsx — เพิ่ม:**
- Columns: รูปแบบการรับ (pickup_type badge), วันที่นัดรับ, จำนวนรายการทรัพย์สิน, ชื่อผู้อนุมัติ (ในประวัติ), วันที่อนุมัติ
- Filters: กรองตามฝ่าย, กรองตามบริษัท, กรองตามช่วงวันที่, กรองตามสถานะ (รออนุมัติ/อนุมัติแล้ว/ไม่อนุมัติ)

---

### ส่วนที่ 3: Update หน้ารายงานทั้งหมดให้เป็นปัจจุบัน

**3.1 InventoryReport.tsx** — เพิ่ม:
- Column: รูปแบบการรับ (pickup_type), สถานะอนุมัติ (approval_status)
- Filter: pickup_type, approval_status

**3.2 StockMovementLog.tsx** — เพิ่ม:
- Filter: ช่วงวันที่ (date range picker), กรองตามฝ่าย, กรองตามบริษัท
- Column: ฝ่าย

**3.3 DocumentSearch.tsx** — เพิ่ม:
- ค้นหาเอกสารจาก `goods_issue_pending` (เอกสารเบิก) และ `delivery_confirmations` (เอกสารยืนยันรับ)
- Filter: ประเภทเอกสาร (เพิ่มตัวเลือก "เอกสารเบิก", "เอกสารยืนยันรับ")

**3.4 BillboardIssueReport.tsx** — เพิ่ม:
- Column: pickup_type, สถานะอนุมัติ
- Filter: pickup_type

---

### ส่วนที่ 4: Update หน้าจัดการผู้ใช้ให้เป็นปัจจุบัน

**4.1 UserPermissionManager.tsx:**
- ตาราง Users: เพิ่ม column แสดง role "Manager" ด้วย badge สีม่วง
- Role descriptions: อัปเดตคำอธิบาย Manager role ให้ระบุว่าสามารถ "อนุมัติเบิกทรัพย์สินเฉพาะฝ่ายที่รับผิดชอบ"
- Function permissions: ตรวจสอบว่า `delivery_confirm` และ `manager_approval` แสดงถูกต้องในรายการฟังก์ชัน

**4.2 RoleDescriptions.tsx:**
- อัปเดต ROLE_DETAILS ของ Manager ให้มี capabilities ใหม่: "อนุมัติเบิกทรัพย์สิน", "ดูเฉพาะฝ่ายที่รับผิดชอบ"
- เพิ่ม defaultFunctions: `manager_approval`

**4.3 FunctionDescriptions.tsx:**
- เพิ่มรายการ `delivery_confirm` และ `manager_approval` ใน FUNCTION_DETAILS
- ระบุ relatedPages ที่เกี่ยวข้อง

---

### ไฟล์ที่ต้องสร้าง/แก้ไข

| ไฟล์ | การเปลี่ยนแปลง |
|------|----------------|
| `src/pages/WarehousePickupPlanning.tsx` | **สร้างใหม่** — Dashboard วางแผนจัดเตรียมสินค้า |
| `src/App.tsx` | เพิ่ม route `/warehouse-planning` |
| `src/components/AppSidebar.tsx` | เพิ่มเมนู "แผนจัดเตรียมสินค้า" |
| `src/pages/DeliveryConfirmation.tsx` | เพิ่ม columns + filters |
| `src/pages/ManagerApproval.tsx` | เพิ่ม columns + filters |
| `src/pages/StockMovementLog.tsx` | เพิ่ม filters (date range, ฝ่าย, บริษัท) |
| `src/pages/DocumentSearch.tsx` | เพิ่มแหล่งข้อมูลเอกสารเบิก/ยืนยันรับ |
| `src/components/admin/UserPermissionManager.tsx` | อัปเดต ROLES description + แสดง Manager badge |
| `src/components/admin/RoleDescriptions.tsx` | อัปเดต Manager capabilities + defaultFunctions |
| `src/components/admin/FunctionDescriptions.tsx` | เพิ่ม delivery_confirm + manager_approval |
| `src/hooks/useFunctionPermissions.tsx` | ไม่ต้องแก้ (มี delivery_confirm, manager_approval แล้ว) |

**ไม่ต้อง Migration** — ใช้ข้อมูลที่มีอยู่แล้วในตาราง `goods_issue_pending` (pickup_type, pickup_date, pickup_time, approval_status)

