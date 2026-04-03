# Contract: Actigraphy Import Workflow

## Purpose

Define the external behavior expected from the first actigraphy import workflow so downstream
planning and implementation share the same input, output, and idempotency rules.

## Invocation

- **Actor**: Report developer or analyst preparing actigraphy data for report generation
- **Trigger**: Run the actigraphy import workflow from the local project environment
- **Required input**:
  - A readable root path pointing to the approved GGIR derivatives directory
  - Access to a local PostgreSQL database configured for this project
- **Optional input**:
  - A narrowed source subtree for fixture-based validation runs

## Source Discovery Contract

- The workflow recursively searches from the provided root path.
- Only files matching the approved GGIR `MM` day-summary pattern are eligible for import.
- For every matched file, the workflow derives:
  - `subject_code` from the `sub-*` path component
  - `session_number` from the `ses-*` path component
  - `source_file` as the matched file path used for lineage

## Row Import Contract

For each eligible daily row in a matched file, the workflow must produce one canonical
session-day record containing:

- `subject_code`
- `session_number`
- `calendar_date`
- `weekday`
- `nonwear_minutes` derived from the source percentage
- `sleep_minutes`
- `sedentary_minutes`
- `light_pa_minutes`
- `moderate_pa_minutes`
- `vigorous_pa_minutes`
- `mvpa_minutes`
- `source_file`

The current parser requires these GGIR source columns in each matched CSV row:

- `weekday`
- `calendar_date`
- `nonwear_perc_day`
- `dur_spt_min`
- `dur_day_total_IN_min`
- `dur_day_total_LIG_min`
- `dur_day_total_MOD_min`
- `dur_day_total_VIG_min`

## Validation Contract

- Rows missing required columns, valid dates, usable subject/session metadata, or numeric metric
  values are rejected and reported as import issues.
- `nonwear_perc_day` must be convertible into minutes using the plan's agreed denominator.
- Every matched file must be accounted for after the run as fully imported, partially imported
  with issues, or rejected with issues.

## Idempotency Contract

- Re-running the import on the same source data must not create duplicate subject/session/day
  combinations.
- If a previously imported subject/session/day is encountered again, the workflow refreshes the
  canonical local record rather than appending a duplicate entry.

## Storage Contract

- The workflow writes only to the local project-managed PostgreSQL database.
- The canonical `session_days` record stores the imported sleep, sedentary, light, moderate,
  vigorous, and derived MVPA metrics; it does not persist the older wake-vigorous field that was
  removed from the required CSV inputs.
- The workflow never writes to the shared GGIR derivatives tree or other shared upstream
  locations.

## Run Result Contract

The workflow returns or logs a run summary containing at least:

- Matched file count
- Imported row count
- Skipped/rejected row count
- A list of import issues with enough detail to identify the source file and failure reason
