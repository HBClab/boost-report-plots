# Research: Heart Rate Plots (004-hr-plots)

**Phase**: 0 — Outline & Research  
**Date**: 2026-04-07

## Decision 1: Delivery Surface and Data Access

**Decision**: Implement the HR dashboard as a dedicated local TypeScript + D3 web app under `plots/hr/`, with a minimal local server that serves static assets and exposes `data/zone_out.csv` read-only.

**Rationale**:

- The constitution requires shipped plot behavior to use TypeScript + D3.
- The source data is already a repository CSV, so introducing a database or server-side aggregation layer would add complexity without user value.
- A tiny local server is still useful for browser-based development, CSV loading, and SVG export without changing the source dataset.

**Alternatives considered**:

- Extend the existing Python tooling to render plots directly: rejected because shipped plot behavior must use TypeScript + D3.
- Add a JSON API that parses and aggregates CSV server-side: rejected because the dataset is small enough to parse in-browser and the extra API surface is unnecessary for this feature.
- Precompute derived JSON files in the repository: rejected because it duplicates source-of-truth data and complicates refresh behavior.

---

## Decision 2: Week Scope

**Decision**: Restrict all dashboard views to weeks 1 through 6 even though `zone_out.csv` contains weeks 1 through 12.

**Rationale**:

- The approved HR plot document and feature spec both define a six-week dashboard.
- Expanding the dashboard to 12 weeks would materially change chart layout, labeling density, and the meaning of the comparison views.
- The extra weeks are best treated as out of scope until the plot specification is deliberately revised.

**Alternatives considered**:

- Render all 12 weeks automatically: rejected because it would violate the current approved plot contract.
- Collapse later weeks into an "other" bucket: rejected because it obscures the exact study-week meaning and is not described by the current feature spec.

---

## Decision 3: Weekly Heatmap Adherence Calculation

**Decision**: Compute the heatmap state from the ratio `met_sessions / total_sessions` for each subject-week, with `met` defined as a ratio greater than or equal to `0.75`.

**Rationale**:

- This implements the requested "at least 75% of sessions" rule directly and unambiguously.
- Ratio-based logic works correctly for varying weekly session counts from 1 to 6.
- It avoids arbitrary rounding rules and keeps manual validation straightforward.

**Examples**:

| Sessions met | Total sessions | Ratio | Heatmap state |
|--------------|----------------|-------|---------------|
| 3 | 4 | 0.75 | Met |
| 2 | 4 | 0.50 | Not met |
| 4 | 5 | 0.80 | Met |
| 0 | 0 | N/A | No data |

**Alternatives considered**:

- Require at least 4 sessions per week before classifying: rejected because the feature request does not impose a minimum session count.
- Round the required met-session count instead of using a ratio: rejected because it is harder to explain and validate for weeks with 3 or 5 sessions.

---

## Decision 4: Subject Alignment Strategy

**Decision**: Build the individual comparison from the union of supervised and unsupervised subjects observed in weeks 1 through 6, sorted alphabetically by subject ID, and render aligned supervised and unsupervised heatmaps side by side using that shared roster.

**Rationale**:

- The dataset contains 40 overlapping subjects and 10 additional supervised-only subjects, so alignment cannot rely on exact overlap alone.
- A shared union roster preserves a stable row index for direct comparison while making missing values explicit.
- Alphabetical ordering is deterministic, easy to validate manually, and consistent with the original plot document's subject sorting guidance.

**Alternatives considered**:

- Use only overlapping subjects: rejected because it would hide supervised-only subjects and silently drop available data.
- Sort by adherence rate or completeness: rejected because it would make cross-view alignment harder to verify and more sensitive to minor data changes.

---

## Decision 5: Plot Specification Update Requirement

**Decision**: Treat the HR plot document update as a required pre-implementation task.

**Rationale**:

- The current document defines a single heatmap based on per-session `bounded_met` values.
- This feature introduces two material changes: weekly thresholded adherence and aligned supervised/unsupervised heatmaps.
- Under the constitution, those changes must be captured in the approved plot specification before implementation begins.

**Alternatives considered**:

- Implement the feature first and backfill the plot document later: rejected because it violates the project's governing workflow.

---

## Resolved Clarifications

| Item | Resolution |
|------|-----------|
| App architecture | Dedicated `plots/hr/` TypeScript + D3 web app |
| Data access pattern | Read-only CSV served locally; no database or write path |
| Week range | Weeks 1 through 6 only |
| Heatmap threshold | `met_sessions / total_sessions >= 0.75` |
| Roster alignment | Alphabetical union of supervised and unsupervised subjects |
| Missing group/subject weeks | Rendered as explicit no-data cells |
| Pre-implementation gate | Update `docs/plot-specs/hr.md` first |
