# Tasks: Heart Rate Plots

**Input**: Design documents from `/specs/004-hr-plots/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Tests/Validation**: No automated test suite required. Validation is by manual inspection against `data/zone_out.csv`, quickstart checks, and exported SVG review.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: User story label for traceability (`[US1]`, `[US2]`, `[US3]`)
- Every task includes an exact file path

---

## Phase 1: Setup (Spec Gate)

**Purpose**: Satisfy the constitution gate before implementation starts.

**⚠️ GATE**: No implementation task may begin until T001 is complete.

- [X] T001 Update `docs/plot-specs/hr.md` to document the weekly 75% adherence rule, aligned supervised/unsupervised heatmaps, and any resulting legend or layout changes for the HR dashboard

**Checkpoint**: Constitution Principle I is satisfied and the approved HR plot contract matches the planned feature behavior.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the shared `plots/hr/` application skeleton, read-only CSV access, and core transformation layer required by all user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Create the directory structure `plots/hr/server/`, `plots/hr/src/`, and `plots/hr/public/` per `specs/004-hr-plots/plan.md`
- [X] T003 Create `plots/hr/package.json` with TypeScript, D3, Express, esbuild, and the `dev`, `build`, and `start` scripts described in `specs/004-hr-plots/quickstart.md`
- [X] T004 [P] Create `plots/hr/tsconfig.json` for strict TypeScript compilation of server and browser code
- [X] T005 [P] Create `plots/hr/esbuild.config.ts` to bundle `plots/hr/src/main.ts` into `plots/hr/public/bundle.js`
- [X] T006 [P] Create `plots/hr/public/index.html` with the dashboard host markup, root SVG container, and Save SVG control
- [X] T007 [P] Create `plots/hr/public/styles.css` with the shared dashboard styles and card presentation needed by all plots
- [X] T008 Create `plots/hr/server/index.ts` to serve `plots/hr/public/` and expose the read-only `/data/zone_out.csv` route defined in `specs/004-hr-plots/contracts/input-data.md`
- [X] T009 [P] Create `plots/hr/src/types.ts` with `HrSessionRow`, `WeeklyGroupZoneSummary`, `WeeklyGroupAdherenceSummary`, `WeeklySubjectAdherenceSummary`, `AlignedSubjectRoster`, and layout helper interfaces from `specs/004-hr-plots/data-model.md`
- [X] T010 [P] Create `plots/hr/src/transforms.ts` to parse CSV rows, filter weeks 1 through 6, derive group summaries, derive subject-week adherence states, and build the aligned subject roster
- [X] T011 Update `plots/hr/src/main.ts` to load `/data/zone_out.csv`, parse it through `transforms.ts`, create the root SVG canvas, and provide shared layout data to story renderers

**Checkpoint**: The HR app starts locally, serves the CSV read-only, and produces parsed week-1-through-6 view models ready for rendering.

---

## Phase 3: User Story 1 - Review Weekly Zone Time by Group (Priority: P1) 🎯 MVP

**Goal**: Render the weekly grouped stacked bar chart for supervised and unsupervised zone-time allocation.

**Independent Validation**: Open the dashboard, confirm weeks 1 through 6 render for both groups, then manually verify one group-week per side against hand-calculated mean `time_below_s`, `time_in_allowed_s`, and `time_above_s` values from `data/zone_out.csv`.

### Validation for User Story 1

- [X] T012 [P] [US1] Update `specs/004-hr-plots/quickstart.md` with explicit manual spot-check instructions for one supervised week and one unsupervised week in the zone-time chart

### Implementation for User Story 1

- [X] T013 [P] [US1] Create `plots/hr/src/plot1.ts` with the grouped stacked bar renderer for weekly supervised and unsupervised zone-time summaries
- [X] T014 [US1] Extend `plots/hr/src/plot1.ts` to render the documented HR plot titles, weekly labels, group bars, zone segments, and legend from `docs/plot-specs/hr.md`
- [X] T015 [US1] Update `plots/hr/src/main.ts` to call `plot1.ts` with the derived `WeeklyGroupZoneSummary` data and place the chart in the dashboard layout
- [X] T016 [US1] Refine `plots/hr/src/plot1.ts` to handle missing group-week data without collapsing the week position in the chart

**Checkpoint**: User Story 1 is independently functional and manually verifiable from the CSV.

---

## Phase 4: User Story 2 - Review Weekly Adherence Trends (Priority: P2)

**Goal**: Render the weekly group adherence trend with bounded variability bands for supervised and unsupervised sessions.

**Independent Validation**: Pick one group-week, compute `met_sessions / total_sessions` from `data/zone_out.csv`, confirm the rendered adherence point matches, and confirm the variability band stays within 0% to 100%.

### Validation for User Story 2

- [X] T017 [P] [US2] Update `specs/004-hr-plots/quickstart.md` with explicit manual validation steps for the weekly adherence trend and the 0% to 100% band bounds

### Implementation for User Story 2

- [X] T018 [P] [US2] Create `plots/hr/src/plot2.ts` with the weekly adherence line-and-band renderer using `WeeklyGroupAdherenceSummary`
- [X] T019 [US2] Extend `plots/hr/src/plot2.ts` to draw supervised and unsupervised trend lines, point markers, axes, titles, and clipped variability bands per `docs/plot-specs/hr.md`
- [X] T020 [US2] Update `plots/hr/src/main.ts` to pass the derived adherence summaries into `plot2.ts` and place the adherence trend in the shared dashboard layout
- [X] T021 [US2] Refine `plots/hr/src/transforms.ts` so the variability-band inputs are derived from per-subject weekly adherence rates and clipped to the valid 0 to 1 range before rendering

**Checkpoint**: User Story 2 is independently functional and manually verifiable from the CSV.

---

## Phase 5: User Story 3 - Compare Individual Weekly Adherence Consistently Across Groups (Priority: P3)

**Goal**: Render aligned supervised and unsupervised weekly adherence heatmaps using the 75% threshold and a shared subject roster.

**Independent Validation**: Manually verify at least five multi-session subject-weeks against the `met_sessions / total_sessions >= 0.75` rule and confirm at least three sampled subjects occupy the same row position across both heatmaps, including one supervised-only subject.

### Validation for User Story 3

- [X] T022 [P] [US3] Update `specs/004-hr-plots/quickstart.md` with explicit manual checks for the 75% weekly threshold, no-data cells, and aligned subject row positions across the two heatmaps

### Implementation for User Story 3

- [X] T023 [P] [US3] Extend `plots/hr/src/transforms.ts` to derive `WeeklySubjectAdherenceSummary` records with `met`, `not_met`, and `no_data` states from the weekly 75% threshold
- [X] T024 [P] [US3] Extend `plots/hr/src/transforms.ts` to build the alphabetical union `AlignedSubjectRoster` for supervised and unsupervised subjects in weeks 1 through 6
- [X] T025 [US3] Extend `plots/hr/src/plot2.ts` to render aligned supervised and unsupervised heatmap panels beneath the adherence trend using the derived subject-week summaries and shared roster
- [X] T026 [US3] Extend `plots/hr/src/plot2.ts` to show explicit no-data cells for missing group-week combinations and preserve row alignment for supervised-only subjects
- [X] T027 [US3] Update `plots/hr/src/main.ts` to pass the aligned heatmap data into `plot2.ts` and render the full combined adherence view

**Checkpoint**: User Story 3 is independently functional and manually verifiable from the CSV.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finish export, documentation, and end-to-end validation across all stories.

- [X] T028 [P] Create `plots/hr/src/export-svg.ts` to serialize the rendered SVG and trigger the dashboard download
- [X] T029 Update `plots/hr/src/main.ts` to wire the Save SVG control to `export-svg.ts` and use the final filename for the HR dashboard export
- [X] T030 [P] Add `plots/hr/.gitignore` entries for `node_modules/`, generated bundles, and build output
- [X] T031 [P] Update `feat/hr-plots.md` to reflect implementation status and the approved HR plot-spec change once implementation is complete
- [ ] T032 Run the full manual validation flow in `specs/004-hr-plots/quickstart.md` and record any final adjustments needed in `specs/004-hr-plots/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup / Spec Gate)**: starts immediately and blocks all implementation
- **Phase 2 (Foundational)**: depends on T001 and blocks all user stories
- **Phase 3 (US1)**: depends on Phase 2 completion
- **Phase 4 (US2)**: depends on Phase 2 completion and can integrate after `plots/hr/src/main.ts` exists
- **Phase 5 (US3)**: depends on Phase 2 completion and extends the shared adherence view from US2
- **Phase 6 (Polish)**: depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: no dependency on other user stories after Phase 2
- **US2 (P2)**: no dependency on US1 data logic, but shares the dashboard entry point and should integrate after the foundational app shell exists
- **US3 (P3)**: depends on the shared adherence view started in US2 because the heatmaps live in the same dashboard section

### Within Each User Story

- Validation-documentation tasks can begin in parallel with renderer implementation
- Transformation tasks must be in place before dependent rendering tasks
- Renderer modules should be complete before wiring them into `plots/hr/src/main.ts`
- Manual validation should happen at each story checkpoint before moving on

### Parallel Opportunities

- T004, T005, T006, T007 can run in parallel after `plots/hr/package.json` is defined
- T009 and T010 can run in parallel during the foundational phase
- T012 can run in parallel with T013-T016
- T017 can run in parallel with T018-T021
- T022 can run in parallel with T023-T027
- T028, T030, and T031 can run in parallel in the polish phase

---

## Parallel Example: User Story 3

```bash
# Validation and transform work can start together:
Task: "Update specs/004-hr-plots/quickstart.md with explicit manual checks for the 75% weekly threshold, no-data cells, and aligned subject rows"
Task: "Extend plots/hr/src/transforms.ts to derive WeeklySubjectAdherenceSummary records with met/not_met/no_data states"
Task: "Extend plots/hr/src/transforms.ts to build the alphabetical union AlignedSubjectRoster"

# Then integrate the renderer:
Task: "Extend plots/hr/src/plot2.ts to render aligned supervised and unsupervised heatmap panels"
Task: "Update plots/hr/src/main.ts to pass the aligned heatmap data into plot2.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: update `docs/plot-specs/hr.md`
2. Complete Phase 2: scaffold the `plots/hr/` app and shared transforms
3. Complete Phase 3: deliver the weekly zone-time chart
4. Stop and validate User Story 1 independently from `data/zone_out.csv`

### Incremental Delivery

1. Foundation complete -> app shell and read-only CSV access are working
2. Add US1 -> validate zone-time chart
3. Add US2 -> validate weekly adherence trend
4. Add US3 -> validate aligned weekly heatmaps
5. Add polish -> validate SVG export and full dashboard

### Parallel Team Strategy

1. One developer clears the plot-spec gate and foundational app shell
2. After Phase 2:
   - Developer A: US1 renderer
   - Developer B: US2 adherence trend
   - Developer C: US3 threshold + roster alignment work
3. Merge into the shared dashboard entry point and run the quickstart validation flow

---

## Notes

- `[P]` tasks touch different files and can be implemented independently
- The plan intentionally does not include automated test tasks because the feature specification explicitly relies on manual validation evidence
- The first implementation task is not code: the approved HR plot specification must change before implementation begins
