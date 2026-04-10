# US2 Screenshot Checklist — Caption Updates on Toggle

**Goal**: Confirm captions swap synchronously when toggle buttons are clicked on dual-view cards.

## Screenshots to capture (save to `us2/`)

| Card | View | File name | Acceptance criteria |
|------|------|-----------|---------------------|
| ACT Plot 1 | All Sessions | `us2-act-plot1-all.png` | Prose mentions "all study sessions"; N = 45 Intervention, 150 Observational |
| ACT Plot 1 | Baseline (S1) | `us2-act-plot1-baseline.png` | Prose mentions "Session 1 (Baseline)"; N = 50 Intervention (S1) |
| HR Plot 2 | TRIMP | `us2-hr-plot2-trimp.png` | Prose mentions "TRIMP"; N annotations for both groups |
| HR Plot 2 | % HR Max | `us2-hr-plot2-hrmax.png` | Prose mentions "percent of maximum heart rate"; N = 49 Supervised, 43 Unsupervised |
| HR Plot 3 | Adherence | `us2-hr-plot3-adherence.png` | Prose mentions "75%"; disclaimer "75% weekly adherence threshold applied" |
| HR Plot 3 | Sessions | `us2-hr-plot3-sessions.png` | Prose mentions "Session count" — NO mention of adherence threshold |

## Common failure modes to check

- After toggle, old caption text briefly remains visible (stale state)
- After toggle, both the old and new captions are visible simultaneously (double-render)
- The caption group is not cleared before re-render (`renderCaption` `.caption-area` removal not working)
- HR Plot 2 caption still shows TRIMP text after switching to % HR Max (updateView not firing)
