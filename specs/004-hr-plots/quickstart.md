# Quickstart: Heart Rate Plots

**Branch**: `004-hr-plots`

## Prerequisites

- Dev shell active: `nix develop`
- Repository dataset present at `data/zone_out.csv`
- Node.js available in the dev shell

## First-Time Setup

```bash
cd plots/hr
npm install
```

## Run the Dashboard

```bash
cd plots/hr
npm run dev
```

Open `http://localhost:3000` in a browser.

The local server must serve:

- the HR dashboard page
- the browser bundle
- the read-only dataset route `/data/zone_out.csv`

## Validate Source Data Access

Confirm the dataset route is reachable:

```bash
curl -I http://localhost:3000/data/zone_out.csv
curl -s http://localhost:3000/data/zone_out.csv | head
```

Expected:

- `200 OK`
- CSV header includes `group,subject,week,session,...,bounded_met`

## Validate the Weekly Zone-Time Chart

1. Open the dashboard in the browser.
2. Confirm the grouped stacked bar chart shows weeks 1 through 6 only.
3. Pick one week for `Supervised` and one for `Unsupervised`.
4. Hand-calculate the mean `time_below_s`, `time_in_allowed_s`, and `time_above_s` values from the CSV for those group-week combinations.
5. Confirm the rendered segment sizes and labels match the manual calculations.
6. Record the exact group-week pairs checked and the three source means used for each check.

## Validate the Weekly Adherence Trend

1. Choose one group-week from weeks 1 through 6.
2. Count total session rows and rows with `bounded_met == true`.
3. Confirm the rendered adherence point matches `met_sessions / total_sessions`.
4. Confirm the displayed band stays within 0% to 100%.
5. Record the sampled group-week, session counts, computed rate, and the observed plotted value.

## Validate the Aligned Weekly Heatmaps

1. Pick at least five subject-weeks with multiple sessions.
2. For each sampled subject-week, compute `met_sessions / total_sessions`.
3. Confirm the weekly cell shows:
   - `Met` when the ratio is at least 0.75
   - `Not Met` when the ratio is below 0.75
   - `No Data` when there are no rows for that subject-week
4. Pick at least three subjects, including one supervised-only subject.
5. Confirm those subjects appear in the same row position across both heatmaps and that missing sides render as no data.
6. Record the sampled subject IDs, sampled weeks, computed ratios, and row positions for both panels.

## Adjust the Heatmap Threshold

The current weekly heatmap threshold is defined in:

`plots/hr/src/transforms.ts`

Look for:

```ts
export const HEATMAP_ADHERENCE_THRESHOLD = 0.75;
```

Change that value if you want the heatmap to classify weekly adherence using a different ratio threshold.

## Validate the SVG Export

1. Click the dashboard's **Save SVG** control.
2. Open the downloaded SVG in a browser or vector editor.
3. Confirm the exported file matches the on-screen dashboard layout, labels, and no-data states.
4. Record the export filename and whether any rendering mismatch was observed.

## Implementation Gate

Before starting code work, update `docs/plot-specs/hr.md` so it explicitly documents:

- the weekly 75% adherence threshold for the individual heatmap
- the aligned supervised and unsupervised heatmap layout
- any legend or layout changes required by that alignment

## Validation Notes

- 2026-04-07 implementation smoke checks:
- 2026-04-07 data-window normalization:
  - The dashboard maps each group's available six-week window into displayed weeks 1-6.
  - In the current dataset, `Supervised` weeks 1-6 and `Unsupervised` weeks 7-12 are normalized into the same displayed week slots for comparison.
- 2026-04-07 implementation smoke checks:
  - `npm install` completed in `plots/hr/`
  - `npm run build` completed successfully
  - Elevated runtime checks confirmed `GET /`, `GET /health`, and `GET /data/zone_out.csv`
- Final end-to-end visual validation in a browser should be logged here after reviewing chart rendering and SVG export interactively.
