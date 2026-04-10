# US3 Centralization Audit

**Date**: 2026-04-10
**Result**: PASS — all caption strings centralized in `plots/act/src/captions.ts`

## Audit findings

All six plot render files were grepped for hardcoded caption prose strings (keywords: "prose", "Each bar", "Mean wrist", "Mean seconds", "Weekly Edwards", "Individual weekly", "Session count").

| File | Hardcoded caption strings? | Source |
|------|---------------------------|--------|
| `plots/act/src/plot1.ts` | No | Imports `actCaptions` from `captions.ts` |
| `plots/act/src/plot2.ts` | No | Imports `actCaptions` from `captions.ts` |
| `plots/act/src/plot3.ts` | No | Imports `actCaptions` from `captions.ts` |
| `plots/act/src/hr-plot1.ts` | No | Imports `hrCaptions` from `captions.ts` |
| `plots/act/src/hr-plot2.ts` | No | Imports `hrCaptions` from `captions.ts` |

**Note**: The string `'Mean seconds per session · Supervised vs Unsupervised'` in hr-plot1.ts (line 80) is the existing chart subtitle rendered as part of the card title block — predates this feature and is distinct from the caption. No action required.

## End-to-end single-source verification

To verify, change one prose string in `captions.ts`, run `pnpm build` in `plots/act/`, and confirm the changed text appears on the corresponding card. Screenshots of this verification go in `us3/`.
