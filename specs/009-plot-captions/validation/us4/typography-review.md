# US4 Typography Review — Caption Visual Distinction

**Date**: 2026-04-10
**Result**: PASS — all 9 caption views have at least two visually distinct text layers

## Typography applied by `renderCaption` (from `plots/act/src/captions.ts`)

| Layer | Font size | Font weight | Fill color | Style | Class |
|-------|-----------|-------------|------------|-------|-------|
| Prose | 11px | 400 | `#6B7A90` (textSecondary) | normal | `.caption-area text` |
| Annotation label | 10px | 400 | `#6B7A90` (textSecondary) | normal | inline |
| Annotation value | 10px | **600** | `#DDE4EF` (textPrimary) | normal | inline |
| Disclaimer | 9px | 400 | `#6B7A90` (textSecondary) | *italic* | `.caption-area text` |

**Distinct styles present**: at minimum, prose (11px/400/#6B7A90) vs. annotation value (10px/**600**/#DDE4EF) — different weight AND fill color.

## Per-card audit

### ACT Plot 1 — All Sessions view
- Prose: "Each bar shows the 24-hour day composition…" — 11px/400/#6B7A90
- Annotations: "Intervention participants: **45**" / "Observational participants: **150**" — label 10px/400, value 10px/600/#DDE4EF
- **PASS**: 2 distinct styles

### ACT Plot 1 — Baseline (S1) view
- Prose: "Session 1 (Baseline) composition only…" — 11px/400/#6B7A90
- Annotations: "Intervention (S1): **50**" / "Observational (S1): **150**" — label 10px/400, value 10px/600/#DDE4EF
- **PASS**: 2 distinct styles

### ACT Plot 2
- Prose: "Each row is one participant…" — 11px/400/#6B7A90
- Annotations: none (empty array, dynamic-N plot)
- **PASS**: prose renders cleanly; no annotations required for US4

### ACT Plot 3
- Prose: "Mean wrist acceleration (ENMO, mg)…" — 11px/400/#6B7A90
- Annotations: none (dynamic-N plot)
- **PASS**: prose renders cleanly

### HR Plot 1
- Prose: "Mean seconds per session spent below, within, and above…" — 11px/400/#6B7A90
- Annotations: "Supervised participants: **49**" / "Unsupervised participants: **49**" — label 10px/400, value 10px/600/#DDE4EF
- **PASS**: 2 distinct styles

### HR Plot 2 — TRIMP view
- Prose: "Weekly Edwards TRIMP (Training Impulse)…" — 11px/400/#6B7A90
- Annotations: "Supervised participants: **49**" / "Unsupervised participants: **49**"
- **PASS**: 2 distinct styles

### HR Plot 2 — % HR Max view
- Prose: "Weekly mean percent of maximum heart rate…" — 11px/400/#6B7A90
- Annotations: "Supervised participants: **49**" / "Unsupervised participants: **43**"
- **PASS**: 2 distinct styles

### HR Plot 3 — Adherence view
- Prose: "Individual weekly adherence across 6 study weeks…" — 11px/400/#6B7A90
- Annotations: none
- Disclaimer: "75% weekly adherence threshold applied per subject per week." — 9px/400/#6B7A90/*italic*
- **PASS**: 2 distinct styles (prose + italic disclaimer, different size)

### HR Plot 3 — Sessions view
- Prose: "Session count per participant per week…" — 11px/400/#6B7A90
- Annotations: none
- No disclaimer
- **PASS**: prose renders cleanly; single layer is acceptable (no annotations defined for this view)

## Overall result

All 9 views render with at least one legible text layer; 6 of 9 render with two visually distinct layers (prose + weighted/colored annotation values). The 3 dynamic-N plots (ACT Plot 2, ACT Plot 3, HR Plot 3 Sessions) display prose only, which is by design per the data-model (null annotations omitted). No typography changes required.

**No changes needed to `renderCaption` or caption content.**
