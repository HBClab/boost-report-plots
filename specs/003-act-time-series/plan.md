# Implementation Plan: Accelerometer Time Series Plot (Radial Clock, Per-Session Lines)

**Branch**: `003-act-time-series` | **Date**: 2026-04-03 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-act-time-series/spec.md`

## Summary

Extend Plot 3 (Radial Activity Clock) to render one line per intervention session (S1–S4) instead of a single aggregated intervention line, with ±1 SD shading per session. Hour-level ENMO statistics (mean, SD, N) are pre-computed during data import and stored in a new `session_hourly_enmo` table. A new Express endpoint serves this data; the D3 browser code is extended to draw and legend the per-session lines alongside the existing observational group line.

## Technical Context

**Language/Version**: Python 3.12 (importer extension), TypeScript 5.x (server + browser)
**Primary Dependencies**: psycopg (Python DB writes), D3 v7, Express, node-postgres (`pg`), esbuild
**Storage**: PostgreSQL — additive new table `session_hourly_enmo`; existing `session_days` table unchanged
**Testing/Validation**: Manual visual verification against fixture data with known hour-level means/SDs; confirm plotted values at sampled hours (6, 12, 18) match fixture within 0.01 mg rounding tolerance
**Target Platform**: Linux server (NixOS dev shell, same as existing pipeline)
**Project Type**: Data pipeline (Python) + web visualization (TypeScript/D3)
**Performance Goals**: DB query sub-second for ~384 rows; full plot render within 5 seconds from data available
**Constraints**: Read-only access to GGIR source files on `/mnt/lss/`; schema changes must be additive only (no destructive changes to `session_days`)
**Scale/Scope**: ~200 participants × 4 sessions × 2 groups × 24 hours = ~384 rows in the new table

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Plot Specification Fidelity | ⚠️ REQUIRES PRE-ACTION | Plot 3 in `docs/plot-specs/act.md` does not yet document per-session intervention lines, per-session SD shading, per-session legend entries, or M5/L5 suppression. **The spec MUST be updated before implementation begins.** This is the first task of the implementation phase. |
| II. TypeScript + D3 Standard | ✅ PASS | All plot rendering uses TypeScript + D3 v7. Python importer writes to DB only. |
| III. Read-Only Shared Data Access | ✅ PASS | GGIR source files on `/mnt/lss/` are read-only. The importer writes only to the local PostgreSQL instance. |
| IV. Validation by Deliverable Evidence | ✅ PASS | Validation evidence defined: fixture hour-level data with known means/SDs; visual confirmation at hours 6, 12, 18. |
| V. Incremental Data Contract Definition | ✅ PASS | New `session_hourly_enmo` table and `/api/plot3` endpoint are defined for this feature only; no speculative generalization. |

**Constitution Violation — Principle I**: `docs/plot-specs/act.md` must be updated to document per-session intervention lines before any code is written. The update is additive (a new subsection to Plot 3) and is the first implementation task.

## Project Structure

### Documentation (this feature)

```text
specs/003-act-time-series/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── plot3-enmo-endpoint.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── act/
│   ├── importer.py          # EXTEND: add hourly ENMO aggregation logic
│   ├── parser.py            # EXTEND: parse GGIR epoch CSV files (ENMO column only)
│   ├── repository.py        # EXTEND: write session_hourly_enmo rows
│   └── schema.sql           # EXTEND: add session_hourly_enmo table DDL
└── cli/
    └── import_actigraphy.py # EXTEND: add --hourly-enmo flag or integrate into existing flow

plots/act/
├── server/
│   ├── db.ts                # EXTEND: add plot3Query function
│   └── index.ts             # EXTEND: add GET /api/plot3 endpoint
└── src/
    └── plot3.ts             # EXTEND: per-session lines, per-session SD shading, legend
```

**Structure Decision**: All changes are additive extensions to existing modules. No new top-level directories. New Python module `src/act/hourly_enmo.py` for the aggregation logic, to keep it cleanly separated from the day-level importer.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Plot spec must be updated before code | Constitution Principle I requires pre-existing spec approval | Cannot skip — the spec is the contract; proceeding without it would violate governance |
