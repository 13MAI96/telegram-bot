## ADDED Requirements

### Requirement: Active transaction wizards provide recoverable validation feedback
The system SHALL provide explicit recovery guidance whenever a user enters invalid data in the `bill`, `transfer`, or `instalment` wizard steps, instead of failing silently or returning only a generic rejection.

#### Scenario: User enters an invalid account, category, holder, or amount
- **WHEN** a wizard receives a value that does not match the expected options or numeric constraints
- **THEN** the wizard MUST explain why the value was rejected
- **THEN** the wizard MUST remain on the same step
- **THEN** the wizard MUST tell the user how to retry with a valid value

#### Scenario: User needs to abandon a broken flow
- **WHEN** the `bill`, `transfer`, or `instalment` wizard has rejected at least one input or the user is otherwise stuck in the current scene
- **THEN** the wizard MUST remind the user that the conversation can be cancelled with the configured cancel command

### Requirement: Transaction entry flows handle downstream persistence failures safely
The system SHALL catch failures that occur while `bill`, `transfer`, `instalment`, or `plane-text` are saving data or invoking dependent services and SHALL respond with a user-safe error message plus server-side diagnostics.

#### Scenario: Google Sheets write fails during confirmation
- **WHEN** a wizard reaches its confirmation step and the persistence operation fails
- **THEN** the wizard MUST inform the user that the operation could not be completed
- **THEN** the wizard MUST avoid claiming that the record was saved successfully
- **THEN** the system MUST log enough context to identify the failing wizard and operation

#### Scenario: Unexpected exception occurs inside a wizard
- **WHEN** an unhandled exception is raised while processing a transaction-entry wizard step
- **THEN** the system MUST log the exception with scene context
- **THEN** the user MUST receive a generic recovery message without internal stack details

#### Scenario: Plain-text entry fails while saving
- **WHEN** the `plane-text` flow has accepted an expense payload and the persistence operation fails
- **THEN** the system MUST inform the user that the expense could not be saved
- **THEN** the system MUST avoid claiming that the record was registered successfully
- **THEN** the system MUST log enough context to identify the failing operation
