---
name: Assessment to Defective Handoff
description: Assessment outcome=defective auto-creates pending defective_returns row and navigates to confirm/cut stock
type: feature
---
- AssessmentCompleteDialog with outcome=defective auto-INSERTs defective_returns (status=pending_warehouse_entry, source_type=from_assessment, assessment_log_id=link), then navigates to /defective-return-entry with prefill
- defective_returns has reporter_name + reporter_department (auto-filled from logged-in profile + first allowed department, editable when reporting on behalf of others)
- Stock is NOT cut by the auto-create — warehouse staff must confirm and submit on Defective Entry page to actually deduct stock
- Document Search includes: defective_returns, assessment_logs, claim_records, swap_requests, stock_movements (Stock Card) sources
