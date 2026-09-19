# Development Roadmap

## Table of Contents
- [Backlog](#backlog)
- [Code Organization](#code-organization)

## Related Roadmaps

- Logging and observability roadmap: [LOGGING_AND_OBSERVABILITY_ROADMAP.md](LOGGING_AND_OBSERVABILITY_ROADMAP.md)
- Configuration reference: [CONFIGURATION.md](CONFIGURATION.md)
- Troubleshooting and startup diagnostics: [ENHANCED_TROUBLESHOOTING.md](ENHANCED_TROUBLESHOOTING.md)

## Backlog

This section acts as the lightweight project backlog for architectural and technical improvements.

Status legend:
- `proposed`: idea captured, not yet planned
- `planned`: accepted and queued for implementation
- `in-progress`: currently being implemented
- `done`: implemented and verified

| ID | Priority | Status | Title | Summary |
|---|---|---|---|---|
| ARCH-001 | High | proposed | Promote timezone to system scope | Move timezone default from API scope to a system-level config and keep scheduler-level timezone as an explicit override. |
| ARCH-002 | High | proposed | Move scheduler jobs to code-first defaults with DB overrides | Define job defaults in code, use DB records as runtime overrides, and reconcile missing/deprecated jobs on startup without overwriting existing operator-managed schedule values. |
| ARCH-003 | High | proposed | Config governance aligned to NestJS standards | Consolidate configuration loading to clear source precedence, typed config namespaces, and validated startup contracts with no secrets in committed JSON files. |
| REL-001 | High | proposed | Dependency health aggregation contract | Provide a single aggregated readiness model for core dependencies (storage, GPT, DB, Key Vault, external APIs) with severity and operator action hints. |
| REL-002 | High | proposed | Dependency-failure UX guidance path | Standardize API error mapping so dependency failures are explicit (not generic 500), and provide user-facing guidance for retry/fallback paths in frontend flows. |
| OBS-001 | Medium | proposed | Actionable observability for dependency failures | Extend diagnostics and logs with dependency-specific error classification, correlation metadata, and dashboard-friendly fields for fast triage. |

### Backlog Details

#### ARCH-001: Promote timezone to system scope

Problem:
- `api.timeZone` is currently used beyond API concerns, including scheduler behavior.
- This creates ambiguous ownership because timezone is a cross-cutting system concern, not only an API concern.

Proposed direction:
- Introduce `system.timeZone` as the global default timezone.
- Keep `scheduler.heartbeat.timeZone` as an optional module-level override.
- Migrate scheduler fallback behavior to use `system.timeZone` first.
- Deprecate `api.timeZone` after a migration window.

Acceptance criteria:
- Scheduler uses `scheduler.heartbeat.timeZone` when present.
- Scheduler falls back to `system.timeZone` when scheduler timezone is not set.
- API and other modules use `system.timeZone` as default where timezone is needed.
- Configuration docs include migration notes and deprecation guidance for `api.timeZone`.

#### ARCH-002: Move scheduler jobs to code-first defaults with DB overrides

Problem:
- Scheduler job identity currently comes from code registration, while schedule defaults still depend on external config and DB state.
- Startup reconciliation currently syncs registered jobs into the DB metadata store, but it does not yet treat code as the source of truth for default `enabled`, `cron`, and `timeZone`.
- The next scheduler admin/editor flow needs a stable persisted view of current runtime config without losing code-owned defaults.

Proposed direction:
- Extend the scheduler job contract so each job implementation declares its default schedule in code.
- Use the DB job config collection as the persisted override layer and runtime view for operators.
- On startup, reconcile registered job implementations into the DB by creating missing records, refreshing code-owned metadata, and deprecating removed jobs.
- Do not overwrite existing DB schedule values during startup reconciliation unless an explicit reset-to-default action is requested.
- Reduce `scheduler.jobs` config JSON to a transitional bootstrap role and remove it as the long-term primary source once code defaults are in place.

Acceptance criteria:
- Each registered scheduler job exposes code-owned default schedule values.
- Startup reconciliation creates missing DB records from implementation defaults.
- Startup reconciliation updates code-owned metadata such as `jobKey`, `jobName`, and `description` without overwriting existing DB `enabled`, `cron`, or `timeZone` values.
- Effective runtime scheduling resolves from code defaults first and then overlays DB overrides.
- Deprecated DB records remain visible for audit purposes but are not scheduled.

#### ARCH-003: Config governance aligned to NestJS standards

Problem:
- Current config behavior is functional but mixed: local JSON overlays, environment variables, and Key Vault resolution are not represented as a strict, documented precedence contract.
- Sensitive values have appeared in local JSON usage patterns, increasing accidental secret exposure risk.
- Runtime diagnostics are useful, but startup validation is not yet a strict contract that fails early with typed guidance for missing critical settings.

Proposed direction:
- Adopt a NestJS-first configuration pattern using `@nestjs/config` as the primary integration surface while preserving `AppConfigService` as the typed facade.
- Define explicit source precedence by environment and document it as code-level policy:
	1) environment variables,
	2) local override file (development only, gitignored),
	3) baseline config file,
	4) Key Vault secret resolution (environment-dependent).
- Introduce schema validation at bootstrap (zod or joi) with fail-fast behavior for required fields and clear diagnostics.
- Split configuration into typed domains/namespaces (`auth`, `storage`, `gpt`, `observability`, `database`) and remove ad-hoc key access patterns.
- Enforce "no secrets in committed config" and provide a sanctioned `.env`/Key Vault path per environment.

Acceptance criteria:
- A single documented and tested precedence contract exists and matches runtime behavior.
- Startup fails fast for missing required secrets in production with actionable error context.
- Development supports local overrides without requiring secret values in committed JSON files.
- Configuration access across modules uses typed facade methods or typed namespace contracts only.
- Config docs and local setup docs are consistent with the implemented behavior.

#### REL-001: Dependency health aggregation contract

Problem:
- Service-level diagnostics exist, but operators and UI flows need one aggregated dependency view with severity and readiness semantics.
- Current health signals do not consistently express "ready vs degraded vs unavailable" by user-impacting capability.

Proposed direction:
- Define a dependency registry for critical services (`storage`, `gpt`, `database`, `key-vault`, `gmail`, optional externals).
- Extend diagnostic aggregation to include:
	- severity (`critical`, `important`, `optional`),
	- capability impact (`upload`, `analysis`, `auth-refresh`, `notifications`),
	- recommended operator action.
- Publish a stable response contract for `/api/diagnostic/services` and an aggregated readiness endpoint for frontend consumption.

Acceptance criteria:
- Aggregated readiness returns deterministic overall state from dependency severity.
- Each dependency reports impact and action hints suitable for support/runbooks.
- Smoke tests validate the diagnostic endpoint contract for at least one degraded scenario.

#### REL-002: Dependency-failure UX guidance path

Problem:
- Dependency failures are often surfaced as generic 500 responses, obscuring root cause and next actions for users.
- Frontend flows (upload, analysis/report generation) need predictable error classes to guide user behavior.

Proposed direction:
- Introduce error classification and mapping for dependency failures:
	- `dependency_unavailable`,
	- `dependency_quota_exceeded`,
	- `dependency_timeout`,
	- `dependency_auth_failed`.
- Return structured API error payloads with machine-readable codes and human guidance.
- Define frontend UX patterns per error class (retry, switch mode, try later, contact support).

Acceptance criteria:
- Workflow endpoints return classified dependency errors instead of generic internal failures for known external failure modes.
- Frontend can branch on stable error codes and display guidance text.
- Logs include correlated classification fields for each mapped error.

#### OBS-001: Actionable observability for dependency failures

Problem:
- Logging and diagnostics are improving, but dependency-specific triage still requires manual interpretation.
- Incidents need quickly searchable fields for dependency, capability impact, and remediation hints.

Proposed direction:
- Extend structured logs and diagnostics with fields such as `dependencyName`, `dependencyOperation`, `failureClass`, and `userImpact`.
- Align these fields with the logging/observability roadmap so dashboards and alerts can group failures by dependency class.
- Add alert-friendly thresholds for recurring dependency failures and quota-related events.

Acceptance criteria:
- Dependency-related errors emit consistent structured fields across modules.
- At least one dashboard/query recipe is documented for dependency triage.
- Alert rules are defined for repeated critical dependency failures.

## Code Organization

### Current Architecture Analysis

The current module structure contains a mix of core services and business process modules without clear separation:

```
src/module/
├── app/                    # Main application
├── asset/                  # Asset management
├── auth/                   # Authentication
├── config/                 # Configuration
├── contact/                # Contact management
├── content/                # Content handling
├── db/                     # Database connectivity
├── email-campaign/         # Email marketing (Business Process)
├── email-template/         # Template rendering
├── file/                   # File management
├── gmail/                  # Email delivery
├── gpt/                    # AI/LLM integration
├── logger/                 # Logging infrastructure
├── metadata/               # Metadata handling
├── pdf/                    # PDF generation
├── quiz/                   # Quiz functionality
├── storage/                # File storage
├── user/                   # User management
├── user-quiz-result/       # Quiz results
└── workflow/               # Workflow management
```

### Proposed Architecture: Core vs Business Process Separation

Reorganize modules to distinguish between fundamental, reusable capabilities and business-specific workflows.

#### Core Services Structure (`src/module/core/`)

**Infrastructure Services** - System-level capabilities:
- `config/` - Application configuration management
- `logger/` - Centralized logging infrastructure
- `db/` - Database connectivity and ORM
- `storage/` - File storage services (Azure Blob, local, etc.)
- `auth/` - Authentication and authorization mechanisms

**Domain Services** - Business domain capabilities:
- `gmail/` - Email delivery service
- `email-template/` - Handlebars template rendering engine
- `file/` - File management and processing
- `pdf/` - PDF generation and manipulation
- `gpt/` - AI/LLM integration services
- `asset/` - Static asset management
- `metadata/` - Metadata extraction and handling

**Entity Services** - Data model management:
- `user/` - User entity CRUD operations
- `contact/` - Contact management services

#### Business Process Modules (`src/module/`)

**Current Business Processes:**
- `email-campaign/` - Email marketing workflow orchestration

**Potential Future Business Processes:**
- `user-onboarding/` - New user registration and setup workflow
- `content-publishing/` - Content creation, review, and publishing workflow
- `quiz-management/` - Quiz creation, administration, and assessment workflow
- `document-processing/` - File upload → PDF conversion → analysis pipeline

#### Classification Decisions Needed

**Modules requiring analysis:**
- `content/` - Determine if core service or business workflow
- `quiz/` + `user-quiz-result/` - Possibly combine into `quiz-management/` business process
- `workflow/` - Evaluate if general infrastructure or specific business processes
- `asset/` vs `file/` - Assess overlap and potential consolidation

#### Proposed Final Structure

```
src/module/
├── core/
│   ├── infrastructure/
│   │   ├── config/
│   │   ├── logger/
│   │   ├── db/
│   │   ├── storage/
│   │   └── auth/
│   ├── services/
│   │   ├── gmail/
│   │   ├── email-template/
│   │   ├── file/
│   │   ├── pdf/
│   │   ├── gpt/
│   │   ├── asset/
│   │   └── metadata/
│   └── entities/
│       ├── user/
│       └── contact/
├── email-campaign/         # Business process
├── quiz-management/        # Business process (combined quiz + results)
├── content-workflow/       # Business process (if content/ is workflow)
├── document-processing/    # Business process (file → PDF → analysis)
└── app/                   # Main application module
```

### Benefits of Core vs Business Process Architecture

#### Development Benefits
- **Clear Separation of Concerns**: Infrastructure vs business logic boundaries
- **Dependency Flow**: Business processes depend on core services, never reverse
- **Reusability**: Core services can be shared across multiple business processes
- **Team Organization**: Clear ownership between infrastructure and product teams

#### Maintenance Benefits
- **Easier Navigation**: Developers know immediately whether they're working with infrastructure or business logic
- **Testing Strategy**: Unit tests for core services, integration tests for business processes
- **Reduced Coupling**: Business processes remain isolated from each other
- **Scalability**: Core services can evolve independently of business processes

#### Architectural Benefits
- **Service Discovery**: Easy identification of available capabilities
- **API Design**: Clear interfaces between core services and business orchestration
- **Documentation**: Natural grouping for API documentation and developer guides
- **Future Growth**: New business processes can leverage existing core services

### Migration Strategy

#### Phase 1: Analysis and Planning
1. Audit existing modules to categorize core vs business process
2. Identify dependencies between modules
3. Plan migration order to minimize disruption
4. Update import statements and module references

#### Phase 2: Core Services Migration
1. Create `src/module/core/` structure
2. Move infrastructure services (config, logger, db, storage, auth)
3. Move domain services (gmail, email-template, file, pdf, gpt, asset, metadata)
4. Move entity services (user, contact)
5. Update all import references

#### Phase 3: Business Process Organization
1. Keep `email-campaign/` at root level as established business process
2. Evaluate and potentially combine `quiz/` + `user-quiz-result/` into `quiz-management/`
3. Assess `content/` and `workflow/` modules for business process classification
4. Create new business process modules as needed

#### Phase 4: Validation and Documentation
1. Update all module imports throughout the application
2. Verify all tests pass with new structure
3. Update developer documentation
4. Create architectural decision records (ADRs) for the reorganization