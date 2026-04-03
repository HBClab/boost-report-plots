# Implementation Plan: Accelerometer Activity Plots 1 & 2

**Branch**: `002-act-plots-1-2` | **Date**: 2026-04-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-act-plots-1-2/spec.md`

---

## Summary

Implement a browser-based D3 visualization of accelerometer activity data with two plot types:

- **Plot 1** (stacked proportional activity bar): group-level 24-hour day composition across Sleep, Sedentary, Light, Moderate, and Vigorous activity — rendered separately for Intervention and Observational groups.
- **Plot 2** (participant × session heatmap): individual-level sedentary and MVPA variation across up to 4 sessions — rendered for the Intervention group only.

Data is served from the local `boost_actigraphy` PostgreSQL database via a lightweight TypeScript/Node.js server. The client is TypeScript + D3, bundled and served to a browser. A Save SVG button enables report-ready export.

---

## Technical Context

**Language/Version**: TypeScript 5.x (server and browser)
**Primary Dependencies**: D3 v7, Express, node-postgres (`pg`), esbuild (build)
**Storage**: PostgreSQL 16 — `boost_actigraphy` database, read-only access via Unix socket at `.local/` on port 55432
**Testing/Validation**: Manual visual verification against SQL reference values (see `research.md`). Validation SQL script provided for proportion cross-check.
**Target Platform**: Local development server (Linux, accessed via browser)
**Project Type**: Web visualization tool (local-only, no auth, no deployment)
**Performance Goals**: Both plot instances render within 3 seconds of page load on the full dataset (~3,800 session-days)
**Constraints**: Read-only database access; no writes, no mutations. Sessions beyond 4 excluded from Plot 2.
**Scale/Scope**: 335 subjects (86 Intervention, 249 Observational), 509 sessions, 3,822 session-days

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Plot Specification Fidelity**: Plots 1 and 2 are directly specified in `docs/plot-specs/act.md` (v2.1, April 1 2026). All layout dimensions, colors, encodings, and interaction behaviors are sourced from that document.
- [x] **TypeScript + D3 Implementation Standard**: All shipped plot behavior is implemented in TypeScript, rendered with D3 v7. The existing Python code (data importer) is not part of the plot pipeline and remains unchanged.
- [x] **Read-Only Shared Data Access**: The server connects to `boost_actigraphy` using only SELECT queries. No INSERT, UPDATE, DELETE, or DDL statements are issued. Connection source documented: Unix socket `.local/`, port 55432, database `boost_actigraphy`.
- [x] **Validation by Deliverable Evidence**: Validation evidence defined — SQL reference values in `research.md`, proportion cross-check script, and manual visual verification against the Figma spec. No automated test suite assumed.
- [x] **Incremental Data Contract Definition**: Minimum required input schema defined in `data-model.md`. Two API endpoint contracts defined in `contracts/api.md`. No speculative pipeline abstraction introduced.

**Post-design re-check**: All constitution checks pass. No violations to track.

---

## Project Structure

### Documentation (this feature)

```text
specs/002-act-plots-1-2/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions and verified SQL reference values
├── data-model.md        # Phase 1 — source schema and derived entity definitions
├── quickstart.md        # Phase 1 — developer setup and validation steps
├── contracts/
│   └── api.md           # Phase 1 — server endpoint contracts
└── tasks.md             # Phase 2 output (/speckit.tasks — not yet created)
```

### Source Code

```text
plots/
└── act/
    ├── package.json         # Node project — D3 plotting app for accelerometer data
    ├── tsconfig.json        # TypeScript config (server + browser targets)
    ├── esbuild.config.ts    # Browser bundle build script
    ├── server/
    │   ├── index.ts         # Express server entry point (port 3000)
    │   └── db.ts            # PostgreSQL query functions (read-only)
    ├── src/
    │   ├── main.ts          # Browser entry point — fetch data, init plots
    │   ├── plot1.ts         # Plot 1: stacked proportional bar renderer
    │   └── plot2.ts         # Plot 2: participant × session heatmap renderer
    └── public/
        ├── index.html       # Single-page host (served by Express)
        └── bundle.js        # esbuild output (gitignored)
```

**Structure Decision**: Web application pattern (server + browser client) within a dedicated `plots/act/` directory. Isolated from the existing `src/` Python package tree. The server handles database access and serves JSON; the browser bundle handles all D3 rendering. This satisfies the constitution's TypeScript + D3 mandate without touching the Python importer.

---

## Complexity Tracking

> No constitution violations — this section is not applicable.

---

## Implementation Notes

### Group Derivation

The `subject_code` follows BIDS format (`sub-NNNN`). Group membership:
- **Observational**: `subject_code LIKE 'sub-7%'` (249 subjects in current data)
- **Intervention**: all others — `sub-6xxx`, `sub-8xxx`, etc. (86 subjects)

This is the correct pattern. A simple `LIKE '7%'` check would return zero rows.

### Plot 1 Query Pattern

```sql
-- Day-type averages for one group (replace filter for observational)
SELECT
  'All Days' AS day_type,
  AVG(sleep_minutes)         AS sleep_min,
  AVG(sedentary_minutes)     AS sed_min,
  AVG(light_pa_minutes)      AS light_min,
  AVG(moderate_pa_minutes)   AS mod_min,
  AVG(vigorous_pa_minutes)   AS vig_min
FROM subjects s
JOIN sessions se ON se.subject_id = s.subject_id
JOIN session_days sd ON sd.session_id = se.session_id
WHERE s.subject_code NOT LIKE 'sub-7%'   -- swap for observational
UNION ALL
SELECT
  CASE WHEN weekday IN ('Saturday', 'Sunday') THEN 'Weekends' ELSE 'Weekdays' END,
  AVG(sleep_minutes), AVG(sedentary_minutes), AVG(light_pa_minutes),
  AVG(moderate_pa_minutes), AVG(vigorous_pa_minutes)
FROM subjects s
JOIN sessions se ON se.subject_id = s.subject_id
JOIN session_days sd ON sd.session_id = se.session_id
WHERE s.subject_code NOT LIKE 'sub-7%'
GROUP BY 1
ORDER BY day_type;
```

### Plot 2 Query Pattern

```sql
SELECT
  s.subject_code,
  se.session_number,
  AVG(sd.sedentary_minutes) AS avg_sed_min,
  AVG(sd.mvpa_minutes)      AS avg_mvpa_min
FROM subjects s
JOIN sessions se ON se.subject_id = s.subject_id
JOIN session_days sd ON sd.session_id = se.session_id
WHERE s.subject_code NOT LIKE 'sub-7%'
  AND se.session_number <= 4
GROUP BY s.subject_code, se.session_number
ORDER BY s.subject_code, se.session_number;
```

Client-side: pivot by subject_code, compute `delta_sed`, sort descending.

### Canvas Layout

Per `docs/plot-specs/act.md` (v2.1). The two Plot 1 instances (Intervention + Observational) and Plot 2 share the 1440×1024px canvas:

| Region | X | Y | Width | Height | Notes |
|--------|---|---|-------|--------|-------|
| Plot 1 (Intervention) card | 60 | 40 | 1320 | 296 | Top card — spec region |
| Plot 1 (Observational) card | 60 | 375 | 640 | 296 | Reuses Plot 2 card region |
| Plot 2 (Intervention) card | 740 | 375 | 640 | 610 | Lower-right card |

> **Layout note**: The original spec was designed for a single combined Plot 1. With two separate group instances, Plot 1 Intervention occupies the full top card; Plot 1 Observational occupies the lower-left card slot (normally Plot 2's position). Plot 2 occupies the lower-right. This layout maximizes use of the canvas without resizing cards.

### Color Palette Constants

```typescript
const COLORS = {
  sleep: '#4A5568',
  sedentary: '#6B7890',
  light: '#8CC299',
  moderate: '#FCBA42',
  vigorous: '#DE4545',
  intervention: '#247F8F',
  observational: '#DE7833',
  missing: '#E0E0E8',
  background: '#F7F7F9',
  card: '#FFFFFF',
  textPrimary: '#212130',
  textSecondary: '#737380',
};
```

### Validation Reference (Plot 1 — Intervention)

From verified SQL query (see `research.md`):

| Day Type | Sleep % | Sed % | Light % | Mod % | Vig % |
|----------|---------|-------|---------|-------|-------|
| All Days | 30.4% | 53.6% | 10.3% | 5.6% | 0.2% |
| Weekdays | 29.6% | 54.7% | 10.0% | 5.5% | 0.2% |
| Weekends | 32.5% | 50.6% | 11.2% | 5.6% | 0.1% |

The rendered Plot 1 segments must match these values within 0.1 percentage points.
