# Implementation Plan: Extract Actigraphy Data

**Branch**: `001-extract-actigraphy-data` | **Date**: 2026-03-31 | **Spec**: [/home/zak/work/hbc/boost/extras/report-2/specs/001-extract-actigraphy-data/spec.md](/home/zak/work/hbc/boost/extras/report-2/specs/001-extract-actigraphy-data/spec.md)
**Input**: Feature specification from `/specs/001-extract-actigraphy-data/spec.md`

## Summary

Build the first actigraphy ingestion workflow for the report pipeline: recursively discover GGIR
day-summary CSVs in the approved derivatives tree, normalize the required session-day metrics,
and load them into a local PostgreSQL dataset that supports traceable, repeatable imports for
future report generation.

## Technical Context

**Language/Version**: Python 3.12 for ingestion tooling; SQL for local schema and migrations  
**Primary Dependencies**: Standard-library CSV/path handling, PostgreSQL driver, lightweight
database migration support  
**Storage**: Local PostgreSQL database for subjects, sessions, and session_days  
**Testing/Validation**: Manual validation with fixture imports, row-count checks, sampled source
to database comparisons, and rerun idempotency verification; automated tests optional later  
**Target Platform**: Local Linux/macOS development shell via Nix; read access to mounted shared
BOOST data directory  
**Project Type**: Single-project data-ingestion utility supporting the report pipeline  
**Performance Goals**: Import the full derivatives tree in one run without manual file
selection; keep reruns practical for iterative analyst workflows  
**Constraints**: Read-only access to `/mnt/lss/Projects/BOOST/.../GGIR-3.2.6`; no writes to
shared servers; support duplicate-safe reruns; extend `flake.nix` for Python and PostgreSQL
tooling as needed  
**Scale/Scope**: One study-level derivatives tree containing many subjects, multiple sessions per
subject, and one session-day record per CSV row

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Plot scope is traced to an approved specification in `docs/plot-specs/act.md` because this
  ingestion feature prepares the actigraphy dataset used by those report plots; it introduces no
  new plot behavior.
- The TypeScript + D3 rule does not apply to this feature's shipped behavior because the scope is
  data ingestion rather than plot rendering. Future actigraphy plots remain bound to the
  TypeScript + D3 standard.
- Data access remains read-only against shared servers: the importer reads GGIR outputs from the
  mounted derivatives tree and writes only to a local project-managed PostgreSQL database.
- Validation evidence is defined as fixture imports, sampled source-to-database checks, import
  issue reporting, and duplicate-safe rerun verification without requiring a standing automated
  test suite.

## Project Structure

### Documentation (this feature)

```text
specs/001-extract-actigraphy-data/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── actigraphy-import-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
flake.nix
src/
├── act/
│   ├── __init__.py
│   ├── importer.py
│   ├── parser.py
│   ├── repository.py
│   └── schema.sql
└── cli/
    └── import_actigraphy.py

tests/
└── fixtures/
    └── actigraphy/
```

**Structure Decision**: Use a single-project Python ingestion layout under `src/` with a small
CLI entrypoint, feature-specific actigraphy import modules, and fixture-based validation assets.
`flake.nix` remains the environment entrypoint and will be extended for Python/PostgreSQL
development dependencies.

## Complexity Tracking

No constitution violations require justification. The feature adds a local PostgreSQL layer
because the spec requires traceable, duplicate-safe subject/session/day storage across reruns.
