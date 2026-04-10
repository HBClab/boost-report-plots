# Implementation Plan: Plot Captions

**Branch**: `009-plot-captions` | **Date**: 2026-04-10 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/009-plot-captions/spec.md`

## Summary

Add descriptive captions to all six plot cards (ACT 1/2/3, HR 1/2/3), sourced from a single centralized TypeScript captions module. Captions include a prose description and numeric annotations (participant Ns) styled distinctly. For the three toggle-bearing cards (ACT Plot 1, HR Plot 2, HR Plot 3), each view has its own independent caption that swaps synchronously when the toggle fires.

## Technical Context

**Language/Version**: TypeScript 5.x (browser bundle), esbuild  
**Primary Dependencies**: D3 v7 (SVG text rendering in existing plot render functions)  
**Storage**: N/A — captions are static content defined in a TypeScript source module  
**Testing/Validation**: Manual visual inspection — render both ACT and HR views, confirm captions appear on all six cards, toggle all three dual-view cards and confirm caption swap  
**Target Platform**: Browser, fixed 1440px desktop canvas  
**Project Type**: D3 visualization dashboard (web-app)  
**Performance Goals**: Caption swap must be synchronous with the toggle re-render — no perceptible lag  
**Constraints**: Must visually integrate with the existing rendered card style as implemented (dark palette, Inter/DM Sans fonts, 12px card corner radius); caption text must be legible against the card background without zoom  
**Scale/Scope**: 9 caption objects total (6 static + 3 additional toggle-view variants for ACT-1 Baseline, HR-2 HRMax, HR-3 Sessions)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Plot Specification Fidelity | ✅ Pass | Captions are additive UI elements only. No changes to encodings, data semantics, or interaction behavior. The plot-spec docs will receive a minor addendum noting the caption area added to each card — captured in this plan before implementation begins. |
| II. TypeScript + D3 Implementation Standard | ✅ Pass | Captions rendered as SVG text elements via D3 within existing TypeScript plot render functions; captions module is a plain TypeScript file. |
| III. Read-Only Shared Data Access | ✅ Pass | Caption content is static; no data writes or mutations. N values are study-metadata constants in the captions module. |
| IV. Validation by Deliverable Evidence | ✅ Pass | Validation is manual visual inspection of both views. Evidence: screenshots confirming caption presence, toggle behavior, and styling on all six cards. No automated tests required. |

**Plot-spec addendum required**: Before implementation, add a "Caption Area" section to `docs/plot-specs/act.md` and `docs/plot-specs/hr.md` specifying the caption zone dimensions and typography within each card. This addendum is a constitution requirement (Principle I) and must be done first.

## Project Structure

### Documentation (this feature)

```text
specs/009-plot-captions/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
plots/act/src/
├── captions.ts          # NEW — single source-of-truth captions module (all 9 objects)
├── plot1.ts             # MODIFIED — imports captions, renders caption area; toggle passes active key
├── plot2.ts             # MODIFIED — imports captions, renders caption area
├── plot3.ts             # MODIFIED — imports captions, renders caption area
├── hr-plot1.ts          # MODIFIED — imports captions, renders caption area
└── hr-plot2.ts          # MODIFIED — imports captions for both HR Plot 2 toggle views
                         #            and both HR Plot 3 toggle views

docs/plot-specs/
├── act.md               # MODIFIED — caption area section added to all 3 ACT plot specs
└── hr.md                # MODIFIED — caption area section added to all 3 HR plot specs
```

**Structure Decision**: Single TypeScript module (`captions.ts`) in the existing `plots/act/src/` directory. All six plot files import from it. Toggle-aware captions are keyed sub-objects within each plot's caption entry. No new build configuration needed — esbuild already bundles all `.ts` files in that directory.

## Complexity Tracking

No constitution violations identified. Table not required.
