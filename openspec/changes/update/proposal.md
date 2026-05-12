## Why

The bot's active transaction wizards are inconsistent around date entry and error recovery, which makes expense registration slower and easier to abandon when a user mistypes a value. This change is needed now to standardize the conversational UX across the implemented expense flows while bringing the NestJS application and supporting libraries onto a maintained baseline.

## What Changes

- Add consistent date shortcuts across the implemented transaction wizards `bill`, `transfer`, and `instalment`.
- Add explicit user-facing recovery paths for invalid inputs and operational failures so `bill`, `transfer`, and `instalment` can guide the user to retry, cancel, or continue safely.
- Add centralized server-side error handling for wizard execution and sheet write failures to reduce silent or confusing failures.
- Add consistent persistence-failure handling to the `plane-text` expense entry flow without expanding its date-input behavior.
- Refresh NestJS and related dependencies to the latest compatible versions supported by the current application structure and strict TypeScript settings.
- Preserve the existing Telegram-based identification model and current MongoDB/Google Sheets integration boundaries.

## Capabilities

### New Capabilities
- `wizard-date-shortcuts`: Users can provide the shortcut commands `hoy`, `ayer`, and `sig <día>` in the `bill`, `transfer`, and `instalment` wizards.
- `wizard-error-recovery`: `bill`, `transfer`, and `instalment` provide consistent validation feedback, retry prompts, cancellation guidance, and graceful handling of downstream service failures, while `plane-text` gains consistent persistence-failure handling.

### Modified Capabilities

None.

## Impact

Affected code includes `src/bot/bot.service.ts`, the transaction-oriented wizards `src/bot/wizards/bill.wizard.ts`, `src/bot/wizards/transfer.wizard.ts`, `src/bot/wizards/instalment.wizard.ts`, `src/bot/wizards/plane-text.wizard.ts`, shared helpers such as `src/shared/services/date.service.ts`, and integration services that persist data to Google Sheets. Affected dependencies include NestJS packages, `nestjs-telegraf`, tooling packages, and any related TypeScript or lint/test configuration needed to keep strict typing intact.
