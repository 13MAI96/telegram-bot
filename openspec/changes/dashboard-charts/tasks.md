## 1. Data Access And Aggregation

- [x] 1.1 Extend the `Caja` movement model/read path to include date, category, account, holder, debit, and credit for dashboard aggregation.
- [x] 1.2 Add a dashboard aggregation service that filters by month, holders, and accounts, includes only debit expenses, and sums totals by category.
- [x] 1.3 Add month parsing helpers for the dashboard command, including the selected accepted formats and invalid-month feedback.
- [x] 1.4 Add category exclusion parsing and apply exclusions during dashboard aggregation.

## 2. Chart Rendering

- [x] 2.1 Choose and add the minimal PNG rendering dependency or implementation compatible with `node:22-bookworm-slim`.
- [x] 2.2 Implement a pie chart renderer that returns an image buffer with category labels, amounts/percentages, and total context.
- [x] 2.3 Add a text fallback formatter for category totals when chart rendering or Telegram image delivery fails.
- [x] 2.4 If the renderer requires native packages, update and validate Docker build dependencies.
- [x] 2.5 Make the chart image height account for all legend entries so categories are not visually truncated.

## 3. Telegram Wizard

- [x] 3.1 Add the dashboard command handler in `src/bot/bot.service.ts` and include it in `/help`.
- [x] 3.2 Create a dashboard wizard that asks for month, holders, and accounts with support for `todos` and comma-separated multi-select values.
- [x] 3.3 Validate holder/account selections case-insensitively against group masters and keep users on the current step after invalid input.
- [x] 3.4 Generate and send the chart image in Telegram with month, filters, and total expense context.
- [x] 3.5 Handle no-data, aggregation failures, render failures, and Telegram send failures with clear user-facing messages.
- [x] 3.6 Remove holder/account option lists from prompts and add a category exclusion prompt with indexed options plus `ninguna`/`todos`.

## 4. Verification

- [x] 4.1 Add unit tests for aggregation by month/category and holder/account filters.
- [x] 4.2 Add unit tests for month parsing and filter validation.
- [x] 4.3 Add wizard tests for successful chart generation, no-data behavior, invalid filters, and fallback responses.
- [x] 4.4 Run build, tests, and Docker validation if rendering dependencies require container changes.
- [x] 4.5 Add tests for category exclusions and non-truncated chart rendering with more than 10 categories.
