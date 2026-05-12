## 1. Command and wizard setup

- [x] 1.1 Register the `fixed` wizard in the bot wizard index/module and expose the `/suscripcion` command in the bot update handler.
- [x] 1.2 Ensure the new command follows the existing assigned-group check and redirects through group onboarding when the user has no group.

## 2. Fixed wizard implementation

- [x] 2.1 Implement `src/bot/wizards/fixed.wizard.ts` using the shared date, retry-message, and persistence helpers.
- [x] 2.2 Add validation for the initial charge date so it is inclusively between one month ahead and one year ahead.
- [x] 2.3 Add validation for category, account, holder, debit amount, and repetition count, including the privacy rule that account/holder retries must not expose the configured lists.
- [x] 2.4 Generate repeated monthly debit rows with a constant amount, notify the user after each successful repetition is added to Excel, and save them through the shared Sheets wrapper with safe failure handling.

## 3. Verification

- [x] 3.1 Add focused tests for `/suscripcion` command wiring, date-window validation, repetition bounds, privacy-preserving validation replies, and repeated row creation behavior.
- [x] 3.2 Run build, tests, and lint and fix any regressions introduced by the new fixed recurring charge flow.
