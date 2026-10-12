# Project Architecture Rules

- Clear the cross-tab session mirror only after an explicit user sign-out; an unauthenticated tab must never invalidate another tab's active session, preventing login/logout races.- Special requests: types live in a frontend registry (requestTypes.ts) with free-text request_type; only auto types need logic in review_special_request RPC — adding types needs no schema change.
- Special requests UI is split by role: /my-special-requests (requester, own rows) and /special-requests (Super Admin only) share one page component via a mode prop; RLS remains the real boundary.
- Outstanding issued inventory uses shared issueQuantities helpers and a read-only, department-scoped tab independent of purpose flags; this keeps report/export totals consistent without changing stock workflows.
- Inter-warehouse transfer reuses the issue flow: a purpose flagged `is_transfer` makes dispatch move stock (source allocation out, destination allocation in, `transferred_qty` on the line) instead of deducting it; this avoids a separate transfer module and keeps outstanding totals correct via `lineLeft`.
- Magic Ticket Integration runs as one edge function (`magic-ticket`) whose writes go through SECURITY DEFINER RPCs executable only by service_role; API keys are stored hashed in a table so Super Admin can issue/revoke them without secrets access.
