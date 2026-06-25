# เพิ่ม Sub Media Type สำหรับฝ่าย 7-Eleven Media

## 1. Database Migration (Safe)
เพิ่มคอลัมน์ใหม่ลงตาราง `media_players`:
- `sub_media_type` (TEXT, nullable) — รับค่า 1 ใน 9: `TOPSHELF_1, TOPSHELF_2, TOPSHELF_3, SPECIAL_1, SPECIAL_2, OVERVAULT_1, OVERVAULT_2, OPENTYPE_1, OPENTYPE_2`
- ใช้ Validation Trigger (ไม่ใช่ CHECK constraint) เพื่อบังคับว่า:
  - ถ้า `department = '7-Eleven Media'` → `sub_media_type` ต้อง NOT NULL และอยู่ใน 9 ตัวเลือก
  - ถ้า department อื่น → บังคับ `sub_media_type = NULL` (ล้างค่าอัตโนมัติ)
- ข้อมูลเก่าไม่กระทบ (default NULL, trigger เฉพาะ INSERT/UPDATE ใหม่)
- อัปเดต RPC `import_media_player_row` ให้รับ/ตรวจ `sub_media_type` พร้อมข้อความ error ภาษาไทยชัดเจน

> หมายเหตุ: ใช้คอลัมน์ที่มีอยู่ `media_players.department` (TEXT) จับคู่ชื่อ `'7-Eleven Media'` แบบตรงตัว (case-insensitive ใน trigger)

## 2. Frontend (UI/UX)

### ค่าคงที่กลาง
สร้าง `src/lib/mediaPlayerSubTypes.ts` รวม:
- `SEVEN_ELEVEN_DEPT_NAME = '7-Eleven Media'`
- `SUB_MEDIA_TYPES = [TOPSHELF_1, ... OPENTYPE_2]`
- helper `requiresSubMediaType(dept)` และ `normalizeSubMediaType(dept, value)`

### MP Setup (Master Data) — `MediaPlayerEntry.tsx` (ฟอร์ม Create/Edit หลัก)
- เพิ่ม Select "ตำแหน่งสื่อย่อย (Sub Media Type)" — **แสดง + required เฉพาะเมื่อเลือกฝ่าย 7-Eleven Media**
- เปลี่ยนฝ่ายเป็นฝ่ายอื่น → ซ่อนและล้างค่าอัตโนมัติ
- เพิ่ม Filter ใหม่ "Sub Media Type" ในแถบ filter (เปิดใช้เมื่อเลือกฝ่าย 7-Eleven Media หรือเลือก "ทุกฝ่าย")
- เพิ่ม Column "ตำแหน่งสื่อย่อย" ในตาราง List + Excel export

### MP Edit Dialog — `MediaPlayerInfoEditDialog.tsx`
- เพิ่มฟิลด์ Select เดียวกัน พร้อม conditional logic ตามฝ่ายปัจจุบันของเครื่อง

### MP Profile (Detail View) — `GeneralInfoTab.tsx`
- แสดงค่าในส่วน "ข้อมูลทรัพย์สิน" (แสดงเฉพาะเมื่อมีค่า / เป็น 7-Eleven Media)

### Import Template (Excel)
- เพิ่มคอลัมน์ `sub_media_type` ใน `mediaPlayerTemplate.ts`
- เพิ่ม sheet `_ref_sub_media_types` + Data Validation dropdown
- `validators.ts` ตรวจ: ถ้า department = 7-Eleven Media → required + ต้องอยู่ใน 9 ค่า; อื่นๆ ต้องว่าง

## 3. Swap Logic — `SwapWizardDialog.tsx`
- ตอนเลือกเครื่องเก่า → อ่าน `sub_media_type` แล้ว pre-fill ลงเครื่องใหม่
- แสดง Select ในขั้นตอน "เครื่องใหม่" พร้อม hint *"สืบทอดจากเครื่องเดิม: TOPSHELF_1 (แก้ได้)"*
- ตอน submit เขียนค่าลง `media_players.sub_media_type` ของเครื่องใหม่
- ถ้าฝ่ายเครื่องใหม่ไม่ใช่ 7-Eleven Media → ไม่บันทึกค่า (NULL)

## 4. Report / Search ที่กระทบ (อ่านอย่างเดียว — เพิ่ม column แสดงผล)
- `MediaPlayerReport.tsx` — เพิ่ม column + filter
- `DocumentSearch.tsx` (ส่วน MP) — รวม sub_media_type ในผลค้นหา
- `BillboardDetail.tsx` ส่วน MP ที่ติดตั้ง — แสดง badge "TOPSHELF_1" ใต้ชื่อเครื่อง (เฉพาะที่มีค่า)

## 5. ไฟล์ที่จะแก้/สร้าง
**สร้างใหม่**
- `supabase/migrations/<ts>_add_mp_sub_media_type.sql`
- `src/lib/mediaPlayerSubTypes.ts`
- `src/components/media-player/SubMediaTypeSelect.tsx` (reusable)

**แก้ไข**
- `src/pages/MediaPlayerEntry.tsx` (ฟอร์ม + filter + table + export)
- `src/components/media-player/profile/MediaPlayerInfoEditDialog.tsx`
- `src/components/media-player/profile/GeneralInfoTab.tsx`
- `src/components/media-player/profile/types.ts` (เพิ่มฟิลด์)
- `src/components/swap/SwapWizardDialog.tsx`
- `src/lib/importTemplates/mediaPlayerTemplate.ts`
- `src/lib/importTemplates/validators.ts`
- `src/lib/importTemplates/refData.ts` (เพิ่ม static list)
- `src/pages/MediaPlayerReport.tsx`
- RPC `import_media_player_row` (ใน migration เดียวกัน)

## นอกขอบเขต
- Receive Goods / Delivery Entry forms (ไม่ได้เลือก) — Trigger จะบังคับเฉพาะตอน INSERT ใหม่ที่ฝ่าย = 7-Eleven Media; ฟอร์มเหล่านี้ยังไม่มี UI แต่จะ fallback เป็น error ถ้าพยายามบันทึกโดยไม่มีค่า (ผู้ใช้ต้องไปกรอกที่ MP Setup/Edit แทน)
- Equipment table (เฉพาะ Media Player เท่านั้น)
