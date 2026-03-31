# report-2 Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-31

## Active Technologies

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

- 001-extract-actigraphy-data: Added Python 3.12 for ingestion tooling; SQL for local schema and migrations + Standard-library CSV/path handling, PostgreSQL driver, lightweight

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
