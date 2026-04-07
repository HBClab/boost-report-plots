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

## Validate the Weekly Adherence Trend

1. Choose one group-week from weeks 1 through 6.
2. Count total session rows and rows with `bounded_met == true`.
3. Confirm the rendered adherence point matches `met_sessions / total_sessions`.
4. Confirm the displayed band stays within 0% to 100%.

## Validate the Aligned Weekly Heatmaps

1. Pick at least five subject-weeks with multiple sessions.
2. For each sampled subject-week, compute `met_sessions / total_sessions`.
3. Confirm the weekly cell shows:
   - `Met` when the ratio is at least 0.75
   - `Not Met` when the ratio is below 0.75
   - `No Data` when there are no rows for that subject-week
4. Pick at least three subjects, including one supervised-only subject.
5. Confirm those subjects appear in the same row position across both heatmaps and that missing sides render as no data.

## Validate the SVG Export

1. Click the dashboard's **Save SVG** control.
2. Open the downloaded SVG in a browser or vector editor.
3. Confirm the exported file matches the on-screen dashboard layout, labels, and no-data states.

## Implementation Gate

Before starting code work, update `docs/plot-specs/hr.md` so it explicitly documents:

- the weekly 75% adherence threshold for the individual heatmap
- the aligned supervised and unsupervised heatmap layout
- any legend or layout changes required by that alignment
