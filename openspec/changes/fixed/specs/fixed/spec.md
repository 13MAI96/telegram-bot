## ADDED Requirements

### Requirement: User can start a fixed recurring charge wizard
The system SHALL expose a `/suscripcion` command that starts a fixed recurring charge wizard for users with an assigned group.

#### Scenario: User starts fixed recurring charge registration
- **WHEN** a user with an assigned group sends `/suscripcion`
- **THEN** the system MUST enter the `fixed` wizard
- **THEN** the wizard MUST begin collecting the fixed recurring charge data required for registration

#### Scenario: User without assigned group starts the command
- **WHEN** a user without an assigned group sends `/suscripcion`
- **THEN** the system MUST redirect the user through the existing group onboarding path instead of entering the fixed wizard

### Requirement: Fixed wizard validates input and keeps the user on the current step on failure
The system SHALL validate the initial charge date, category, account, holder, debit amount, description, and repetition count while keeping the user on the same step until a valid value is received.

#### Scenario: Initial date is outside the allowed window
- **WHEN** the user provides a first charge date that is more than one month behind or more than one year ahead of the current date
- **THEN** the wizard MUST reject the value
- **THEN** the wizard MUST explain the date constraint to the user
- **THEN** the wizard MUST remain on the same step waiting for a valid date

#### Scenario: Initial date matches an allowed boundary
- **WHEN** the user provides a first charge date that is exactly one month behind or exactly one year ahead of the current date
- **THEN** the wizard MUST accept the value as inside the allowed range

#### Scenario: Repetition count is outside the allowed range
- **WHEN** the user provides a repetition count lower than 1 or higher than 12
- **THEN** the wizard MUST reject the value
- **THEN** the wizard MUST explain that the accepted range is 1 to 12
- **THEN** the wizard MUST remain on the same step waiting for a valid count

#### Scenario: Description is empty
- **WHEN** the user provides an empty description
- **THEN** the wizard MUST reject the value
- **THEN** the wizard MUST ask for a non-empty description
- **THEN** the wizard MUST remain on the same step waiting for a valid description

#### Scenario: Account or holder validation fails
- **WHEN** the user provides an invalid account or holder
- **THEN** the wizard MUST reject the value
- **THEN** the wizard MUST ask the user to retry
- **THEN** the wizard MUST NOT expose the configured account or holder lists in the recovery reply

### Requirement: Fixed wizard creates repeated debit rows with constant amount
The system SHALL create one debit row per repetition using the validated initial date plus monthly repeats, and each row SHALL use the same debit amount and base description provided by the user.

#### Scenario: User confirms a valid fixed recurring charge
- **WHEN** the user confirms the collected fixed recurring charge data
- **THEN** the system MUST create the configured number of repeated rows
- **THEN** each row MUST use the same debit amount without installment-style division or adjustment
- **THEN** each row MUST use a date derived from the initial charge date plus the appropriate monthly offset
- **THEN** each row MUST use a description formatted as `{descripcion} {indice} de {total}`
- **THEN** the wizard MUST notify the user after each successfully persisted repetition is added to Excel

#### Scenario: Persistence fails during repeated row creation
- **WHEN** the system fails while saving one or more repetitions
- **THEN** the wizard MUST avoid claiming that the recurring charge was fully registered successfully
- **THEN** the system MUST send a user-safe persistence failure message
- **THEN** the system MUST log enough context to diagnose the failing operation
