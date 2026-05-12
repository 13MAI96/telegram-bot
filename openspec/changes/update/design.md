## Context

The bot currently implements each conversational flow as an independent Telegraf wizard under `src/bot/wizards/`. Date handling is partially duplicated across the active transaction flows `bill`, `transfer`, and `instalment`, with some flows supporting shortcuts such as `hoy`, `ayer`, or `sig <dia>`, while others only accept manual `dd/mm/yyyy` input. Validation and operational failure handling are also inconsistent: some steps retry on invalid input, some only show a generic error, and writes to Google Sheets are performed without a uniform user-visible fallback when an external call fails. The `plane-text` flow is also part of the transaction entry surface, but only needs consistent persistence-failure handling rather than expanded date input.

The project already runs on NestJS 11 with strict TypeScript expectations, MongoDB for group metadata, and Google Sheets as the system of record for financial rows. The design therefore needs to preserve the existing transport and storage model while reducing duplicated wizard logic and tightening dependency compatibility checks around `nestjs-telegraf` and the current TypeScript toolchain.

## Goals / Non-Goals

**Goals:**
- Standardize date shortcut behavior across `bill`, `transfer`, and `instalment`.
- Provide consistent user-facing recovery for invalid inputs, missing configuration, and downstream persistence failures in `bill`, `transfer`, and `instalment`, plus persistence-failure handling in `plane-text`.
- Centralize reusable wizard helpers so new validation and prompt patterns do not need to be copied across all scenes.
- Upgrade framework and tooling dependencies in a controlled way without relaxing strict TypeScript behavior.

**Non-Goals:**
- Extend this change to unimplemented or administrative wizards such as `fixed`, `group`, or `config`.
- Redesign the data model for groups, users, or spreadsheets.
- Introduce Telegram login, authentication, or identity changes.
- Replace Google Sheets with another persistence mechanism.
- Rework every conversational copy string beyond what is needed for clearer validation and recovery prompts.

## Decisions

### 1. Introduce shared wizard utilities for date shortcuts and prompt recovery

Create reusable helpers in the shared/bot layer that can:
- resolve shortcut text such as `hoy`, `ayer`, and `sig <dia>` into valid `dd/mm/yyyy` values;
- expose a single validation path for manual date input;
- generate consistent retry/cancel guidance for common invalid states.

`sig <dia>` will mean "next calendar month on that day", clamped to the nearest valid day in the target month when needed.

Rationale: the current wizards duplicate parsing and reply logic, which will drift further if shortcuts are expanded flow by flow.

Alternatives considered:
- Keep shortcut handlers inside each wizard. Rejected because it preserves duplication and makes consistency hard to verify.
- Add a single generic wizard base class. Rejected for now because the existing scene classes differ enough that helper composition is lower risk than inheritance.

### 2. Define a standard wizard failure contract for both validation errors and persistence failures

Each relevant wizard step that accepts user input will follow the same contract:
- reject invalid values with a specific correction prompt;
- remind users they can cancel the current scene;
- keep the wizard on the same step until valid input arrives;
- wrap persistence calls so service failures produce a clear user message and do not silently leave the flow in an ambiguous state.

This full contract applies to `bill`, `transfer`, and `instalment`. The `plane-text` flow will only adopt the persistence-failure portion because it does not share the same date-entry conversation pattern.

Rationale: today some failures only return a generic message, while sheet write failures are not consistently surfaced to the user.

Alternatives considered:
- Rely only on Nest exception handling. Rejected because wizard scenes need conversational recovery, not just server logging.
- Handle failures only in `SheetsService`. Rejected because configuration and validation failures also need a consistent UX at the wizard layer.

### 3. Add an application-level bot error boundary plus structured logging

Add a central mechanism around bot update handling and/or shared service calls so unhandled wizard exceptions are logged with enough context to diagnose the failing scene, user, and operation. User replies should remain minimal and safe, while server logs capture technical detail.

Rationale: operational issues with Telegram or Google Sheets need observability without exposing internals to end users.

Alternatives considered:
- Only add `try/catch` blocks in individual methods. Rejected because it is easy to miss paths and produces inconsistent logging.

### 4. Upgrade dependencies conservatively against the current runtime shape

Refresh NestJS-adjacent libraries, `nestjs-telegraf`, lint/test tooling, and any type packages only to versions that remain compatible with the current bot architecture. Validate the upgrade with build, lint, and targeted wizard tests instead of broad refactors.

Rationale: the codebase is already near current NestJS versions, so the main risk is compatibility drift in surrounding packages rather than a framework rewrite.

Alternatives considered:
- Delay dependency updates to a separate change. Rejected because the proposal explicitly treats supported versions as part of the stabilization effort.
- Aggressively refactor the bot during the upgrade. Rejected because it increases migration risk without improving the user-facing requirements.

## Risks / Trade-offs

- Shared helpers may still leave some wizard-specific edge cases untreated initially. → Mitigation: limit the first rollout to `bill`, `transfer`, and `instalment`, and add targeted tests for each flow plus `plane-text` persistence failures.
- `nestjs-telegraf` compatibility may constrain how far related packages can be upgraded. → Mitigation: pin to the newest verified compatible set rather than forcing latest-major everywhere.
- More explicit retry prompts increase message verbosity in chat. → Mitigation: keep prompt templates short and consistent, and only show corrective guidance on failure paths.
- Wrapping persistence calls may expose latent issues in `SheetsService` sequencing. → Mitigation: add focused tests and, if needed, normalize the add-row/write flow behind one application method before reusing it broadly.

## Migration Plan

1. Upgrade dependencies and resolve compile or typing issues introduced by the verified package set.
2. Introduce shared date shortcut parsing and wizard prompt/retry helpers.
3. Update `bill`, `transfer`, and `instalment` to use the shared helpers and standardized recovery messages.
4. Add centralized exception logging and user-safe persistence failure replies, including the `plane-text` flow.
5. Run build, lint, and targeted tests for wizard behavior before shipping.

Rollback strategy: revert the dependency bump and helper adoption in one change set if scene execution or persistence becomes unstable after verification.

## Open Questions

- Is there any production telemetry or log sink already expected for bot errors, or should logging remain console-based for now?
