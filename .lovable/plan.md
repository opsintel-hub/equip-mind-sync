
## เป้าหมาย
1. ปิดโปรแกรม/ปิดแท็บ → เปิดใหม่ต้อง Login ทุกครั้ง (ไม่จำ session ถาวร)
2. เจ้าหน้าที่คลังเปิดหน้าค้างไว้ ต้องเห็นคำขอเบิกใหม่ทันทีโดยไม่ต้องกด Refresh และ **หน้าจอต้องไม่กระพริบ**

---

## แผนงาน

### ส่วน A — บังคับ Login ใหม่เมื่อปิดโปรแกรม

แก้ `src/integrations/supabase/client.ts` **ไฟล์เดียว** โดยเปลี่ยน storage จาก `localStorage` → `sessionStorage`

- `sessionStorage` จะหายทันทีเมื่อปิดแท็บ/ปิด browser → ครั้งหน้าเปิดใหม่ = ต้อง Login
- ระหว่างใช้งาน (เปลี่ยนหน้า, refresh หน้าเดิม) session ยังอยู่ตามปกติ
- ไม่ต้องเปลี่ยน backend, ไม่กระทบ RLS
- คงค่า `autoRefreshToken: true` ไว้ เพื่อไม่ให้ token หมดอายุระหว่างใช้งาน

หมายเหตุ: ไฟล์นี้มี comment ว่า "auto-generated" — แต่การแก้ storage เป็นสิ่งที่ยอมรับได้ (Lovable จะไม่ทับค่านี้)

### ส่วน B — Realtime สำหรับหน้าที่เจ้าหน้าที่คลังเปิดค้าง (ไม่กระพริบ)

ใช้ **Supabase Realtime (Postgres Changes)** — มาพร้อม Lovable Cloud, ไม่มีค่าใช้จ่ายเพิ่ม, ไม่ต้อง polling

หน้าที่ต้องเพิ่ม subscription:
1. `src/pages/IssueGoods.tsx` — คลังจ่ายสินค้า (ฟัง `goods_issue_pending` INSERT/UPDATE)
2. `src/pages/ManagerApproval.tsx` — Manager อนุมัติ (ฟัง INSERT/UPDATE)
3. `src/pages/DeliveryConfirmation.tsx` — ยืนยันรับสินค้า
4. `src/pages/IncompleteIssues.tsx` — รายการยังไม่สมบูรณ์
5. `src/components/NotificationCenter.tsx` — แจ้งเตือน (ฟัง `notifications`)

**วิธีทำให้ไม่กระพริบ** (สำคัญ):
- ใช้ `queryClient.invalidateQueries({ queryKey: [...] })` แทนการ `refetch()` ทันที
- ตั้ง `placeholderData: keepPreviousData` (หรือ `keepPreviousData: true`) ใน `useQuery` ที่เกี่ยวข้อง → React Query จะเก็บข้อมูลเก่าไว้แสดงจนกว่าข้อมูลใหม่จะโหลดเสร็จ ไม่มี unmount/remount ตาราง
- ปิด `refetchOnWindowFocus` สำหรับ query ที่ subscribe realtime แล้ว (ไม่จำเป็นต้อง refetch ซ้ำเมื่อ focus)
- ถ้าคำขอใหม่เข้ามา ให้แสดง toast เล็กๆ มุมขวาบน "มีคำขอเบิกใหม่ 1 รายการ" เพื่อให้เจ้าหน้าที่รู้ตัว โดยไม่ต้องพึ่งการกระพริบของหน้าจอ

สร้าง helper hook ใหม่ `src/hooks/useRealtimeInvalidate.tsx`:
```
useRealtimeInvalidate({
  table: "goods_issue_pending",
  events: ["INSERT", "UPDATE"],
  queryKey: ["issue-goods-pending"],
  onInsert: () => toast("มีคำขอเบิกใหม่"),
})
```
- Subscribe channel ครั้งเดียวต่อหน้า
- Cleanup ตอน unmount
- Debounce การ invalidate (200ms) กันกรณี event มาถี่

### ส่วน C — เอกสาร/UX เล็กน้อย
- ที่หน้า Login แจ้งใต้ปุ่ม: "ระบบจะออกจากระบบอัตโนมัติเมื่อปิดโปรแกรม เพื่อความปลอดภัย"

---

## Technical details (สำหรับ dev)

**ทำไมเลือก sessionStorage แทน timeout-based logout?**
- ไม่ต้องมี background timer, ไม่ต้องแก้ backend
- ตอบโจทย์ "ปิดโปรแกรมแล้วต้อง Login ใหม่" ตรงตัว
- ถ้าอยากให้ session หมดอายุระหว่างใช้งานด้วย (idle timeout) ค่อยเพิ่มทีหลัง

**ทำไม Realtime ไม่ใช่ polling?**
- Polling ทุก 10-30 วิ → ตารางกระพริบ + สิ้นเปลือง egress
- Supabase Realtime ใช้ WebSocket เดียว ประหยัดกว่ามาก
- ต้องเปิด Realtime ให้ตารางที่ subscribe (ตรวจว่า `goods_issue_pending`, `notifications` เปิดแล้ว — ถ้ายังไม่เปิดจะเพิ่ม migration `ALTER PUBLICATION supabase_realtime ADD TABLE ...`)

**ทำไมไม่กระพริบ:**
- React Query `keepPreviousData` = ไม่มี loading state ระหว่าง background refetch
- `invalidateQueries` = mark stale + refetch เงียบๆ, DOM เดิมคงอยู่ระหว่างรอ
- ไม่ใช้ `window.location.reload()` เด็ดขาด

---

## ขอบเขตที่จะไม่ทำในรอบนี้
- Idle timeout (ไม่ใช้งาน X นาที → logout) — ถ้าต้องการ แจ้งได้จะทำเพิ่ม
- Multi-tab logout sync — ปกติ sessionStorage แยกแท็บอยู่แล้ว
- Realtime สำหรับทุกหน้าในระบบ — เริ่มจาก 5 หน้าที่ระบุก่อน หน้าอื่นค่อยเพิ่มตามความต้องการ
