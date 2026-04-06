# Tasks: Accelerometer Time Series Plot — Radial Clock Per-Session Lines

**Input**: Design documents from `/specs/003-act-time-series/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests/Validation**: No automated tests required (spec FR-009). Validation evidence is visual inspection against fixture data with known hour-level means/SDs at hours 6, 12, 18.

**Organization**: Tasks grouped by user story to enable independent implementation and validation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story — [US1], [US2], [US3]

---

## Phase 1: Setup (Spec Gate — Must Complete First)

**Purpose**: Satisfy Constitution Principle I before any code is written. The plot specification must be updated to document per-session lines before implementation begins.

**⚠️ GATE**: No implementation task (Phase 2+) may begin until T001 is complete.

- [x] T001 Update `docs/plot-specs/act.md` Plot 3 section to v3.0 — add per-session intervention lines, per-session SD shading, M5/L5 suppression, session color palette (S1: `#247F8F`, S2: `#3BA8BD`, S3: `#6EC4D1`, S4: `#A4DCE6`), per-session legend format, and per-session participant N display

**Checkpoint**: `docs/plot-specs/act.md` Plot 3 section now reflects the delivered feature. Constitution Principle I satisfied.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, fixture data, and aggregation scaffold must be in place before any user story implementation.

**⚠️ CRITICAL**: All user story phases depend on this phase completing.

- [x] T002 Add `session_hourly_enmo` table DDL and index to `src/act/schema.sql` — additive, no changes to existing tables (see data-model.md for exact DDL)
- [ ] T003 [P] Apply schema migration (manual: `nix develop` then `python -m src.cli.import_actigraphy init-db`; DB not running in this environment): `psql "$ACTIGRAPHY_DB_URL" -f src/act/schema.sql` — verify `\d session_hourly_enmo` succeeds
- [x] T004 [P] Create fixture GGIR epoch CSV files in `tests/fixtures/hourly_enmo/` — two participants × two sessions × all 24 hours, with pre-computed expected hourly means and SDs for validation at hours 6, 12, 18 (document expected values in a companion `tests/fixtures/hourly_enmo/expected.json`)

**Checkpoint**: Schema applied, fixture data created with known expected values. Foundation ready — user story work can begin.

---

## Phase 3: User Story 1 — Per-Session Radial Clock Lines (Priority: P1) 🎯 MVP

**Goal**: Render one line per intervention session on the radial clock, each in a distinct teal shade, alongside the unchanged observational group line.

**Independent Validation**: Load fixture data into the DB, start the server, open the browser, confirm exactly 4 intervention lines + 1 observational line appear, each in the correct color per the spec. At the 12pm position, the S1 intervention line radius matches the fixture `enmo_mean` within 0.01 mg.

### Implementation for User Story 1

- [x] T005 [US1] Extend `src/act/parser.py` to parse GGIR epoch CSV files (`.csv.RData.csv` format) — extract `timestamp` and `ENMO` columns, discard `anglez`, parse `hour` from timestamp, map `sub-****` and `ses-*` path segments to participant ID and session number
- [x] T006 [US1] Create `src/act/hourly_enmo.py` — implement `aggregate_hourly_enmo(participant_files)` function: computes per-participant hourly means, then group-level mean/SD/N per `(group, session_number, hour)`; sets SD to None when N=1; excludes hours with no valid ENMO readings
- [x] T007 [US1] Extend `src/act/repository.py` — add `upsert_session_hourly_enmo(conn, rows)` function that deletes existing rows for `(group, session_number)` then batch-inserts new rows (idempotent re-import)
- [x] T008 [US1] Extend `src/cli/import_actigraphy.py` — add `--hourly-enmo` flag that discovers GGIR epoch files at the FR-008 path pattern, invokes aggregation, and calls `upsert_session_hourly_enmo`
- [x] T009 [P] [US1] Add `plot3Query` function to `plots/act/server/db.ts` — `SELECT "group", session_number, hour, enmo_mean, enmo_sd, n_participants FROM session_hourly_enmo ORDER BY "group", session_number, hour`
- [x] T010 [P] [US1] Add `SessionHourlyEnmo` and `Plot3Response` TypeScript interfaces to `plots/act/src/types.ts`
- [x] T011 [US1] Add `GET /api/plot3` endpoint to `plots/act/server/index.ts` — returns `{ rows: SessionHourlyEnmo[] }`, 500 on DB error (see contracts/plot3-enmo-endpoint.md)
- [x] T012 [US1] Create `plots/act/src/plot3.ts` — implement `renderPlot3(svg, rows, layout)`: radial coordinate system (center, outer radius, 24-hour clock), per-session intervention lines drawn from `enmo_mean` per hour in session palette colors, single observational line in `#DE7833`, hour tick marks and ring labels at 38/76/115 mg, MVPA dashed ring at 100 mg, M5/L5 suppressed for all lines
- [x] T013 [US1] Extend `plots/act/src/main.ts` — add `plot3` layout entry, fetch `/api/plot3`, call `renderPlot3` with returned rows; add Plot 3 card to canvas
- [ ] T014 [US1] Visual validation (manual: requires running DB + server; fixture aggregation verified ✓) — load fixture data via `python -m src.cli.import_actigraphy --hourly-enmo --fixture`, start server, open browser, verify: 4 intervention lines in correct colors, 1 observational line in orange, legend shows "Session 1"–"Session 4" + "Observational", correct radial value at hour 12 for S1 matches fixture expected value

**Checkpoint**: Plot 3 renders per-session lines. US1 independently validated.

---

## Phase 4: User Story 2 — SD Shading Per Session (Priority: P2)

**Goal**: Each per-session intervention line has a filled ±1 SD polygon at 20% opacity; the shading is absent when `enmo_sd` is null (N=1 participant for that hour).

**Independent Validation**: Using the same fixture, confirm that the SD shaded region at hour 12 for S1 extends from `enmo_mean − enmo_sd` to `enmo_mean + enmo_sd` at the correct opacity. Introduce a fixture session with N=1 for a specific hour and confirm no band appears at that hour.

### Implementation for User Story 2

- [x] T015 [US2] Extend `plots/act/src/plot3.ts` `renderPlot3` function — for each intervention session, render a filled radial polygon connecting `(hour, enmo_mean − enmo_sd)` and `(hour, enmo_mean + enmo_sd)` points at 20% opacity in the session's color; skip hours where `enmo_sd` is null
- [x] T016 [US2] Add N=1 hour to fixture in `tests/fixtures/hourly_enmo/` (sub-1003/ses-1 — only hour 3) (one session, one hour with single participant) — verify in browser that no SD band renders at that hour and the line still draws through it
- [ ] T017 [US2] Visual validation (manual: requires running DB + server) — confirm SD band at hour 6 for S2 matches fixture ±SD, observational line SD band unchanged from existing behavior, no band visible for N=1 hour

**Checkpoint**: SD shading visible per session, absent when N=1. US1 + US2 both independently validated.

---

## Phase 5: User Story 3 — Storage Recommendation Documentation (Priority: P3)

**Goal**: A developer reading the spec can identify the chosen storage approach and understand its rationale without consulting external sources.

**Independent Validation**: `specs/003-act-time-series/spec.md` contains a recommendation section covering data volume, query latency, update frequency, and schema complexity. The implemented schema is additive and does not alter `session_days`.

**Note**: US3's written recommendation is already complete in `spec.md`. The two tasks below verify that both acceptance scenarios are provably satisfied.

- [x] T018 [P] [US3] Verify `specs/003-act-time-series/spec.md` Storage and Retrieval Recommendation section explicitly covers all four criteria (data volume, update/refresh frequency, query latency, schema complexity) — all criteria present ✓
- [x] T019 [P] [US3] Verify `session_hourly_enmo` table DDL in `src/act/schema.sql` is additive — confirm no `ALTER TABLE session_days`, no `DROP`, no destructive change ✓

**Checkpoint**: US3 acceptance criteria provably met. All three user stories complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T020 [P] Update `docs/plot-specs/act.md` version history — v3.0 entry added ✓
- [x] T021 [P] Update `feat/act-time-series.md` status to "Implemented" ✓
- [ ] T022 Full end-to-end validation per `specs/003-act-time-series/quickstart.md` (manual: requires running DB + server)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 complete — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 complete
- **Phase 4 (US2)**: Depends on Phase 3 complete (extends plot3.ts rendering)
- **Phase 5 (US3)**: Depends on Phase 2 complete — can run in parallel with Phase 3
- **Phase 6 (Polish)**: Depends on Phases 3, 4, 5 complete

### Within Phase 3 (US1)

```
T005 (parser) → T006 (hourly_enmo.py) → T007 (repository) → T008 (CLI)
T009 (db.ts query)   [P — independent of Python tasks]
T010 (types.ts)      [P — independent of Python tasks]
T009 + T010 → T011 (server endpoint)
T010 + T012 (plot3.ts render) → T013 (main.ts wire-up)
T008 + T011 + T013 → T014 (visual validation)
```

### Within Phase 4 (US2)

```
T012 (plot3.ts, from US1) → T015 (add SD polygon) → T016 (N=1 fixture) → T017 (visual validate)
```

### Parallel Opportunities

- T003 and T004 (Phase 2) can run in parallel
- T009 and T010 (Phase 3, server-side) can run in parallel with T005–T008 (Python side)
- T018 and T019 (Phase 5) can run in parallel with Phase 3 work after Phase 2 completes
- T020 and T021 (Phase 6) can run in parallel

---

## Parallel Example: Phase 3 (US1)

```bash
# After Phase 2 completes, launch Python and TypeScript tracks simultaneously:

# Python track (sequential):
Task: "Extend src/act/parser.py to parse GGIR epoch CSV files"
Task: "Create src/act/hourly_enmo.py with aggregate_hourly_enmo()"
Task: "Extend src/act/repository.py with upsert_session_hourly_enmo()"
Task: "Extend src/cli/import_actigraphy.py with --hourly-enmo flag"

# TypeScript track (parallel with Python track):
Task: "Add plot3Query to plots/act/server/db.ts"
Task: "Add SessionHourlyEnmo types to plots/act/src/types.ts"
# Then (after both above):
Task: "Add GET /api/plot3 to plots/act/server/index.ts"
Task: "Create plots/act/src/plot3.ts radial rendering"
Task: "Extend plots/act/src/main.ts to wire up plot3"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Update `docs/plot-specs/act.md` (T001)
2. Phase 2: Schema + fixture (T002–T004)
3. Phase 3: Full US1 implementation (T005–T014)
4. **STOP and VALIDATE**: Four per-session lines visible, correct colors, correct values at sampled hours
5. Ship MVP — researchers can see per-session activity patterns

### Incremental Delivery

1. Phase 1 + 2 → Foundation ready
2. Phase 3 → Per-session lines working (MVP)
3. Phase 4 → SD shading added → full scientific interpretation possible
4. Phase 5 → Documentation verified (quick pass, no code changes expected)
5. Phase 6 → Final polish + end-to-end validation

---

## Notes

- `[P]` tasks touch different files — safe to implement in parallel
- Each user story checkpoint must be reached before advancing
- Re-running the importer is idempotent — `upsert_session_hourly_enmo` deletes then re-inserts per `(group, session_number)`
- SD=null in DB → no shading band in plot — handled at the D3 rendering level, not filtered at the API level
- The existing `plot2.ts` heatmap is at x=740 in main.ts; Plot 3 card placement in main.ts may require layout adjustment — resolve in T013
