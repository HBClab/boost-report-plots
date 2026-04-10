# D3 Plot Specification: HR Zone Analysis Dashboard

## Background & Data Context

These plots visualise heart rate (HR) zone adherence from a cardiac exercise study.
Participants wore HR monitors during sessions over 6 weeks. Each session's HR trace
(60 Hz readings) was summarised into the following zone-time metrics per row in the
source CSV (`zone_out.csv`):

| Field               | Type    | Description                                                                                         |
| ------------------- | ------- | --------------------------------------------------------------------------------------------------- |
| `group`             | string  | `"Supervised"` or `"Unsupervised"` — whether sessions were clinician-led                            |
| `subject`           | string  | Participant ID, e.g. `sub8000`                                                                      |
| `week`              | integer | Study week number. The source file may contain later weeks, but this dashboard renders weeks 1–6 only |
| `session`           | integer | Session number within the week; used to compute the weekly 75% adherence threshold in Panel B      |
| `time_in_allowed_s` | float   | Seconds with HR inside the target zone                                                              |
| `time_above_s`      | float   | Seconds with HR above the target zone                                                               |
| `time_below_s`      | float   | Seconds with HR below the target zone                                                               |
| `bounded_met`       | boolean | `true` if the subject maintained a sufficiently long continuous bout within zone; `false` otherwise |

The total session length is approximately 2401 seconds (40 minutes).
All time values are in seconds.

---

## Overall Layout

- Canvas: `1440 × 1024 px`, background `#fafafc`
- Two side-by-side white cards with `border-radius: 12px` and a subtle drop shadow
  (`box-shadow: 0 2px 16px rgba(0,0,0,0.07)`)
- Font: **Inter** throughout. Sizes: 14px bold titles, 10px regular subtitles,
  9px axis labels/legend, 8px heatmap labels
- Label colour: `#1a1a26` (titles), `#80808f` (all axis labels, subtitles, legend text)
- Grid line colour: `#e5e5ed`, 1px height

---

## Colour Tokens

```

BLUE (Supervised) #3378de 
ORANGE (Unsupervised) #f5802e 
GREEN (In Zone) #3bbd8c 
RED (Above) #f04545 
LIGHT_BLUE (Below) #8cb8f5 
GREY (No Data) #e5e5ed

```

---

## Plot 1 — Zone Time Allocation by Group & Week

### What it shows
A grouped stacked bar chart. For each of the 6 study weeks, two bars appear
side-by-side: one for Supervised sessions (blue group), one for Unsupervised
(orange group). Each bar is divided into three stacked segments representing the
mean seconds spent **below**, **in**, and **above** the HR target zone.

### Card dimensions
- Position: top-left of canvas, `x: 60, y: 50`
- Width: `620px`, Height: `380px`

### Chart area margins (inside the card)
- Left: `80px` (for y-axis labels)
- Top: `60px` (for title + subtitle)
- Right: `20px`
- Bottom: `80px` (for x-axis labels + legend)

### Data preparation
Aggregate `zone_out.csv` by `(group, week)`:
- Compute mean of `time_in_allowed_s`, `time_above_s`, `time_below_s` per group per week.
- Each bar therefore has exactly three stacked segments.

### Scales
- **y-axis**: linear, domain `[0, 2401]` (total session seconds), range `[chartHeight, 0]`
- **x-axis**: two nested levels
  - Outer: `scaleBand` over weeks 1–6, with `paddingOuter(0.1)` and `paddingInner(0.2)`
  - Inner: `scaleBand` over `["Supervised", "Unsupervised"]` within each week cluster,
    with `paddingInner(0.1)`

### Stacking
Use `d3.stack()` with keys `["time_below_s", "time_in_allowed_s", "time_above_s"]`
applied separately per group. Stack order bottom-to-top: below → in-zone → above.

### Bar colours
- `time_below_s` → `#8cb8f5` (light blue)
- `time_in_allowed_s` → `#3bbd8c` (green)
- `time_above_s` → `#f04545` (red)

### Grid lines
Horizontal lines at y = 0, 600, 1200, 1800, 2400 seconds.
Colour `#e5e5ed`, no tick marks, labels left-aligned at `chartLeft - 4px`.

### Axis labels
- y-axis title: `"Seconds"`, rotated -90°, positioned mid-chart-height, `14px` left of axis
- x-axis: week labels `"Wk 1"` … `"Wk 6"` centred on each cluster, `8px` below chart bottom

### Legend (bottom of card)
Five items in a horizontal row at `y = cardTop + cardHeight - 28`:
1. Green square → `"In Zone"`
2. Red square → `"Above"`
3. Light-blue square → `"Below"`
4. Blue square → `"Supervised"`
5. Orange square → `"Unsupervised"`

Each legend marker is a `10×10px` rectangle with `border-radius: 2px`, followed
by text `12px` to the right. Items spaced `90px` apart horizontally.

### Title block
- Title: `"Zone Time Allocation by Group & Week"`, `14px`, bold, `#1a1a26`
- Subtitle: `"Mean seconds per session · Supervised vs Unsupervised"`, `10px`, `#80808f`
- Both left-aligned, `8px` vertical gap, positioned `18px` from card top, starting
  at `chartLeft`

---

## Plot 2 — Session Intensity Trend Card

### What it shows
This card replaces the adherence line chart with a **single-chart card that supports two views**
using the same inline two-button toggle pattern already used elsewhere in the dashboard.

Available views:
1. **TRIMP** — weekly Edwards TRIMP comparison between Supervised and Unsupervised
2. **% HR Max** — weekly mean percent HR max comparison between Supervised and Unsupervised

Only one view is visible at a time. The card body, axes, legend placement, colours, and
overall geometry stay fixed while the metric-specific title, subtitle, y-scale, and tooltip
content update when the toggle changes.

### Source fields and naming
- `edwards_trimp` in `zone_out.csv` is the source for the **TRIMP** view
- `mean_hr_pct_max` in `zone_out.csv` is the source for the **% HR Max** view
- In UI copy, use reader-friendly labels:
  - `"TRIMP"` for `edwards_trimp`
  - `"% HR Max"` for `mean_hr_pct_max`

### Time-point handling
- The CSV contains Supervised weeks `1–6` and Unsupervised weeks `7–12`
- For this card, normalise each group to a shared displayed time axis of `Wk 1` to `Wk 6`
  so the two groups can be compared at matched time points
- Preserve the original row ordering only for aggregation; do not display `Wk 7–Wk 12`

### Card dimensions
- Position: `x: 723, y: 40`
- Width: `660px`, Height: `390px`

### Interaction model
- Top-right inline toggle inside the card header, matching the existing two-option slider/button logic
- Two options:
  - `"TRIMP"`
  - `"% HR Max"`
- Default view: `"TRIMP"`
- Toggle container styling should match the other dashboard cards that already expose two views:
  rounded outer container, two pill-like buttons, active state fill, inactive hover state

### Chart area margins
- Left: `70px`
- Right: `20px`
- Top: `60px`
- Bottom: `28px`

### Shared chart form
Both views use the same visual grammar:
- one `d3.line()` per group
- one `d3.area()` SD band per group
- one `r = 5px` point marker per week
- x-axis as matched weeks `Wk 1` … `Wk 6`
- legend in the top-right of the card body
- supervised in blue, unsupervised in orange

This should feel like the old adherence trend card, but with the metric swapped.

---

### View A — TRIMP

#### What it shows
Mean weekly training impulse per session for Supervised vs Unsupervised, with a shaded
±1 SD band computed from subject-level weekly means.

#### Data preparation
1. Filter to valid rows with non-empty `edwards_trimp`
2. Map each row onto a display week from `1–6` within its group
3. For each `(group, display_week, subject)`, compute the subject's weekly mean `edwards_trimp`
4. For each `(group, display_week)`:
   - `group_mean = mean(subject_weekly_means)` for the plotted line
   - `group_sd = sample_sd(subject_weekly_means)` for the shaded band
   - `session_count = count(rows)` for tooltip context
   - `subject_count = count(distinct subject)` for tooltip context

#### Observed data range in `zone_out.csv`
- Overall range: `0` to `14676`
- Group-week means run approximately `4901` to `6949`

#### Scales
- **x**: `scalePoint` over `[1, 2, 3, 4, 5, 6]`, range `[0, innerWidth]`, padding `0.1`
- **y**: linear, domain from `0` to a rounded headroom above the maximum `group_mean + group_sd`
- Recommended tick marks: every `2000` units when space permits
- y-axis labels should render as integers, no decimals

#### SD band
- `y0 = max(0, group_mean - group_sd)`
- `y1 = group_mean + group_sd`
- Fill with the corresponding group colour at `15% opacity`

#### Title block
- Title: `"Weekly TRIMP by Group"`
- Subtitle: `"Subject-level weekly mean per session · shaded band = ±1 SD"`

#### Tooltip
On point hover, show:
- group
- displayed week
- mean TRIMP for that group-week
- SD if available
- number of sessions contributing
- number of subjects contributing

Example copy:
`Supervised · Wk 3`
`Mean TRIMP: 5373`
`SD: 1637`
`201 sessions · 49 subjects`

---

### View B — % HR Max

#### What it shows
Mean weekly session intensity as percent of maximum heart rate for Supervised vs Unsupervised,
with a shaded ±1 SD band computed from subject-level weekly means.

#### Data preparation
1. Filter to valid rows with non-empty `mean_hr_pct_max`
2. Map each row onto a display week from `1–6` within its group
3. For each `(group, display_week, subject)`, compute the subject's weekly mean `mean_hr_pct_max`
4. For each `(group, display_week)`:
   - `group_mean = mean(subject_weekly_means)` for the plotted line
   - `group_sd = sample_sd(subject_weekly_means)` for the shaded band
   - `session_count = count(rows)` for tooltip context
   - `subject_count = count(distinct subject)` for tooltip context

#### Observed data range in `zone_out.csv`
- Overall range: `0.325` to `0.935`
- Group-week means run approximately `0.638` to `0.686`

#### Scales
- **x**: `scalePoint` over `[1, 2, 3, 4, 5, 6]`, range `[0, innerWidth]`, padding `0.1`
- **y**: linear, fixed domain `[0.50, 0.80]`
- Render y-axis labels as percentages: `"50%"`, `"60%"`, `"70%"`, `"80%"`
- Clip SD bands to the y-domain

The fixed percent domain is intentional. It avoids the visual instability of autoscaling and
keeps group differences readable given the observed weekly means cluster between roughly 64% and 69%.

#### SD band
- `y0 = clamp(group_mean - group_sd, 0.50, 0.80)`
- `y1 = clamp(group_mean + group_sd, 0.50, 0.80)`
- Fill with the corresponding group colour at `15% opacity`

#### Title block
- Title: `"Weekly % HR Max by Group"`
- Subtitle: `"Subject-level weekly mean per session · shaded band = ±1 SD"`

#### Tooltip
On point hover, show:
- group
- displayed week
- mean `% HR Max` as a percentage with one decimal place
- SD if available, also as a percentage
- number of sessions contributing
- number of subjects contributing

Example copy:
`Unsupervised · Wk 5`
`Mean % HR Max: 68.5%`
`SD: 6.5%`
`116 sessions · 43 subjects`

---

### Shared legend and styling

#### Legend
Two items stacked vertically at the top-right of the chart body:
- Blue square + `"Supervised"`
- Orange square + `"Unsupervised"`

Each marker is `10 × 10px` with `border-radius: 2px`.

#### Group colours
- Supervised → `#3378de`
- Unsupervised → `#f5802e`

#### Grid lines
- Horizontal only
- Colour `#e5e5ed`
- Use metric-appropriate tick positions for the active y-scale

#### X-axis labels
- `"Wk 1"` … `"Wk 6"` centred on each x-position

#### Missing-data behavior
- If a group has no data for a displayed week, leave the x-position visible and break the line
- Only render circles for points with a defined `group_mean`
- If SD cannot be computed because only one subject contributes, omit the band for that point span

---

## Plot 3 — Aligned Weekly Heatmaps

### What it shows
An aligned dual heatmap of weekly subject adherence across all 6 weeks, rendered as
side-by-side Supervised and Unsupervised panels that share the same subject roster
and row order.

### Card dimensions
- Position: `x: 60, y: 460`
- Width: `1323px`, Height: dynamic from shared roster size

#### Dimensions
- Two heatmap panels share the card body: **Supervised** on the left and
  **Unsupervised** on the right, separated by a `24px` gutter.
- **Rows**: one per subject in the **union** of Supervised and Unsupervised
  subject IDs observed in weeks 1–6, sorted alphabetically
- **Columns**: 6 (weeks 1–6) in each panel
- Cell width: `(panelWidth / 6) - 2px`
- Cell height: `18px` or shrink proportionally when the shared subject roster
  would otherwise exceed the available panel height
- Row gap: `2px`, column gap: `2px`
- Cell `border-radius: 2px`

#### Data preparation
1. Filter the dataset to study weeks 1–6 after groupwise week normalisation
2. For each `(group, subject, week)`, compute:
   - `total_sessions = count(*)`
   - `met_sessions = count(bounded_met == true)`
   - `weekly_adherence = met_sessions / total_sessions`
3. Derive the display state:
   - **Met** when `weekly_adherence >= 0.75`
   - **Not Met** when `total_sessions > 0` and `weekly_adherence < 0.75`
   - **No Data** when `total_sessions == 0`
4. Build the row roster from the alphabetical union of subjects present in either
   group during weeks 1–6
5. Render both group panels against that same roster so a subject always occupies
   the same row position in both panels

#### Colour encoding
| Weekly status | Colour |
|---|---|
| `met` | `#3bbd8c` (green) |
| `not_met` | `#f04545` (red) |
| `no_data` | `#e5e5ed` (grey) |

#### Labels
- **Panel subtitles**: `"Supervised"` and `"Unsupervised"`, `8px` font,
  `#80808f`, bold, aligned above the respective column headers
- **Column headers** (`"W1"` … `"W6"`): centred above each column, `8px` font,
  `#80808f`, `12px` above the first row in each panel
- **Row labels** (subject IDs): right-aligned `60px` to the left of the left panel,
  `8px` font, vertically centred on each row; labels apply to both panels because
  the row roster is shared

#### Sub-panel title
`"Individual Weekly Adherence Heatmaps (75% threshold; aligned subjects)"`,
`9px`, `#80808f`, bold, `14px` above the column headers.

#### Legend (bottom of card)
Three items horizontal, `4px` below the last heatmap row:
1. Green square → `"Met"`
2. Red square → `"Not Met"`
3. Grey square → `"No Data"`

#### Missing-data behavior
- If a subject is present in Supervised data but absent from Unsupervised data,
  the subject remains in the shared roster and the Unsupervised cells are rendered
  as **No Data**
- If a subject-week is missing within one panel, that week cell is rendered as
  **No Data** rather than removing the week or shifting cells
- If an entire group has no rows for a week, the column remains visible and all
  affected cells are rendered as **No Data**

---

## Caption Areas

Each HR plot card includes a caption zone below the chart content. The caption zone is **100px tall** and sits at the bottom of the card, separated from the chart/legend by 12px of top padding.

### Caption typography

| Element | Font size | Weight | Color | Purpose |
|---------|-----------|--------|-------|---------|
| Prose description | 11px | 400 (Regular) | `#6B7A90` (text secondary) | Explains what the plot shows |
| Numeric annotation label | 10px | 400 (Regular) | `#6B7A90` (text secondary) | Prefix label, e.g. "Supervised participants: " |
| Numeric annotation value | 10px | 600 (Semi Bold) | `#DDE4EF` (text primary) | The number itself |
| Disclaimer | 9px | 400 (Regular, italic) | `#6B7A90` (text secondary) | Supplementary methodology note |

All caption text uses `DM Sans, Inter, -apple-system, sans-serif`.

### Per-card caption content

| Plot | Views | Prose | Annotations | Disclaimer |
|------|-------|-------|-------------|------------|
| HR Plot 1 — Zone Time | (static) | Zone-time breakdown per group per week | N per group | — |
| HR Plot 2 — Intensity Trend | TRIMP | Edwards TRIMP by group with SD | N per group | — |
| HR Plot 2 — Intensity Trend | % HR Max | Percent HR max by group with SD | N per group | — |
| HR Plot 3 — Heatmaps | Adherence | Individual weekly adherence; Met/Not Met rule | — (N dynamic) | 75% threshold |
| HR Plot 3 — Heatmaps | Sessions | Session count per participant per week | — (N dynamic) | — |

### Toggle behavior

For HR Plot 2, captions swap inside the existing `updateView()` function without a full card re-render. HR Plot 3 re-renders its entire card on toggle; captions update accordingly.

### Card height increase

Each card's SVG height is increased by `CAPTION_H = 100px`. Bottom-anchored elements (HR Plot 1 legend, HR Plot 3 heatmap body) use `contentH = layout.h − CAPTION_H` for their positioning.

| Plot | Original height | Rendered height | Notes |
|------|----------------|-----------------|-------|
| HR Plot 1 — Zone Time | 380px | **480px** | Static increase; y-axis label and legend use `contentH` |
| HR Plot 2 — Intensity Trend | 390px | **490px** | Static increase; `innerH` uses `contentH` so chart size unchanged |
| HR Plot 3 — Heatmaps | dynamic | dynamic + 100px | `getHrHeatmapCardHeight()` adds `CAPTION_H` |

Caption y-offset from card top: `captionTop = layout.h − CAPTION_H + 12` (12px top padding inside caption zone).

---

## D3 Implementation Notes

- Use `d3.rollup` or `d3.group` to aggregate the CSV before drawing.
- For Plot 2, compute subject-level weekly means before computing group means and SDs.
- Plot 2 should preserve the existing inline two-button toggle interaction pattern already
  used on other cards in the dashboard.
- The Plot 2 SD band and line chart should use `clipPath` to prevent overflow beyond the
  chart area.
- Recommend `d3.v7` (`import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm"`).
- Load the CSV with `d3.csv("zone_out.csv", d3.autoType)` or equivalent typed parsing.
- Apply the 75% threshold only to Plot 3; Plot 2 is metric-based and does not use
  the adherence threshold.
  `bounded_met` proportion per group-week for the line chart.
