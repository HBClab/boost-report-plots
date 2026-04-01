# Quickstart: Extract Actigraphy Data

## Purpose

Validate the first actigraphy import workflow end to end using a local PostgreSQL database and a
fixture-sized subset of the GGIR derivatives tree before running against the full study data.

## Prerequisites

1. Enter the project development shell.
2. Ensure the environment includes Python tooling and PostgreSQL client/server tools.
3. Confirm read access to the approved GGIR derivatives root:
   `/mnt/lss/Projects/BOOST/InterventionStudy/3-experiment/data/act-int-final-test-2/derivatives/GGIR-3.2.6`
4. Start or connect to a local PostgreSQL instance for the project dataset.
5. The importer defaults to the hardcoded derivatives root in `src/act/importer.py`; change that
   constant or pass `--root` to load a different study tree with the same structure below
   `derivatives/`.

## Validation Flow

1. Prepare a small fixture subtree containing one or more `part5_daysummary_MM_*.csv` files
   across at least two subjects and multiple sessions.
   Each CSV must include the current required columns:
   `weekday`, `calendar_date`, `nonwear_perc_day`, `dur_spt_min`,
   `dur_day_total_IN_min`, `dur_day_total_LIG_min`, `dur_day_total_MOD_min`,
   and `dur_day_total_VIG_min`.
2. Initialize the local schema for `subjects`, `sessions`, and `session_days`.
   Example: `python3 -m src.cli.import_actigraphy init-db --db-url postgresql:///boost_actigraphy`
3. Run the actigraphy import workflow against the fixture subtree.
   Example:
   `python3 -m src.cli.import_actigraphy import --init-db --root tests/fixtures/actigraphy --db-url postgresql:///boost_actigraphy`
4. Verify the run summary reports all matched files as imported or flagged with an explicit
   issue.
5. Query the local dataset and confirm:
   - subject/session/day uniqueness is preserved
   - required metrics are present
   - `nonwear_minutes` was derived from the source percentage
   - the persisted `session_days` schema matches the current canonical fields and no longer
     includes the removed wake-vigorous metric
   - each day row retains its source file lineage
6. Re-run the same import and confirm stored subject/session/day counts do not increase unless
   the fixture data changed.

## Suggested Manual Checks

- Compare at least five imported day rows against source CSV values.
- Confirm one invalid fixture row is rejected with a readable issue message.
- Confirm one duplicate rerun updates or preserves the canonical local row instead of creating a
  second copy.
- Record matched file count, imported row count, and rejected row count for planning sign-off.

## Validation Notes

- The fixture tree under `tests/fixtures/actigraphy/` is expected to match 3 files.
- A successful fixture import should load 3 valid rows and report 1 rejected row from the invalid
  fixture file with the blank `calendar_date`.
- Re-running the same fixture import should keep the `subjects`, `sessions`, and `session_days`
  counts stable.

## Observed Validation Results

- Validation run date: 2026-03-31
- Environment: `nix develop` with a temporary local PostgreSQL 17 instance
- First fixture import result:
  - matched files: 3
  - imported rows: 3
  - refreshed rows: 0
  - skipped rows: 1
  - subjects: 2
  - sessions: 2
  - session_days: 3
- Second fixture import result:
  - matched files: 3
  - imported rows: 0
  - refreshed rows: 3
  - skipped rows: 1
  - subjects: 2
  - sessions: 2
  - session_days: 3
- Observed rejected row:
  - `tests/fixtures/actigraphy/sub-3003/accel/ses-1/output_ses-1/results/part5_daysummary_MM_invalid.csv`
    was rejected because `calendar_date` was blank
