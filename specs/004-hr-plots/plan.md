# Implementation Plan: Heart Rate Plots

**Branch**: `004-hr-plots` | **Date**: 2026-04-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-hr-plots/spec.md`

## Summary

Implement the heart rate dashboard from `docs/plot-specs/hr.md` as a dedicated TypeScript + D3 web visualization that reads the repository dataset `data/zone_out.csv` in read-only mode. The app renders:

- a weekly grouped stacked bar chart for supervised vs unsupervised zone-time allocation
- a weekly adherence trend with group lines and bounded variability bands
- an aligned dual heatmap for supervised and unsupervised subject-week adherence using the feature-specific 75% weekly threshold

Because the feature changes the documented heatmap semantics from session-level `bounded_met` cells to weekly thresholded adherence and requires matched supervised/unsupervised subject alignment, the plot specification must be updated before implementation starts.

## Technical Context

**Language/Version**: TypeScript 5.x (browser + local server)  
**Primary Dependencies**: D3 v7, Express, esbuild  
**Storage**: Repository CSV file `data/zone_out.csv`, served read-only by the local app  
**Testing/Validation**: Manual visual verification against hand-calculated CSV reference values and subject-roster spot checks; no automated tests assumed by default  
**Target Platform**: Local Linux development server opened in a browser  
**Project Type**: Web visualization tool (local-only, no authentication, no persistence)  
**Performance Goals**: Full dashboard render within 3 seconds from the 1,910-row CSV on a local development machine  
**Constraints**: Shipped rendering must use TypeScript + D3; source data is read-only; only study weeks 1 through 6 are rendered even though the CSV also contains weeks 7 through 12; missing group/subject weeks must remain visible as no-data states  
**Scale/Scope**: 1,910 session rows total, 50 supervised subjects, 40 unsupervised subjects, 40 overlapping subjects, 10 supervised-only subjects, and 265 subject-week cells within weeks 1 through 6

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Plot Specification Fidelity | ⚠️ REQUIRES PRE-ACTION | `docs/plot-specs/hr.md` currently defines a single subject heatmap using raw `bounded_met` values. This feature changes the heatmap to weekly thresholded adherence and aligned supervised/unsupervised views. The HR plot spec MUST be updated before implementation begins. |
| II. TypeScript + D3 Implementation Standard | ✅ PASS | The delivered dashboard is planned as a dedicated TypeScript + D3 web app. |
| III. Read-Only Shared Data Access | ✅ PASS | The app reads `data/zone_out.csv` from the repository and performs no writes to shared systems or upstream data. |
| IV. Validation by Deliverable Evidence | ✅ PASS | Manual evidence is defined: CSV spot checks for weekly means, weekly adherence calculations, roster alignment checks, and SVG export review. |
| V. Incremental Data Contract Definition | ✅ PASS | The plan defines only the minimum CSV input contract and derived view models needed for the HR dashboard. |

**Constitution Violation — Principle I**: `docs/plot-specs/hr.md` must be amended before code implementation so the approved plot contract reflects the weekly 75% adherence rule and the aligned supervised/unsupervised heatmap layout.

**Post-design re-check**: Phase 1 design resolved the technical unknowns and added the required CSV/data contracts. Principle I remains the only open gate, and it is resolved only by updating `docs/plot-specs/hr.md` before implementation work begins.

## Project Structure

### Documentation (this feature)

```text
specs/004-hr-plots/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── input-data.md    # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created here)
```

### Source Code (repository root)

```text
plots/
└── hr/
    ├── package.json         # Node project for the HR dashboard
    ├── tsconfig.json        # TypeScript config for server + browser code
    ├── esbuild.config.ts    # Browser bundle build script
    ├── server/
    │   └── index.ts         # Local Express server serving static assets and read-only CSV
    ├── src/
    │   ├── main.ts          # App bootstrap, data loading, dashboard composition
    │   ├── types.ts         # CSV row and derived view-model types
    │   ├── transforms.ts    # Week filtering and aggregation logic
    │   ├── plot1.ts         # Zone-time allocation chart
    │   ├── plot2.ts         # Adherence trend + aligned dual heatmaps
    │   └── export-svg.ts    # Save SVG behavior
    └── public/
        ├── index.html       # Single-page host
        └── styles.css       # Dashboard styles
```

**Structure Decision**: Use a dedicated `plots/hr/` web application, parallel to the earlier plot-specific planning pattern, instead of extending the Python ingestion package. The local server exists only to serve the page bundle and expose the repository CSV as a read-only asset; all transformation and rendering logic stays in TypeScript + D3 in the browser.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| HR plot spec must be updated before code | Constitution Principle I requires approved plot semantics before implementation | Skipping the spec update would let the code diverge from the documented contract on weekly adherence logic and aligned heatmap layout |

## Implementation Notes

### Week Window

The source CSV contains weeks 1 through 12, but the approved dashboard scope remains weeks 1 through 6. Weeks 7 through 12 are excluded from all derived views in this feature unless the plot specification is later revised.

### Weekly Adherence Rule

For the individual heatmap only:

```text
weekly_adherence = met_sessions / total_sessions
met if weekly_adherence >= 0.75
not met if total_sessions > 0 and weekly_adherence < 0.75
no data if total_sessions == 0
```

This feature does not change the group-level adherence trend semantics from the current plot document: the trend still uses the share of sessions meeting adherence in each group-week.

### Aligned Subject Roster

The individual comparison uses the union of subjects observed in supervised or unsupervised data for weeks 1 through 6, sorted alphabetically by subject ID. This preserves deterministic row positions across both heatmaps:

- overlapping subjects populate both sides
- supervised-only subjects show data on the supervised side and no-data cells on the unsupervised side
- subjects absent in a given week retain their row and show a no-data cell for that week

### Variability Band

The group adherence trend continues to use per-subject weekly adherence rates to derive the week-level spread shown around each group line. Displayed band bounds are clipped to the valid 0% to 100% range.

### Validation Evidence

Manual validation evidence for implementation must include:

1. one spot-check week per group for zone-time segment means
2. at least five sampled subject-weeks showing the 75% threshold calculation
3. at least three sampled subjects verifying aligned row positions across supervised and unsupervised heatmaps
4. one exported SVG reviewed against the rendered browser output
