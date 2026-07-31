## ADDED Requirements

### Requirement: Dashboard wizard collects month, holders, and accounts

The system SHALL expose a Telegram dashboard command that starts a wizard and collects the target month, holder filter, account filter, and category exclusions before generating an expense category chart.

#### Scenario: User starts dashboard with assigned group

- **WHEN** the user sends the dashboard command and has a group assigned
- **THEN** the bot MUST enter the dashboard wizard
- **THEN** the wizard MUST ask which month to visualize

#### Scenario: User starts dashboard without assigned group

- **WHEN** the user sends the dashboard command and has no assigned group
- **THEN** the bot MUST redirect the user to the group onboarding flow instead of generating a chart

#### Scenario: User selects filters

- **WHEN** the wizard asks for holders or accounts
- **THEN** the user MUST be able to select `todos`
- **THEN** the user MUST be able to provide multiple registered values separated by comma
- **THEN** the system MUST validate values case-insensitively and use canonical registered values
- **THEN** the bot MUST NOT include the full holder or account option list in the prompt

#### Scenario: User enters invalid filter

- **WHEN** the user enters a holder or account that does not match registered options and is not `todos`
- **THEN** the wizard MUST explain which filter is invalid
- **THEN** the wizard MUST ask for that full filter selection again

#### Scenario: User selects categories to exclude

- **WHEN** the wizard asks for categories to avoid
- **THEN** the bot MUST show registered categories with numeric indices
- **THEN** the user MUST be able to provide multiple indices separated by comma
- **THEN** the user MUST be able to send `ninguna` to exclude no categories
- **THEN** the user MUST be able to send `todos` to exclude all categories

#### Scenario: User enters invalid category exclusion

- **WHEN** the user enters a category index that does not exist
- **THEN** the wizard MUST explain that the category selection is invalid
- **THEN** the wizard MUST ask for the category exclusion selection again

### Requirement: Dashboard aggregates monthly expenses by category

The system SHALL read `Caja`, filter rows by selected month, holders, accounts, and excluded categories, and aggregate only expense movements by category.

#### Scenario: Matching expense movements exist

- **WHEN** `Caja` contains debit movements for the selected month and filters
- **THEN** the system MUST group those movements by category
- **THEN** the system MUST sum debit amounts per category
- **THEN** the system MUST compute the total expense amount for the chart

#### Scenario: Income or zero-debit movements are present

- **WHEN** `Caja` contains credit movements or rows with debit equal to `0`
- **THEN** the system MUST exclude those rows from the expense category aggregation

#### Scenario: Category is excluded

- **WHEN** `Caja` contains debit movements for a category selected for exclusion
- **THEN** the system MUST exclude those rows from the expense category aggregation

#### Scenario: No matching expenses exist

- **WHEN** no expense rows match the selected month and filters
- **THEN** the bot MUST tell the user that there are no expenses for the selected criteria
- **THEN** the bot MUST NOT send an empty chart

### Requirement: Dashboard sends a pie chart image in Telegram

The system SHALL render the aggregated category expenses as a pie chart image and send it as a response in the same Telegram chat.

#### Scenario: Chart renders successfully

- **WHEN** aggregation returns at least one category
- **THEN** the system MUST generate a PNG image of a pie chart
- **THEN** the image MUST include every aggregated category in the legend without truncating the visible category list
- **THEN** the bot MUST send the image in Telegram
- **THEN** the response MUST include the selected month, filters, and total expense amount in a caption or adjacent message

#### Scenario: Chart rendering fails

- **WHEN** the dataset is valid but image generation fails
- **THEN** the bot MUST send a text fallback with category totals
- **THEN** the bot MUST avoid claiming that an image was generated

#### Scenario: Telegram image send fails

- **WHEN** Telegram rejects or fails the image response
- **THEN** the bot MUST send a text fallback with category totals if possible
- **THEN** the system MUST log enough context to diagnose the failed send

### Requirement: Frontend dashboard remains a documented fallback, not the first delivery path

The system SHALL keep the first implementation focused on Telegram image delivery and SHALL treat a frontend dashboard as a future extension unless Telegram delivery proves insufficient.

#### Scenario: User requests the first dashboard chart

- **WHEN** the dashboard command completes successfully
- **THEN** the user MUST receive the chart directly in Telegram rather than only receiving a web link

#### Scenario: Future frontend is needed

- **WHEN** requirements expand to interactive filtering, multiple chart types, drill-down, or persistent historical browsing
- **THEN** the dashboard data aggregation service MUST be reusable by a future frontend implementation
