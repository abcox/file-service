# Database Migration Plan (SQL + DocDB)

## Purpose
This document defines a practical and community-aligned migration strategy for both relational SQL data and document data in this service.

Goals:
- Make schema/data changes repeatable and auditable.
- Remove drift between environments.
- Support safe rollout and rollback patterns.
- Keep SQL and DocDB migration behavior explicit and observable.

## Current State Summary
- SQL currently relies on TypeORM synchronize behavior in development.
- No formal SQL migration files are present in the repository.
- DocDB (Mongoose on Cosmos Mongo API) uses code-defined schemas without a formal migration runner.
- package.json contains db-create/db-drop/db-reset scripts, but corresponding script files are currently missing.

## Proposed Standards

### SQL (Relational)
Recommended standard: TypeORM native migrations.

Why:
- First-class support in TypeORM/Nest ecosystem.
- Widely used and maintained.
- Clear up/down migration model.

### DocDB (Cosmos Mongo API)
Recommended standard: migrate-mongo (preferred) or Umzug + Mongoose adapter (alternative).

Why:
- migrate-mongo is widely used for Mongo-compatible document migrations.
- Provides versioned migration scripts and migration history tracking.

## Proposed Folder Structure

Under src/module/db:
- sql/migration/
  - SQL migration files (versioned)
- doc/migration/
  - Document migration files (versioned)
- migration/
  - Shared migration contracts/types and helpers (optional but recommended)

Suggested additional runtime metadata collection/table:
- SQL: rely on TypeORM migrations table (and optional extended audit table)
- DocDB: migration_history collection

## Shared Migration Metadata Contract
Define a common migration metadata shape for observability:
- migrationId (string)
- system (sql | doc)
- version (string)
- description (string)
- checksum (string)
- appliedAt (Date)
- appliedBy (string)
- durationMs (number)
- status (success | failed)
- errorMessage (optional string)

Notes:
- SQL may keep this in TypeORM internal table plus optional audit table.
- DocDB should store this in migration_history with unique migrationId.

## Versioning Strategy
Two supported approaches:
1. Timestamp versions (recommended):
   - Example: 20260803_001_add_scheduler_job_config
2. Semantic sequence:
   - Example: v1.12.0_sql_add_user_idx

Recommendation:
- Use timestamp-based ordering for deterministic execution and easy sorting.

## Migration Execution Rules
- All migrations must be idempotent or guarded by applied-state checks.
- No destructive migration without a rollback or explicit irreversible annotation.
- Validate expected preconditions before mutate operations.
- Log start/end/failure with migration metadata.

## Rollout Plan

### Phase 1: SQL Migration Foundation
- Add TypeORM migration config and scripts:
  - migration:generate
  - migration:run
  - migration:revert
  - migration:show
- Create baseline SQL migration from current entities.
- Update environment policy:
  - Development: synchronize optional during transition
  - Non-development: migrations only (synchronize disabled)

### Phase 2: DocDB Migration Foundation
- Add document migration runner (migrate-mongo preferred).
- Add src/module/db/doc/migration folder with baseline marker migration.
- Add migration_history tracking.
- Add scripts:
  - migration:doc:up
  - migration:doc:down
  - migration:doc:status

### Phase 3: Shared Contracts + Observability
- Add shared migration metadata contract and helper utilities.
- Standardize structured logging fields for both systems.
- Add checksum capture and duration metrics.

### Phase 4: CI/CD Integration
- Add migration status checks in pipeline.
- Run SQL migrations during deployment stage.
- Run DocDB migrations during deployment stage.
- Fail deployment on migration failure.

### Phase 5: Safety Hardening
- Add lock/lease guard for doc migrations in multi-instance deployments.
- Add dry-run or validate mode where feasible.
- Add rollback runbooks and incident recovery guidance.

## Operational Decisions to Finalize
- Should development stop using synchronize immediately, or use a short transition window?
- Should doc migrations run at app startup or only via deployment pipeline?
- Should SQL and DocDB share one global version namespace or use separate tracks?
- Should migration execution require explicit operator confirmation in production?

## Recommended Defaults
- SQL: TypeORM migrations, synchronize false outside development.
- DocDB: migrate-mongo with explicit deployment-run execution.
- Separate version tracks for sql and doc, unified metadata format for reporting.
- No automatic production startup migrations until locks/audit controls are finalized.

## Deliverables Checklist
- [ ] SQL migration folder and baseline migration
- [ ] Doc migration folder and baseline migration
- [ ] Shared migration metadata contract
- [ ] package.json migration scripts for sql/doc
- [ ] CI/CD migration steps
- [ ] Rollback and runbook documentation
