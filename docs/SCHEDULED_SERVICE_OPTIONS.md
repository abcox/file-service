# Scheduled Service Implementation Options

## Purpose
This document captures architecture options for adding a continuous or scheduled background service capability to File Service.

The evaluation lens is a balance of:
- Easy to maintain
- Cost to run/host
- Reliable scalability

## Current Baseline (File Service)
- Runtime is a NestJS API process started from [src/main.ts](../src/main.ts).
- No scheduler module is currently wired in [src/module/app/app.module.ts](../src/module/app/app.module.ts).
- Primary deployment paths today are Azure App Service and Azure Container Instances (ACI).

## Evaluation Criteria
Scoring scale: 1 (low) to 5 (high).

Interpretation:
- Maintainability: lower operational complexity, clearer ownership, easier evolution.
- Cost Efficiency: lower monthly hosting and platform overhead.
- Reliable Scalability: resilient under growth, restart-safe, and predictable under load.

## Option 1: In-Process Scheduler in File Service API
Implement scheduled jobs directly in the existing NestJS application process.

Typical implementation:
- Add schedule support in app module.
- Add a job module containing cron/interval handlers.
- Keep job handlers idempotent.

Scores:
- Maintainability: 4
- Cost Efficiency: 5
- Reliable Scalability: 2

Pros:
- Fastest implementation and least code surface area.
- No additional deployable service to manage.
- Lowest immediate hosting cost.

Cons:
- Scheduler lifecycle is tied to API process health and restarts.
- Multiple API instances can trigger duplicate job execution without distributed locking.
- Background workload can compete with API latency/throughput.

Best fit:
- Early validation phase, low-volume jobs, non-critical schedules.

### Option 1 Configuration (In-Process Scheduler)

Current implementation note:
- The in-process scheduler work has now started in `file-service` with code-registered jobs, DB-backed job config records, and admin endpoints for status/reload/manual execution.
- The current implementation is still transitional: heartbeat and job schedule defaults are partly config-driven, while job identity and behavior are code-driven.
- The intended direction is code-first job defaults with DB-backed runtime overrides and a future job-config admin/editor experience.

Current configuration location:
- [src/config/config.json](../src/config/config.json)
- [src/config/config.production.json](../src/config/config.production.json)

Current configuration shape:

```json
"scheduler": {
	"enabled": true,
	"heartbeat": {
		"enabled": true,
		"cron": "*/5 * * * *",
		"timeZone": "America/New_York"
	}
}
```

Field reference:
- `scheduler.enabled`: master switch for all in-process scheduled jobs.
- `scheduler.heartbeat.enabled`: enables the heartbeat job used to verify scheduler activity.
- `scheduler.heartbeat.cron`: cron expression used by the in-process scheduler.
- `scheduler.heartbeat.timeZone`: timezone used to interpret the cron expression.

Job configuration direction:
- Job implementations should become the source of truth for default job identity and default schedule values.
- The DB job config collection should become the persisted override layer and the current operational view of job configuration.
- Startup reconciliation should create missing DB config records from code defaults, refresh code-owned metadata, and mark removed jobs as deprecated.
- Startup reconciliation should not overwrite an existing DB schedule override unless an operator explicitly resets that job back to implementation defaults.
- The `scheduler.jobs` block in config JSON should be treated as transitional bootstrap input and retired as the primary source once all job defaults are expressed in code.

Recommended target model:
1. Code owns `jobKey`, `jobName`, `description`, and default `enabled` / `cron` / `timeZone`.
2. DB owns operator overrides and the editable runtime view.
3. Scheduler startup reconciles code into DB additively, without destroying existing overrides.
4. Admin tooling can safely edit the DB layer while preserving a reset path back to code defaults.

Cron format notes:
- Uses standard 5-field cron format: `minute hour day-of-month month day-of-week`.
- Example `*/5 * * * *` means every 5 minutes.

Useful cron examples:
- Every minute: `* * * * *`
- Every 15 minutes: `*/15 * * * *`
- Every hour at minute 0: `0 * * * *`
- Daily at 02:30: `30 2 * * *`
- Weekdays at 08:00: `0 8 * * 1-5`

Timezone choice rationale:
- `America/New_York` was selected to align scheduler behavior with the existing API timezone in configuration (`api.timeZone`) so operational timestamps and scheduled cadence are consistent by default.
- If business operations are centered in a different timezone (for example `America/Toronto`), update `scheduler.heartbeat.timeZone` to that business timezone.
- If `scheduler.heartbeat.timeZone` is omitted, the scheduler service falls back to the effective application timezone from config/runtime.

Operational recommendation:
- Keep `api.timeZone` and `scheduler.heartbeat.timeZone` aligned unless there is a clear business reason to separate them.
- For DST-sensitive business schedules, always set an explicit IANA timezone (for example `America/New_York`) rather than using UTC offsets.

## Option 2: Dedicated Worker Service (NestJS)
Create a separate worker app/module for scheduled and background processing, independent of API traffic.

Typical implementation:
- Worker process with no public API or minimal admin endpoints.
- Shared domain services/libraries reused from file-service.
- Deploy worker separately from API.

Scores:
- Maintainability: 4
- Cost Efficiency: 3
- Reliable Scalability: 4

Pros:
- Strong separation of concerns.
- Independent scaling and release cadence from API.
- Reduced risk of API performance impact from background jobs.

Cons:
- Additional deployment artifact and runtime to operate.
- Slightly higher hosting and observability cost.

Best fit:
- Medium to high business criticality where background work grows over time.

## Option 3: Azure Functions Timer Trigger
Use Azure Functions (timer trigger) to run scheduled tasks and invoke shared business logic/services.

Typical implementation:
- Timer-triggered function per job group.
- Shared service layer reused via package or HTTP endpoints.

Scores:
- Maintainability: 3
- Cost Efficiency: 4
- Reliable Scalability: 5

Pros:
- Mature cron semantics and platform-managed execution model.
- Strong elasticity and retry ecosystem.
- Good reliability for scheduled workloads.

Cons:
- Another runtime model and project boundary to maintain.
- Shared code packaging and local debug flow can be more complex.

Best fit:
- Recurring jobs where reliability and schedule correctness are top priorities.

## Option 4: Azure Container Apps Jobs (Scheduled)
Use Container Apps Jobs to run scheduled containerized tasks.

Typical implementation:
- Define scheduled jobs with cron expression.
- Container image executes and exits.

Scores:
- Maintainability: 3
- Cost Efficiency: 4
- Reliable Scalability: 5

Pros:
- Clear job-style execution model.
- Good for heavier or bursty workloads.
- Strong alignment with container-based CI/CD.

Cons:
- Extra infrastructure and configuration surface.
- Requires container-oriented operational maturity.

Best fit:
- Batch-like workloads and heavier processing with strict schedule boundaries.

## Option 5: Queue-Driven Hybrid (Scheduler + Worker)
Use a scheduler only to enqueue jobs and dedicated workers to consume queue messages.

Typical implementation:
- Scheduler publishes job intents.
- Worker pool processes tasks from queue with retries and dead-letter handling.

Scores:
- Maintainability: 3
- Cost Efficiency: 3
- Reliable Scalability: 5

Pros:
- Highest reliability for variable or high-volume workloads.
- Backpressure, retries, and failure isolation are built in.
- Clear path to horizontal scale.

Cons:
- More moving parts to design and operate.
- Higher upfront implementation and operational complexity.

Best fit:
- Business-critical automation, high throughput, or spiky workload patterns.

## Comparison Summary
| Option | Maintainability | Cost Efficiency | Reliable Scalability | Notes |
|---|---:|---:|---:|---|
| In-Process Scheduler | 4 | 5 | 2 | Fast and cheap; weakest under scale/restarts |
| Dedicated Worker | 4 | 3 | 4 | Balanced long-term architecture |
| Azure Functions Timer | 3 | 4 | 5 | Strong reliability with managed scheduling |
| Container Apps Jobs | 3 | 4 | 5 | Great for containerized scheduled batches |
| Queue-Driven Hybrid | 3 | 3 | 5 | Most resilient, highest complexity |

## Effort, Cost, and Benefits Comparison
| Option | Effort | Cost | Benefits |
|---|---|---|---|
| In-Process Scheduler | Low | Low | Fastest to implement, no extra service footprint, minimal platform overhead |
| Dedicated Worker | Medium | Medium | Clear separation from API traffic, safer scaling, reduced API performance contention |
| Azure Functions Timer | Medium | Low-Medium | Managed cron reliability, elastic execution, strong retry/runtime support |
| Container Apps Jobs | Medium-High | Medium | Strong container-native job model, good for heavier scheduled workloads |
| Queue-Driven Hybrid | High | Medium-High | Highest reliability and scalability, resilient retries/backpressure, failure isolation |

## Recommendation Path
1. Start with In-Process Scheduler only for short validation windows and low-risk jobs.
2. Move to Dedicated Worker as default production architecture for sustained background services.
3. Use Azure Functions Timer or Container Apps Jobs when strict schedule reliability or batch semantics become primary.
4. Introduce Queue-Driven Hybrid when throughput, retry guarantees, and independent scaling are required.

## Production Guardrails (Applies to All Options)
- Ensure job handlers are idempotent.
- Add distributed lock/leader strategy if more than one scheduler instance can run.
- Track job runs with status, duration, and failure reason.
- Add retry policy with dead-letter strategy for repeated failures.
- Define SLOs for schedule latency and completion time.
- Add alerting for missed or delayed runs.

## Decision Checklist
Use this quick checklist before implementation:
- Is schedule reliability business-critical?
- Will workload spike or grow materially over 6-12 months?
- Is minimizing monthly hosting cost the top constraint?
- Do we need independent release and scaling from API traffic?
- Do we need replay/retry and auditable job execution history?

If most answers are yes for reliability/scale, choose Dedicated Worker or Azure managed scheduler options first.