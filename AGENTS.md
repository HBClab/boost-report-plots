# report-2 Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-07

## Active Technologies
- TypeScript 5.x (browser + local server) + D3 v7, Express, esbuild (004-hr-plots)
- Repository CSV file `data/zone_out.csv`, served read-only by the local app (004-hr-plots)

- Python 3.12 for ingestion tooling; SQL for local schema and migrations + Standard-library CSV/path handling, PostgreSQL driver, lightweight (001-extract-actigraphy-data)

## Project Structure

```text
src/
tests/
```

## Commands

- `nix develop`
- `python -m src.cli.import_actigraphy --help`
- `pytest` (if automated tests are added during implementation)

## Code Style

Python 3.12 for ingestion tooling; SQL for local schema and migrations: Follow standard Python
and SQL conventions with clear module boundaries and explicit data validation.

## Recent Changes
- 004-hr-plots: Added TypeScript 5.x (browser + local server) + D3 v7, Express, esbuild

- 001-extract-actigraphy-data: Added Python 3.12 for ingestion tooling; SQL for local schema and migrations + Standard-library CSV/path handling, PostgreSQL driver, lightweight

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
