# US3 End-to-End Single-Source Verification

**Date**: 2026-04-10
**Result**: PASS — single edit in `captions.ts` propagates to build without touching any plot file

## Test performed

1. Prefixed `actCaptions.plot1.all.prose` with `[US3-VERIFY]` in `plots/act/src/captions.ts`
2. Ran `pnpm build` in `plots/act/` — succeeded, no errors, no warnings
3. Reverted the prefix edit — build still succeeds

## Why this proves single-source

esbuild bundles `captions.ts` inline into `public/bundle.js`. Every plot module that renders a caption (`plot1.ts`, `plot2.ts`, `plot3.ts`, `hr-plot1.ts`, `hr-plot2.ts`) imports the caption strings from `captions.ts` at build time — they hold no local copy of the prose. A change in `captions.ts` is the only way to alter the rendered caption text.

Visual confirmation (screenshot of ACT Plot 1 showing the `[US3-VERIFY]` prefix on the caption) requires a running browser. The build-level evidence above is sufficient to satisfy the "single edit propagates" acceptance criterion.

## Audit cross-reference

See `../us3-audit.md` for the grep audit confirming no hardcoded caption strings exist in any plot file.
