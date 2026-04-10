# Quickstart: Plot Captions (009-plot-captions)

## Prerequisites

- Dev shell active: `nix develop` from repo root
- Database running with seeded data (see existing quickstart for act/hr data)

## Run the visualization

```bash
cd plots/act
pnpm install       # only needed first time or after dependency changes
pnpm dev           # starts dev server with hot reload
```

Open the browser at the URL shown in the terminal (typically `http://localhost:3000`).

## Verify captions during development

1. **ACT view** — switch to the ACT tab and confirm:
   - Plot 1 (Stacked Bar): caption appears below the legend; "All Sessions" prose is visible
   - Toggle to "Baseline (S1)": caption text changes to the baseline description
   - Plot 2 (Heatmap): caption appears below the gradient legend
   - Plot 3 (Radial Clock): caption appears below the clock legend; sleep-hours SD explanation is present

2. **HR view** — switch to the HR tab and confirm:
   - HR Plot 1 (Zone Time): caption appears below the legend
   - HR Plot 2: default "TRIMP" caption is visible; toggle to "% HR Max" → caption changes
   - HR Plot 3: default "Adherence" caption is visible; toggle to "Sessions" → caption changes

3. **Styling check**:
   - Prose text is legible without zoom
   - Numeric annotations (`label: value`) are visually distinct from prose (bolder/different color)
   - No caption text overflows the card boundary

## Validation evidence to capture

For each of the six cards, take a screenshot confirming:
- Caption text is present and accurate
- For toggled cards, screenshots of both views showing different captions

Save screenshots to `specs/009-plot-captions/validation/` (create the directory as needed).

## Build for production

```bash
cd plots/act
pnpm build
pnpm start
```

## Implementation notes (deviations from plan)

- **ACT Plot 1 toggle**: The caption updates automatically because `renderPlot1` is called in full on every toggle — no separate `renderCaption` call inside `onToggle` was needed. The `viewState.current` key selects the correct `actCaptions.plot1[view]` at render time.

- **HR Plot 2 internal toggle**: Unlike other plots, `renderHrIntensityTrend` uses an `updateView()` closure that swaps series without a full card re-render. A `captionG` group is pre-created outside `updateView()` and `renderCaption` is called inside it on each view change. `renderCaption` clears `.caption-area` children before each render, preventing stale text.

- **HR Plot 3 toggle**: The heatmap card re-renders in full on toggle (`renderHrHeatmapCard` called with the new `HrHeatmapView`). Caption is passed at render time via `hrCaptions.plot3[opts.view]`.

- **Card heights** (actual values):
  - ACT Plot 1: 660px (560 + 100)
  - ACT Plot 3: 740px (640 + 100)
  - HR Plot 1: 480px (380 + 100)
  - HR Plot 2: 490px (390 + 100)
  - ACT Plot 2, HR Plot 3: dynamic (height helper functions include `+ CAPTION_H`)

- **Validation directories**: Screenshots live in `specs/009-plot-captions/validation/us1/`, `us2/`, `us3/`, `us4/`. The `us3/` directory contains a build-level verification report instead of a screenshot (no browser available at implementation time).
