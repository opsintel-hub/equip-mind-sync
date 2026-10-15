---
name: Single Return Path
description: Items still owed on an open issue document must be returned via that document, not the direct defective entry menu
type: constraint
---
- เมนู "นำของเสียเข้าระบบ" ตรวจยอดค้างใบเบิก (status issued/partial_return/partially_issued, lineLeft>0) ก่อนบันทึก
- Media Player หรือ S/N ตรงกับรายการค้าง → บล็อก แจ้งเลขใบเบิก ให้คืนผ่าน รอส่งคืน → ส่งคืนสินค้า
- สินค้านับจำนวนไม่มี S/N ตรง → ต้องกดยืนยันว่าเป็นของเสียในคลัง/ถอดจากป้าย ไม่ได้มาจากใบเบิก
- ข้ามการตรวจเมื่อมาจากการประเมิน (assessment) หรือใบที่รอยืนยันอยู่แล้ว
