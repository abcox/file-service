# Funnel Feature Specification

## Purpose
The Funnel feature orchestrates a user journey across three major stages:

1. Starting workflow
2. Quiz
3. Ending workflow

The initial goal is to support a linear journey with optional ending add-ons such as Booking and Payment/Deposit.

## Goals
- Reuse existing Quiz and Workflow capabilities.
- Introduce a reusable Funnel Definition model.
- Track each user execution as a Funnel Run.
- Support monetization-oriented endings with booking and payment/deposit.
- Keep V1 simple: linear flow only, no branching.

## Existing Building Blocks
Current modules that Funnel should leverage:

- `quiz` module: quiz CRUD and result logic
- `user-quiz-result` module: quiz completion/result storage
- `workflow` module: workflow execution endpoints/services
- `booking` module: booking capabilities
- `payment` module: payment capabilities

## Domain Model

### FunnelDefinition
Represents an authorable reusable funnel template.

Suggested fields:
- `id`
- `name`
- `slug`
- `status`: `draft | active | archived`
- `version`
- `startStep`
- `quizStep`
- `endSteps` (ordered list)
- `createdAt`
- `updatedAt`

### FunnelStep
Represents one stage in the funnel.

Suggested fields:
- `stepType`: `workflow | quiz | addon`
- `addonType` (for add-on steps): `booking | payment | deposit | email | webhook`
- `config`: step-specific settings
- `required`: boolean
- `order`: number

### FunnelRun
Represents one user/session execution of a funnel.

Suggested fields:
- `id`
- `funnelId`
- `funnelVersion`
- `userId` (optional for guest)
- `sessionId`
- `state`
- `startStepExecution`
- `quizResultId`
- `endStepExecutions`
- `errors`
- `createdAt`
- `updatedAt`

## Runtime State Model
V1 state progression:

- `created`
- `start_pending`
- `start_completed`
- `quiz_pending`
- `quiz_completed`
- `end_pending`
- `end_booking_pending` (optional)
- `end_booking_selected` (optional)
- `end_payment_pending` (optional)
- `end_payment_succeeded` (optional)
- `end_completed`
- `completed`
- `failed`

Notes:
- Keep transitions idempotent to avoid duplicate side effects.
- Persist enough metadata to retry failed ending steps safely.

## Ending Add-ons

### Booking Add-on
Suggested config:
- `serviceId`
- `allowedDurations`
- `timezone`
- `prefillFromUser`: boolean
- `requirePaymentBeforeConfirmation`: boolean

Suggested behavior:
- Collect slot selection.
- If payment/deposit is required, defer final booking confirmation until payment success.

### Payment/Deposit Add-on
Suggested config:
- `mode`: `full | fixed_deposit | percent_deposit`
- `amount` (for fixed deposit/full)
- `percentage` (for percent deposit)
- `currency`
- `refundPolicy`

Suggested behavior:
- Create payment intent and persist id in `FunnelRun`.
- Confirm payment in an idempotent endpoint.
- Continue to next end step only after successful payment.

## API Proposal (V1)

### Funnel Definition APIs (admin)
- `POST /funnel`
- `PUT /funnel/:id`
- `GET /funnel/:id`
- `GET /funnel/list`
- `POST /funnel/:id/activate`
- `POST /funnel/:id/archive`

### Funnel Run APIs (runtime)
- `POST /funnel/:id/run/start`
- `GET /funnel/run/:runId`
- `POST /funnel/run/:runId/advance`
- `POST /funnel/run/:runId/booking/select`
- `POST /funnel/run/:runId/payment/create-intent`
- `POST /funnel/run/:runId/payment/confirm`

## Scheduled Entry Points (Lead Sourcing)

The funnel model should support scheduled creation of new `FunnelRun` records from external lead sources.

Purpose:
- Periodically source new leads from configured systems.
- Start funnel runs automatically without manual API calls.
- Enable repeatable outbound and nurture workflows.

Example lead sources:
- CRM export/API
- Marketing form submissions
- CSV/file drops
- Third-party webhook relay storage

Suggested scheduler integration:
- Use the scheduler module for periodic polling/trigger jobs.
- Use config-driven cadence and timezone (cron expression + timezone).
- Route each sourced lead through a deterministic upsert and run-start pipeline.

### Scheduler Workflow Contract (Implementation Scaffold)

To support pluggable scheduled workflows, each scheduler job should implement a common execution contract and be resolved by name from a registry.

Suggested contract surface:
- `name`: unique stable job identifier (for config binding and observability).
- `execute(context)`: async execution entry point.
- `context.runId`: unique run correlation id per execution.
- `context.scheduledAt`: UTC timestamp for trigger instant.
- `context.trigger`: trigger source (`cron | manual`).
- `context.reportProgress(progress)`: callback for emitting progress events/log entries.

Progress payload suggestion:
- `step`: machine-readable lifecycle step.
- `message`: human-readable summary.
- `processed`: optional processed count.
- `total`: optional total count.
- `meta`: optional structured metadata.

Lifecycle recommendation:
- `job_started`
- `source_fetch_started`
- `source_fetch_completed`
- `dedup_completed`
- `invitation_send_started` (optional)
- `invitation_send_completed` (optional)
- `run_start_completed`
- `job_completed`
- `job_failed`

Scheduler config model suggestion:
- `scheduler.jobs[]`: name, enabled, cron, timeZone.
- Job-specific settings in `scheduler.<job-specific-block>`.

This enables adding new source adapters/jobs without modifying scheduler core logic.

Suggested source configuration (conceptual):
- `sourceId`
- `sourceType`
- `enabled`
- `cron`
- `timeZone`
- `targetFunnelId`
- `mappingRules`
- `dedupKey`

Suggested runtime behavior:
- Poll/fetch new source records.
- Normalize records to a canonical lead payload.
- Deduplicate using `sourceId + dedupKey`.
- Create or reuse contact identity.
- Send invitation when configured for invite-first flows.
- Start a new funnel run bound to `targetFunnelId` based on run-start trigger mode.
- Persist source-to-run linkage for traceability.

### Entry Attribution Model

Funnel entry should distinguish between campaign-driven traffic and organic discovery.

Primary channels:
- `campaign`: lead entered via promoted/published link.
- `organic`: lead discovered funnel independently.
- `unknown`: fallback for malformed or ambiguous traffic.

Campaign sub-types:
- `email`
- `publication`
- `paid-social`
- `paid-search`
- `referral-partner`
- `other`

### Funnel Entry Query Parameters

Suggested query contract on funnel landing route:
- `src`: `campaign | organic | direct`
- `campaignId`: campaign identifier for promoted link attribution
- `campaignType`: `email | publication | paid-social | paid-search | referral-partner | other`
- `inviteToken`: opaque invitation token for invite-explicit path
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`

Notes:
- `src=direct` should map to `organic` in persisted attribution unless campaign context is provided.
- Campaign metadata can be accepted from query params, but invitation identity must be server-validated.

### Invitation and Run-Start Triggers

For sourced leads, invitation-first should be supported as a first-class pattern.

Suggested run-start modes:
- `onInviteSend`: create `FunnelRun` when invitation is sent.
- `onInviteClick`: create `FunnelRun` when invite link is clicked.
- `onLanding`: create `FunnelRun` on first valid funnel route load.

Suggested invitation state model:
- `queued`
- `sent`
- `delivered`
- `opened`
- `clicked`
- `expired`
- `accepted`

Suggested attribution persistence on `FunnelRun`:
- `acquisitionChannel`: `campaign | organic | unknown`
- `acquisitionSubType`: nullable campaign sub-type
- `campaignId`: nullable
- `inviteId`: nullable
- `utm`: object snapshot
- `landingUrl`: first seen landing URL
- `referrerHost`: nullable
- `firstTouchAt`: timestamp

Attribution precedence:
- Valid `inviteToken` path
- Explicit campaign params (`campaignId` or UTM set)
- Referrer/session heuristics
- Organic fallback

Idempotency and safety requirements:
- Source ingestion must be idempotent.
- Starting a run for the same dedup key should not duplicate side effects.
- Repeated invite clicks should reuse existing run where policy allows.
- Retries must be safe for partial failures.
- Multi-instance deployments require lock/leader strategy or queue-based handoff.

Observability additions for scheduled sourcing:
- Leads pulled per run
- Leads deduplicated
- Runs started per source
- Source processing latency
- Source error rate and retry count

V1 scope suggestion:
- Start with one source adapter and one scheduled job.
- Keep sourcing linear (no branching rules at ingestion).
- Persist ingestion audit data for replay and troubleshooting.

## Content Creation Feature Opportunity

Funnel invites and campaign touchpoints create a natural extension point for a content creation feature that helps teams draft, personalize, and approve outbound content before delivery.

Objective:
- Enable operators to create invitation and nurture content tied to funnel definitions, campaign context, and attribution strategy.

Suggested capability model:
- Template-first authoring: start from reusable templates (invite, reminder, follow-up).
- Structured personalization: merge contact/funnel/campaign fields into deterministic placeholders.
- Optional AI-assisted drafting: generate subject/body variants from campaign intent, then require human review.
- Approval workflow: draft -> review -> approved -> published status lifecycle.
- Versioning: store content revisions and bind sent messages to an immutable content version.

Suggested domain entities (future):
- `FunnelContentTemplate`: reusable authored template with channel and metadata.
- `FunnelContentVariant`: concrete variant (manual or AI-assisted) linked to template/version.
- `FunnelContentApproval`: reviewer decisions and audit trail.
- `FunnelContentUsage`: linkage between sent invite/message and content version used.

Integration points with current funnel design:
- Invitation-first runs can select content by campaign type and funnel stage.
- Scheduled sourcing jobs can reference approved template/variant IDs for send steps.
- Attribution data (`campaignId`, `campaignType`, UTM) can drive variant selection rules.
- Funnel run observability should include content/version identifiers for conversion analysis.

Safety and governance requirements:
- Enforce approval before production sends.
- Keep AI generation optional and feature-flagged.
- Log generation prompts and outputs for auditability.
- Provide fallback to deterministic non-AI templates when AI is unavailable.

Incremental rollout suggestion:
- Phase A: template-only content selection in invite pipeline.
- Phase B: personalization and variant testing by campaign type.
- Phase C: optional AI-assisted draft generation with reviewer approval gates.

## Security and Access
- Definition APIs should be admin-only.
- Runtime APIs should support auth and guest session flows.
- Validate funnel ownership and allowed transitions on each run action.

## Observability
Track funnel metrics for conversion and drop-off:
- Start -> Quiz conversion
- Quiz completion rate
- Booking start and booking confirmation rates
- Payment initiation and payment success rates
- Failure rates by step type

## V1 Non-Goals
- Arbitrary branching/decision trees
- Visual drag-and-drop funnel builder
- Multi-tenant rule engines
- Complex retries with compensation logic

## Suggested Delivery Phases

### Phase 1
- Funnel definition CRUD
- Linear start -> quiz -> end flow
- Funnel run persistence and transition guardrails

### Phase 2
- Booking add-on integration
- Payment/deposit add-on integration
- Basic conversion analytics

### Phase 3
- Advanced reporting
- Optional branching rules based on quiz outcomes

## Notes for Implementation
- Prefer versioned definitions: each run binds to a specific `funnelVersion`.
- Avoid title-based identity for references where IDs are available.
- Keep state transitions server-driven and idempotent.
