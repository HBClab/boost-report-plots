# Data Model: Accelerometer Time Series Plot (003-act-time-series)

**Phase**: 1 — Design & Contracts
**Date**: 2026-04-03

---

## Entities

### 1. Session Hourly ENMO Summary (`session_hourly_enmo`)

The primary new entity. One row per `(group, session_number, hour)`. Produced by the importer from GGIR source files; consumed by the Express server to serve Plot 3 data.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `BIGSERIAL` | PK | Surrogate key |
| `group` | `TEXT` | NOT NULL, CHECK IN ('intervention','observational') | Participant group |
| `session_number` | `SMALLINT` | NOT NULL, CHECK > 0 | Session number (1–4) |
| `hour` | `SMALLINT` | NOT NULL, CHECK 0–23 | Clock hour (0 = 00:00–00:59) |
| `enmo_mean` | `DOUBLE PRECISION` | NOT NULL | Group mean ENMO (mg) across participants, computed from participant-level hourly means |
| `enmo_sd` | `DOUBLE PRECISION` | NULL | Sample SD of participant-level hourly means (NULL when `n_participants` = 1) |
| `n_participants` | `INTEGER` | NOT NULL, CHECK > 0 | Number of participants contributing to this hour/session |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() | Import timestamp |

**Unique constraint**: `(group, session_number, hour)` — one summary row per combination.

**SQL DDL** (additive, goes in `src/act/schema.sql`):

```sql
CREATE TABLE IF NOT EXISTS session_hourly_enmo (
    id BIGSERIAL PRIMARY KEY,
    "group" TEXT NOT NULL CHECK ("group" IN ('intervention', 'observational')),
    session_number SMALLINT NOT NULL CHECK (session_number > 0),
    hour SMALLINT NOT NULL CHECK (hour >= 0 AND hour <= 23),
    enmo_mean DOUBLE PRECISION NOT NULL,
    enmo_sd DOUBLE PRECISION,
    n_participants INTEGER NOT NULL CHECK (n_participants > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE ("group", session_number, hour)
);

CREATE INDEX IF NOT EXISTS idx_session_hourly_enmo_group_session
    ON session_hourly_enmo ("group", session_number);
```

**Relationships**: This table is independent of `session_days`. It does not reference `sessions` or `subjects` by FK — it holds group-level aggregates, not participant-level records.

---

### 2. GGIR Epoch Record (transient — never stored)

A single row from a GGIR output file. Used only during aggregation at import time.

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | `datetime` | Epoch timestamp; used to extract clock hour |
| `ENMO` | `float` | Acceleration in mg; the only stored value |
| `anglez` | `float` | **Discarded immediately** — not used in any computation |

**Source path pattern**:
```
/mnt/lss/Projects/BOOST/InterventionStudy/3-experiment/data/act-int-final-test-2/
  derivatives/GGIR-3.2.6/sub-****/accel/ses-*/output_ses-*/meta/csv/
  sub-****_ses-*_accel.csv.RData.csv
```

**Group and session** are parsed from the path segments (`sub-****` → participant ID mapped to group; `ses-*` → session number).

---

### 3. Participant × Session (derived, not stored as a new entity)

The mapping from participant to session is already implicit in the source file paths and in the existing `subjects` + `sessions` tables. The new aggregation code resolves group membership by matching `subject_code` from the path against the existing `subjects` table.

| Attribute | Source |
|-----------|--------|
| Participant ID | `sub-****` segment of source file path |
| Session number | `ses-*` segment of source file path |
| Group | Looked up from `subjects` table (or configuration if group is not yet in DB) |

---

## State Transitions

The `session_hourly_enmo` table is a snapshot, not an append-only log. When the importer runs for a given `(group, session_number)`:

1. Delete existing rows for that `(group, session_number)` (idempotent re-import).
2. Insert new computed rows.

This allows safe re-runs if source files are updated.

---

## Validation Rules

| Rule | Enforcement |
|------|-------------|
| `hour` in 0–23 | DB CHECK constraint |
| `group` is 'intervention' or 'observational' | DB CHECK constraint |
| `enmo_sd` NULL iff `n_participants` = 1 | Application logic in importer |
| `enmo_mean` > 0 for valid epochs | Soft — importer logs a warning but does not reject; ENMO may legitimately be near 0 during sleep |
| No row for hours with zero valid participants | Application logic — excluded during aggregation |
