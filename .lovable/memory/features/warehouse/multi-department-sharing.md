---
name: Warehouse multi-department sharing
description: คลังสินค้า 1 แห่งผูกได้หลายฝ่ายผ่าน warehouses.departments (text[]) ฝ่ายร่วมใช้งานเต็มรูปแบบ
type: feature
---
- `warehouses.departments text[]` = ฝ่ายทั้งหมดที่ใช้คลังนี้ร่วมกัน (สิทธิ์เท่ากันทุกฝ่าย ใช้งานเต็มรูปแบบ: รับเข้า/เบิกจ่าย/โอนย้าย)
- `warehouses.department` (text เดิม) คงไว้เพื่อความเข้ากันได้ = ฝ่ายแรกใน departments
- ใช้ helper `src/lib/warehouseDepartments.ts` (warehouseDepts / warehouseHasDept / warehouseDeptLabel) ทุกจุดที่กรองหรือแสดงฝ่ายของคลัง — ห้ามเทียบ `w.department === dept` ตรง ๆ
- ฟอร์มเพิ่ม/แก้ไขคลังใช้ checkbox multi-select ฝ่าย
