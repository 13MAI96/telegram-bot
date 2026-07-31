## 1. Bot command entrypoints

- [x] 1.1 Add `/transactions`, `/ingreso_plano`, and `/gasto_plano` command handlers in `src/bot/bot.service.ts`.
- [x] 1.2 Update `/help` text to include the new plain-text and transaction-history commands.
- [x] 1.3 Remove or neutralize the current implicit `@On('text')` path that starts `plane-text` from arbitrary free-text messages.

## 2. Plain-text transaction flows

- [x] 2.1 Extract or introduce a shared parser/validator for `fecha, categoria, descripcion, monto, cuenta, titular`.
- [x] 2.2 Update `plane-text` to act as the `/gasto_plano` wizard, prompting for the full payload, re-requesting the full message on invalid data, and persisting as debit.
- [x] 2.3 Create the `/ingreso_plano` wizard using the same parser/validator and confirmation flow, persisting as credit.
- [x] 2.4 Reuse date shortcut handling for `dd/mm/yyyy`, `hoy`, and `ayer`, and canonicalize category/account/holder values case-insensitively.

## 3. Transaction history flow

- [x] 3.1 Create a `transactions` wizard that asks for account and holder and validates both against group masters.
- [x] 3.2 Extend `SheetsService` with a read operation for `Caja` that filters by account and holder and returns the latest 5 matching rows.
- [x] 3.3 Format lookup results for chat output, omitting debit or credit segments when the value is `0`, and add empty-result/failure handling.

## 4. Verification

- [x] 4.1 Add or update unit tests for the new bot commands and group-assignment routing.
- [x] 4.2 Add wizard tests for valid payloads, invalid payload retries, case-insensitive master matching, date shortcuts, and debit/credit persistence direction.
- [x] 4.3 Add tests for transaction-history filtering, formatting, no-results behavior, and spreadsheet read failures.
- [x] 4.4 Run the relevant test suite and confirm the new commands are ready for BotFather registration.
