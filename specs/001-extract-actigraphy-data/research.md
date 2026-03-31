# Research: Extract Actigraphy Data

## Decision 1: Use a local PostgreSQL database as the canonical import target

- **Decision**: Store imported actigraphy data in a local PostgreSQL database with normalized
  `subjects`, `sessions`, and `session_days` tables.
- **Rationale**: The feature requires duplicate-safe reruns, clear subject/session/day lineage,
  and queryable records for downstream plots. PostgreSQL gives strong uniqueness guarantees and a
  straightforward path for later aggregation work.
- **Alternatives considered**:
  - Flat CSV or JSON cache: easier to bootstrap, but weak for idempotent reruns and relational
    lookups.
  - SQLite: viable for local-only storage, but the feature request explicitly points toward a
    PostgreSQL database and future work may benefit from parity with larger relational workflows.

## Decision 2: Implement the importer in Python

- **Decision**: Build the ingestion workflow in Python and extend `flake.nix` to provide the
  required Python tooling alongside the existing environment.
- **Rationale**: The feature request explicitly references a main Python module for actigraphy
  work. Python has strong standard-library support for recursive file discovery and CSV parsing,
  which keeps the first ingestion pass simple.
- **Alternatives considered**:
  - Node.js: already present in the dev shell, but not aligned with the requested actigraphy
    module direction.
  - Shell-only pipeline: insufficient for normalization, validation, and durable import logic.

## Decision 3: Discover source files by recursive path matching from the approved derivatives root

- **Decision**: Traverse the approved GGIR derivatives directory recursively and ingest only files
  matching the expected `sub-*/accel/ses-*/output_ses-*/results/part5_daysummary_*.csv` pattern.
- **Rationale**: The source tree is nested by subject and session, and the feature requirement is
  to find files by tree search rather than maintain a hand-authored manifest.
- **Alternatives considered**:
  - Manual file lists: too error-prone for repeated analyst workflows.
  - Non-recursive directory assumptions: brittle if the upstream tree contains extra nesting or
    reprocessed outputs.

## Decision 4: Derive subject and session metadata from the matched path and validate against row content

- **Decision**: Treat subject code and session number as path-derived metadata captured during
  file discovery, then attach them to every imported day row.
- **Rationale**: The input requirement explicitly asks for subject and session logging even though
  they are not part of the listed extracted columns. The directory structure provides a stable
  source for that lineage.
- **Alternatives considered**:
  - Depend on row-level subject/session columns: not guaranteed by the current source column list.
  - Require a separate manifest: adds avoidable coordination overhead for the first feature.

## Decision 5: Convert nonwear percentage into minutes using a full-day baseline

- **Decision**: Multiply `nonwear_perc_day` by 1,440 minutes to derive stored nonwear minutes,
  with input validation for blank or out-of-range percentages.
- **Rationale**: The current feature artifacts require minute-based storage and do not define a
  waking-day or valid-wear-only denominator. The specification therefore uses the full day as the
  default baseline until later research artifacts define a different rule.
- **Alternatives considered**:
  - Store raw percentages only: does not satisfy the required normalized storage behavior.
  - Use a waking-day baseline: unsupported by the current input contract.

## Decision 6: Make reruns idempotent with natural uniqueness on subject/session/day

- **Decision**: Enforce one canonical `session_day` record per subject/session/calendar date and
  implement reruns as upsert-style refreshes rather than append-only imports.
- **Rationale**: The spec requires repeated imports without duplicates and needs stable lineage for
  auditing.
- **Alternatives considered**:
  - Append every run as a new snapshot: complicates downstream queries and violates duplicate-safe
    rerun behavior.
  - Delete and reload the entire database for every run: possible, but riskier and less efficient
    once additional data is present.
