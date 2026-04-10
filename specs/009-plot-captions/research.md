# Research: Plot Captions (009-plot-captions)

No NEEDS CLARIFICATION markers were identified in the spec or Technical Context. All decisions below are resolved from direct codebase inspection.

---

## Decision 1: Caption module format

**Decision**: A single TypeScript file (`captions.ts`) exports a typed object tree indexed by plot ID and, for toggle-aware cards, by view key.

**Rationale**: The `feat/captions/captions.js` draft already uses this structure (`actCaptions`, `hrCaptions` objects with plot-keyed sub-objects). Centralizing in one TypeScript file satisfies FR-003 (single source of truth), enables strict-mode typing for annotation fields, and requires no build config changes — esbuild already handles the `plots/act/src/` directory.

**Alternatives considered**:
- JSON file: Rejected — TypeScript provides type safety and IDE autocompletion for caption fields; no runtime fetch overhead.
- Inline strings in each plot file: Rejected — violates FR-003 and requires hunting multiple files for updates.

---

## Decision 2: Caption rendering approach (SVG text vs HTML overlay)

**Decision**: Render caption content as SVG `<text>` and `<tspan>` elements appended to the existing D3 card SVG, within the card boundary.

**Rationale**: All existing plot rendering (titles, subtitles, legends, axes) uses D3 SVG text elements. Matching this pattern keeps the implementation consistent and avoids mixing SVG and HTML layering. The caption area sits below the chart area, within the card's bounding rect. Each plot file already extends the SVG `g` element per card.

**Alternatives considered**:
- HTML overlay `<div>` positioned over the card: Rejected — introduces z-index and coordinate-alignment complexity on top of an SVG canvas; inconsistent with existing pattern.
- Foreignobject (SVG-embedded HTML): Rejected — unnecessary complexity for plain text.

---

## Decision 3: Toggle-caption binding mechanism

**Decision**: For the three toggle-aware cards, caption objects are keyed by the same view identifier already used in each toggle's internal state (`SessionView`, `TrendView`, `HeatmapView` enums/types in the respective plot files). The `updateView` / `onToggle` callback passes the active key, and the render function reads `captions[plotId][activeView]`.

**Rationale**: No new toggle state management needed — existing callbacks already propagate the active view. Adding a caption swap is a one-line addition inside the existing `updateView` function in each toggled plot.

**Confirmed toggle key values from codebase**:
- ACT Plot 1: `'all'` / `'baseline'` (SessionView type in `plot1.ts`)
- HR Plot 2: `'trimp'` / `'hrmax'` (TrendView type in `hr-plot2.ts`)
- HR Plot 3: `'adherence'` / `'sessions'` (HeatmapView type in `hr-plot2.ts`)

---

## Decision 4: Caption typography

**Decision**: Two styled text layers within the caption area:
1. **Prose text**: 11px, Inter/DM Sans Regular, secondary text color (matching existing subtitle style)
2. **Numeric annotations** (N values, thresholds, disclaimers): 10px Semi Bold, accent color or primary text color — visually distinct from prose via weight and/or color

**Rationale**: Matches the existing card typography scale (titles at 14px bold, subtitles at 10px regular, axis labels at 9–11px). Using font-weight and color difference — rather than size alone — keeps the caption area compact within the card.

---

## Decision 5: Caption area vertical placement

**Decision**: Caption area is appended below the chart content (below the legend if present) within the card bounding rect, with a fixed top margin of 16px below the last chart element. Card height may need to increase by ~60–80px per card to accommodate captions without clipping.

**Rationale**: The spec requires captions "on the same card" and "within the card boundary" (FR-007). Extending card height slightly is the cleanest approach — it avoids overlapping chart elements and does not require restructuring card layout. Each card's SVG height is set explicitly in the render function and can be incremented.

**Cards whose SVG height will increase**:
- ACT Plot 1: 560 → ~630px
- ACT Plot 2: 640+ → ~700+px
- ACT Plot 3: 640 → ~700px
- HR Plot 1: 380 → ~450px
- HR Plot 2: 390 → ~460px
- HR Plot 3: dynamic → dynamic + ~70px

---

## Study metadata for N annotations

The following participant Ns are used in the captions module. Sourced from plot-spec comments and the legend labeling pattern in `plot3.ts` (which renders `"Session N (n=NNN)"` from live data).

| Plot | Group / Session | Approximate N |
|------|----------------|---------------|
| ACT Plot 1 — All Sessions | Intervention | ~45–50 |
| ACT Plot 1 — All Sessions | Observational | ~150 |
| ACT Plot 1 — Baseline (S1) | Intervention | ~50 |
| ACT Plot 1 — Baseline (S1) | Observational | ~150 |
| ACT Plot 2 | (participant count varies with data) | N/A — omit or derive at render time |
| ACT Plot 3 | per session, derived from live data | per-session N already rendered in legend |
| HR Plot 1 | Supervised / Unsupervised | ~49–50 per group |
| HR Plot 2 TRIMP | Supervised / Unsupervised | ~49 per group |
| HR Plot 2 % HR Max | Supervised / Unsupervised | ~43–49 per group |
| HR Plot 3 | (subject count dynamic) | N/A — omit fixed N |

**Implication**: For plots where N is already rendered in the legend or is dynamic (ACT Plot 2, ACT Plot 3, HR Plot 3), the captions module uses `null` for the N field and the render function omits the numeric annotation rather than showing stale hardcoded values. For ACT Plot 3, the prose caption references the per-session Ns already shown in the legend rather than repeating them inline.

---

## Why the SD band clamps to near-zero during sleep hours (ACT Plot 3)

The radial clock plots ENMO (wrist acceleration) by hour. During sleep hours (~10pm–6am), nearly all participants are asleep and wrist movement is minimal and highly consistent across individuals. Mean ENMO drops to near zero and the inter-individual standard deviation is also near zero because the population is uniformly inactive. The SD band (`enmo_mean ± enmo_sd`) therefore collapses to a very thin sliver around the near-zero mean — visually appearing to "clamp to 0". This is a genuine data characteristic, not a rendering artifact. The caption should state this plainly.
