## Why

The bot runs on a Koyeb free instance that automatically sleeps after one hour without inbound HTTP traffic, while the bot itself uses Telegram polling and therefore does not naturally keep the service awake through user activity. This change is needed now to reduce confusion for recently active users by warning them before the service sleeps and giving them a direct wake-up link.

## What Changes

- Track which Telegram users were active during the current recent-activity window without introducing a new database dependency.
- Add an in-memory sleep-warning coordinator that tracks the latest inbound HTTP activity seen by the service and schedules a single pre-sleep notification before the Koyeb idle timeout is reached.
- Send a warning message only to recently active users, including a public wake-up link pointing to the deployed service root path `/`.
- Ensure notification delivery failures are logged and do not block the bot's normal operation or other notifications.
- Add a best-effort shutdown notification path that can attempt a final warning on graceful termination, without making the feature depend on exact shutdown timing.
- Preserve the current polling-based Telegram architecture and existing MongoDB/Google Sheets boundaries.

## Capabilities

### New Capabilities
- `koyeb-sleep-warning`: Recently active users receive one warning per idle cycle before the Koyeb-hosted bot service goes to sleep, along with a direct wake-up link.

### Modified Capabilities

None.

## Impact

Affected code will likely include `src/main.ts`, `src/app.controller.ts`, `src/app.service.ts`, `src/bot/bot.service.ts`, and one or more new shared services to track recent user activity, inbound HTTP activity, wake-link generation, and notification scheduling. Verification will require focused tests around activity tracking, duplicate-warning suppression, and failure-tolerant notification delivery.
