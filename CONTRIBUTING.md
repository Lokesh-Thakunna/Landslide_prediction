# BHURAKSHAN Contributing Guide

This repository is currently a planning and specification workspace. The goal of contribution is to keep the documentation internally consistent with the updated product direction before implementation starts.

## Working Agreement

- treat `C:/Users/lt22c/Downloads/goal_updated.md` as the source brief
- prefer updating all affected documents in the same pass when a core assumption changes
- avoid introducing architecture that depends on live hardware sensors for v1
- keep the v1 ML description aligned to a single `Random Forest` model
- keep the risk language aligned to `SAFE`, `WATCH`, and `DANGER`
- keep forecasting aligned to `current`, `+1h`, and `+2h`

## Ownership Split

| Role | Owns |
| --- | --- |
| Product and UX | citizen experience, alerts, evacuation guidance, map language |
| Frontend | dashboard map, hotspot panel, alert log, mobile interface |
| Backend | API contracts, alert orchestration, subscriptions, shelter and route data |
| ML and Data | rainfall ingestion, proxy generation, Random Forest scoring, forecasting |

## Contribution Rules

- update the high-level docs first when strategy changes:
  `README.md`, `Project_docs/goal.md`, `Project_docs/prd.md`
- then update the technical contracts:
  API, data model, system design, business logic, security
- finally update execution docs:
  `Task/TASKS.md`, `env.example`, and backend infrastructure notes

## What Changed In The Updated Direction

The following older assumptions should not be reintroduced:

- MQTT sensor ingestion as a required v1 dependency
- RF plus XGBoost ensemble scoring
- IVR as a core channel
- four-tier `LOW/MODERATE/HIGH/CRITICAL` risk labels
- documentation that implies the codebase already exists when it is still a plan

## Recommended Branching

If the repo is later initialized as a Git project, keep work scoped by area:

- `feat/docs-core`
- `feat/docs-api`
- `feat/docs-ml`
- `feat/docs-ux`

## Commit Style

Use concise conventional commits:

```text
docs(goal): align strategy to rainfall+slope+history model
docs(api): add current and forecast risk endpoints
docs(ml): replace ensemble logic with random forest workflow
docs(tasks): remove sensor work and add proxy forecast tasks
```

## Review Checklist

Before finalizing a change, confirm:

- the same risk scale appears everywhere
- alert channels are consistent everywhere
- forecasting horizons are consistent everywhere
- the ML feature list is consistent everywhere
- tables, flows, and tasks no longer reference removed sensor architecture unless clearly marked as future scope
- documentation does not claim files, services, or endpoints exist if they are only planned
