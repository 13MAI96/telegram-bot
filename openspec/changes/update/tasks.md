## 1. Dependency and baseline setup

- [x] 1.1 Audit current NestJS, `nestjs-telegraf`, TypeScript, lint, and test package versions and choose the newest verified compatible set for this bot.
- [x] 1.2 Update `package.json` and any related config files, then resolve compile or strict-typing issues introduced by the dependency refresh.

## 2. Shared wizard infrastructure

- [x] 2.1 Add a shared date parsing helper that resolves `hoy`, `ayer`, `sig <day>`, and manual `dd/mm/yyyy` input into one validated date path.
- [x] 2.2 Add shared wizard reply helpers for retry prompts, cancel guidance, and standardized invalid-input messages.
- [x] 2.3 Add a centralized error-handling/logging path for wizard execution and downstream persistence failures that keeps technical detail out of user replies.
- [x] 2.4 Normalize Google Sheets write handling behind a reusable method or wrapper so confirmation steps in `bill`, `transfer`, `instalment`, and `plane-text` can report persistence failures consistently.

## 3. Wizard behavior rollout

- [x] 3.1 Update `bill`, `transfer`, and `instalment` to use the shared date shortcut helper with `hoy`, `ayer`, and `sig <day>` semantics.
- [x] 3.2 Update `bill`, `transfer`, and `instalment` validation steps for categories, accounts, holders, amounts, and missing configuration to use the shared recovery messaging contract.
- [x] 3.3 Update `bill`, `transfer`, `instalment`, and `plane-text` confirmation/save steps to catch persistence failures, avoid false success messages, and leave or retain the scene consistently based on the outcome.

## 4. Verification

- [x] 4.1 Add or update focused tests for `bill`, `transfer`, and `instalment` date shortcuts, invalid input retries, cancellation guidance, and `plane-text` persistence failure handling.
- [x] 4.2 Run build, lint, and relevant test commands and fix any regressions introduced by the upgrade and wizard standardization work.
