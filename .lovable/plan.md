## ปัญหา
`requires_return` อยู่ที่ระดับ**ใบเบิก (purpose)** — เลือกวัตถุประสงค์ที่ต้องคืนของเก่าแล้วบังคับคืน**ทุกรายการ** รวมของสิ้นเปลือง (ทินเนอร์ กาว) ที่ไม่ควรต้องคืน

## 4 แนวทาง

### แนวทาง A — Flag ที่ระดับ Category + Override รายบรรทัด
- `categories.is_consumable` + `goods_issue_pending_items.needs_return`
- ตั้งครั้งเดียวต่อหมวด → ครอบคลุมทุกสินค้าในหมวดนั้นทันที
- **ข้อดี:** ตั้งน้อยจุด (~สิบกว่าหมวด), เพิ่มสินค้าใหม่ในหมวดไม่ต้องมาตั้งซ้ำ
- **ข้อเสีย:** ถ้าหมวดเดียวมีทั้งของคืน/ไม่คืน ต้องมา override รายบรรทัด

### แนวทาง B — Override รายบรรทัดอย่างเดียว
- เพิ่มแค่ `needs_return` ที่ item, default = purpose.requires_return, ให้ผู้เบิกติ๊กเอง
- **ข้อดี:** เบาสุด **ข้อเสีย:** พึ่งผู้เบิกจำเอง เสี่ยงลืม

### แนวทาง C — บังคับแยกใบเบิก
- ถ้า purpose ต้องคืน + มี consumable → error ให้แยกใบ
- **ข้อเสีย:** ขัด UX เดิม ผู้เบิกทำงานเพิ่ม

### แนวทาง D — Flag ที่ระดับ**รหัสสินค้า (equipment)** + Override รายบรรทัด ⭐ แนะนำใหม่
เหมือน A แต่ลงลึกถึงรหัสสินค้าแต่ละตัว แม่นยำสุด ทำเยอะแต่ครั้งเดียวจบ

**Schema (migration):**
- `equipment.is_consumable BOOLEAN DEFAULT false` — flag รายรหัสสินค้า
- `equipment.return_policy TEXT` (optional) — เก็บเหตุผล/หมายเหตุ เช่น "ใช้แล้วหมด"
- `goods_issue_pending_items.needs_return BOOLEAN` — snapshot ตอนสร้างใบ (คำนวณจาก purpose + equipment)
- `goods_issue_pending_items.needs_return_overridden BOOLEAN DEFAULT false` — audit ว่าผู้เบิกแก้เอง

**Logic คำนวณ default ตอนเพิ่มลงตะกร้า:**
```
needs_return = purpose.requires_return AND NOT equipment.is_consumable
```

**Master Data — ต้องทำเยอะ (ตามคำขอผู้ใช้):**
1. **Equipment Form:** เพิ่ม checkbox "สินค้าสิ้นเปลือง (ไม่ต้องคืนของเก่า)" + textarea หมายเหตุ
2. **Equipment List:** เพิ่มคอลัมน์ "ประเภทการคืน" (Badge: 🔄 ต้องคืน / ♻️ สิ้นเปลือง) + filter + bulk-edit
3. **Import Template (equipmentTemplate.ts):** เพิ่มคอลัมน์ `is_consumable` (Y/N) พร้อม validator + คู่มือ
4. **Media Player / Tool:** ประเมินว่าต้องเพิ่มคอลัมน์นี้ด้วยหรือไม่ (MP ปกติต้องคืนอยู่แล้ว, Tool เป็น loan อยู่แล้ว → **น่าจะไม่ต้อง**)
5. **Bulk-set wizard:** หน้า Master Data มีปุ่ม "ตั้งค่าสิ้นเปลืองแบบกลุ่ม" — เลือกหมวด/ค้นหารหัส → tick หลายรายการพร้อมกัน (ประหยัดเวลาตั้งค่าเริ่มต้น ~ร้อยรหัส)

**หน้าเบิก/จ่าย/ยืนยัน (แก้ทั่วระบบ):**
6. **IssueRequest:** ตอน add-to-cart set `needs_return` อัตโนมัติ + แสดง Badge บนบรรทัด + Switch override + tooltip อธิบาย
7. **IssueGoods (จ่ายสินค้า):** แสดง Badge "ต้องคืนของเก่า" ที่คอลัมน์รายการ (ตามภาพ) + สรุปหัวใบว่า "รายการที่ต้องคืน: X / Y"
8. **ManagerApproval:** แสดง Badge + filter "เฉพาะใบที่มีของต้องคืน"
9. **IncompleteIssues:** เปลี่ยนเงื่อนไขจาก `purpose.requires_return` → `item.needs_return` (เฉพาะบรรทัดที่ต้องคืนเท่านั้นค้างในใบไม่สมบูรณ์)
10. **DeliveryConfirmation:** แสดงเฉพาะรายการที่ `needs_return = true` ในส่วน "รอคืนของเก่า"
11. **StockCard / EquipmentTrackingReport:** เพิ่มคอลัมน์ประเภทการคืน (optional filter)

**Backfill (insert tool ทีหลัง):**
- `UPDATE equipment SET is_consumable = true` สำหรับหมวดที่ผู้ใช้ระบุ (ทินเนอร์, กาว, น้ำยา, สี, เทป, ฯลฯ) — จะขอ list จากผู้ใช้ก่อนหรือให้ผู้ใช้ทำเองผ่าน bulk-set wizard
- `UPDATE goods_issue_pending_items SET needs_return = <calc>` ตามใบเบิกเก่า เพื่อให้รายงานย้อนหลังตรงกัน

## เปรียบเทียบ A vs D

| ประเด็น | A (Category) | D (Equipment) ⭐ |
|---|---|---|
| ความแม่นยำ | หยาบ | แม่นยำระดับรหัส |
| จำนวนจุดที่ตั้งค่า | สิบกว่าจุด | ~ร้อยจุด (มี bulk-set ช่วย) |
| กรณีหมวดเดียวมีทั้ง 2 แบบ | ต้อง override บ่อย | จบที่รหัส ไม่ต้อง override |
| สินค้าใหม่ | inherit จากหมวดอัตโนมัติ | ต้องระบุตอนสร้าง (มี default) |
| แก้โค้ด | ~5 ไฟล์ | ~10 ไฟล์ + import template + bulk wizard |
| เครดิต | ปานกลาง | สูง (แต่ครั้งเดียวจบ) |

## คำแนะนำ
**เลือก D** — ตรงตามที่ผู้ใช้ขอ (ทำเยอะหน่อย, ที่ระดับรหัส) และแม่นยำที่สุดในระยะยาว เพราะ:
- ทินเนอร์กับอะไหล่ป้ายอาจอยู่คนละหมวด/หมวดเดียวกันก็ได้ — ตัดสินที่รหัสชัดเจนกว่า
- มี bulk-set wizard ช่วยลดภาระตั้งค่าเริ่มต้น
- ตั้งครั้งเดียวจบ ไม่ต้องคอย override ในใบเบิกทุกครั้ง

ยืนยันเลือก D ให้ลุยได้เลยครับ หรือถ้าอยากผสม A+D (fallback: ถ้า equipment ไม่ได้ตั้ง ใช้ค่าจาก category) ก็บอกได้