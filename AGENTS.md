# Project Architecture Rules

- Clear the cross-tab session mirror only after an explicit user sign-out; an unauthenticated tab must never invalidate another tab's active session, preventing login/logout races.- Special requests: types live in a frontend registry (requestTypes.ts) with free-text request_type; only auto types need logic in review_special_request RPC — adding types needs no schema change.
- Special requests UI is split by role: /my-special-requests (requester, own rows) and /special-requests (Super Admin only) share one page component via a mode prop; RLS remains the real boundary.
- Outstanding issued inventory uses shared issueQuantities helpers and a read-only, department-scoped tab independent of purpose flags; this keeps report/export totals consistent without changing stock workflows.
