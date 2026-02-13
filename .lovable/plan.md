

# แผนแก้ไข: เพิ่ม Progress Bar และปรับปรุงประสิทธิภาพการนำเข้า Billboard

## ปัญหาที่พบ

1. **ไม่มี Progress Indicator** - เมื่อกดปุ่ม "นำเข้า 92 รายการ" ระบบแสดงเพียง "กำลังนำเข้า..." โดยไม่มี % ความคืบหน้า ทำให้ไม่รู้ว่าระบบทำงานอยู่หรือค้าง
2. **Update ทีละแถว** - สำหรับข้อมูลที่ต้อง update จะทำทีละ row ซึ่งช้ามากเมื่อมีหลายร้อย/พันแถว
3. **ไม่มี mapping สำหรับ Status และ Notes จาก Excel** - คอลัมน์ Status และ Notes ในไฟล์ Excel ถูกข้ามไปไม่ได้นำเข้า

## การแก้ไข (1 ไฟล์)

### `src/components/billboard/BillboardImport.tsx`

1. **เพิ่ม Progress Bar แบบ real-time** แสดง:
   - จำนวนรายการที่ดำเนินการแล้ว / ทั้งหมด (เช่น "45/92")
   - เปอร์เซ็นต์ความคืบหน้า (เช่น "49%")
   - แถบ progress แบบ visual
   - สถานะปัจจุบัน: "กำลังเพิ่มข้อมูลใหม่..." / "กำลังอัพเดทข้อมูล..."

2. **ปรับ update records เป็น batch** - ใช้ upsert หรือ batch update แทนการ update ทีละแถว เพื่อเพิ่มความเร็ว

3. **เพิ่ม mapping คอลัมน์ Notes** จากไฟล์ Excel เข้าสู่ฐานข้อมูล

## รายละเอียดทางเทคนิค

### Progress State

```text
progressState: {
  current: number      // จำนวนที่ทำแล้ว
  total: number        // จำนวนทั้งหมด
  phase: string        // "inserting" | "updating"
}
```

### ปรับ confirmImport function

- เพิ่ม state `importProgress` เพื่อ track ความคืบหน้า
- ทุกครั้งที่ insert/update batch สำเร็จ -> update progress
- Progress bar จะ re-render ทันทีที่ state เปลี่ยน

### ปรับ Update Logic

- รวม update records เป็น batch โดยใช้ Promise.all กับ chunk ขนาด 10-20 records เพื่อทำพร้อมกัน
- อัพเดท progress ทุก batch

