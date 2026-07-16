
# Department Scoping ทั้งระบบ + Billboard Filter ตาม Compatibility

เป้าหมาย 2 เรื่อง:

1. **ทุก role ยกเว้น Super Admin** เห็นเฉพาะข้อมูลของ "ฝ่ายที่ตนมีสิทธิ์" (`getViewableDepartments()`) — บังคับทั้ง Transaction, Reports, Master Data, Dropdown
2. **Dropdown ป้ายโฆษณาในรายการเบิก** ต้องแสดงเฉพาะป้ายที่ "อะไหล่/สินค้าที่เลือก" รองรับ (ตาม `billboard_compatibility_mode` + resolved list)

---

## Section 1 — Department Scoping (Frontend Filter)

ใช้ hook เดิม `useDepartmentPermissions` (คืน `isSuperAdmin`, `getViewableDepartments()`) — เพิ่ม filter ที่ query ทุกจุดที่ดึงข้อมูล 4 ตารางหลัก:

| ตาราง | คอลัมน์กรอง |
|---|---|
| `billboards` | `department` |
| `equipment` | `department` |
| `media_players` | `department` |
| `tools` | `department` |

รูปแบบมาตรฐาน (ทำเป็น helper ใน `src/lib/deptScope.ts`):
```ts
if (!isSuperAdmin) query = query.in("department", viewableDepts);
```

### ไฟล์ที่ต้องแก้ (ตามการ scan)

**Billboards (department filter)**
- `src/pages/Billboards.tsx`
- `src/pages/BillboardDetail.tsx`
- `src/pages/BillboardIssueReport.tsx`
- `src/pages/BillboardPackages.tsx`
- `src/pages/BillboardPartsAvailability.tsx`
- `src/pages/BillboardPMPage.tsx`
- `src/components/billboard/BillboardSelect.tsx` (default dept = user's viewable)
- `src/components/billboard/BillboardSummaryCards.tsx`
- `src/components/billboard/BillboardDisplay.tsx`
- `src/components/billboard/BillboardEquipmentExport.tsx`
- `src/components/billboard/BillboardExport.tsx`
- `src/components/billboard/BillboardFilters.tsx` (options list)
- `src/components/billboard/BillboardPackageSelect.tsx`
- `src/components/pm/BillboardPMFilters.tsx`
- `src/components/BillboardEquipmentChart.tsx`

**Equipment / spare parts**
- `src/pages/IssueRequest.tsx` (dropdown FIFO — ภาพที่1)
- `src/pages/IssueGoods.tsx`, `GoodsIssue.tsx`, `WaitingStockRequests.tsx`
- `src/pages/InventoryReport.tsx`, `DeadStockReport.tsx`, `StockCard.tsx`, `StockReconciliation.tsx`, `DocumentSearch.tsx`
- `src/pages/EquipmentTrackingReport.tsx`, `IncompleteIssues.tsx`, `DefectiveReturnEntry.tsx`, `DisposalApproval.tsx`
- `src/components/equipment/EquipmentList.tsx`, `EquipmentTransferForm.tsx`, `SerialNumberSelect.tsx`
- `src/components/loan/LoanRequestForm.tsx`
- `src/components/reconciliation/ItemTracer.tsx`
- `src/components/kpi/*` (InventoryValue, DeadStock, ExpiryWarranty, MinStock, StockTurnover)
- `src/components/pm/PMScheduleImport.tsx`, `PMHistoryList.tsx`

**Media Players**
- `src/pages/MediaPlayerReport.tsx`, `MediaPlayerProfile.tsx`, `MediaPlayerEntry.tsx`
- `src/components/media-player/profile/ProfileSearch.tsx`, `MediaPlayerInfoEditDialog.tsx`
- `src/components/kpi/MediaPlayerStatusKPI.tsx`

**Tools**
- `src/pages/ToolManagement.tsx`, `ToolPMSchedule.tsx`, `ToolPMReport.tsx`, `ToolPMTasks.tsx`, `ToolPMHistory.tsx`
- `src/components/tools/ToolList.tsx`, `ToolForm.tsx`, `ToolEditForm.tsx`, `TechnicianToolsDialog.tsx`, `ToolImport.tsx`

**Cross-cutting**
- `src/components/GlobalSearch.tsx` — filter billboards/equipment/mp/tools
- `src/components/ExpiryAlerts.tsx`, `LowStockAlerts.tsx`, `BillboardEquipmentAlerts.tsx`, `PendingAssessmentAlerts.tsx`, `NotificationCenter.tsx` (ส่วนใหญ่ใช้ hook อยู่แล้ว — ตรวจให้ครบ)
- `src/components/LocationInventoryChart.tsx`, `CategoryPieChart.tsx`, `dashboard/StockMovementChart.tsx`

### ยกเว้น
- Super Admin: ไม่กรอง
- Admin: กรองตาม `getViewableDepartments()` (ปัจจุบัน hook คืน permissions ตามที่ตั้งใน user_departments)
- หน้า Public (`/p/...`, `AdContractorView`, `AdPublicView`, `BillboardPublicView`, `MediaPlayerPublicView`, `DirectShippingPublicView`) — ไม่แตะ
- Admin Master Data ทั่วไป (departments, suppliers, brands, etc.) — ไม่กรอง (ไม่มีคอลัมน์ department)

### Waiting list ที่ต้องระวัง
- ตอน Sync จาก MSSQL (`sync-billboards-mssql`) และ import — ไม่แตะ (เป็นฝั่ง backend)
- หน้า Approval (Manager/Director) ที่ต้องอนุมัติของฝ่ายอื่นให้ยังทำงานได้ตาม role permission เดิม — Manager เห็นตามฝ่ายที่ตัวเองมีสิทธิ์อยู่แล้ว

---

## Section 2 — Billboard Picker ต้อง filter ตาม Equipment Compatibility (ภาพที่ 2)

ปัจจุบัน `IssueRequest.tsx` มี `compatMap: equipment_id → Set<billboard_id>` อยู่แล้ว (ใช้เตือน cross-billboard) แต่ `BillboardSelect` ยังแสดง "ป้ายทุกใบของฝ่าย"

### เปลี่ยน `BillboardSelect` ให้รับ prop เพิ่ม
```ts
interface Props {
  ...
  allowedBillboardIds?: string[]; // ถ้าส่งมา จะกรองรายการเหลือเฉพาะ id ในนี้
  unrestricted?: boolean;         // ถ้า true = แสดงทุกใบ (ตาม dept)
}
```

### ใน `IssueRequest.tsx` (Add-item form + Cart edit)
- อ่าน `selectedEquipment.billboard_compatibility_mode`
  - `unrestricted` → ส่ง `unrestricted={true}` (แสดงทุกใบของฝ่าย)
  - `multi_partial` / `specific` → ส่ง `allowedBillboardIds = Array.from(compatMap[equipment_id] ?? [])`
- ถ้า `allowedBillboardIds.length === 0` แสดงข้อความ "อะไหล่นี้ยังไม่ระบุป้ายที่รองรับ กรุณาแจ้ง Admin"
- ส่ง `department = requester_department` ด้วย (Section 1)
- Media Player: ไม่ใช้ compat mode → แสดงทุกใบของฝ่าย (คงพฤติกรรมเดิม)

### จุดอื่นที่ใช้ BillboardSelect (ตรวจว่าควร filter ด้วยหรือไม่)
- `EquipmentTransferForm`, `LoanRequestForm`, `AdRequest`, `AssessmentCompleteDialog`, `SwapWizardDialog`, `MediaPlayerInfoEditDialog` — ทบทวนทีละจุด: ถ้าเลือกป้ายเพื่อผูกกับอุปกรณ์ที่มี compat mode ก็ filter ด้วยเช่นกัน

---

## Section 3 — QA / Validation

- Login เป็น user ฝ่าย Digital Media → ตรวจว่าไม่เห็น billboard/equipment/tool/media_player ของฝ่ายอื่นในทุกหน้าที่แก้
- Login เป็น Super Admin → เห็นครบ
- ทดลองเลือกอะไหล่ mode `specific` ใน IssueRequest → ป้ายที่ dropdown เหลือเฉพาะรายการ compat
- ทดลอง `unrestricted` → ยังแสดงป้ายทุกใบ (ของฝ่าย requester)
- ทดสอบ Global Search ให้ไม่ leak ข้ามฝ่าย

---

## หมายเหตุ (สำหรับผู้ใช้)

- งานนี้เป็นการกรองฝั่ง Frontend ล้วน (ไม่แตะ RLS/DB) — ปลอดภัย เพราะ RLS ปัจจุบันเปิดกว้างระดับ role อยู่แล้ว แต่ถ้าต้องการ hard-lock ระดับ DB ในอนาคต สามารถทำเป็น Phase 2 โดยเพิ่ม RLS policy ที่เรียก `has_department_permission()`
- ไม่แตะ import, edge function, sync job, และหน้า public link
