
## ปัญหาที่พบ

จากการตรวจสอบ DB และโค้ด `src/pages/ReceiveGoods.tsx` (ทั้ง `confirmReceive` ~บรรทัด 585 และ `confirmBatchReceive` ~บรรทัด 847):

ทุกครั้งที่รับ Media Player เข้าคลัง โค้ดจะ **UPDATE row เดิม** ใน `media_players` (โดย `media_player_id`) แล้วบวก `quantity` พร้อมเขียนทับ `serial_number_1` ทำให้:

- รับ 4 ใบ (KSA7399839, KSA7399896, KSA7399898, KSA7399905) → เกิดเพียง 3 rows
- 1 row ถูกบวก quantity เป็น 2 และเก็บ S/N ของใบสุดท้ายเท่านั้น
- ผิดกฎ `mem://data-model/media-player-unit-individualization` ที่บอกว่าต้อง **1 record ต่อ 1 เครื่อง**

ผลลัพธ์ลามไปทุกหน้า:
- รายงานสินค้าคงคลัง: 3 แถว (ควรเป็น 4) แถวที่ qty=2 จับคู่ SN จาก stock_movements เลยโชว์ 2 SN รวมกัน
- Media Player Profile / Report: เห็นเพียง 3 เครื่อง (ขาด KSA7399839)
- หน่วย "ชิ้น" vs "เครื่อง" ไม่สม่ำเสมอ (เช่น Document Search โชว์ "ชิ้น" สำหรับ DR ของ Media Player)

## สิ่งที่จะแก้

### 1. `src/pages/ReceiveGoods.tsx` — Clone Media Player ทุกใบรับ

ทั้ง `confirmReceive` (single) และ `confirmBatchReceive` (batch) สำหรับสาขา `isMediaPlayer`:

- **ถ้า row เดิม (`media_player_id` ที่ผูกกับใบรับ) มี `quantity = 0` และยังไม่มี `serial_number_1`** → ใช้ row เดิม (เคสรับครั้งแรกของ master ที่เพิ่งสร้าง quantity=0 ตามกฎ `mem://features/media-player/setup-quantity-zero`)
- **กรณีอื่น** (row เดิมมี SN/qty อยู่แล้ว) → **INSERT row ใหม่** โดย:
  - copy ฟิลด์ identity จาก master row (code, name, model_id, brand, category ฯลฯ)
  - set `quantity = 1`, `status = 'active'`, `serial_number_1 = SN ใบรับ`, `serial_number_2 = SN2 ถ้ามี`
  - เติม payload จากใบรับ (department, location_id, supplier_id, company_id, unit_price, po/pr/invoice, depreciation, warranty, asset_code ฯลฯ — เหมือน payload เดิม)
  - log `stock_movements` ผูกกับ `media_player_id` ของ row ใหม่ (stock_before=0, stock_after=1)
- อัปเดต `goods_receipt_pending.media_player_id` (หรือ field ที่อ้างอิง) ของใบรับนั้นให้ชี้ไป row ใหม่ เพื่อให้ trace ย้อนได้
- คง `quantity = 1` (ไม่บวกสะสม) ตามกฎ One Code to Many Units

### 2. Data fix สำหรับ 4 ใบที่หลุดไปแล้ว (MP-DGT-0002)

Migration/insert ครั้งเดียวเพื่อ:
- INSERT row ใหม่สำหรับ **KSA7399839** (copy จาก row ใดก็ได้ของ MP-DGT-0002, qty=1, location_id เดิม)
- ลด quantity ของ row d8049db5 (KSA7399898) จาก 2 → 1
- อัปเดต `goods_receipt_pending` ของ PD-20260624-945-01 ให้ชี้ media_player_id ใหม่
- เติม stock_movement ของ KSA7399839 ให้ครบ (ลบ movement ที่ผูกผิดหรือ rewire)

### 3. หน่วยให้เป็น "เครื่อง" สำหรับ Media Player ทุกหน้า

ตรวจสอบและแก้จุดที่ใช้คำว่า "ชิ้น" hard-code ใน:
- `src/pages/DocumentSearch.tsx` (คอลัมน์จำนวนของ DR/PD ที่เป็น Media Player)
- `src/pages/DefectiveReturnEntry.tsx` (ถ้ามี)
- หน้าอื่นที่ขึ้นกับประเภท → ใช้ helper เลือก `"เครื่อง"` เมื่อ `is_media_player === true` ไม่งั้น `"ชิ้น"`

## รายละเอียดทางเทคนิค

ไฟล์ที่แก้:
- `src/pages/ReceiveGoods.tsx` — เปลี่ยน flow รับ MP เป็น clone-per-unit ทั้ง 2 จุด
- `src/pages/DocumentSearch.tsx` — render หน่วยตามประเภท
- ไฟล์อื่นที่พบว่า hard-code "ชิ้น" สำหรับ MP (จะ rg หา)

DB:
- migration/insert แก้ข้อมูลย้อนหลัง 1 ครั้ง (KSA7399839 + ลด qty)

ไม่แตะ:
- Master data setup flow (quantity=0 ตามเดิม)
- Schema `media_players`
- Logic Assessment/Swap/Defective

## ผลที่คาดหวัง

- รับ MP 4 ใบ → 4 rows แยกตาม S/N ทุกหน้าตรงกัน (Inventory Report 4 บรรทัด, MP Profile/Report เห็น 4 เครื่อง)
- หน่วย Media Player แสดง "เครื่อง" สม่ำเสมอทุกหน้า
- ข้อมูล MP-DGT-0002 เดิมถูกแก้ให้ครบ 4 เครื่องย้อนหลัง
