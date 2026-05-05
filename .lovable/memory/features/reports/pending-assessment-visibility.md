---
name: Pending Assessment Visibility
description: Standard labels, colors, and report surfaces for pending_assessment / under_repair / in_claim / is_refurbished across all reports
type: feature
---

After Swap/Uninstall, units flow into `pending_assessment` (logical warehouse `WH-PENDING-ASSESS` / `LOC-PENDING-ASSESS`) before assessment. After assessment they may go to `under_repair`, `in_claim`, or back as `is_refurbished=true`.

## Standard labels
- `pending_assessment` → "พักรอประเมิน" (purple-600, Hourglass)
- `under_repair` → "กำลังซ่อม" (cyan-600, Hammer)
- `in_claim` → "รอเคลม" (rose-700, ShieldAlert)
- `is_refurbished=true` → "Refurbished" suffix or badge (emerald-600)

## Report surfaces (all must show these states)
- MediaPlayerEntry / MediaPlayerDashboard — Row 3 cards
- MediaPlayerReport — statusLabel + filter
- InventoryReport — equipmentSNMap split (pendingAssessSNs/underRepairSNs/inClaimSNs)
- EquipmentTrackingReport — eqSNMap split
- StockCard — movement types: pending_assessment_in/out, repair_in, claim_in, refurb_back
- Dashboard — PendingAssessmentAlerts card
- KPI MediaPlayerStatusKPI — distinct slices
- MediaPlayerProfile — ProcessTracker extra step

## Master data
- `media_player_statuses` table seeded with the 3 new values
- `warehouses` has `WH-PENDING-ASSESS`, `locations` has `LOC-PENDING-ASSESS`
- `media_players` has `is_refurbished`, `refurbished_at`, `refurbished_notes`
