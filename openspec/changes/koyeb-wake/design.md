## Context

The bot currently runs as a NestJS web service on a Koyeb free instance. Koyeb free instances automatically scale to zero after one hour without inbound HTTP traffic, while this bot receives Telegram updates through polling rather than webhooks. Because of that mismatch, recent Telegram usage alone does not keep the service awake and the application cannot rely on “last bot message” as a proxy for Koyeb idle time.

The bot already identifies users by Telegram `from.id` and resolves group membership through MongoDB, but there is no dedicated persistence for “recently active users” or “last warning sent”. The current application already exposes HTTP endpoints and can respond on `/wake`, so wake-up can be anchored to a dedicated public route.

## Goals / Non-Goals

**Goals:**
- Warn recently active Telegram users before the service is likely to enter Koyeb sleep.
- Send at most one warning per sleep cycle.
- Generate the wake-up link from a configured public base URL and direct users to `/wake`.
- Keep activity tracking and warning coordination in memory, with no new database model.
- Make failed Telegram notifications non-fatal and observable through logs.
- Add a best-effort final notification path on graceful shutdown without depending on exact Koyeb shutdown timing.

**Non-Goals:**
- Migrating the bot from polling to webhooks.
- Guaranteeing exact delivery at the moment the instance stops.
- Persisting activity state across restarts or deployments.
- Adding authentication, user preferences, or per-user opt-out flows.

## Decisions

### 1. Use two in-memory windows: recent Telegram activity and recent inbound HTTP activity
The implementation should track:
- Telegram user activity timestamps keyed by Telegram user id.
- The latest inbound HTTP request timestamp for the service.

The sleep-warning scheduler should base “about to sleep” on the HTTP inactivity clock, because that is what Koyeb actually uses for free-instance sleep behavior. User targeting should still come from Telegram activity during the last 60 minutes, because the product requirement is to notify users who were recently using the bot.

Alternative considered:
- Use only Telegram activity timestamps.
  Rejected because it does not model Koyeb sleep behavior under polling.

### 2. Add a dedicated coordinator service instead of embedding timers in `BotUpdate`
Create a shared coordinator service responsible for:
- recording Telegram activity
- recording inbound HTTP activity
- recalculating the next warning time
- suppressing duplicate sends within the same idle cycle
- sending best-effort shutdown notifications

This keeps timing logic outside of transport handlers and makes the feature testable without running Telegraf or Nest application bootstrap end-to-end.

Alternative considered:
- Store all timing logic directly in `BotUpdate` and `AppController`.
  Rejected because the feature cuts across HTTP and Telegram entrypoints and would become hard to test.

### 3. Use a single configured `PUBLIC_BASE_URL` to build the wake-up link
The warning message should include a URL built from a single environment variable such as `PUBLIC_BASE_URL`, normalized to the wake-up path `/wake`.

Alternative considered:
- Infer the public URL dynamically from request headers.
  Rejected because Koyeb sleep warnings may be sent from a timer or `SIGTERM` path without an active request context.

### 4. Treat only `/wake` as wake-cycle activity after startup
The application should start one idle cycle when the bot boots, and after that only requests to `/wake` should refresh the service activity timestamp and start a new idle cycle if a warning had already been sent for the previous one.

Alternative considered:
- Count any inbound HTTP request as cycle activity.
  Rejected because the product requirement is now to let only the explicit wake-up route extend the cycle after startup.

### 5. Warning delivery must degrade safely
When sending notifications:
- continue sending to other users if one Telegram send fails
- log user id and error details
- never interrupt normal bot operation
- use Spanish copy in first person so the bot sounds conversational and direct, for example: `Me estoy por ir a dormir, si necesitás algo más no te olvides de despertarme en {link}`

Alternative considered:
- Abort the warning batch on first failure.
  Rejected because it loses too many notifications for one transient error.

### 6. Ignore non-`/wake` HTTP traffic for cycle resets
Health checks and any other inbound HTTP requests outside `/wake` should not reset the application-side idle cycle. This intentionally biases the bot toward warning users based on explicit wake-up traffic rather than platform-side incidental traffic.

Alternative considered:
- Count health checks and other incidental requests as activity.
  Rejected because it makes the user-facing warning timing less predictable and less tied to the explicit wake-up flow.

### 7. Shutdown notification is best-effort only
The current app already handles `SIGINT` and `SIGTERM` in bootstrap. The coordinator should expose a best-effort “flush warning if still unsent” operation that can be invoked during graceful shutdown. The design must explicitly avoid treating this path as the primary guarantee, because Koyeb may stop the instance quickly and network sends may not complete.

Alternative considered:
- Depend exclusively on `SIGTERM` to send the warning.
  Rejected because it is operationally fragile.

## Risks / Trade-offs

- [In-memory state is lost on restart] -> Accept as part of the no-database goal; new activity rebuilds the set naturally after wake-up.
- [Koyeb may count non-`/wake` traffic differently than the app does] -> Accept that the app-side warning model is intentionally based on explicit wake-ups after startup, not every inbound request Koyeb might observe.
- [Polling means active chat usage may happen without HTTP traffic] -> Make this explicit in proposal/spec/design and message copy so user expectations stay accurate.
- [Telegram send rate or transient failures during warning batch] -> Send sequentially or with limited concurrency, log failures, and avoid failing the whole batch.
- [Incorrect public URL configuration] -> Fail closed by logging a configuration warning and skipping sends until `PUBLIC_BASE_URL` is valid.

## Migration Plan

1. Add the coordinator and activity trackers behind the existing NestJS application structure.
2. Wire Telegram activity recording into the bot entrypoints that already receive user messages.
3. Wire HTTP activity recording into the web layer so only `/wake` resets the cycle after startup.
4. Add the warning scheduler using the Koyeb free-instance idle assumption of 60 minutes with a pre-warning threshold at 59 minutes.
5. Add best-effort shutdown flush behavior.
6. Deploy with `PUBLIC_BASE_URL` configured to the Koyeb public domain.
7. Roll back by disabling the feature flag or removing the new environment variable wiring if warning behavior proves noisy.

## Open Questions

None at the moment.
