## ปัญหา

ภาพในการ์ด **MP-POOK 0007 / S/N BBB0010** เป็นภาพ "ตัวแทน" ที่ถูก clone มาจากเครื่องต้นแบบตอน Receive Goods ไม่ใช่ภาพถ่ายของเครื่องจริง และไม่มีจุดให้แก้/เพิ่มภาพเฉพาะรายเครื่อง

## Flow ภาพปัจจุบัน

```text
[Master Data → Media Player Setup]
  └─ Upload ภาพ ← จุดเดียวที่ทำได้ตอนนี้
        │
        ▼  สร้าง master, quantity=0
[Delivery Entry / Receive Goods]
  └─ คีย์ S/N → clone master เป็น row ต่อ S/N
     ★ ภาพถูก copy ไปทุกใบ → ทุก S/N โชว์ภาพเดียวกัน
        │
        ▼
[แสดงผล]
  ├─ Media Player Profile (/media-player/:id)
  ├─ Public QR view (/p/media-player/:id)
  ├─ Inventory Report (ปุ่มดูภาพ)
  └─ Media Player Report
```

## สิ่งที่จะแก้

### 1. เปลี่ยน limit ภาพจาก 10 → 5 ทั้งระบบ
- แก้ `MAX_IMAGES = 5` ใน `MediaPlayerImageUpload.tsx`
- ปรับข้อความ subtitle เป็น **"อัปโหลดได้สูงสุด 5 รูป"**
- เพิ่ม inline hint สีส้มว่า **"⚠ อัปโหลดได้ไม่เกิน 5 ภาพ"**
- ที่หน้า Master Setup (`MediaPlayerEntry.tsx`) ถ้ามีข้อความ/validation ที่อ้าง 10 รูป → แก้ตามให้ตรงกัน

### 2. เพิ่มปุ่มจัดการภาพในหน้า Media Player Profile
- เพิ่มปุ่ม **"📷 จัดการรูปภาพ"** ใน `ProfileHeader.tsx` ข้างปุ่ม QR Code
- เปิด `MediaPlayerImageUpload` ผูกกับ `media_player_id` ของเครื่องนั้น (ไม่ใช่ master)
- หลังบันทึก refetch ภาพแล้วอัปเดต header ทันที
- เฉพาะ user ที่มีสิทธิ์ (warehouse staff / admin); user ทั่วไป hide
- Public QR view ไม่มีปุ่มนี้ (อ่านอย่างเดียว)

### 3. แสดงภาพได้สูงสุด 5 ภาพ + คลิกดูภาพต้นฉบับ
- ที่ `ProfileHeader.tsx` ถ้ามีหลายภาพ ให้แสดงเป็น thumbnail strip ใต้ภาพหลัก (สูงสุด 5)
- คลิกภาพใดก็ได้ → เปิด **Lightbox** แสดงภาพขนาด **Original** (ใช้ `image_url` จาก storage โดยตรง ไม่ resize)
- รองรับเลื่อนซ้าย/ขวา (← →), ปิดด้วย Esc, ปุ่มดาวน์โหลด/เปิดในแท็บใหม่
- ถ้าไม่มีภาพ → placeholder + ปุ่ม "เพิ่มรูปภาพ" ตรงกลาง

### 4. แสดง badge "ภาพต้นแบบ" (optional, ถ้าทำได้สะดวก)
- ถ้าภาพยังเป็นชุดที่ clone มาจาก master (ตรวจจาก storage path prefix `{masterId}/...` ≠ id ปัจจุบัน) → แสดง badge เล็ก ๆ ใต้ภาพว่า **"ภาพต้นแบบ — แตะเพื่อแทนที่ด้วยภาพจริง"**

## สิ่งที่ "ไม่" แก้

- ไม่แตะตรรกะ clone ภาพตอน Receive Goods (เก็บ default ที่ดีไว้)
- ไม่แตะ storage / RLS bucket
- ไม่แตะหน้า Inventory Report / Media Player Report (ใช้ viewer เดิม)

## ไฟล์ที่จะแก้

- `src/components/media-player/MediaPlayerImageUpload.tsx` — `MAX_IMAGES = 5` + ข้อความ
- `src/components/media-player/profile/ProfileHeader.tsx` — ปุ่มจัดการภาพ + thumbnail strip + Lightbox + badge
- `src/pages/MediaPlayerProfile.tsx` — callback refetch หลังบันทึก
- `src/pages/MediaPlayerEntry.tsx` — อัปเดตข้อความ "สูงสุด 5 รูป" ถ้ามี hardcoded 10
- (ถ้ายังไม่มี Lightbox reusable) สร้าง `src/components/media-player/ImageLightbox.tsx` ใหม่ — modal เต็มจอ ภาพ original + nav
