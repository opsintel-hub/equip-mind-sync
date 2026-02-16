
## แผนการปรับปรุง 2 ส่วน

### ส่วนที่ 1: หน้านำสินค้าเข้า (Delivery Entry) - แสดงข้อมูลอัตโนมัติสำหรับสินค้าที่มีในระบบ

**สถานะปัจจุบัน:**
- หมวดหมู่ และ หมวดหมู่ย่อย แสดงอัตโนมัติเมื่อเลือกสินค้าที่มีอยู่แล้ว (ทำเรียบร้อยแล้ว)
- หน่วย (unit) ก็ถูก auto-fill เรียบร้อย
- ขนาดพื้นที่ (กว้าง x สูง x ลึก) ยังไม่ได้ auto-fill จากข้อมูลอุปกรณ์

**สิ่งที่จะทำ:**

1. **ดึงข้อมูลมิติจากอุปกรณ์** - เพิ่ม `width_cm`, `height_cm`, `depth_cm`, `volume_cm3` ในการ query equipment
2. **Auto-fill ขนาดพื้นที่เมื่อเลือกสินค้า** - เมื่อเลือกสินค้าที่มีในระบบ ให้ดึงค่า width/height/depth มาแสดงในช่อง "ขนาดพื้นที่ๆต้องการใช้"
3. **คูณจำนวนกับปริมาตร** - คำนวณปริมาตรรวม = (กว้าง x สูง x ลึก) x จำนวน แล้วแสดงผลลัพธ์
4. **กรณีสินค้าใหม่** - บังคับกรอกทุกช่อง (หน่วย, ขนาดพื้นที่, หมวดหมู่, หมวดหมู่ย่อย) เหมือนเดิมที่ทำอยู่แล้ว

---

### ส่วนที่ 2: หน้าขอเบิกสินค้า (Issue Request) - กรอง Serial Number ตามสินค้าที่เลือก

**สถานะปัจจุบัน:**
- ช่อง "เลือกสินค้า (FIFO)" และ "ค้นหาจาก Serial Number" ทำงานแยกกัน
- ช่อง Serial Number แสดง S/N ทุกตัวจากทั้งระบบ ไม่ว่าจะเลือกสินค้าอะไรไว้ก่อนหน้า

**สิ่งที่จะทำ:**

1. **กรอง S/N ตามสินค้าที่เลือก** - เมื่อผู้ใช้เลือกสินค้าจากช่อง FIFO แล้ว ช่อง Serial Number จะแสดงเฉพาะ S/N ที่เป็นของสินค้านั้น
2. **รองรับ Media Player** - ถ้าสินค้าที่เลือกเป็น Media Player จะแสดงทั้ง S/N 1 และ S/N 2
3. **ถ้ายังไม่เลือกสินค้า** - แสดง S/N ทั้งหมดเหมือนเดิม (ไม่กรอง)
4. **ล้าง S/N เมื่อเปลี่ยนสินค้า** - ถ้าผู้ใช้เปลี่ยนสินค้า ช่อง S/N จะถูกล้างค่าเดิมออก

---

### รายละเอียดทางเทคนิค

**ไฟล์ที่แก้ไข:**

1. **`src/pages/DeliveryEntry.tsx`**
   - เพิ่มฟิลด์ `width_cm, height_cm, depth_cm, volume_cm3` ในการ query equipment
   - อัปเดต Equipment interface
   - ใน useEffect ที่ตรวจจับ selectedEquipment ให้ auto-fill ค่ามิติ
   - ปรับ calculatedVolume ให้คูณกับ quantity (ปริมาตรรวม = ปริมาตรต่อชิ้น x จำนวน)

2. **`src/components/equipment/SerialNumberSelect.tsx`**
   - เพิ่ม prop `equipmentId?: string` สำหรับกรอง S/N ตาม equipment ที่เลือก
   - เพิ่ม prop `isMediaPlayer?: boolean` เพื่อรู้ว่าควรค้นหาจากตาราง equipment หรือ media_players
   - เพิ่มตรรกะการกรองใน `serialNumberItems` ตาม equipmentId ที่ส่งเข้ามา

3. **`src/pages/IssueRequest.tsx`**
   - ส่ง `equipmentId` และ `isMediaPlayer` prop ให้ `SerialNumberSelect` component
   - ล้างค่า serial_number ใน currentItem เมื่อเปลี่ยน equipment_id
