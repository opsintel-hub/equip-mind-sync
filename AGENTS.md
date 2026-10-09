# Project Architecture Rules

- Clear the cross-tab session mirror only after an explicit user sign-out; an unauthenticated tab must never invalidate another tab's active session, preventing login/logout races.- Special requests: types live in a frontend registry (requestTypes.ts) with free-text request_type; only auto types need logic in review_special_request RPC — adding types needs no schema change.
