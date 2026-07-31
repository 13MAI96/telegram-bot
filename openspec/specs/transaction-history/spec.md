## Purpose

Define transaction history lookup from the `Caja` spreadsheet by account and holder.

## Requirements

### Requirement: `/transactions` collects account and holder before querying history

The system SHALL expose a `/transactions` command that starts a wizard and requests `cuenta` and `titular` before attempting to read transaction history.

#### Scenario: User starts the transactions wizard

- **WHEN** the user sends `/transactions` and has a group assigned
- **THEN** the bot MUST enter the transactions wizard
- **THEN** the wizard MUST ask first for the account value
- **THEN** the wizard MUST later ask for the holder value before querying the spreadsheet

#### Scenario: User starts the transactions wizard without an assigned group

- **WHEN** the user sends `/transactions` and has no assigned group
- **THEN** the bot MUST redirect the user to the group onboarding flow instead of entering the transactions wizard

### Requirement: Transaction history is filtered by canonical account and holder values

The system SHALL validate account and holder values against the group's registered options using case-insensitive matching and SHALL query the spreadsheet using the canonical matched values.

#### Scenario: User provides account and holder with different casing

- **WHEN** the user enters account and holder text that matches registered options ignoring case
- **THEN** the wizard MUST accept both values
- **THEN** the system MUST use the canonical registered account and holder values for the query

#### Scenario: User provides an invalid account or holder

- **WHEN** the user enters an account or holder that does not match the registered options
- **THEN** the wizard MUST explain that the data is invalid
- **THEN** the wizard MUST remain on the current step or restart the lookup input flow
- **THEN** the wizard MUST ask again for the required value

### Requirement: Transaction history returns the last five matching `Caja` movements

The system SHALL read the `Caja` worksheet, filter movements by the selected account and holder, sort or preserve them so the newest five matching rows are returned, and format each result for chat output.

#### Scenario: Matching movements are found

- **WHEN** the spreadsheet contains matching `Caja` rows for the selected account and holder
- **THEN** the bot MUST return at most 5 movements
- **THEN** each movement MUST be formatted as `${fecha} - ${descripcion} - Deb.: ${debito} - Cred.: ${credito}`
- **THEN** the bot MUST omit the `Deb.:` segment when debit is `0`
- **THEN** the bot MUST omit the `Cred.:` segment when credit is `0`

#### Scenario: No matching movements are found

- **WHEN** the spreadsheet contains no `Caja` rows for the selected account and holder
- **THEN** the bot MUST inform the user that no movements were found
- **THEN** the wizard MUST finish without claiming that results exist

#### Scenario: Spreadsheet lookup fails

- **WHEN** reading the `Caja` worksheet fails after valid account and holder input
- **THEN** the bot MUST inform the user that the query could not be completed
- **THEN** the system MUST avoid returning partial or fabricated movements
