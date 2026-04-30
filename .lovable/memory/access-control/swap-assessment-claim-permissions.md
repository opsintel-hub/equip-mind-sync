---
name: Swap/Assessment/Claim split permissions
description: Swap, Assessment, Claim each split into 2 function permissions (technician view/create vs warehouse manage)
type: feature
---
3 หน้าแยก function permission เป็นคู่:
- Swap: `swap_request_create` (ช่าง — แท็บ "แจ้ง Swap ใหม่") / `swap_request_manage` (คลัง — แท็บ "รายการคำขอ")
- Assessment: `assessment_view` (ช่าง — แท็บ "รายการประเมิน") / `assessment_create` (คลัง — แท็บ "บันทึกการประเมินใหม่")
- Claim: `claim_view` (ช่าง — แท็บ "รายการเคลม") / `claim_create` (คลัง — แท็บ "สร้างคำเคลมใหม่")

Tabs ถูก hide อัตโนมัติตามสิทธิ์ผ่าน `hasFunctionAccess` จาก `useFunctionPermissions`. Default tab เลือกตามสิทธิ์ที่มี
