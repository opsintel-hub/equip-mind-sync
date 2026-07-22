
## 1. แสดงฝ่ายที่ผู้ใช้มีสิทธิ์ + Auto-fill (ใช้ทั่วทั้งระบบ)

**ปรับ `src/components/equipment/SimpleDepartmentSelect.tsx`:**
- ถ้าผู้ใช้มีสิทธิ์ **1 ฝ่าย** → Auto-fill + disable (มีอยู่แล้ว) แต่เพิ่ม badge เขียว "✓ ฝ่ายของคุณ" ใต้ช่องให้ผู้ใช้เห็น
- ถ้าผู้ใช้มีสิทธิ์ **หลายฝ่าย** → dropdown แสดงเฉพาะฝ่ายที่มีสิทธิ์ (มีอยู่แล้ว) + เพิ่มแถวเล็ก ๆ ใต้ช่องเป็น badge แสดง "สิทธิ์ของคุณ: [ฝ่าย A] [ฝ่าย B] ..." คลิกที่ badge ได้เพื่อเลือกเร็ว
- ถ้าเป็น Super Admin → แสดงทุกฝ่ายตามปกติ พร้อม badge "Super Admin — เห็นทุกฝ่าย"

เนื่องจากเมนูอื่น ๆ (Equipment, Media Player, Delivery, Loan, ฯลฯ) ใช้ `SimpleDepartmentSelect` ตัวเดียวกันอยู่แล้ว → แก้ที่เดียวจบทุกเมนู ไม่ต้องไล่แก้รายไฟล์

## 2. Cascade คลังสินค้า & ตำแหน่งจัดเก็บตามฝ่ายที่เลือก

**ปรับ `src/components/location/WarehouseLocationSelect.tsx`:**
- รับ prop `department` (มีอยู่แล้วในบางเมนู) — ในหน้า "เพิ่มเครื่องมือ" ยังไม่ส่ง prop นี้ ต้องเพิ่มเข้าไป
- Filter `warehouses` ให้แสดงเฉพาะที่อยู่ในฝ่ายนั้น ๆ (ผ่าน `warehouses.department` หรือ join ผ่าน department)
- เมื่อยังไม่เลือกฝ่าย → disabled + hint "กรุณาเลือกฝ่ายก่อน"
- เมื่อเปลี่ยนฝ่าย → reset warehouse/location เพื่อกันข้อมูลไขว้

**ปรับ `ToolForm.tsx`:** ส่ง `department={form.watch("department")}` เข้า `WarehouseLocationSelect` และ reset location เมื่อฝ่ายเปลี่ยน (ใช้ pattern เดียวกันในหน้าอื่นถ้ายังไม่ได้ทำ)

## 3. แก้ Layout ล้น (ผู้จัดจำหน่าย)

**ปรับใน `ToolForm.tsx` section "แหล่งที่มา & คลังจัดเก็บ":**
- เพิ่ม `min-w-0` ให้ทุก `FormItem` ใน grid เพื่อให้ text ยาว ๆ (เช่น "004222 - บริษัท 320 เอสพี จำกัด") ตัดเป็น `truncate` แทนที่จะดันขอบขวาออก
- ปรับ `SupplierSelect` / `CompanySelect` trigger ให้ใส่ `w-full min-w-0` + `<span className="truncate">` รอบค่าที่แสดง
- เปลี่ยน grid จาก `md:grid-cols-2 lg:grid-cols-3` เป็น `md:grid-cols-2` เพื่อให้แต่ละช่องกว้างพอ (หน้า tool form ใช้ dialog `max-w-4xl`)
- ลบช่อง "วันหมดอายุ" (`expiry_date`) ที่ผู้ใช้บอกไม่ได้ใช้ ออกจาก form ทั้ง Add + Edit

## 4. แก้ Upload เอกสารล้มเหลว — "Invalid key"

**สาเหตุ (ยืนยันจากภาพ error):** ข้อความ error คือ `Invalid key: TL 0002/TL_0002_...` — path มี **ช่องว่างในโฟลเดอร์** (`TL 0002`) เพราะรหัสเครื่องมือบางตัวมีช่องว่าง เช่น `TL 0002`, `PB_PO25010229` ก็อาจมีอักขระอื่นที่ Supabase Storage ไม่ยอมรับใน bucket key

**ใน `src/components/tools/ToolDocumentUpload.tsx`:**
- Sanitize `toolCode` ก่อนใช้เป็น folder: `sanitize(toolCode)` ทั้งใน `path = ${sanitize(toolCode)}/${finalName}` และใน `buildFileName`
- ขยาย `sanitize()` ให้ครอบคลุมทุกอักขระที่ Supabase Storage รับ (แทนช่องว่าง + Unicode พิเศษด้วย `_`) — ใช้ regex `[^A-Za-z0-9._\-]+` (เอา `ก-๙` ออกจาก path เพราะ Thai ในโฟลเดอร์ก็เสี่ยง) แต่ยังคงชื่อไฟล์อ่านออก
- เพิ่ม fallback: ถ้า `toolCode` ว่างหรือ sanitize แล้วว่าง → ใช้ `unassigned`
- ทำ retry-safe: ถ้า upload error → toast error พร้อมชื่อไฟล์และเหตุผลเดิม (มีอยู่แล้ว) และไม่ insert DB row

**ทำไมบางคน upload ได้ บางคนไม่ได้:** เพราะขึ้นกับรหัสเครื่องมือของ tool ที่เขาแนบ — ถ้ารหัสไม่มีช่องว่าง/อักขระพิเศษก็ผ่าน ถ้ามีจะพัง หลังแก้ sanitize จะรองรับได้ทุกกรณี

**Migration เล็ก:** สแกน `tool_documents` เก่าที่ `file_path` มีช่องว่าง — แค่รายงาน ไม่ย้ายไฟล์ (ไฟล์เก่าที่ upload สำเร็จแล้วยังเข้าถึงได้ผ่าน signed URL) ถ้าพบมีเยอะ ค่อยเสนอ script ย้าย

## 5. การค้นหาเอกสาร

หลังแก้ข้อ 4 การค้นหาในหน้า `ToolList` (ที่ค้นด้วยชื่อไฟล์/รหัสเครื่องมือ/ประเภทเอกสาร) จะ match ได้ถูกต้อง เพราะ `file_name` ที่เก็บใน DB จะสอดคล้องกับ pattern `{รหัสสะอาด}_{ประเภท}_{YYYYMMDD}_{ชื่อเดิม}` ทุกไฟล์ — ไม่ต้องแก้ logic ค้นหาเพิ่ม

## ไฟล์ที่จะแก้

- `src/components/equipment/SimpleDepartmentSelect.tsx` — badges + hint
- `src/components/location/WarehouseLocationSelect.tsx` — filter by department + disabled state
- `src/components/tools/ToolForm.tsx` — ส่ง department prop, ลบ expiry_date, min-w-0, grid ปรับ
- `src/components/tools/ToolEditForm.tsx` — เช่นเดียวกัน (ลบ expiry_date + cascade)
- `src/components/tools/ToolDocumentUpload.tsx` — sanitize path + folder

ไม่แตะ schema, ไม่ migration.
