## ADDED Requirements

### Requirement: Recently active users receive a pre-sleep warning
The system SHALL warn Telegram users who were active during the last 60 minutes before the Koyeb-hosted service reaches its idle sleep threshold.

#### Scenario: Warn recently active users before sleep
- **WHEN** the service is approaching the end of a 60-minute inbound HTTP inactivity window
- **THEN** the system MUST send a warning message to each Telegram user recorded as active during the last 60 minutes
- **THEN** the warning message MUST include a wake-up link pointing to the configured public root path `/`
- **THEN** the warning message MUST be written in Spanish and first person, using copy equivalent to `Me estoy por ir a dormir, si necesitás algo más no te olvides de despertarme en {link}`

#### Scenario: Do not warn inactive users
- **WHEN** a Telegram user has no recorded activity during the last 60 minutes
- **THEN** the system MUST NOT include that user in the pre-sleep warning batch

### Requirement: Warning delivery is limited to one send per idle cycle
The system SHALL avoid sending duplicate pre-sleep warnings for the same inactivity cycle.

#### Scenario: Only one warning is sent before sleep
- **WHEN** the warning for the current idle cycle has already been sent
- **THEN** the system MUST NOT send another warning until new inbound HTTP activity starts a new cycle

#### Scenario: New traffic starts a new idle cycle
- **WHEN** the service receives new inbound HTTP traffic after a warning was already sent
- **THEN** the system MUST reset the warning state for the next idle cycle

### Requirement: Warning logic is based on inbound HTTP activity
The system SHALL use inbound HTTP activity, not Telegram polling activity alone, to estimate the Koyeb sleep window.

#### Scenario: Telegram activity alone does not reset the Koyeb idle clock
- **WHEN** users continue interacting with the bot only through Telegram polling and no inbound HTTP traffic reaches the service
- **THEN** the system MUST continue counting down the current idle cycle based on inbound HTTP activity timestamps

#### Scenario: Any inbound HTTP request refreshes service activity
- **WHEN** the service receives an inbound HTTP request
- **THEN** the system MUST record a fresh service activity timestamp for idle-cycle tracking

#### Scenario: Health checks count as legitimate cycle activity
- **WHEN** the service receives an inbound HTTP health-check request
- **THEN** the system MUST treat that request as valid inbound HTTP activity for the current idle cycle

### Requirement: Notification failures do not interrupt normal operation
The system SHALL treat failed warning deliveries as non-fatal.

#### Scenario: One user notification fails
- **WHEN** sending the warning message to one Telegram user fails
- **THEN** the system MUST log the failure with enough context to diagnose it
- **THEN** the system MUST continue attempting to notify the remaining eligible users

### Requirement: Shutdown warning is best-effort
The system SHALL attempt a final warning during graceful shutdown only as a fallback when the current idle cycle has not yet been warned.

#### Scenario: Graceful shutdown occurs before scheduled warning send
- **WHEN** the application receives a graceful shutdown signal and the current idle cycle has not yet emitted its warning
- **THEN** the system MUST attempt one final best-effort warning send

#### Scenario: Scheduled warning already sent before shutdown
- **WHEN** the application receives a graceful shutdown signal after the current idle cycle warning was already sent
- **THEN** the system MUST NOT send a duplicate warning
