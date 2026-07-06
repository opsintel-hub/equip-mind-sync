
# แผน: Permission Matrix (User × Function)

หน้าจัดการผู้ใช้ตอนนี้ใช้การ์ดต่อคน + Wizard 3 ขั้น กด "ใช้เลย" ทีละคน — ตั้งค่าเยอะครั้งเสียเวลา แผนนี้เพิ่ม Matrix รวมสำหรับดูภาพรวม + แก้เป็น bulk

## รูปแบบ

**Tab ใหม่ "Matrix สิทธิ์"** ในหน้า `/admin` (ข้าง Tab เดิม "ผู้ใช้")

```
                  │ นำเข้า │ รับเข้า │ ขอเบิก │ จ่าย │ Master │ รายงาน │ Swap │ ...
────────────────────────────────────────────────────────────────────────────
สมชาย  [7-Eleven] │   ✓    │   ✓    │        │      │        │   ✓    │      │
สมหญิง [Fresh]   │        │        │   ✓    │      │        │   ✓    │      │
[+เลือกทั้งแถว]   │  ▢     │  ▢     │  ▢     │  ▢  │   ▢    │  ▢     │  ▢   │
────────────────────────────────────────────────────────────────────────────
[✓เลือกทั้งคอลัมน์]
```

- **แถว** = ผู้ใช้ 1 คน (ชื่อ + Badge บทบาท + Badge ฝ่าย)
- **คอลัมน์** = 41 ฟังก์ชัน จัดกลุ่มเป็น 8 หมวด (นำเข้า/รับเข้า/เบิก/จ่าย/Master Data/รายงาน/Swap-ประเมิน-เคลม/แอดมิน) มี header กลุ่ม + freeze คอลัมน์ชื่อผู้ใช้
- **Cell** = Checkbox ติ๊กเดียว (ไม่มี CRUD ในนี้ — CRUD อยู่ที่ department ซึ่งจัดการต่างหาก)

## ฟีเจอร์หลัก

1. **Multi-select แถว** — Checkbox ซ้ายสุดแต่ละแถว → เลือกหลายคน แล้ว bulk apply/revoke ฟังก์ชันได้
2. **เลือกทั้งคอลัมน์** — คลิก header คอลัมน์ → ให้/ถอนสิทธิ์ฟังก์ชันนั้นแก่ทุกคนที่กรอง
3. **Bulk toolbar** (ลอยเมื่อเลือกแถว): [ให้สิทธิ์...] [ถอนสิทธิ์...] [Apply Preset...] [เคลียร์]
4. **ตัวกรอง** ด้านบน: ค้นหาชื่อ, กรองบทบาท, กรองฝ่าย, ซ่อนคอลัมน์ที่ทุกคนไม่มีสิทธิ์ (declutter)
5. **แสดงสถานะ Preset** — คอลัมน์ 2 (ติดกับชื่อ): ป้ายบอกว่าคนนี้ตรงกับ Preset ไหน (Admin/Warehouse/Manager/...) หรือ "กำหนดเอง" — คลิก dropdown "Apply Preset" ในแถวเดี่ยวก็ได้
6. **Auto-save พร้อม Undo** — ติ๊ก 1 ครั้ง = บันทึกทันที + toast "แก้แล้ว (undo ได้ 5 วิ)"
7. **Super Admin lock** — แถว super_admin ทุกช่องแสดง ✓ สีเทา แก้ไม่ได้ (มีไอคอน 🔒)
8. **ปุ่ม "แก้แบบละเอียด"** ในแต่ละแถว → เปิด Wizard เดิม (ยังใช้จัดการ Department CRUD)

## จุดที่ Preset ยังอยู่

- Quick Preset ในหน้าเดิม (Tab "ผู้ใช้") **คงไว้เหมือนเดิม** — ไม่แตะ
- ใน Matrix เพิ่มปุ่ม "Apply Preset..." ใน bulk toolbar และในแต่ละแถว → เลือก preset + ฝ่าย → เขียนทับ function permissions + roles + departments (ใช้ `applyPresetToUser` ที่มีอยู่)

## รายละเอียดเทคนิค

**ไฟล์ใหม่:**
- `src/components/admin/PermissionMatrix.tsx` — หน้า Matrix
- `src/components/admin/PermissionMatrixCell.tsx` — เซลล์ checkbox (memoized)

**แก้:**
- `src/pages/Admin.tsx` — เพิ่ม Tab "Matrix สิทธิ์"

**Data:**
- โหลด `profiles`, `user_roles`, `user_function_permissions`, `user_departments` รอบเดียว → เก็บเป็น `Map<userId, Set<functionName>>`
- Toggle cell → optimistic update + upsert/delete ใน `user_function_permissions`
- Bulk = batch insert/delete ใน 1 query

**Layout:**
- Sticky ซ้าย 2 คอลัมน์ (checkbox + ชื่อ), sticky บน 2 แถว (group + function)
- ScrollArea แนวนอน, virtualize ถ้า > 50 users (ยังไม่ทำในเฟสแรก — ระบบมีผู้ใช้น้อย)
- Header กลุ่มมีปุ่ม collapse ทั้งหมวด (ซ่อนคอลัมน์ในกลุ่มนั้น)

**Performance:**
- `useMemo` cache Set lookup, `React.memo` cell component
- Debounce search 200ms

## สิ่งที่ไม่ทำในเฟสนี้

- ไม่ย้าย Department CRUD (ดู/สร้าง/แก้/ลบ) เข้า Matrix — ยังใช้ Wizard เดิม (Matrix นี้คุมแค่ "เปิด/ปิดเมนู")
- ไม่แตะ Backend/RLS
- ไม่ทำ virtualization

## ผลที่ได้

- ตั้งสิทธิ์ 10 คนพร้อมกันได้ใน 3 คลิก (เลือกแถว → คลิกคอลัมน์ → Apply)
- ดูภาพรวมทั้งบริษัทได้ในหน้าเดียว รู้ทันทีใครมีสิทธิ์อะไร
- ผู้ที่ชอบวิธีเดิมยังใช้ Quick Preset + Wizard ได้เหมือนเดิม
