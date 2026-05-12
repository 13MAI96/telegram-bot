## Why

The bot currently supports one-off expenses, transfers, installments, and plain-text expense entry, but it does not support fixed recurring charges such as subscriptions or periodic collections with the same amount on every occurrence. This change is needed now to cover a common financial workflow with the same validation and conversational quality already expected from the active transaction wizards.

## What Changes

- Add a new `/suscripcion` command that starts a `fixed` wizard for recurring fixed charges.
- Implement a new fixed-charge conversational flow that collects initial charge date, category, target account, holder, debit amount, and repetition count.
- Validate that the first charge date is at least one month ahead and no more than one year ahead of the current date.
- Validate that category, account, and holder are correct, while avoiding prompts that enumerate accounts or holders back to the user.
- Validate that repetition count is between 1 and 12 and that debit amounts are stored without installment-style division or transformation.
- Keep the wizard on the same step when validation fails and reply with clear user-facing guidance.

## Capabilities

### New Capabilities
- `fixed`: Users can register recurring fixed charges through a dedicated wizard that generates repeated debit entries with a constant amount.

### Modified Capabilities

None.

## Impact

Affected code includes `src/bot/bot.service.ts`, `src/bot/wizards/fixed.wizard.ts`, `src/bot/wizards/index.ts`, shared wizard/date helpers under `src/shared/services/`, and the Google Sheets persistence flow in `src/sheets/sheets.service.ts`. Verification will likely add focused tests for the new wizard behavior and command wiring.
