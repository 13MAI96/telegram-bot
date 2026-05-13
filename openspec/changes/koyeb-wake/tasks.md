## 1. Activity tracking and configuration

- [x] 1.1 Add configuration for the public wake-up URL and validate that the application can build a `/wake` link from it.
- [x] 1.2 Implement an in-memory tracker for recently active Telegram users, keeping only users active within the last 60 minutes.
- [x] 1.3 Implement an in-memory tracker for explicit wake-cycle activity and idle-cycle warning state.

## 2. Sleep-warning coordination

- [x] 2.1 Add a shared coordinator service that schedules a single pre-sleep warning at the 59-minute mark of the current inbound HTTP inactivity cycle.
- [x] 2.2 Record Telegram user activity from the bot message entrypoints without interrupting existing wizard or plain-text flows.
- [x] 2.3 Record `/wake` HTTP activity from the web layer and reset the idle-cycle warning state when that explicit wake-up traffic starts a new cycle.
- [x] 2.4 Implement failure-tolerant Telegram warning delivery that logs per-user send failures and continues notifying remaining eligible users.
- [x] 2.5 Add a best-effort graceful-shutdown warning flush that attempts one final send only when the current idle cycle has not already been warned.

## 3. User-facing behavior and verification

- [x] 3.1 Define the warning message copy in Spanish and first person, including the wake-up link on `/wake` and the approved sleep-warning wording.
- [x] 3.2 Add focused tests for recent-user filtering, duplicate-warning suppression, `/wake`-driven cycle resets, non-`/wake` request behavior, and non-fatal send failures.
- [x] 3.3 Run build, tests, and lint and fix any regressions introduced by the Koyeb sleep-warning flow.
