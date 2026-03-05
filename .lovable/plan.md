

## Analysis: Department Data Flow Confusion

Currently there are **two independent places** where department gets set on a Media Player (or Equipment):

1. **จัดการ Media Player (MediaPlayerEntry.tsx)** — sets `department` directly on the `media_players` table when creating a new item
2. **นำสินค้าเข้า (DeliveryEntry.tsx)** — sets `department_id` on the `goods_receipt_pending` record, which gets copied to the item **only if the item has no department** during ReceiveGoods

This creates confusion:
- If you create a Media Player with department "A", then receive it via DeliveryEntry under department "B", the item keeps department "A" (because ReceiveGoods only fills empty departments)
- If you create a Media Player without a department, then receive it via DeliveryEntry under department "B", the item gets department "B"

## Proposed Solution

**Make the DeliveryEntry/ReceiveGoods department authoritative** — since the receiving process is the final step that confirms which department actually owns the item:

1. **ReceiveGoods.tsx** — Change the logic from "only fill if empty" to **always update** the department from the receipt record (both `handleReceive` and `handleBatchReceive`)
   - Remove the `if (!currentItem?.department && deptName)` condition
   - Always set `department = deptName` when `deptName` exists

2. **MediaPlayerEntry.tsx** — Keep the department field as required (already done), but add a note/description under the field: *"ฝ่ายอาจถูกอัปเดตเมื่อรับสินค้าเข้าคลัง"* so users understand it can be overridden

3. **DeliveryEntry.tsx** — Already validates department is required before submit — no changes needed

This ensures a single clear rule: **the department assigned during goods receiving is the final authority**.

