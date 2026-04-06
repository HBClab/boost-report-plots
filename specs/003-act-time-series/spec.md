# Feature Specification: Accelerometer Time Series Plot (Radial Clock, Per-Session Lines)

**Feature Branch**: `003-act-time-series`
**Created**: 2026-04-03
**Status**: Draft
**Input**: User description: "create new spec using @feat/act-time-series.md as initial specification"

## User Scenarios & Validation *(mandatory)*

### User Story 1 - View Per-Session Radial Clock (Priority: P1)

A researcher opens the accelerometer report and sees the radial activity clock (Plot 3) extended with one line per intervention session, instead of a single aggregated intervention line. This lets them compare whether intervention participants' activity patterns shifted across sessions — e.g., whether the S2 line peaks earlier or shows higher midday acceleration than S1.

**Why this priority**: This is the core deliverable. Without per-session lines the feature does not exist. It directly answers whether the intervention changed participants' circadian activity patterns over time.

**Independent Validation**: Can be verified by rendering the plot with fixture data containing known hour-level ENMO means for each session, then confirming that the correct number of lines appears (one per session present in the data), each drawn in the correct color/style, and that values at specific hours match the fixture.

**Acceptance Scenarios**:

1. **Given** intervention participants have data for sessions 1–4, **When** the plot renders, **Then** four distinct lines are drawn on the radial clock, each labeled "Session 1" through "Session 4", using visually distinguishable colors or dash patterns derived from the intervention palette.
2. **Given** a participant cohort where only sessions 1 and 2 have data (e.g., study still in progress), **When** the plot renders, **Then** only two lines appear — the plot adapts to however many sessions are present without manual configuration.
3. **Given** the observational group line is also present, **When** the plot renders, **Then** the observational group line (single, orange `#DE7833`) is visually distinct from all per-session intervention lines, maintaining the existing group-level comparison.

---

### User Story 2 - Understand Activity Variability Per Session (Priority: P2)

A researcher wants to see not just the mean ENMO per hour per session, but also spread (±1 SD shading) around each per-session line, so they can assess whether session-level differences exceed within-session variability.

**Why this priority**: Error bands are required by the feature spec and are essential for scientific interpretation. Without them, apparent session differences may not be meaningful.

**Independent Validation**: Can be verified with a fixture where SD values are known — confirm that the shaded region for a given session and hour extends exactly ±1 SD from the mean at that hour, with the polygon rendered at the correct opacity.

**Acceptance Scenarios**:

1. **Given** hour-level mean and SD values per session, **When** the plot renders, **Then** each per-session line has a filled ±1 SD shaded region at 20% opacity matching the line's color, consistent with the existing observational-group shading pattern.
2. **Given** a session where only one participant contributed data to a specific hour, **When** the plot renders, **Then** the SD band for that hour is omitted rather than rendered as a zero-width artifact, and the line still draws through that hour.

---

### User Story 3 - Recommendation on Data Retrieval and Storage (Priority: P3)

A developer or researcher reads a documented recommendation on whether to (a) store aggregated hour-level ENMO data in the database, or (b) compute it on-the-fly directly from the raw GGIR source files at request time, including the trade-offs of each.

**Why this priority**: Source files are large (~10 MB each, tens of thousands of rows). A bad storage/retrieval decision made early will cause performance or maintenance problems. The recommendation must be explicit and justified before implementation begins.

**Independent Validation**: Validated by the presence of a written recommendation section in this spec with a clear choice and rationale covering file size, query latency, DB schema impact, and update frequency.

**Acceptance Scenarios**:

1. **Given** the feature spec is complete, **When** a developer reads it, **Then** they find a recommendation identifying one approach as preferred, with explicit reasoning covering at least: data volume estimates, update/refresh frequency, query latency expectations, and schema complexity.
2. **Given** the recommendation favors DB storage, **When** a developer implements it, **Then** the schema change is additive (not destructive to existing `session_days` rows) and the stored aggregation captures hour-level mean and SD of ENMO per session.

---

### Edge Cases

- What happens when a participant has no valid ENMO readings for a specific hour in a session (e.g., non-wear period)? The hour should be excluded from that session's mean and SD computation; the radial line should not interpolate across missing hours.
- What happens when only one participant contributed data to a session? SD is undefined; the shaded band should be omitted for that session rather than rendered as a zero-width artifact.
- How does the plot handle sessions with very different participant counts (e.g., S1: 180 participants, S4: 40)? Lines are still shown, but the legend or a footnote must communicate per-session N so the reader can assess reliability.
- How does the system behave if a source GGIR file is missing or unreadable at retrieval time? The affected session's data is omitted from the plot with a visible warning rather than silently failing or crashing.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The radial clock plot MUST render one line per intervention session (S1–S4, or however many sessions are present), each visually distinguishable from the others and from the single observational group line.
- **FR-002**: Each per-session intervention line MUST have a filled ±1 SD shaded region at 20% opacity, computed from the participant-level ENMO values contributing to that session and hour.
- **FR-003**: The observational group line MUST remain as a single aggregated line (unchanged from existing Plot 3 behavior) to preserve the group-level comparison.
- **FR-004**: Data aggregation MUST use only the `ENMO` column from GGIR output files; the `anglez` column MUST be ignored entirely.
- **FR-005**: Hour-level means MUST be computed by grouping all per-epoch ENMO readings within each clock hour (00:00–00:59 → hour 0, etc.) across all participants in the session, then deriving group-level statistics from participant-level hourly means.
- **FR-006**: The legend MUST display each session line with its label (e.g., "Session 1", "Session 2") and the observational group line, and MUST include per-session participant N.
- **FR-007**: M5 and L5 annotations MUST either be computed and shown per session, or suppressed with a note — the chosen approach MUST be documented before implementation begins.
- **FR-008**: The system MUST locate source files using the path pattern: `/mnt/lss/Projects/BOOST/InterventionStudy/3-experiment/data/act-int-final-test-2/derivatives/GGIR-3.2.6/sub-****/accel/ses-*/output_ses-*/meta/csv/sub-****_ses-*_accel.csv.RData.csv`.
- **FR-009**: Feature specifications for this repository MUST state the validation evidence required to prove plot correctness, and MUST NOT require automated tests unless the feature explicitly calls for them. Validation evidence: render against fixture hour-level data with known means/SDs and confirm visual output matches expected values at sampled hours (e.g., hours 6, 12, 18).

### Key Entities

- **Session Hourly ENMO Summary**: Hour-level summary of ENMO for a given session. Key attributes: `session` (1–4), `hour` (0–23), `enmo_mean` (mg), `enmo_sd` (mg), `n_participants` (int).
- **GGIR Epoch Record**: A single row from a source `.csv.RData.csv` file representing one measurement epoch. Key attributes: `timestamp`, `ENMO`. Used only transiently during aggregation; `anglez` is discarded.
- **Participant × Session**: Pairing of a participant identifier and a session number. Defines which source files belong to which session for aggregation. Relationship: one participant may contribute to multiple sessions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The radial clock renders per-session intervention lines that are visually distinguishable at a glance — a researcher can identify which line corresponds to which session without consulting the legend, through consistent color or dash differentiation.
- **SC-002**: When given fixture data with pre-computed hour-level means and SDs, the plotted values at sampled hours (e.g., hours 6, 12, 18) match the fixture values within rounding tolerance (< 0.01 mg).
- **SC-003**: The plot renders within 5 seconds after data is available (whether from DB query or file read), for a full dataset of up to 200 participants × 4 sessions.
- **SC-004**: A developer reading the spec can identify the chosen storage/retrieval approach and understand the rationale without consulting external sources.
- **SC-005**: The per-session extension does not break the existing observational group line — both coexist correctly in the same radial coordinate space, verified by visual inspection against the existing Plot 3 output.

## Storage and Retrieval Recommendation

**Recommended approach: Pre-compute and store aggregated hour-level summaries in the database (Idea 1, adapted).**

Compute hour-level ENMO statistics (mean, SD, N) per session per group during data import and store them in a new table (e.g., `session_hourly_enmo`). Do not store raw epoch records in the DB.

| Factor | DB-stored aggregates | On-the-fly file reads |
|--------|----------------------|-----------------------|
| Data volume per render | ~192 rows (24 hours × 4 sessions × 2 groups) | ~8 GB (10 MB × 200 participants × 4 sessions) |
| Query latency | Sub-second | Minutes on cold storage |
| Update frequency | Low — GGIR outputs finalized per session | Always current but prohibitively slow |
| Schema impact | Additive new table; no change to `session_days` | No schema change |
| Maintenance | Re-run importer when source files change | Source files are always the source of truth |

The data update frequency is low (GGIR processing runs once per session), so the cost of maintaining a pre-computed table is minimal. The performance benefit of avoiding ~8 GB of file reads per render is decisive.

The new table should be separate from `session_days` to avoid widening that table with 24 rows × N sessions of time-series data.

## Assumptions

- Source GGIR `.csv.RData.csv` files are available and readable at the path pattern specified; the system does not need to handle GGIR re-processing.
- The intervention group has up to 4 sessions; the observational group is treated as a single aggregated group with no per-session split, consistent with existing Plot 3 behavior.
- M5/L5 annotations will be suppressed for individual per-session lines (to avoid visual clutter) and shown only for the combined intervention mean if retained — the implementer must confirm this before writing code.
- The radial clock canvas and coordinate system follow the existing Plot 3 layout specification (card x=740, y=375, w=640, h=610; center approximately x=1060, y=695; outer radius ~195px).
- The existing observational group line rendering is unchanged — only the intervention side gains per-session lines.
- Inter font and the shared color palette from `docs/plot-specs/act.md` apply to this plot extension.
- Mobile or print rendering is out of scope; target is the existing 1440×1024px desktop canvas.
- The existing Python importer pipeline (`src/`) will be extended to compute and store hour-level aggregates; the plot server (`plots/act/server/`) will serve them via a new JSON endpoint.
