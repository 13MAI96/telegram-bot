## ADDED Requirements

### Requirement: Active transaction wizards accept standardized date shortcuts
The system SHALL accept the same supported date shortcuts in the `bill`, `transfer`, and `instalment` wizard steps that ask the user to enter a transaction date or scheduled payment date, in addition to manual `dd/mm/yyyy` input.

#### Scenario: User enters today shortcut
- **WHEN** a wizard is waiting for a date and the user sends `hoy`
- **THEN** the wizard MUST resolve the date to the current local calendar date in `dd/mm/yyyy` format
- **THEN** the wizard MUST continue to the next step without asking for the date again

#### Scenario: User enters yesterday shortcut
- **WHEN** a wizard is waiting for a date and the user sends `ayer`
- **THEN** the wizard MUST resolve the date to the previous local calendar date in `dd/mm/yyyy` format
- **THEN** the wizard MUST continue to the next step without asking for the date again

#### Scenario: User enters next-month shortcut
- **WHEN** a wizard is waiting for a date and the user sends `sig <day>`
- **THEN** the wizard MUST resolve the date to the requested day in the next calendar month
- **THEN** if the requested day does not exist in the target month, the wizard MUST clamp to the nearest valid day in that month
- **THEN** the wizard MUST continue to the next step without asking for the date again

### Requirement: Active transaction wizards validate shortcut and manual date input consistently
The system SHALL use one shared validation path for both shortcut-derived dates and manual date strings so that `bill`, `transfer`, and `instalment` enforce the same format and calendar rules.

#### Scenario: User enters a valid manual date
- **WHEN** a wizard is waiting for a date and the user sends a valid `dd/mm/yyyy` value
- **THEN** the wizard MUST store that exact normalized date value
- **THEN** the wizard MUST continue to the next step

#### Scenario: User enters an invalid date
- **WHEN** a wizard is waiting for a date and the user sends an invalid or unsupported date value
- **THEN** the wizard MUST explain that the date is invalid
- **THEN** the wizard MUST remain on the current step
- **THEN** the wizard MUST remind the user of the accepted input formats or shortcuts
