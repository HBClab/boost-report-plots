# Data Model: Plot Captions (009-plot-captions)

This feature introduces no database tables or server-side data. The "data model" here is the TypeScript type structure of the captions module that lives in `plots/act/src/captions.ts`.

---

## Types

### `NumericAnnotation`

A structured numeric value displayed in a visually distinct style from prose text.

```typescript
interface NumericAnnotation {
  label: string;       // Display label, e.g. "Intervention", "Supervised"
  value: number | null; // null → annotation is omitted from render
}
```

### `CaptionEntry`

A single caption for one plot view (or the only view if the card has no toggle).

```typescript
interface CaptionEntry {
  prose: string;                    // Main descriptive paragraph text
  annotations: NumericAnnotation[]; // Zero or more N-values or other numeric callouts
  disclaimer?: string;              // Optional supplementary note (styled distinctly)
}
```

### `StaticCaption`

Caption for a card with no toggle — one entry only.

```typescript
type StaticCaption = CaptionEntry;
```

### `ToggledCaption<ViewKey extends string>`

Caption for a card with a two-option toggle — one entry per view key.

```typescript
type ToggledCaption<K extends string> = Record<K, CaptionEntry>;
```

---

## Captions module shape

```typescript
// plots/act/src/captions.ts

export const actCaptions: {
  plot1: ToggledCaption<'all' | 'baseline'>;
  plot2: StaticCaption;
  plot3: StaticCaption;
} = { ... };

export const hrCaptions: {
  plot1: StaticCaption;
  plot2: ToggledCaption<'trimp' | 'hrmax'>;
  plot3: ToggledCaption<'adherence' | 'sessions'>;
} = { ... };
```

---

## Populated caption entries (placeholder prose — to be finalized by domain reviewer)

### ACT Plot 1 — All Sessions

```typescript
plot1: {
  all: {
    prose: "Each bar shows the average 24-hour day composition across all study sessions, "
         + "split by day type. Bars are normalized to 100% of the 24-hour day (1440 min). "
         + "Sleep and waking sedentary time together account for the majority of the day; "
         + "higher Moderate and Vigorous segments indicate greater physical activity.",
    annotations: [
      { label: "Intervention participants", value: 45 },
      { label: "Observational participants", value: 150 },
    ],
  },
  baseline: {
    prose: "Baseline (Session 1) day composition only. Use this view to establish "
         + "pre-intervention activity patterns before any program effect is possible.",
    annotations: [
      { label: "Intervention participants (S1)", value: 50 },
      { label: "Observational participants (S1)", value: 150 },
    ],
  },
},
```

### ACT Plot 2 — Participant × Session Heatmap

```typescript
plot2: {
  prose: "Each row is a participant; each column is a study session (S1–S4). "
       + "Cell color encodes sedentary minutes (left panel, grey scale) and MVPA minutes "
       + "(right panel, teal scale). Rows are sorted by change in sedentary time from "
       + "first to last available session. The Δ column shows intervention (▲) and "
       + "observational (▼) group markers scaled to the magnitude of change.",
  annotations: [],  // N is dynamic; already visible in participant row count
},
```

### ACT Plot 3 — Radial Activity Clock

```typescript
plot3: {
  prose: "Mean wrist acceleration (ENMO, mg) plotted by hour of day on a 24-hour clock. "
       + "Intervention sessions are shown as separate lines (S1–S4, teal palette); the "
       + "observational group appears as a single aggregated orange line. Shaded bands "
       + "show ±1 SD across participants for each hour. During sleep hours (~10 pm–6 am) "
       + "the SD band collapses to near zero — this reflects genuine population uniformity: "
       + "nearly all participants are inactive and movement is consistently minimal, "
       + "so inter-individual variability approaches zero. The dashed ring marks the "
       + "100 mg MVPA threshold. Per-session participant counts are shown in the legend.",
  annotations: [],  // N rendered per-session in legend; not repeated here
},
```

### HR Plot 1 — Zone Time Allocation

```typescript
plot1: {
  prose: "Mean seconds per session spent below, within, and above the target HR zone, "
       + "for each of 6 study weeks. Supervised sessions (blue) and Unsupervised sessions "
       + "(orange) are shown side by side per week. Green segments indicate time on-target; "
       + "red indicates above-zone effort; light blue indicates below-zone effort.",
  annotations: [
    { label: "Supervised participants", value: 49 },
    { label: "Unsupervised participants", value: 49 },
  ],
},
```

### HR Plot 2 — TRIMP view

```typescript
plot2: {
  trimp: {
    prose: "Weekly Edwards TRIMP (Training Impulse) averaged across subjects, with ±1 SD "
         + "band. TRIMP combines session duration and heart rate intensity into a single "
         + "training load score. Higher values indicate greater physiological demand per "
         + "session week. Supervised (blue) and Unsupervised (orange) are shown on a "
         + "shared week axis.",
    annotations: [
      { label: "Supervised participants", value: 49 },
      { label: "Unsupervised participants", value: 49 },
    ],
  },
  hrmax: {
    prose: "Weekly mean percent of maximum heart rate per session, averaged across subjects, "
         + "with ±1 SD band. The y-axis is fixed from 50%–80% to keep group differences "
         + "readable given the observed range. Values above 85% HR Max are classified as "
         + "vigorous-intensity exercise.",
    annotations: [
      { label: "Supervised participants", value: 49 },
      { label: "Unsupervised participants", value: 43 },
    ],
  },
},
```

### HR Plot 3 — Adherence view

```typescript
plot3: {
  adherence: {
    prose: "Individual weekly adherence for each participant across 6 study weeks. "
         + "A week is marked Met (green) when ≥75% of sessions that week had a sustained "
         + "bout within the target HR zone (bounded_met = true). Both panels share the "
         + "same alphabetical subject roster so rows align between groups.",
    annotations: [],  // Participant count is dynamic (union roster); not hardcoded
    disclaimer: "75% adherence threshold applied per week.",
  },
  sessions: {
    prose: "Session count per participant per week. Both panels share the same subject "
         + "roster. Cells show the number of sessions recorded for that subject-week. "
         + "Grey cells indicate no sessions recorded.",
    annotations: [],
  },
},
```

---

## Render contract

Each plot render function receives its caption entry and renders it into the card SVG below the chart/legend area:

1. Append a `<g class="caption-area">` at `y = [last chart element bottom] + 16`.
2. Append a `<text class="caption-prose">` with the `prose` string, wrapped to card width minus padding (use D3 tspan word-wrap or foreignObject if line breaks are needed).
3. For each `annotation` with a non-null `value`, append a `<text class="caption-annotation">` showing `"{label}: {value}"` in Semi Bold weight.
4. If `disclaimer` is present, append a `<text class="caption-disclaimer">` in italic or reduced opacity.

Typography:
- `.caption-prose`: 11px, Regular weight, secondary text color
- `.caption-annotation`: 10px, Semi Bold (600), primary text color or accent
- `.caption-disclaimer`: 9px, Regular, secondary text color, italic
