
## เปลี่ยน "หน้าที่เข้าถึงได้" ใน คำอธิบายฟังก์ชัน เป็น Multi-Select Dropdown

### สิ่งที่จะทำ
เปลี่ยนส่วน `relatedPages` ในแต่ละฟังก์ชัน (เช่น "ตาราง PM ป้าย", "งาน PM ป้าย", "ประวัติ PM ป้าย") จาก **Badge แบบคงที่** เป็น **SearchableMultiSelect Dropdown** เพื่อให้รูปแบบสอดคล้องกับหน้า "คำอธิบายบทบาท" ที่ทำไปแล้ว

### ผลกระทบ
- ไม่กระทบระบบสิทธิ์จริง (เป็นส่วนเอกสารอ้างอิงเท่านั้น)
- รูปแบบ UI จะเหมือนกันทั้งหน้า FunctionDescriptions และ RoleDescriptions

### รายละเอียดทางเทคนิค

#### ไฟล์ที่แก้ไข: `src/components/admin/FunctionDescriptions.tsx`

1. **Import เพิ่มเติม**: นำเข้า `SearchableMultiSelect` จาก `@/components/ui/searchable-select` และ `useMemo` จาก React
2. **สร้างรายการ Page Options**: รวบรวมหน้าทั้งหมดจาก `relatedPages` ของทุกฟังก์ชันเป็น options สำหรับ dropdown (ค่าไม่ซ้ำกัน)
3. **เพิ่ม State**: `selectedPagesByFunction` เก็บหน้าที่เลือกของแต่ละฟังก์ชัน (ค่าเริ่มต้นมาจาก `relatedPages` เดิม)
4. **แทนที่ Badge**: เปลี่ยนจาก Badge loop เป็น `SearchableMultiSelect` พร้อมหัวข้อ "หน้าที่เข้าถึงได้:"
5. **Dropdown ใช้งานได้**: ผู้ใช้สามารถค้นหาและเลือก/ยกเลิกหน้าได้อิสระ (เป็น reference เท่านั้น ไม่บันทึกลงฐานข้อมูล)
