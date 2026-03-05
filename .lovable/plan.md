

## Problem Analysis

When items are received into the warehouse via "รับสินค้าเข้าคลัง", the system updates stock quantity, location, and condition on the `equipment`/`media_players` tables — but **does not copy the department** from the `goods_receipt_pending` record. This means if the equipment/media player was registered without a department (e.g. via quick-create during receiving), the `department` field stays null, and department-filtered views like Inventory Report won't show it.

## Solution

Update `src/pages/ReceiveGoods.tsx` to propagate the department from the pending receipt to the item record during the receive action:

1. **In `handleReceive()`** — when updating `media_players` (line ~454-461), add `department: getDepartmentName(selectedReceipt.department_id)` to the update payload (only if the item's current department is empty).

2. **In `handleReceive()`** — when updating `equipment` (line ~516-524), add `department: getDepartmentName(selectedReceipt.department_id)` to the update payload (only if current department is empty).

3. **In `handleBatchReceive()`** — apply the same logic for batch processing.

4. **Add validation in `DeliveryEntry.tsx`** — the `selectedDepartmentId` is already required before submit (line 634), but add a more explicit check/toast so users see a clear error if department is missing.

This ensures every item that goes through the receiving workflow will have a department assigned, preventing invisible items in filtered reports.

