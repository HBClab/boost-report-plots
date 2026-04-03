# Quickstart: Accelerometer Activity Plots 1 & 2

**Branch**: `002-act-plots-1-2`

## Prerequisites

- Nix shell active (`nix develop` from repo root) — provides Node.js, npm, PostgreSQL client
- Local PostgreSQL running (`bash scripts/start-local-db.sh` from repo root)

## First-Time Setup

```bash
cd plots/act
npm install
```

## Run (Development — auto-rebuild on changes)

From the repo root or from `plots/act/`:

```bash
bash plots/act/dev.sh
```

`dev.sh` computes the correct absolute socket path from the repo root and sets `ACTIGRAPHY_DB_URL` automatically before starting the server. **Do not set `ACTIGRAPHY_DB_URL` manually** — relative paths with `..` in them are not resolved by the PostgreSQL client.

Open `http://localhost:3000` in a browser.

## Run (Production build)

```bash
cd plots/act
npm run build       # bundles client, compiles server
# Then start with the correct env:
bash dev.sh         # still the simplest way to set ACTIGRAPHY_DB_URL
```

## Save SVG Output

Click the **Save SVG** button on the page. The file downloads to your default downloads folder.

## Validate Plot 1 — Activity Composition

After charts render, verify Plot 1 (Intervention, All Days) shows approximately:
- Sleep: **30.4%**
- Sedentary: **53.6%**
- Light: **10.3%**
- Moderate: **5.6%**
- Vigorous: **0.2%**

Tolerance: within **0.1 percentage points** of SQL reference values.

Run the reference SQL to get expected numbers:

```bash
psql "$ACTIGRAPHY_DB_URL" -f specs/002-act-plots-1-2/validate-plot1.sql
```

Compare each segment proportion: browser value must match SQL `(raw_min / total_min × 100)` within 0.1pp.

Also verify:
- Hovering a segment shows a tooltip with activity name, raw minutes, and percentage
- Segments wider than 44px display inline percentage labels in white
- Legend shows five items: Sleep, Sedentary, Light, Moderate, Vigorous

## Validate Plot 2 — Participant Heatmap

Run the reference SQL to check row count and sort order:

```bash
psql "$ACTIGRAPHY_DB_URL" -f specs/002-act-plots-1-2/validate-plot2.sql
```

Checklist:
1. **Row count**: First query result (`intervention_subject_count`) equals the number of participant rows rendered in Plot 2.
2. **Sort order**: The `subject_code` values with the most negative `delta_sed` in the second query result appear at the top of the browser's Plot 2.
3. **Missing sessions**: Subjects with fewer than 4 sessions show neutral-colored cells (`#E0E0E8`) for missing slots.
4. **Delta markers**: Subjects with decreasing sedentary time show teal ▲ markers; those with increasing sedentary time show orange ▼ markers.

## Validate Save SVG

1. Click the **Save SVG** button on the page.
2. The file `accelerometer-plots.svg` downloads to your default downloads folder.
3. Open the SVG in a browser (drag-and-drop) or a vector editor (Inkscape).
4. Confirm all three chart sections are visible: Plot 1 Intervention (top), Plot 1 Observational (lower-left), Plot 2 (lower-right).
5. Confirm text labels, colors, and segment proportions match the on-screen rendering.
