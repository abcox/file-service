# Azure Resource Cost Budget and Optimization Plan

## Purpose

This document captures the current Azure resource state for file-service, explains recent cost observations, and defines concrete actions to reduce spend while the platform is in development mode.

Date: 2026-05-13
Subscription in scope: `236217f7-0ad4-4dd6-8553-dc4b574fd2c5` (Pay-As-You-Go)
Tenant in scope: `a7f7a08d-4e79-4d3d-812f-10bd18abbcfb` (Vorba)

## Account, Tenant, Subscription Clarification

- An Azure account (email login) can access multiple tenants.
- A tenant (Microsoft Entra directory) can contain multiple subscriptions.
- Resources are billed at the subscription level.

Known mappings from project notes:

1. `adam.cox@vorba.com` in tenant `a7f7a08d-4e79-4d3d-812f-10bd18abbcfb` -> subscription `236217f7-0ad4-4dd6-8553-dc4b574fd2c5`.
2. `adam@adamcox.net` in tenant `df86b8aa-8ee7-48d7-b0cc-5c674984b2a3` -> subscription `6a1e4df2-a791-4357-981e-69d3332eb767`.

Important: Cost review in this document is for subscription `236217f7-0ad4-4dd6-8553-dc4b574fd2c5` only.

## Resource Group Snapshot

Primary resource group reviewed: `vorba-file-service-rg`

Observed key resources:

- App Service plan: `vorba-file-service-plan` (B1 Linux)
- App Services: `vorba-file-service`, `vorba-file-service-2`, `vorba-file-service-3`
- ACI groups: `vorba-file-service-4`, `vorba-file-service-5`, `vorba-file-service-debug`
- ACR: `vorbaacr` (Basic, admin user enabled)
- App Insights: `vorba-file-service-4-insights`
- Log Analytics workspaces:
  - `vorba-file-service-4-workspace`
  - `vorba-file-service-logs`
- Key Vault: `vorba-file-service-kv`
- SQL Server: `vorba-sql-svr-1`

## ACI Details for vorba-file-service-4

Container group: `vorba-file-service-4`

Deployment characteristics:

- Region: `canadaeast`
- Public endpoint: `vorba-file-service-4.canadaeast.azurecontainer.io`
- Restart policy: `OnFailure`
- Identity: User-assigned managed identity (`vorba-file-service-identity`)
- Sidecar: Caddy for HTTPS termination and reverse proxy

Container sizing:

1. `app` container
   - CPU: 2.0
   - Memory: 4.0 GiB
   - Image: `vorbaacr.azurecr.io/file-service:<sha>`
   - Includes Playwright/Chromium path for PDF generation.
2. `caddy` sidecar
   - CPU: 0.5
   - Memory: 0.5 GiB
   - Ports: 80/443
   - Uses Azure Files shares for config and cert state.

Current runtime state (as observed):

- Container group state: `Stopped`
- App container detail: `Container stopped per client request`
- Last observed finish time: `2026-05-10T08:50:34Z`

Conclusion: Stopping this container group was a correct cost-control action.

## Other ACI Groups and Risk of Ongoing Spend

Current states observed:

1. `vorba-file-service-4`: `Stopped`
2. `vorba-file-service-5`: `Stopped` (restart policy `Always`, historical restarts observed)
3. `vorba-file-service-debug`: `Failed` (restart policy `Never`)

Note: Stopped/failed ACI groups should not generate active CPU/memory runtime charges, but related services can still produce monthly cost (monitoring, storage, registry, etc.).

## Non-Compute Cost Contributors

Even after ACI stop, these resources can continue billing:

1. ACR (`vorbaacr`, Basic tier)
2. Log Analytics ingestion and retention
3. Application Insights data volume and retention (currently 90 days)
4. Azure Files shares used by Caddy (`aci-caddy-config`, `aci-caddy-data`, `aci-caddy-state`)
5. SQL Server and database baseline costs
6. App Service plan baseline for web/apps

Potential duplicate logging spend signal:

- Two Log Analytics workspaces exist in same resource group:
  - `vorba-file-service-4-workspace`
  - `vorba-file-service-logs`

## Why Cost Was Elevated

Most likely contributors for the period where invoice exceeded expectation:

1. ACI runtime with 2.5 vCPU and 4.5 GiB memory requested while running.
2. Sidecar architecture always reserving extra CPU/memory for Caddy when active.
3. Supporting telemetry and storage resources still active.
4. Possible overlap/duplication in monitoring workspace usage.

## Dev-Mode Cost Reduction Plan

### Immediate Actions (0-2 days)

1. Keep `vorba-file-service-4` stopped unless explicitly needed.
2. Remove or archive unused ACI groups (`vorba-file-service-5`, `vorba-file-service-debug`) after export of any needed diagnostics.
3. Consolidate logging to one workspace and remove the unused one.
4. Reduce Application Insights retention from 90 days to 30 days for dev workloads.
5. Review and remove obsolete Caddy file-share data and cert artifacts if no longer required.

### Near-Term Actions (this sprint)

1. Split PDF generation into a dedicated service/project (separate deployable).
2. Keep core API on lighter hosting (App Service B1 or lower dev equivalent), without Playwright dependency where possible.
3. Run PDF worker on-demand only:
   - ACI job-style start/stop for batch PDF tasks, or
   - queue-triggered execution pattern (worker only active when needed).
4. Right-size PDF worker defaults for dev:
   - Start with 1 CPU / 2 GiB.
   - Scale up only if benchmark proves requirement.

### Policy and Governance (this month)

1. Add budget and cost alerts at subscription and resource-group levels.
2. Tag all resources with `env=dev|prod`, `owner`, and `cost-center`.
3. Add weekly cost review cadence and cleanup checklist.
4. Gate CI deployment workflow so ACI deploy is manual in dev unless explicitly approved.

## Recommended Architecture Direction

Given PDF generation is currently POC-level demand:

1. Keep `vorba-web` published on App Service (existing behavior).
2. Decouple PDF into isolated microservice to avoid carrying Chromium cost on core API.
3. Use one public ingress pattern only when needed:
   - Caddy sidecar for minimal edge behavior, or
   - shared managed edge only when multiple public services justify it.

Front Door is optional, not mandatory for microservices. It becomes cost-effective when centralized WAF, global routing, and multi-service edge management are required.

## Command References

Useful commands for ongoing review:

```bash
az account show --output json
az group list --output table
az resource list --resource-group vorba-file-service-rg --output table
az container show --name vorba-file-service-4 --resource-group vorba-file-service-rg --output json
az container list --resource-group vorba-file-service-rg --output json
az monitor log-analytics workspace list --resource-group vorba-file-service-rg --output table
az monitor app-insights component show --app vorba-file-service-4-insights --resource-group vorba-file-service-rg --output json
```

## Tracking Checklist

- [x] Confirm subscription and tenant context
- [x] Confirm `vorba-file-service-4` is stopped
- [x] Identify ACI sizing and sidecar overhead
- [x] Identify duplicate/overlapping observability resources
- [ ] Export full per-resource monthly spend report from Cost Management
- [ ] Implement PDF split-service architecture
- [ ] Apply retention and workspace consolidation changes
- [ ] Add budgets and alerts

## Notes

A direct per-resource monthly breakdown query from local Azure CLI encountered command/tooling limitations during this review. Use Azure Portal Cost Management (`Cost analysis` + `Group by: Resource`) to validate final dollar attribution before deleting shared resources.
