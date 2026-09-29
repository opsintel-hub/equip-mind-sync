# Project Architecture Rules

- Clear the cross-tab session mirror only after an explicit user sign-out; an unauthenticated tab must never invalidate another tab's active session, preventing login/logout races.