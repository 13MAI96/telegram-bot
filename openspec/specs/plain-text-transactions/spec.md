## Purpose

Define the command-based plain-text income and expense transaction entry flows.

## Requirements

### Requirement: `/ingreso_plano` requests a full plain-text payload

The system SHALL expose an `/ingreso_plano` command that starts a wizard and asks the user for a single message with `fecha, categoria, descripcion, monto, cuenta, titular`.

#### Scenario: User starts the plain-text income wizard

- **WHEN** the user sends `/ingreso_plano` and has a group assigned
- **THEN** the bot MUST enter the plain-text income wizard
- **THEN** the wizard MUST ask for one complete comma-separated message in the required field order

#### Scenario: User starts the plain-text income wizard without an assigned group

- **WHEN** the user sends `/ingreso_plano` and has no assigned group
- **THEN** the bot MUST redirect the user to the group onboarding flow instead of entering the plain-text income wizard

### Requirement: `/gasto_plano` replaces the implicit expense plain-text entry

The system SHALL expose a `/gasto_plano` command for expense plain-text entry and SHALL stop depending on arbitrary free-text messages outside a command as the primary way to start that flow.

#### Scenario: User starts the plain-text expense wizard

- **WHEN** the user sends `/gasto_plano` and has a group assigned
- **THEN** the bot MUST enter the plain-text expense wizard
- **THEN** the wizard MUST ask for one complete comma-separated message in the required field order

#### Scenario: Free-text message arrives outside a wizard

- **WHEN** the user sends a normal text message that is not a command and no scene is active
- **THEN** the bot MUST NOT treat that message as an implicit `/gasto_plano` transaction payload

### Requirement: Plain-text income and expense payloads share the same validation contract

The system SHALL validate `fecha, categoria, descripcion, monto, cuenta, titular` using the same rules for `/ingreso_plano` and `/gasto_plano`, and SHALL require the user to resend the full payload whenever any field is invalid.

#### Scenario: User provides a fully valid payload

- **WHEN** the user sends a complete payload with a valid date, category, description, numeric amount, account, and holder
- **THEN** the wizard MUST normalize and store the canonical values
- **THEN** the wizard MUST show a confirmation summary before saving

#### Scenario: User provides a date shortcut

- **WHEN** the user sends `hoy` or `ayer` in the `fecha` position
- **THEN** the wizard MUST resolve that value to a valid `dd/mm/yyyy` date
- **THEN** the wizard MUST continue using the normalized date in the confirmation summary

#### Scenario: User provides category, account, or holder with different casing

- **WHEN** the payload contains category, account, or holder text that matches a registered option ignoring case
- **THEN** the wizard MUST accept the value
- **THEN** the wizard MUST persist the canonical registered option rather than the raw input casing

#### Scenario: User provides an invalid field

- **WHEN** any field is missing, invalid, or does not match the registered options
- **THEN** the wizard MUST explain that the payload is invalid
- **THEN** the wizard MUST ask again for the full comma-separated message
- **THEN** the wizard MUST NOT continue to confirmation

#### Scenario: User provides an invalid amount

- **WHEN** the `monto` field fails the numeric validation used by the other transaction flows
- **THEN** the wizard MUST reject the payload
- **THEN** the wizard MUST ask again for the full comma-separated message

### Requirement: Plain-text income and expense commands persist opposite ledger directions

The system SHALL persist `/ingreso_plano` rows as credits and `/gasto_plano` rows as debits while keeping the rest of the row structure aligned with the existing ledger storage.

#### Scenario: User confirms a plain-text income

- **WHEN** the user confirms a valid `/ingreso_plano` payload
- **THEN** the system MUST save the amount in the credit field
- **THEN** the system MUST save `0` in the debit field
- **THEN** the bot MUST confirm successful registration only after persistence succeeds

#### Scenario: User confirms a plain-text expense

- **WHEN** the user confirms a valid `/gasto_plano` payload
- **THEN** the system MUST save the amount in the debit field
- **THEN** the system MUST save `0` in the credit field
- **THEN** the bot MUST confirm successful registration only after persistence succeeds

#### Scenario: Persistence fails after confirmation

- **WHEN** saving a confirmed `/ingreso_plano` or `/gasto_plano` payload fails
- **THEN** the bot MUST inform the user that the operation could not be completed
- **THEN** the system MUST avoid claiming that the transaction was registered successfully
