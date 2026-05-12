## Context

The codebase already has reusable transaction wizard primitives for date parsing, retry/cancel guidance, and persistence failure handling, and it already contains a mature recurring-like flow in `src/bot/wizards/instalment.wizard.ts`. However, `src/bot/wizards/fixed.wizard.ts` is still empty, so the application has no dedicated flow for fixed recurring charges such as subscriptions or repeated collections with the same amount every time.

This change needs to stay within the current NestJS + Telegraf wizard model, reuse the Google Sheets write path, and preserve strict TypeScript practices. The new flow must deliberately differ from installments in three areas: the debit amount is not divided, the initial charge date is constrained to an inclusive future window between one month and one year from the current date, and account/holder validation must not reveal the configured lists back to the user.

## Goals / Non-Goals

**Goals:**
- Add a working `fixed` wizard exposed under `/suscripcion`.
- Reuse the shared wizard/date/error infrastructure introduced for the existing transaction flows instead of inventing a parallel pattern.
- Validate the first charge date so it is not earlier than one month ahead and not later than one year ahead of the current date, with both bounds accepted.
- Generate repeated debit rows with the same amount for each repetition.
- Validate category, account, holder, amount, and repetition count while keeping the user on the same step on invalid input.

**Non-Goals:**
- Change MongoDB schemas or add new persistence tables/collections.
- Expose account or holder option lists back to the user as part of recovery messaging.
- Rework existing `bill`, `transfer`, or `instalment` behavior beyond any small shared helper extraction needed by `fixed`.
- Add a separate concept for credits, variable amounts, or indefinite subscriptions.

## Decisions

### 1. Model `fixed` as a sibling of `instalment`, not a generic abstraction

Implement `fixed.wizard.ts` as a new wizard that reuses shared services and confirmation/persistence patterns, but keep its own conversation steps rather than trying to parameterize `instalment`.

Rationale: the flow is similar enough to borrow structure, but different enough in validation and amount semantics that a deep abstraction would create more complexity than value.

Alternatives considered:
- Refactor `instalment` and `fixed` into one generic recurring wizard. Rejected because the step differences are already meaningful and the current codebase favors explicit scene classes.
- Clone `instalment` directly with no shared helper reuse. Rejected because it would duplicate validation and persistence handling that already exists centrally.

### 2. Define the fixed-charge schedule from a validated start date plus monthly repeats

Once the initial charge date is accepted, generate future entries by applying `addMonthsExactDDMMYYYY` for each repetition index starting from zero. The initial date is valid when it falls inside the inclusive range between one month and one year from the current date.

Rationale: this matches the current month-clamping semantics already used for installments and keeps recurring fixed charges predictable across month boundaries.

Alternatives considered:
- Require every future date manually. Rejected because it defeats the purpose of a recurring fixed-charge wizard.
- Use a looser “same day unless invalid” implementation separate from `DateService`. Rejected because the existing helper already captures the intended behavior.

### 3. Use stricter privacy-oriented validation messaging for account and holder steps

For category selection, the wizard may show indexed instalment category choices. For account and holder validation, the wizard will only tell the user that the input is invalid and ask them to retry, without echoing the configured valid options.

Rationale: this matches the requested behavior and avoids exposing internal account or holder names in conversational retries.

Alternatives considered:
- Show the full account/holder lists on validation failure like other wizards. Rejected because it conflicts with the new requirement.

### 4. Persist each repetition as a separate debit row through the shared Sheets wrapper

Use `SheetsService.appendBalanceRow(...)` for every generated occurrence so failures are logged uniformly and user-facing replies are consistent with the other transaction wizards. After each successful row append, the wizard should notify the user that that repetition was added to Excel.

Rationale: this keeps fixed charges aligned with the current operational error-handling model and avoids reintroducing the older `addRow(...).finally(...)` pattern.

Alternatives considered:
- Batch multiple rows in one new Sheets API operation. Rejected for now because it adds scope and the existing wrapper already supports reliable per-row writes.

## Risks / Trade-offs

- Multiple repetitions can partially persist before a later failure. → Mitigation: use the existing partial-failure messaging pattern and keep each row append observable.
- The future-date rule depends on how “one month ahead” and “one year ahead” are interpreted around month-end boundaries. → Mitigation: treat the allowed window as inclusive and document the exact comparison rule in the spec while using the same date helper semantics everywhere.
- Keeping account/holder options hidden may make retries slower for some users. → Mitigation: keep the prompts explicit about what kind of value is expected and preserve `/cancelar` guidance.

## Migration Plan

1. Add the `fixed` wizard implementation and register it in the bot module/index.
2. Wire the `/suscripcion` command to enter the new scene when the user has an assigned group.
3. Reuse shared helpers for date parsing, retry guidance, and persistence failure handling.
4. Add focused tests for inclusive date-window validation, repetition bounds, privacy-preserving validation replies, and repeated row generation with per-repetition user notifications.
5. Run build, tests, and lint before shipping.

Rollback strategy: remove the new command/wizard wiring and its tests if the recurring charge flow is unstable or writes incorrect repeated rows.

## Open Questions

None at the moment.
