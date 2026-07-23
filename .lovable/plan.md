## ปัญหาที่พบและแนวทางแก้

### 1. Reset Password ไม่ได้ (422 Error)
**สาเหตุ:** `reset-user-password` เรียก `updateUserById` เฉพาะ `password` — ถ้า target ถูกแบน (จากการลบ) หรือรหัสไม่ผ่าน HIBP จะ 422

**แก้:**
- ปรับ `supabase/functions/reset-user-password/index.ts` ให้ส่ง `ban_duration: "none"` ควบคู่ (ปลด ban ถ้ามี) และคืน error message จริงจาก Supabase
- Toast ในหน้า Admin แสดง error ที่ parse จาก response body

### 2. คนที่โดนลบ กลับมาสมัครใหม่ไม่ได้
**สาเหตุ:** `delete-user` เก็บ `auth.users` row ไว้ (ban 100 ปี) → email ซ้ำ → 422

**แก้:** ปรับ `delete-user` ให้ **เปลี่ยน email เป็น `deleted+{uuid}@deleted.local`** ก่อนแบน
- ประวัติ join `profiles` ยังใช้ได้ (profile row เดิม ชื่อคงเดิม)
- Email เดิมว่าง → สมัครใหม่ได้ profile ใหม่
- ban row เก่าคงอยู่เพื่อความปลอดภัย

### 3. การรับรู้สถานะการสมัคร
**ผู้สมัคร (หน้า `/user-manual`):** เพิ่มแบนเนอร์สถานะบัญชี
- ยังไม่มี role/function permission → "⏳ บัญชีกำลังรอการอนุมัติจากผู้ดูแล"
- ได้รับสิทธิ์แล้ว → "✅ พร้อมใช้งาน" + ปุ่มไป Dashboard
- Refresh on focus + poll ทุก 30 วิ

**Admin/Super Admin:** DB trigger บน `profiles` insert → สร้าง `notifications` category=`user_signup` priority=high ให้ทุกคนที่มี role `admin`/`super_admin`, link ไป `/admin`

### 4. Sort รายการหน้าจัดการสิทธิ์
เพิ่ม Sort dropdown ใน `UserPermissionManager.tsx` (default = รอการอนุมัติ):

| ตัวเลือก | ลำดับ |
|---|---|
| ⏳ รอการอนุมัติก่อน (default) | ผู้ที่ไม่มี role และไม่มี function permission ขึ้นบน → เรียง `created_at` DESC |
| ตามฝ่ายที่ขอมา | group ตาม `requested_department` (รออนุมัติแทรกบนสุดของแต่ละกลุ่ม) |
| ตามชื่อ | ก-ฮ |
| ใหม่สุด | `created_at` DESC |
| ไม่ได้ใช้งานนานสุด | `last_sign_in_at` ASC (null = ไม่เคย login มาก่อน) |

เพิ่ม Badge "🆕 รอการอนุมัติ" สีส้มบนแถวผู้ใช้ที่ยังไม่มีสิทธิ์

### 5. ติดตาม User ที่ไม่ได้ใช้งานนาน (Inactive Users) — **ใหม่**
ใช้ `auth.users.last_sign_in_at` เป็นแหล่งข้อมูล ไม่ต้องเพิ่ม column

**Backend:**
- ขยาย RPC `get_users_emails` (หรือสร้าง `get_users_activity`) ให้คืน `id, email, last_sign_in_at, created_at` (super_admin/admin เท่านั้น)
- Merge ค่าเข้า user list ตอน fetch เดิม

**UI ในหน้าจัดการผู้ใช้:**
- เพิ่ม **Column "เข้าใช้งานล่าสุด"** แสดงวันที่ + จำนวนวันที่ผ่านมา ("14 วันที่แล้ว" / "ไม่เคยเข้าใช้")
- Highlight สีตามระดับ:
  - ≤30 วัน = ปกติ (ไม่มีสี)
  - 31–60 วัน = เหลือง
  - 61–90 วัน = ส้ม
  - >90 วัน = แดง + Badge "⚠️ ไม่ได้ใช้งาน >90 วัน"
- เพิ่ม **ตัวกรอง "ระยะเวลาไม่ใช้งาน"**: ทั้งหมด / >30 / >60 / >90 / ไม่เคย login
- ปุ่ม **"แจ้งเตือน User"** (ส่ง notification ใน app) ในแถวที่เกิน 60 วัน — บันทึก notification เตือนว่า "หากไม่เข้าใช้งานภายใน X วัน จะถูกลบออกจากระบบ"
- ปุ่ม **"เลือกทั้งหมด (>90 วัน)"** + Bulk action ส่งแจ้งเตือน หรือลบทีเดียว (ยืนยันก่อนลบ)

**สรุปการทำงาน:** Super Admin/Admin เปิดหน้าจัดการผู้ใช้ → filter ">90 วัน" → เห็นรายการที่ควรพิจารณาลบ → แจ้งเตือนหรือลบได้จากที่เดียว

### สรุปไฟล์ที่แก้
- `supabase/functions/reset-user-password/index.ts` — ปลด ban + คืน error จริง
- `supabase/functions/delete-user/index.ts` — เปลี่ยน email ก่อน ban
- Migration: trigger `notify_admins_on_new_signup` + ขยาย/สร้าง RPC คืน `last_sign_in_at`
- `src/pages/UserManual.tsx` — แบนเนอร์สถานะบัญชี
- `src/components/admin/UserPermissionManager.tsx` — Sort dropdown, badge รออนุมัติ, column last_sign_in, filter inactivity, bulk แจ้งเตือน/ลบ
- `src/components/admin/PermissionWizard.tsx` — แสดง error จริงจาก reset password
