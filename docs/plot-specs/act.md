# Group Accelerometer Plot Specification

**Version:** 2.1 — Sleep Segment Added to Plot 1  
**Last updated:** April 1, 2026  
**Study context:** Wrist-worn accelerometer study, 7–10 day wear period, 200 participants, repeated measures design (up to 4 sessions), two groups (Intervention and Observational/Control).  
**Processing pipeline:** GGIR (any version ≥ 2.5). Raw outputs are post-processed to person-level and day-level summaries before plotting.

**Change from v2.0:** Plot 1 now shows a full 24-hour day composition, separating **Sleep** from Sedentary as a distinct first stacked bar segment. The normalization denominator and subtitle have been updated accordingly.

---

## Canvas & Layout

The three plots share a single **1440 × 1024 px** frame with a light off-white background (`#F7F7F9`).

| Region | X | Y | Width | Height |
|---|---|---|---|---|
| Plot 1 card | 60 | 40 | 1320 | 296 |
| Plot 2 card | 60 | 375 | 640 | 610 |
| Plot 3 card | 740 | 375 | 640 | 610 |

All cards have `12px` corner radius and a white (`#FFFFFF`) background. Internal padding is `24px` on all sides.

**Font:** Inter (system fallback: -apple-system, sans-serif). Weights used: Regular (400), Medium (500), Semi Bold (600), Bold (700).

---

## Shared Color Palette

| Role | Hex | Usage |
|---|---|---|
| Sleep | `#4A5568` | Activity band — new in v2.1 |
| Sedentary | `#6B7890` | Activity band, heatmap scale base |
| Light | `#8CC299` | Activity band |
| Moderate | `#FCBA42` | Activity band |
| Vigorous | `#DE4545` | Activity band |
| Intervention | `#247F8F` | Teal — group color, MVPA heatmap scale |
| Observational | `#DE7833` | Orange — group color, radial clock line |
| Missing/neutral | `#E0E0E8` | Missing heatmap cells, grid lines |
| Background | `#F7F7F9` | Canvas background |
| Card surface | `#FFFFFF` | Plot card background |
| Text primary | `#212130` | Titles, row labels |
| Text secondary | `#737380` | Subtitles, axis labels, legends |

---

## Plot 1: Stacked Proportional Activity Bar

### Purpose

Show how the average **24-hour day** is divided across five categories — Sleep, Sedentary, Light, Moderate, and Vigorous — comparing weekday vs. weekend vs. all-days averages at the group level.

> **v2.1 change:** Sleep is now separated from Sedentary and shown as its own first segment. The denominator is the full 24-hour day (sleep + all waking activity), not just waking hours. The subtitle reflects this.

### Data requirements

One summary row per day-type category. Required columns:

| Column | Type | Description |
|---|---|---|
| `day_type` | string | "All Days", "Weekdays", "Weekends" |
| `sleep_min` | numeric | Mean sleep duration minutes (from GGIR `SleepDurationInSpt` or `sleepdur` in part4 output) |
| `sed_min` | numeric | Mean sedentary minutes (waking sedentary only — exclude sleep) |
| `light_min` | numeric | Mean light activity minutes |
| `mod_min` | numeric | Mean moderate activity minutes |
| `vig_min` | numeric | Mean vigorous activity minutes |

**Important constraint:** The five minute values per row must sum to a consistent total representing the full 24-hour day (target: **1440 minutes**). In practice observed totals will differ due to non-wear, missing data, or partial days — normalize each row to 100% before plotting: `value / row_sum`. The bars always represent proportions, never raw minutes. Raw minutes appear only in tooltips.

**Simulated values used in prototype:**

| Day type | Sleep | Sedentary | Light | Moderate | Vigorous |
|---|---|---|---|---|---|
| All Days | 456 | 498 | 320 | 108 | 34 |
| Weekdays | 440 | 520 | 305 | 98 | 37 |
| Weekends | 490 | 455 | 352 | 130 | 23 |

**GGIR data source for sleep:** Use `SleepDurationInSpt` (sleep period time duration) from the GGIR part 4 person-level summary, or `sleepdur` from the night-level output averaged per participant. Do not use `dur_spt_min` (full sleep period time) without verifying it excludes waking after sleep onset unless that is intentional.

### Visual encoding

- **Chart type:** Horizontal 100% stacked bar
- **X-axis:** Percentage of 24-hour day (0–100%), with gridlines and tick labels at 0, 25, 50, 75, 100%
- **Y-axis:** Day type label (left of bar, 13px Medium, no axis line)
- **Bar height:** 46px per row, 20px gap between rows
- **Segment order (left to right):** Sleep → Sedentary → Light → Moderate → Vigorous (dark/cool to warm)
- **Segment colors:** See shared color palette above
- **Segment dividers:** 2px white lines between each color segment
- **Inline labels:** Percentage value centered in each segment if the segment width exceeds 44px; white Semi Bold 11px text. Narrow segments (vigorous, sometimes moderate on weekdays) get no label.
- **Legend:** Colored 13×13px squares with 3px radius, labeled in 12px Regular secondary text, positioned below bars. Left-aligned starting at the bar left edge. Five items: Sleep, Sedentary, Light, Moderate, Vigorous. Spacing: 115px between each item.
- **CI note:** Footnote text at 10px in secondary color: "CI/error bands available in interactive D3 version"

### Layout specifics

- **Label column width:** 84px (accommodates "Weekends" at 13px)
- **Bar left edge:** 196px from frame left (= 60 card x + 24 pad + 84 label + 12 gap + 16 for 0% tick)
- **Bar total width:** ~1124px
- **Gridline style:** 1px, `#E0E0E8`, full height of bar area
- **Gridline position:** Calculated as `bar_left + (pct / 100) * bar_width`

### D3 implementation notes

- Use `d3.scaleLinear([0, 1], [bar_left, bar_right])` for x positioning
- Compute proportion values on the fly: `d.sleep / (d.sleep + d.sed + d.light + d.mod + d.vig)` etc.
- Use `d3.stack()` with keys `['sleep','sed','light','mod','vig']` on normalized data
- Tooltip: on mouseover show `{band_name}: {raw_minutes} min ({pct}%)`
- Example proportion computation:
  ```js
  const keys = ['sleep','sed','light','mod','vig'];
  const normalized = rawData.map(d => {
    const total = keys.reduce((s, k) => s + d[k + '_min'], 0);
    return { day_type: d.day_type, ...Object.fromEntries(keys.map(k => [k, d[k + '_min'] / total])) };
  });
  ```

**Figma file:** https://www.figma.com/design/yteer4gUc7ZkGKFOBgKlPk/Boost-Report-Figures  
**Page:** Accelerometer Plot  
**Frame node ID:** 16:3 (Desktop - 1, 1440×1024px)

---

## Plot 2: Participant × Session Heatmap

*(Unchanged from v2.0)*

### Purpose

Show individual-level variation in sedentary time and MVPA across up to four sessions, sorted by change in sedentary time, with groups color-coded.

### Data requirements

One row per participant × session. Required columns: `participant_id`, `group` ("Intervention" / "Observational"), `session` (1–4), `sed_min`, `mvpa_min`. Sort rows by Δ sedentary (Session 4 − Session 1, or last − first available).

### Visual encoding

- **Chart type:** Two side-by-side participant heatmaps (Sedentary left, MVPA right)
- **Cell dimensions:** 66px wide × 7px tall per session block
- **Separator:** 14px wide column between left and right heatmap panels; Δ arrow markers overlay it
- **Color scale — Sedentary:** `#E0E0E8` (low) → `#6B7890` (high)
- **Color scale — MVPA:** `#E0E0E8` (low) → `#247F8F` teal (high)
- **Group markers (Δ column):** Intervention = upward triangle (`▲`, `#247F8F`), Observational = downward triangle (`▼`, `#DE7833`). Marker height scales proportionally to magnitude of change.
- **Session labels:** S1–S4 above each column pair, 10px Regular secondary text
- **Axes:** No axis lines. Participant rows have no labels (anonymized). Session column headers only.
- **Legend:** Gradient color bars (Low → High) below heatmap for each panel, labeled "Sedentary" and "MVPA"

### Layout specifics

- **Card bounds:** x=60, y=375, w=640, h=610
- **Heatmap left edge:** x=84.5
- **Left panel columns (S1–S4):** x = 84.5, 151.5, 218.5, 285.5; each 66px wide
- **Δ column:** x=359, w=14
- **Right panel columns (S1–S4):** x = 381.5, 448.5, 515.5, 582.5; each 66px wide
- **Row height:** 7px, 1px gap between rows (effectively 8px stride)
- **Participant sort line:** horizontal rule at row 30 (approx. y=696) dividing above/below-median Δ

---

## Plot 3: Radial Activity Clock

*(Unchanged from v2.0)*

### Purpose

Show mean acceleration (ENMO, mg) by hour of day across all participants, with ±1 SD shading and separate lines per group. Annotate M5 (most active 5-hour window peak) and L5 (least active 5-hour window trough).

### Data requirements

One row per hour (0–23). Required columns: `hour` (0–23), `intervention_mean`, `intervention_sd`, `observational_mean`, `observational_sd`. All values in mg (milli-gravitational units).

### Visual encoding

- **Chart type:** Polar/radial line chart — 24-hour clock layout, 12am at top
- **Hour markers:** Tick marks at each hour; labeled at 12am, 3am, 6am, 9am, 12pm, 3pm, 6pm, 9pm (11px Regular secondary text)
- **Concentric rings:** Three rings at 38mg, 76mg, 115mg with ring labels at the 12am position
- **MVPA threshold line:** Dashed ring at 100mg, labeled "MVPA threshold (100mg)"
- **Intervention line:** `#247F8F` teal, 2.5px stroke
- **Observational line:** `#DE7833` orange, 1.5px stroke
- **SD shading:** Filled polygon ±1 SD around each group mean; 20% opacity fill matching group color
- **M5 annotation:** Filled circle + label at the hour of peak acceleration
- **L5 annotation:** Filled circle + label at the hour of trough acceleration
- **Legend:** Below clock — SD band swatch, Intervention line, Observational line, MVPA threshold dashed line

### Layout specifics

- **Card bounds:** x=740, y=375, w=640, h=610
- **Clock center:** x=1060, y=695 (approximate)
- **Outer radius:** ~195px (to ring at 115mg)
- **Inner dead zone radius:** ~44px (white fill center circle)
- **Radial scale:** Linear from 0mg at center to ~115mg+ at outer ring

---

## Version History

| Version | Date | Change |
|---|---|---|
| 2.0 | March 25, 2026 | Post-implementation baseline; D3 implementation notes added |
| 2.1 | April 1, 2026 | Plot 1: Sleep separated from Sedentary as distinct first segment; normalization changed from waking-day to full 24-hour day; `sleep_min` data column added; color palette extended with Sleep (`#4A5568`); legend updated to 5 items; Figma file updated |

---
**Figma file:** https://www.figma.com/design/yteer4gUc7ZkGKFOBgKlPk/Boost-Report-Figures  
**Page:** Accelerometer Plot  
**Frame node ID:** 16:3 (Desktop - 1, 1440×1024px)
