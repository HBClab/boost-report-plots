# Tasks: Accelerometer Activity Plots 1 & 2

**Input**: Design documents from `/specs/002-act-plots-1-2/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/api.md ✓

**Tests/Validation**: No automated test suite required (Constitution Principle IV). Validation is by manual visual verification against SQL reference values from `research.md`.

**Organization**: Tasks grouped by user story — each story is independently completable and verifiable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on each other)
- **[Story]**: Which user story this task belongs to
- Exact file paths are included in all descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the `plots/act/` TypeScript project and configure the build toolchain.

- [x] T001 Create directory structure `plots/act/server/`, `plots/act/src/`, `plots/act/public/` per implementation plan
- [x] T002 Create `plots/act/package.json` with dependencies: `express`, `pg`, `d3`, `esbuild`, and devDependencies: `typescript`, `@types/express`, `@types/pg`, `@types/d3`, `@types/node`
- [x] T003 [P] Create `plots/act/tsconfig.json` with two targets: server (CommonJS, Node 18) and browser (ESNext); `strict: true`, `noImplicitAny: true`
- [x] T004 [P] Create `plots/act/esbuild.config.ts` — bundles `plots/act/src/main.ts` to `plots/act/public/bundle.js`; inline sourcemaps for dev
- [x] T005 [P] Create `plots/act/public/index.html` — single-page host: loads `bundle.js`, contains an `<svg id="canvas" width="1440" height="1024">` root element and a "Save SVG" button

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Server infrastructure, database connection, and the shared canvas/color constants that all plots depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T006 Create `plots/act/server/db.ts` — exports a `pg.Pool` initialized from `process.env.ACTIGRAPHY_DB_URL`; exports a `query(sql, params)` helper; throws a clear error if the env var is missing
- [x] T007 Create `plots/act/server/index.ts` — Express app on port 3000; serves `plots/act/public/` as static files; mounts API routes; logs startup DB URL (without credentials)
- [x] T008 Add `npm run dev` script in `package.json` using `ts-node` or `tsx` for the server + `esbuild --watch` for the client bundle; add `npm run build` and `npm start` scripts
- [x] T009 [P] Create `plots/act/src/constants.ts` — exports the full `COLORS` palette object and the `SEGMENTS` array (`['sleep','sed','light','mod','vig']`) from plan.md; no other logic
- [x] T010 [P] Create `plots/act/src/types.ts` — exports TypeScript interfaces: `DayTypeAggregate`, `ParticipantSessionSummary`, `SessionEntry` matching the shapes in `contracts/api.md`

**Checkpoint**: Server starts on port 3000, serves `index.html`, and `GET /health` returns `{"status":"ok"}`. Canvas SVG element is visible in browser.

---

## Phase 3: User Story 1 — Group-Level Activity Composition (Priority: P1) 🎯 MVP

**Goal**: Plot 1 renders for both Intervention and Observational groups — three stacked 100% bars each, with correct colors, proportions, inline labels, tooltips, and legend.

**Independent Validation**: Open browser, confirm two labeled Plot 1 sections appear. Verify Intervention "All Days" segment proportions: Sleep ≈ 30.4%, Sed ≈ 53.6%, Light ≈ 10.3%, Mod ≈ 5.6%, Vig ≈ 0.2% (within 0.1pp). Hover any segment — tooltip shows activity name, raw minutes, percentage.

### Validation Preparation for User Story 1

- [x] T011 [P] [US1] Create `specs/002-act-plots-1-2/validate-plot1.sql` — reference SQL query that produces the day-type averages for both groups (copy from `research.md`); add a comment showing expected Intervention results
- [x] T012 [P] [US1] Update `specs/002-act-plots-1-2/quickstart.md` — add a "Validate Plot 1" section with exact steps: run the SQL, compare output to browser proportions, confirm within 0.1pp tolerance

### Server: Plot 1 API

- [x] T013 [US1] Add `plot1Query(group: 'intervention' | 'observational'): Promise<DayTypeAggregate[]>` to `plots/act/server/db.ts` — implements the UNION ALL SQL from `plan.md`; maps column names to `DayTypeAggregate` fields
- [x] T014 [US1] Add `GET /api/plot1/:group` route in `plots/act/server/index.ts` — validates `:group` param, calls `plot1Query`, returns JSON per `contracts/api.md`; returns 400 on invalid group

### Client: Plot 1 Renderer

- [x] T015 [US1] Create `plots/act/src/plot1.ts` — exports `renderPlot1(svgContainer: d3.Selection, data: DayTypeAggregate[], groupLabel: string, layout: CardLayout): void`
  - Draws card background (white, 12px corner radius) at specified card bounds
  - Renders three horizontal bars using `d3.stack()` on normalized data
  - Segment order: sleep → sed → light → mod → vig (left to right)
  - Segment colors from `COLORS` in `constants.ts`
  - 2px white dividers between segments
  - X-axis: 0–100% with gridlines at 0, 25, 50, 75, 100%; tick labels in secondary text color
  - Y-axis: day type labels left of bars (13px Medium, no axis line); label column 84px wide
  - Bar height: 46px; 20px gap between rows
- [x] T016 [US1] Extend `plots/act/src/plot1.ts` — inline percentage labels: white Semi Bold 11px, centered in segment, rendered only when segment width > 44px
- [x] T017 [US1] Extend `plots/act/src/plot1.ts` — legend: five colored 13×13px squares with 3px radius + labels (12px Regular, secondary color), positioned below bars, left-aligned at bar left edge, 115px spacing between items
- [x] T018 [US1] Extend `plots/act/src/plot1.ts` — tooltips: on `mouseover` show `{activityName}: {rawMinutes} min ({pct}%)`; dismiss on `mouseout`
- [x] T019 [US1] Extend `plots/act/src/plot1.ts` — footnote text at 10px secondary color below legend: `"CI/error bands available in interactive D3 version"`

### Client: Main Entry Point for US1

- [x] T020 [US1] Create `plots/act/src/main.ts` — fetches `/api/plot1/intervention` and `/api/plot1/observational` in parallel; selects the root `<svg#canvas>`; calls `renderPlot1` for Intervention at card position `{x:60, y:40, w:1320, h:296}` with label "Intervention"; calls `renderPlot1` for Observational at `{x:60, y:375, w:640, h:296}` with label "Observational"

**Checkpoint**: Both Plot 1 instances render correctly. SQL cross-check passes within tolerance.

---

## Phase 4: User Story 2 — Individual-Level Session Heatmap (Priority: P2)

**Goal**: Plot 2 renders for the Intervention group — per-participant sedentary and MVPA heatmap across sessions 1–4, sorted by Δ sedentary, with delta column markers.

**Independent Validation**: Count rendered participant rows and confirm it equals the number of Intervention subjects with data. Verify top row has the most negative delta (greatest sedentary decrease), bottom row has the most positive. Hover a cell — color intensity should visually correspond to high/low values.

### Validation Preparation for User Story 2

- [x] T021 [P] [US2] Create `specs/002-act-plots-1-2/validate-plot2.sql` — SQL query returning per-subject per-session averages for Intervention (sessions 1–4), plus computed delta, in sorted order; confirms expected row count
- [x] T022 [P] [US2] Update `specs/002-act-plots-1-2/quickstart.md` — add "Validate Plot 2" section: run SQL, compare row count and top-3 / bottom-3 sort positions against the browser rendering

### Server: Plot 2 API

- [x] T023 [US2] Add `plot2Query(): Promise<{subject_code: string, sessions: SessionEntry[]}[]>` to `plots/act/server/db.ts` — implements the per-subject × session SQL from `plan.md`; filters to Intervention (`NOT LIKE 'sub-7%'`), sessions 1–4 only; groups by subject_code
- [x] T024 [US2] Add `GET /api/plot2` route in `plots/act/server/index.ts` — calls `plot2Query`, returns JSON per `contracts/api.md`

### Client: Plot 2 Renderer

- [x] T025 [US2] Create `plots/act/src/plot2.ts` — exports `renderPlot2(svgContainer: d3.Selection, data: SubjectSessionData[], layout: CardLayout): void`
  - Client-side sort: compute `delta_sed = lastSession.avg_sed_min − firstSession.avg_sed_min`; sort ascending (most negative = top)
  - Fills missing sessions (1–4) with `null` → renders as `#E0E0E8`
  - Color scales: Sedentary `d3.scaleSequential([minSed, maxSed], [COLORS.missing, COLORS.sedentary])`; MVPA `d3.scaleSequential([minMvpa, maxMvpa], [COLORS.missing, COLORS.intervention])`
- [x] T026 [US2] Extend `plots/act/src/plot2.ts` — heatmap cell layout per spec: cell 66px wide × 7px tall, 1px gap between rows; Sedentary panel left, MVPA panel right, 14px delta column between panels; session labels S1–S4 above columns (10px Regular, secondary text)
- [x] T027 [US2] Extend `plots/act/src/plot2.ts` — delta column markers: ▲ for sedentary decrease (teal `#247F8F`), ▼ for increase (orange `#DE7833`); marker height scales proportionally to |delta_sed| (capped at 12px; minimum 2px for near-zero deltas)
- [x] T028 [US2] Extend `plots/act/src/plot2.ts` — color scale legend bars below each panel: gradient from `#E0E0E8` (Low) to panel high color; labeled "Sedentary" and "MVPA"

### Client: Integrate US2 into Main Entry

- [x] T029 [US2] Update `plots/act/src/main.ts` — add fetch of `/api/plot2`; call `renderPlot2` at card position `{x:740, y:375, w:640, h:610}` after Plot 1 renders

**Checkpoint**: Plot 2 renders with correct participant count, correct sort order, missing session cells in neutral color, delta markers visible.

---

## Phase 5: User Story 3 — Save SVG Output (Priority: P3)

**Goal**: Clicking "Save SVG" downloads the current rendered canvas as a valid SVG file.

**Independent Validation**: Click button → SVG file downloads → open in Inkscape/browser → all chart elements visible and styled correctly.

### Validation Preparation for User Story 3

- [x] T030 [P] [US3] Update `specs/002-act-plots-1-2/quickstart.md` — add "Validate Save SVG" section: click button, open SVG, verify text/colors/shapes match canvas specification

### Implementation for User Story 3

- [x] T031 [US3] Create `plots/act/src/save.ts` — exports `initSaveButton(svgEl: SVGSVGElement, filename: string): void`; on button click: serializes SVG to string using `XMLSerializer`, creates a `Blob` with MIME type `image/svg+xml`, triggers download via a temporary `<a>` element
- [x] T032 [US3] Update `plots/act/src/main.ts` — import `initSaveButton`; call after all plots render, passing the root SVG element and filename `"accelerometer-plots.svg"`

**Checkpoint**: Downloaded SVG opens in a vector graphics viewer and shows both Plot 1 instances and Plot 2 intact.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Visual polish, canvas background, card card rendering, and documentation finalization.

- [x] T033 [P] Add canvas background fill to `plots/act/src/main.ts` — insert a `<rect>` at `{x:0, y:0, w:1440, h:1024}` with fill `#F7F7F9` as first child of the SVG (renders behind all cards)
- [x] T034 [P] Add card title text to each plot section in `plots/act/src/plot1.ts` and `plots/act/src/plot2.ts` — group label as title above each card (14px Semi Bold, `#212130`)
- [x] T035 [P] Add `GET /health` route to `plots/act/server/index.ts` returning `{"status":"ok"}` after confirming DB connectivity with a lightweight `SELECT 1` query
- [x] T036 Add `.gitignore` entry in `plots/act/` to exclude `public/bundle.js`, `node_modules/`, and `dist/`
- [x] T037 [P] Update `CLAUDE.md` — verify project structure section reflects `plots/act/` tree and pnpm commands are correct

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Phase 2
- **User Story 2 (Phase 4)**: Depends on Phase 2; Phase 3 (Plot 1) must render in `main.ts` before US2 adds to it — integrate sequentially
- **User Story 3 (Phase 5)**: Depends on Phase 2; can begin once SVG element exists (Phase 3 complete)
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Unblocked after Phase 2 — no story dependencies
- **US2 (P2)**: Unblocked after Phase 2 — `main.ts` update (T029) must follow T020 from US1
- **US3 (P3)**: Unblocked after Phase 3 (needs rendered SVG to test against)

### Within Each User Story

- Validation SQL and quickstart updates can start in parallel with server work
- Server query function (db.ts) must precede the API route
- API route must precede client renderer (needed for browser fetch)
- Renderer module complete before `main.ts` integration call

### Parallel Opportunities

- T003, T004, T005 — all setup files, no interdependence
- T009, T010 — constants and types have no shared state
- T011, T012 — validation prep for US1 runs alongside server work (T013, T014)
- T021, T022 — validation prep for US2 runs alongside server work (T023, T024)
- T030 — validation prep for US3 runs alongside T031
- T033, T034, T035, T036, T037 — all polish tasks touch different files

---

## Parallel Execution Examples

### Phase 1 Setup (all parallel)
```
T001 Create directory structure
T003 Create tsconfig.json
T004 Create esbuild.config.ts
T005 Create public/index.html
→ then: T002 Create package.json and run pnpm install
```

### Phase 3 US1 (validation + server in parallel, then client)
```
[Parallel batch 1]
T011 Create validate-plot1.sql
T012 Update quickstart.md (US1 section)
T013 Add plot1Query to db.ts

[Sequential after T013]
T014 Add GET /api/plot1/:group route

[Sequential after T014]
T015 → T016 → T017 → T018 → T019 (plot1.ts, extend in order)
T020 Create main.ts with US1 fetch + render calls
```

### Phase 4 US2 (validation + server in parallel, then client)
```
[Parallel batch]
T021 Create validate-plot2.sql
T022 Update quickstart.md (US2 section)
T023 Add plot2Query to db.ts

[Sequential after T023]
T024 Add GET /api/plot2 route

[Sequential after T024]
T025 → T026 → T027 → T028 (plot2.ts, extend in order)
T029 Update main.ts with US2 fetch + render call
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T005)
2. Complete Phase 2: Foundational (T006–T010) — **required before any story**
3. Complete Phase 3: User Story 1 (T011–T020)
4. **STOP and VALIDATE**: Run `validate-plot1.sql`, compare to browser, confirm proportions within 0.1pp, verify tooltips
5. Result: Working browser-based Plot 1 for both groups — report-ready

### Incremental Delivery

1. Setup + Foundational → server running, blank canvas visible
2. US1 complete → Plot 1 for both groups validated → **MVP deliverable**
3. US2 complete → Plot 2 added → validate sort order and row count
4. US3 complete → Save SVG button works → validate downloaded file
5. Polish → canvas background, titles, health check, docs

---

## Notes

- All tasks touch separate files unless noted — conflicts are minimal
- Run `pnpm build && pnpm start` to check each phase visually
- Commit after each phase checkpoint
- The spec says "Observational only has 1 session" — this is approximately true in the data (249 of 286 sessions are session 1) but the Plot 2 exclusion is by group, not by session count
- Group SQL filter: `subject_code LIKE 'sub-7%'` (not `LIKE '7%'`) — see research.md
- Validation reference values are in `research.md` and `validate-plot1.sql` (created in T011)
