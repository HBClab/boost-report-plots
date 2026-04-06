# Research: Accelerometer Time Series Plot (003-act-time-series)

**Phase**: 0 — Outline & Research
**Date**: 2026-04-03

## Decision 1: Storage and Retrieval Approach

**Decision**: Pre-compute hour-level ENMO statistics (mean, SD, N per session per group) during data import and store in a new `session_hourly_enmo` table.

**Rationale**:

| Factor | DB-stored aggregates | On-the-fly file reads |
|--------|----------------------|-----------------------|
| Data volume per render | ~384 rows (24 h × 4 sessions × 2 groups) | ~8 GB (10 MB × ~200 participants × 4 sessions) |
| Query latency | Sub-second | Minutes on cold NFS/LSS storage |
| Update frequency | Low — GGIR outputs finalized once per session | Always current but prohibitively slow at render time |
| Schema impact | Additive new table; `session_days` unchanged | No schema change |
| Maintenance cost | Re-run importer when source files change | None, but render time is unacceptable |

The decisive factor is render performance: ~8 GB of NFS file reads per plot render is unacceptable for a reporting tool. GGIR processing runs once per session; stale aggregates are not a material risk. The pre-computation cost is paid once at import time, not on every render.

**Alternatives considered**:
- On-the-fly reads from source files (Idea 2 in feature notes): rejected due to 10 MB × 200 participants file volume on NFS storage producing multi-minute render times.
- Storing raw epoch records in the DB (not proposed): rejected — epoch-level storage would bloat the DB with tens of millions of rows and still require aggregation at query time.
- Compressed blob attached to `session_days` (Idea 1 variant): rejected in favor of a clean separate table. Widening `session_days` with 24-row time series data per session conflates day-level and hour-level granularities.

---

## Decision 2: Aggregation Granularity and Method

**Decision**: Aggregate at import time to produce one row per `(group, session_number, hour)` with `enmo_mean`, `enmo_sd`, `n_participants`.

**Rationale**: The plot requires hour-level means and ±1 SD shading. Computing participant-level hourly means first, then deriving group-level statistics from those, correctly weights all participants equally regardless of their epoch count within a given hour.

**Procedure**:
1. For each source file matching the path pattern, extract `timestamp` and `ENMO` columns; discard `anglez`.
2. Parse `timestamp` to extract clock hour (0–23).
3. Compute per-participant mean ENMO for each hour (average across all epochs in that hour for that participant).
4. Aggregate across participants in the same `(group, session_number, hour)`: compute group mean, group SD (population or sample — sample SD using `N−1` denominator), and N.
5. Omit hours where a participant has no valid readings (non-wear); do not interpolate.
6. When N=1 for a session/hour, store SD as NULL — the plot will suppress the shaded band rather than render a zero-width artifact.

---

## Decision 3: M5/L5 Annotations for Per-Session Lines

**Decision**: Suppress M5/L5 annotations for individual per-session intervention lines. Retain the existing M5/L5 annotations on the single combined intervention mean if it is still shown, or suppress entirely if per-session lines replace the combined mean.

**Rationale**: Rendering 4 sets of M5/L5 annotations on a radial clock with 4 session lines and 1 observational line would produce severe visual clutter. The spec (FR-007) requires the chosen approach to be documented before implementation.

**Implementation note**: The combined intervention mean line is removed in favor of per-session lines (the feature replaces it). M5/L5 annotations are therefore suppressed entirely from the intervention side. The observational group line retains its existing M5/L5 annotations. This must be captured in the `docs/plot-specs/act.md` update.

---

## Decision 4: Per-Session Color/Dash Encoding

**Decision**: Use a sequential palette derived from the intervention teal (`#247F8F`), varying lightness/saturation across sessions, with consistent line weight (2.5px). Dash patterns may be used as an accessibility fallback but are not the primary differentiator.

**Rationale**: The spec requires lines to be "visually distinguishable at a glance" (SC-001). Color variation within the intervention teal family keeps the per-session lines visually related to the group identity while differentiating sessions. The exact palette will be finalized in the `docs/plot-specs/act.md` update.

**Candidate session palette** (to be confirmed in spec update):
| Session | Color |
|---------|-------|
| S1 | `#247F8F` (existing intervention teal) |
| S2 | `#3BA8BD` |
| S3 | `#6EC4D1` |
| S4 | `#A4DCE6` |

---

## Decision 5: Observational Group — No Per-Session Split

**Decision**: The observational group retains a single aggregated line (unchanged from existing Plot 3 behavior). No per-session split for the observational group.

**Rationale**: The feature spec explicitly states this (FR-003, Assumption 2). The observational group serves as the comparison baseline; per-session lines are specific to the intervention arm.

---

## Resolved Clarifications

| Item | Resolution |
|------|-----------|
| M5/L5 per session | Suppressed — see Decision 3 |
| Combined intervention mean | Replaced by per-session lines — the single aggregated intervention line is removed |
| SD when N=1 | NULL in DB, shading band omitted in plot |
| Missing hours (non-wear) | Excluded from mean/SD, line does not interpolate |
| Per-session N display | Shown in legend per session label (e.g., "Session 1 (n=178)") |
| `anglez` column | Discarded at parse time, not stored |
| Group field in DB | Stored as text: `'intervention'` / `'observational'` |
