# Feature Specification: Heart Rate Plots

**Feature Branch**: `004-hr-plots`  
**Created**: 2026-04-07  
**Status**: Draft  
**Input**: User description: "Initialize the newest spec using feat/hr-plots.md, which directs the project to build the heart rate plots from docs/plot-specs/hr.md using data/zone_out.csv and to change the individual adherence heatmap so weekly adherence requires at least 75% of that week's sessions to meet adherence while matching subjects across supervised and unsupervised views."

## User Scenarios & Validation *(mandatory)*

### User Story 1 - Review Weekly Zone Time by Group (Priority: P1)

A researcher opens the heart rate dashboard and compares how supervised and unsupervised sessions allocate time below, inside, and above the target heart rate zone for each study week.

**Why this priority**: This is the primary summary view for understanding whether each group is spending session time in the intended training range across the six-week study.

**Independent Validation**: Can be verified by rendering the weekly group chart from `zone_out.csv` and manually checking one selected week per group against a hand-calculated mean of the source rows for below-zone, in-zone, and above-zone time.

**Acceptance Scenarios**:

1. **Given** source rows exist for supervised and unsupervised sessions across study weeks, **When** the dashboard loads, **Then** it shows one weekly cluster for each of the six weeks with separate group bars that summarize mean time below zone, in zone, and above zone.
2. **Given** a researcher inspects any weekly bar, **When** the chart is compared to the source specification, **Then** the bar segments, legend labels, titles, and weekly labels match the documented heart rate plot design.

---

### User Story 2 - Review Weekly Adherence Trends (Priority: P2)

A researcher reviews weekly adherence rates for supervised and unsupervised sessions to see how often participants met the bounded adherence criterion over the course of the study.

**Why this priority**: The weekly adherence trend is the clearest group-level measure of whether participants are consistently meeting the heart rate training target.

**Independent Validation**: Can be verified by computing weekly adherence rates from the source data, confirming that the rendered weekly rates match those calculations, and confirming that the confidence band stays within the valid 0% to 100% range.

**Acceptance Scenarios**:

1. **Given** session-level adherence values are present in the source data, **When** the dashboard renders the adherence trend, **Then** it shows one weekly adherence series for supervised sessions and one for unsupervised sessions over study weeks 1 through 6.
2. **Given** some participants have multiple sessions in the same week, **When** weekly adherence is summarized for the group trend, **Then** each week's rate reflects the share of sessions in that week that met the adherence criterion.

---

### User Story 3 - Compare Individual Weekly Adherence Consistently Across Groups (Priority: P3)

A researcher inspects the individual adherence heatmap and sees subject-level weekly adherence status computed with the requested 75% weekly threshold, using a subject roster that stays aligned across supervised and unsupervised views so differences are directly comparable.

**Why this priority**: The requested modification changes the meaning of the heatmap and ensures that cross-group comparisons are not distorted by mismatched subject ordering or missing rows.

**Independent Validation**: Can be verified by selecting subjects with multiple sessions in a week, confirming that a weekly cell is marked as met only when at least 75% of that subject's sessions in that week met adherence, and confirming that the same subject appears in the same relative row position across supervised and unsupervised heatmap views with explicit no-data cells where applicable.

**Acceptance Scenarios**:

1. **Given** a subject has four sessions in a week and three meet adherence, **When** the weekly heatmap value is derived, **Then** that week is shown as met for that subject because at least 75% of sessions met adherence.
2. **Given** a subject has four sessions in a week and only two meet adherence, **When** the weekly heatmap value is derived, **Then** that week is shown as not met for that subject.
3. **Given** a subject appears in supervised data but not unsupervised data for a given week or view, **When** the aligned heatmaps render, **Then** the subject still occupies the matched row and the missing side is shown as no data rather than removing the subject from the comparison.

### Edge Cases

- A subject has sessions in a week but none are usable for adherence summarization; that subject-week is shown as no data rather than counted as not met.
- A subject has fewer than four weekly sessions; the 75% rule is applied to the actual number of available sessions for that week.
- A week contains no rows for one group; the dashboard preserves the weekly position and indicates that the group has no data for that week.
- The supervised and unsupervised subject sets do not fully overlap; the comparison view uses the union of relevant subjects and marks absent group-week combinations as no data.
- A weekly adherence summary produces a rate or spread outside valid bounds due to sparse data; displayed values are constrained to the valid percentage range.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The feature MUST produce the heart rate dashboard defined by the project heart rate plot specification using `zone_out.csv` as the source dataset named in the feature brief.
- **FR-002**: The dashboard MUST include a weekly group comparison plot that summarizes mean time spent below the target zone, in the target zone, and above the target zone for supervised and unsupervised sessions across study weeks 1 through 6.
- **FR-003**: The weekly group comparison plot MUST preserve the week-by-week grouping, segment categories, labels, legends, and visual distinctions between supervised and unsupervised sessions described in the heart rate plot specification.
- **FR-004**: The dashboard MUST include a weekly adherence trend that reports, for each group and week, the proportion of sessions that met the bounded adherence criterion.
- **FR-005**: The weekly adherence trend MUST display a measure of week-level variation around each group trend so that researchers can compare consistency across weeks without reading raw session rows.
- **FR-006**: The dashboard MUST include an individual weekly adherence heatmap derived from weekly subject-level adherence summaries rather than raw single-session adherence values.
- **FR-007**: For the individual adherence heatmap, a subject-week MUST be marked as adherent only when at least 75% of that subject's sessions in that week met adherence.
- **FR-008**: For the individual adherence heatmap, a subject-week MUST be marked as not adherent when the subject has weekly session data but fewer than 75% of sessions in that week met adherence.
- **FR-009**: For the individual adherence heatmap, a subject-week with no available session data MUST be shown as no data.
- **FR-010**: The individual adherence comparison MUST match subjects across supervised and unsupervised views using a consistent subject roster and row ordering so that the same subject can be compared directly across views.
- **FR-011**: When a subject is present in one group view but absent in the other, the dashboard MUST preserve the subject's aligned row and show the missing side as no data.
- **FR-012**: The dashboard MUST cover all six study weeks in both the group-level and individual-level views, even when a specific group or subject has missing data for a week.
- **FR-013**: The feature specification for this repository MUST state the validation evidence required to prove plot correctness and MUST NOT require automated tests because the feature brief does not explicitly call for them.

### Key Entities *(include if feature involves data)*

- **Session Record**: A single observed exercise session for one subject in one study week, including time spent below zone, in zone, above zone, and whether bounded adherence was met.
- **Weekly Group Summary**: A derived weekly summary for one group that combines its session records into average zone-time values and an overall adherence rate for that week.
- **Weekly Subject Adherence Summary**: A derived subject-week result that classifies the subject as met, not met, or no data based on whether at least 75% of that week's sessions met adherence.
- **Aligned Subject Roster**: The ordered set of subjects used to keep supervised and unsupervised individual views directly comparable, including subjects who are missing from one side.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Researchers can verify one selected week for each group in the zone-time chart against hand calculations from the source data with no unexplained discrepancy in segment totals or category assignment.
- **SC-002**: For every displayed week, the group adherence trend reports values within the valid 0% to 100% range, and all displayed variation bands remain within that same range after any clipping needed for display.
- **SC-003**: In a manual review sample of at least five subject-weeks with multiple sessions, the heatmap's met or not-met classification matches the 75% weekly threshold calculation for every sampled subject-week.
- **SC-004**: In a manual review sample of subjects that are missing from one comparison side, each sampled subject appears in a consistent row position across supervised and unsupervised views, with missing values shown as no data rather than omitted.
- **SC-005**: A reviewer can compare the finished dashboard to the heart rate plot specification and confirm that all required plot sections, titles, legends, week labels, and data states are present in a single render pass.

## Assumptions

- The source plot document is the authoritative definition of the heart rate dashboard layout and required views unless the feature brief explicitly overrides it.
- The bounded adherence field in the source data is the input used to determine whether an individual session met adherence.
- The requested 75% threshold applies only to the individual weekly adherence heatmap modification and does not change how the group-level adherence trend counts session-level adherence.
- Subjects can appear in supervised data, unsupervised data, or both, so aligned individual comparison requires a combined subject roster.
- Manual validation against the source data and plot specification is sufficient acceptance evidence for this feature because the request does not call for automated testing.
