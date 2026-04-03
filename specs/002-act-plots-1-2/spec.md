# Feature Specification: Accelerometer Activity Plots 1 & 2

**Feature Branch**: `002-act-plots-1-2`
**Created**: 2026-04-02
**Status**: Draft
**Input**: Implement accelerometer activity visualization — Plot 1 (stacked proportional activity bar) and Plot 2 (participant × session heatmap) — using live data from the boost_actigraphy database, rendered with D3, split by participant group (Intervention vs Observational).

---

## User Scenarios & Validation *(mandatory)*

### User Story 1 - View Group-Level Activity Composition (Priority: P1)

A researcher opens the visualization tool and sees Plot 1: a horizontal 100% stacked bar chart showing how the average 24-hour day is divided across five activity categories (Sleep, Sedentary, Light, Moderate, Vigorous) for each day type (All Days, Weekdays, Weekends). Two separate instances of Plot 1 are rendered — one for the Intervention group and one for the Observational group — drawn from live database data.

**Why this priority**: This is the primary analytical output. It summarizes group-level activity patterns at a glance and is the highest-value deliverable for the study report.

**Independent Validation**: Can be verified by loading the visualization and confirming that three bars (All Days, Weekdays, Weekends) appear for each group, each bar spans the full width (100%), and the proportional breakdown matches values computed manually from the database (e.g., verify All Days proportions with a manual SQL average query against session_days).

**Acceptance Scenarios**:

1. **Given** the database contains session_days records for Intervention subjects (subject_code NOT starting with "7"), **When** the page loads, **Then** Plot 1 for the Intervention group renders three horizontal bars (All Days, Weekdays, Weekends) each spanning 100% across five colored segments (Sleep, Sedentary, Light, Moderate, Vigorous).
2. **Given** the database contains session_days records for Observational subjects (subject_code starting with "7"), **When** the page loads, **Then** Plot 1 for the Observational group renders similarly with data from Observational subjects only.
3. **Given** a bar segment is wider than 44px, **When** rendered, **Then** the percentage label is displayed centered within that segment in white text.
4. **Given** a user hovers over any segment, **When** hovering, **Then** a tooltip displays the activity category name, the raw mean minutes, and the percentage of the day.

---

### User Story 2 - View Individual-Level Session Heatmap for Intervention Group (Priority: P2)

A researcher views Plot 2: a side-by-side participant heatmap showing sedentary time and MVPA across up to four sessions for Intervention participants, sorted by change in sedentary time. Each participant row is color-coded by value intensity; a delta column between the two panels indicates direction and magnitude of change between first and last available session.

**Why this priority**: Plot 2 reveals individual variation and longitudinal change — key for evaluating intervention effectiveness. It is only meaningful for the Intervention group since Observational participants have only one session.

**Independent Validation**: Can be verified by confirming the number of participant rows matches the count of Intervention subjects in the database, that rows are sorted by sedentary change (descending delta), and that color intensity visually corresponds to higher/lower sedentary or MVPA values.

**Acceptance Scenarios**:

1. **Given** Intervention subjects have records across multiple sessions, **When** Plot 2 renders, **Then** each Intervention participant appears as a row with up to four session columns in both the Sedentary and MVPA panels.
2. **Given** rows are sorted by Δ sedentary (last available session minus first session), **When** rendered, **Then** participants with the greatest decrease in sedentary time appear at the top and those with the greatest increase appear at the bottom.
3. **Given** a participant has fewer than four sessions, **When** rendered, **Then** missing session cells appear in the neutral color (`#E0E0E8`) rather than being omitted.
4. **Given** the delta column is rendered, **When** viewed, **Then** each row displays a triangle marker (▲ for sedentary decrease, ▼ for increase) with height scaled proportionally to the magnitude of change.

---

### User Story 3 - Save the Visualization Output (Priority: P3)

A researcher who has reviewed the charts wants to export them for inclusion in the study report. A "Save SVG" button is present on the page and triggers a download of the rendered visualization canvas.

**Why this priority**: The output must be report-ready. Save functionality enables direct use of the rendered charts without manual screenshotting.

**Independent Validation**: Can be verified by clicking the Save SVG button and confirming that a valid SVG file is downloaded that, when opened in a vector graphics tool, accurately reproduces the on-screen charts.

**Acceptance Scenarios**:

1. **Given** charts are rendered on the page, **When** the user clicks "Save SVG", **Then** an SVG file is downloaded containing the rendered plots in their current state.
2. **Given** the downloaded SVG is opened in a vector graphics viewer, **When** inspected, **Then** all text, colors, and layout match the on-screen rendering within the 1440×1024px canvas specification.

---

### Edge Cases

- What happens when a subject has data for only one day type (e.g., no weekend days recorded)? The missing day-type bar is omitted from Plot 1 rather than shown as a zero bar.
- What happens when a session_days row sums to zero total minutes across all five activity columns? That row is excluded from aggregation to avoid distorting proportions.
- What happens when a participant has only one session (so Δ sedentary cannot be computed)? A delta of 0 is assigned and such participants are placed at the neutral sort position in Plot 2.
- What happens when subject_code does not start with "7" but is not a recognized Intervention code pattern? All non-"7xxx" subject codes are treated as Intervention.
- What happens when session numbers beyond 4 exist in the data (sessions 5–8 are present)? Sessions beyond 4 are excluded from Plot 2; Plot 1 uses all sessions regardless of number.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The visualization MUST render Plot 1 as two separate instances — one for the Intervention group and one for the Observational group.
- **FR-002**: Each Plot 1 instance MUST display three horizontal bars: All Days, Weekdays, and Weekends, computed as per-group averages across all session_days records for that group.
- **FR-003**: Each Plot 1 bar MUST represent the proportion of the full 24-hour day across five segments (Sleep, Sedentary, Light, Moderate, Vigorous), normalized so each bar totals 100%.
- **FR-004**: Plot 1 MUST display inline percentage labels within segments wider than 44px, in white Semi Bold text centered in the segment.
- **FR-005**: Plot 1 MUST display a tooltip on segment hover showing: activity category name, mean raw minutes, and percentage of day.
- **FR-006**: Plot 1 MUST use the exact segment colors: Sleep `#4A5568`, Sedentary `#6B7890`, Light `#8CC299`, Moderate `#FCBA42`, Vigorous `#DE4545`.
- **FR-007**: Plot 1 MUST include a five-item legend below the bars with colored squares labeled Sleep, Sedentary, Light, Moderate, Vigorous.
- **FR-008**: Plot 2 MUST be rendered for the Intervention group only; Observational subjects MUST be excluded from Plot 2.
- **FR-009**: Plot 2 MUST display two side-by-side heatmap panels (Sedentary left, MVPA right) with a delta column between them.
- **FR-010**: Plot 2 MUST sort participant rows by Δ sedentary (last available session minus first session), descending — greatest decrease at top.
- **FR-011**: Plot 2 MUST show up to four session columns per panel; cells for missing sessions MUST render in neutral color `#E0E0E8`.
- **FR-012**: Plot 2 delta column MUST display directional triangle markers (▲ for sedentary decrease, ▼ for increase) with height scaled to the magnitude of change.
- **FR-013**: Plot 2 MUST use color scales: Sedentary panel `#E0E0E8` (low) → `#6B7890` (high); MVPA panel `#E0E0E8` (low) → `#247F8F` (high).
- **FR-014**: All activity data MUST be sourced from the boost_actigraphy PostgreSQL database (subjects, sessions, session_days tables) — no hardcoded or simulated data in the production render path.
- **FR-015**: Group membership MUST be derived from subject_code: codes beginning with "7" are Observational; all others are Intervention.
- **FR-016**: The visualization MUST be viewable via a local development server accessible in a web browser without additional configuration beyond starting the server.
- **FR-017**: The visualization page MUST include a "Save SVG" button that downloads the rendered canvas as an SVG file.
- **FR-018**: The overall canvas layout MUST conform to the 1440×1024px frame with background `#F7F7F9`, white plot cards with 12px corner radius, and 24px internal padding as defined in the visual specification.
- **FR-019**: The database column `sleep_minutes` maps to the sleep segment; `sedentary_minutes` to sedentary; `light_pa_minutes` to light; `moderate_pa_minutes` to moderate; `vigorous_pa_minutes` to vigorous; `mvpa_minutes` to MVPA in Plot 2.

### Key Entities

- **Subject**: A study participant identified by `subject_code`. Group is derived from subject code prefix ("7xxx" = Observational; all others = Intervention).
- **Session**: A discrete accelerometer wear period for a subject, numbered 1–N. Intervention subjects may have up to 4 sessions used for visualization; Observational subjects have 1 session.
- **Session Day**: A single calendar day within a session with per-day activity minutes: sleep, sedentary, light PA, moderate PA, vigorous PA, MVPA, and non-wear. The `weekday` field classifies days as weekday (Mon–Fri) or weekend (Sat–Sun).
- **Day-Type Aggregate**: A computed (not stored) per-group average of session_days by day type (All Days / Weekdays / Weekends). Input to Plot 1.
- **Participant Session Summary**: A computed (not stored) per-subject per-session average of sedentary and MVPA minutes. Input to Plot 2.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Both Plot 1 instances (Intervention and Observational) render within 3 seconds of page load against the full dataset (335 subjects, ~3,800 session-days).
- **SC-002**: All five activity segments in each Plot 1 bar sum to 100% with no visible gaps or overlaps at segment boundaries.
- **SC-003**: Plot 2 displays a number of participant rows exactly equal to the count of Intervention subjects with at least one session in the database, verifiable by database query.
- **SC-004**: Plot 1 proportional values match manually computed values from a direct database query within a 0.1 percentage-point tolerance for each segment and day type.
- **SC-005**: Plot 2 row order matches the expected sort (by Δ sedentary) when verified by comparing the rendered sequence against an independently computed sort from the database.
- **SC-006**: The downloaded SVG opens without error in at least one standard vector graphics viewer and visually matches the on-screen rendering.
- **SC-007**: A researcher can open the visualization in a browser with no errors by following a single documented startup step (e.g., starting the local server).

---

## Assumptions

- Weekday classification is based on the `weekday` column in `session_days`: Saturday and Sunday are Weekends; Monday–Friday are Weekdays.
- Group membership is stable and fully determined by `subject_code` prefix: "7xxx" = Observational, all others = Intervention.
- Observational subjects are excluded entirely from Plot 2; no placeholder or partial row is shown for them in that plot.
- Session numbers beyond 4 (sessions 5–8 observed in the data) are excluded from Plot 2, which shows sessions 1–4 only per the visual specification. All sessions contribute to Plot 1 averages.
- No wear-quality filtering (e.g., excluding high-nonwear days) is applied within this feature; upstream data preparation is assumed to have handled quality control.
- The `mvpa_minutes` column is the direct source for MVPA in Plot 2; it is not re-computed as moderate + vigorous.
- The two Plot 1 instances (Intervention and Observational) are rendered as labeled sections on the same page — the exact layout relationship between them (side-by-side vs. stacked) is a planning-phase decision.
- The local server serves both the front-end visualization and a lightweight backend endpoint that queries the database and returns aggregated data, consistent with D3's data-from-server pattern.
