# Research: Accelerometer Activity Plots 1 & 2

**Branch**: `002-act-plots-1-2` | **Phase**: 0 | **Date**: 2026-04-02

---

## Decision 1: Group Membership Derivation

**Decision**: Observational group is identified by `subject_code LIKE 'sub-7%'`; all other codes (`sub-6xxx`, `sub-8xxx`, etc.) are Intervention.

**Rationale**: The feature spec states "observational is 7*** ids" — the database stores full BIDS-style codes (`sub-NNNN`), so the correct SQL predicate is `subject_code LIKE 'sub-7%'` not `LIKE '7%'`. Verified against live data: `sub-7%` yields 249 subjects; everything else yields 86 subjects.

**Alternatives considered**: Parsing the numeric portion of the code (e.g., `SUBSTRING(subject_code FROM 5)::int BETWEEN 7000 AND 7999`) — rejected as over-engineered; the prefix pattern is sufficient and stable.

---

## Decision 2: Actual Data Counts (vs. Feature Spec Stated Counts)

**Decision**: Use the actual database contents as ground truth. The plan spec header ("335 subjects") reflected an earlier data snapshot. The current live database has 86 Intervention subjects (sessions 1–8) and 249 Observational subjects (majority in session 1, some up to session 5).

**Rationale**: Data imports are cumulative; the database is the authoritative source. Observational subjects do have sessions beyond 1 in a minority of cases, but the feature spec explicitly excludes Observational from Plot 2 entirely — this remains correct.

**Alternatives considered**: Filtering to subjects with exactly 1 session for Observational — not needed since the group is fully excluded from Plot 2.

---

## Decision 3: Plot 1 Data Query Strategy

**Decision**: Compute per-group, per-day-type averages using a single SQL query with a `CASE WHEN weekday IN ('Saturday','Sunday')` partition, plus a UNION ALL for "All Days". Averages are taken over individual `session_days` rows (not per-subject means first), meaning days with more observations contribute proportionally.

**Rationale**: Direct averaging of session_days rows is consistent with "group-level mean day" semantics and produces totals very close to 1440 min (verified: Intervention All Days = 1440.1, Weekdays = 1440.0, Weekends = 1440.3). Normalization to 100% per row is still applied client-side to absorb any rounding.

**Alternatives considered**: Two-stage aggregation (subject-level means, then group-level means) — avoids over-representing subjects with many days but adds complexity; deferred to a future spec if needed.

---

## Decision 4: Plot 2 Data Query Strategy

**Decision**: Compute per-subject per-session averages of `sedentary_minutes` and `mvpa_minutes` from `session_days`, capped at session_number ≤ 4, for Intervention subjects only. Delta = average sedentary in max(session_number) − average sedentary in session 1. Sort descending by delta (most decrease at top).

**Rationale**: Aligns with the visual spec's "sort by change in sedentary time." Sessions beyond 4 are excluded per the visual spec's four-session layout. Averaging within a session handles subjects with multiple days per session.

**Alternatives considered**: Using last recorded session (not capped at 4) for delta computation — excluded to stay within the 4-session visual frame.

---

## Decision 5: Application Architecture

**Decision**: TypeScript-only web application: a lightweight Node.js/Express server (TypeScript, compiled with `tsc` or bundled with esbuild) that connects to PostgreSQL, exposes two JSON API endpoints, and serves the static D3 browser bundle. Browser code is TypeScript, bundled by esbuild.

**Rationale**: The constitution mandates TypeScript + D3 for shipped plot behavior. Node.js gives access to the `pg` PostgreSQL driver in the same language as the D3 rendering code. The Nix flake already includes Node.js, pnpm, and yarn. This avoids mixing Python server + TypeScript client.

**Alternatives considered**:
- Python Flask/FastAPI server + TypeScript D3 client — workable but crosses language boundaries unnecessarily.
- Pure-browser D3 with no server (CSV file or embedded JSON) — violates the requirement to read live data from the database.
- Vite dev server for development — possible but adds framework overhead; esbuild + simple Express is lighter and more inspectable.

---

## Decision 6: Project Directory Layout

**Decision**: Create a new `plots/act/` directory at the repo root:

```
plots/act/
├── package.json         # Node project for this plot family
├── tsconfig.json
├── esbuild.config.ts    # or build script
├── server/
│   ├── index.ts         # Express server entry point
│   └── db.ts            # PostgreSQL query functions
├── src/
│   ├── main.ts          # D3 browser entry point
│   ├── plot1.ts         # Plot 1 rendering module
│   └── plot2.ts         # Plot 2 rendering module
└── public/
    ├── index.html       # Single-page host
    └── bundle.js        # esbuild output (gitignored)
```

**Rationale**: Isolated from the existing Python src/ tree. Clean separation of server code (Node.js, DB access) from browser code (D3). Matches the constitution's "Plot specifications in docs/plot-specs/, source code in repo root" convention.

**Alternatives considered**: Putting all TypeScript in `src/` alongside Python — conflicts with existing Python package structure and muddies the src/__init__.py namespace.

---

## Decision 7: Validation Strategy

**Decision**: Manual visual verification against independently computed SQL values. Validation evidence = screenshot of rendered page + side-by-side comparison of Plot 1 proportions against the verified SQL output (see `research.md` — Intervention All Days verified at 1440.1 min total, proportions = sleep 30.4%, sed 53.6%, light 10.3%, mod 5.6%, vig 0.2%).

**Rationale**: Constitution principle IV: no automated test suite is required; validation by deliverable evidence is the standard. The SQL query results serve as ground truth for proportion checks.

**Alternatives considered**: Playwright-based screenshot diffing — valid but out of scope for this feature; would be added in a future "test harness" feature.

---

## Decision 8: SVG Save Mechanism

**Decision**: Implement Save SVG by serializing the `<svg>` DOM node to a string, wrapping in a Blob, and triggering a browser download link. No server involvement needed.

**Rationale**: Standard browser-side SVG export pattern for D3 visualizations. Works reliably for static SVG content. Simple to implement.

**Alternatives considered**: Server-side SVG generation (e.g., with svg-dom-builder in Node) — adds server complexity without benefit since the browser already holds the rendered SVG.

---

## Verified SQL Reference Values (Intervention Group)

These values serve as the primary validation reference for Plot 1:

| Day Type  | Sleep min | Sed min | Light min | Mod min | Vig min | Total  |
|-----------|-----------|---------|-----------|---------|---------|--------|
| All Days  | 437.6     | 771.7   | 148.6     | 80.0    | 2.2     | 1440.1 |
| Weekdays  | 425.7     | 788.4   | 143.8     | 79.8    | 2.4     | 1440.0 |
| Weekends  | 468.1     | 728.9   | 161.1     | 80.6    | 1.7     | 1440.3 |

Normalized proportions (All Days, Intervention):
- Sleep: 30.4% | Sedentary: 53.6% | Light: 10.3% | Moderate: 5.6% | Vigorous: 0.2%
