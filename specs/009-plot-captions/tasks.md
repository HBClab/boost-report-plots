# Tasks: Plot Captions

**Input**: Design documents from `/specs/009-plot-captions/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests/Validation**: Validation is by manual visual inspection and screenshot capture. No automated tests required (per FR-008 and constitution Principle IV).

**Organization**: Tasks are grouped by user story to enable independent implementation and validation of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

## Phase 1: Setup (Plot-Spec Addendum)

**Purpose**: Constitution Principle I requires plot specifications to be updated before implementation. Captions add a new UI zone to each card — this must be captured in the spec docs first.

- [X] T001 Add "Caption Area" section to `docs/plot-specs/act.md` specifying the caption zone for each ACT plot card (dimensions, position relative to legend, typography classes)
- [X] T002 [P] Add "Caption Area" section to `docs/plot-specs/hr.md` specifying the caption zone for each HR plot card (dimensions, position relative to legend, typography classes)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The captions TypeScript module and `renderCaption` helper must exist before any plot file can import from them. No user story can begin until this phase is complete.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Create `plots/act/src/captions.ts` with `NumericAnnotation`, `CaptionEntry`, `ToggledCaption` TypeScript interfaces and fully populated `actCaptions` and `hrCaptions` objects for all 9 caption views (content per `specs/009-plot-captions/data-model.md`)
- [X] T004 Implement and export `renderCaption(parent, entry, layout)` helper function in `plots/act/src/captions.ts` (clears parent group, renders `.caption-prose`, `.caption-annotation` elements per non-null annotation, `.caption-disclaimer` if present; typography per data-model.md)

**Checkpoint**: `captions.ts` compiles cleanly and exports are verifiable via TypeScript imports — user story implementation can now begin.

---

## Phase 3: User Story 1 — Static Captions on All 6 Cards (Priority: P1) 🎯 MVP

**Goal**: Every plot card displays a caption when either the ACT or HR view is rendered. For toggle-bearing cards (ACT Plot 1, HR Plot 2, HR Plot 3), the default view's caption is shown — toggle wiring is deferred to US2.

**Independent Validation**: Open both ACT and HR views; confirm a text block is visible within the card boundary on every plot card, containing prose and at least one styled numeric annotation (or omitted annotation for dynamic-N plots).

### Validation for User Story 1 ⚠️

- [X] T005 [US1] Create `specs/009-plot-captions/validation/` directory and add `us1-screenshot-checklist.md` listing the six cards to capture (ACT Plot 1 default, ACT Plot 2, ACT Plot 3, HR Plot 1, HR Plot 2 default, HR Plot 3 default) with acceptance criteria for each

### Implementation for User Story 1

- [X] T006 [P] [US1] Extend SVG card height and integrate `renderCaption` into `plots/act/src/plot2.ts` using `actCaptions.plot2`; append caption `<g>` below the gradient legend area
- [X] T007 [P] [US1] Extend SVG card height and integrate `renderCaption` into `plots/act/src/plot3.ts` using `actCaptions.plot3`; append caption `<g>` below the clock legend area
- [X] T008 [P] [US1] Extend SVG card height and integrate `renderCaption` into `plots/act/src/hr-plot1.ts` using `hrCaptions.plot1`; append caption `<g>` below the bar chart legend area
- [X] T009 [P] [US1] Extend SVG card height and integrate `renderCaption` into `plots/act/src/plot1.ts` using `actCaptions.plot1.all` (default view only); append caption `<g>` below the legend area — toggle wiring deferred to US2
- [X] T010 [US1] Extend SVG card height and integrate `renderCaption` into `plots/act/src/hr-plot2.ts` for the HR Plot 2 (intensity trend) card using `hrCaptions.plot2.trimp` (default view only); append caption `<g>` below the line chart legend — toggle wiring deferred to US2
- [X] T011 [US1] Extend SVG card height and integrate `renderCaption` into `plots/act/src/hr-plot2.ts` for the HR Plot 3 (heatmap) card using `hrCaptions.plot3.adherence` (default view only); append caption `<g>` below the heatmap legend — toggle wiring deferred to US2
- [X] T012 [US1] Build the project (`pnpm build` in `plots/act/`), open both views, and capture screenshots for all 6 default-state cards into `specs/009-plot-captions/validation/us1/`; confirm each card passes the T005 checklist

**Checkpoint**: All 6 cards show captions in their default state. US1 is fully functional and independently validated.

---

## Phase 4: User Story 2 — Caption Updates on Toggle (Priority: P2)

**Goal**: For the three dual-view cards, the caption swaps synchronously when the user clicks the toggle — no stale caption from the previous view remains visible.

**Independent Validation**: Toggle each of the three dual-view cards (ACT Plot 1, HR Plot 2, HR Plot 3) and confirm the caption text changes on each toggle click.

### Validation for User Story 2 ⚠️

- [X] T013 [US2] Add `us2-screenshot-checklist.md` to `specs/009-plot-captions/validation/` listing both views of each dual-view card (6 screenshots total: ACT Plot 1 All/Baseline, HR Plot 2 TRIMP/HRMax, HR Plot 3 Adherence/Sessions) with acceptance criteria confirming different caption text per view

### Implementation for User Story 2

- [X] T014 [US2] In `plots/act/src/plot1.ts`, update the `onToggle` callback (in `renderSessionToggle`) to call `renderCaption` with `actCaptions.plot1[view]` each time the active `SessionView` changes; confirm the caption `<g>` is cleared and redrawn on each toggle
- [X] T015 [US2] In `plots/act/src/hr-plot2.ts`, update the `updateView` function for the HR Plot 2 (intensity trend) card to call `renderCaption` with `hrCaptions.plot2[view]` on each `TrendView` change
- [X] T016 [US2] In `plots/act/src/hr-plot2.ts`, update the `updateView` function for the HR Plot 3 (heatmap) card to call `renderCaption` with `hrCaptions.plot3[view]` on each `HeatmapView` change
- [ ] T017 [US2] Build and capture before/after screenshots for all three dual-view cards (both toggle states each) into `specs/009-plot-captions/validation/us2/`; confirm all 6 views pass the T013 checklist

**Checkpoint**: All three dual-view cards swap captions correctly on toggle. US1 and US2 are both validated.

---

## Phase 5: User Story 3 — Single Source of Truth (Priority: P3)

**Goal**: Confirm that all caption strings originate exclusively from `captions.ts` — no hardcoded strings in any plot render file — so a single edit propagates correctly.

**Independent Validation**: Make one prose change in `captions.ts`, rebuild, and confirm the change appears on the corresponding card without touching any plot file.

### Validation for User Story 3 ⚠️

- [X] T018 [US3] Grep `plots/act/src/` for any hardcoded caption strings in `plot1.ts`, `plot2.ts`, `plot3.ts`, `hr-plot1.ts`, `hr-plot2.ts` — document findings in `specs/009-plot-captions/validation/us3-audit.md`; all caption prose must originate from `captions.ts` imports

### Implementation for User Story 3

- [X] T019 [US3] If T018 finds any hardcoded strings, move them to `captions.ts` and update the corresponding render call; rebuild and verify; update `us3-audit.md` to mark resolved
- [X] T020 [US3] Perform an end-to-end single-source-of-truth verification: edit one prose string in `captions.ts`, run `pnpm build`, confirm the changed text appears on the correct card; capture screenshot into `specs/009-plot-captions/validation/us3/` as evidence

**Checkpoint**: All caption content is centralized. A single edit in `captions.ts` propagates to the rendered output without touching plot files.

---

## Phase 6: User Story 4 — Visually Distinct Typography (Priority: P4)

**Goal**: Verify that at least two visually distinct text styles exist in every caption area — prose and numeric annotations are distinguishable by weight, color, or size at normal zoom.

**Independent Validation**: Open any plot card; confirm at a glance that numeric annotations (N values, disclaimers) are visually distinct from prose text without reading all the text.

### Validation for User Story 4 ⚠️

- [X] T021 [US4] Review all 9 rendered caption views and document the visual style applied to each text layer (prose, annotation, disclaimer) in `specs/009-plot-captions/validation/us4-typography-review.md`; confirm at least two distinct styles are present per card

### Implementation for User Story 4

- [X] T022 [US4] If any caption view fails the US4 visual distinction check, update the `renderCaption` helper typography (font-size, font-weight, fill) in `plots/act/src/captions.ts` to meet the two-style requirement; rebuild and re-verify
- [ ] T023 [US4] Capture final styled screenshots of all 9 caption views (6 default + 3 alternate toggle states) into `specs/009-plot-captions/validation/us4/`; confirm all cards meet the typography criteria

**Checkpoint**: All 9 caption views have legible, visually distinct text layers. All four user stories are validated.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation updates, prose review, and final cleanup across all stories.

- [X] T024 [P] Update `docs/plot-specs/act.md` and `docs/plot-specs/hr.md` caption area sections with actual rendered dimensions (card height increases, caption zone y-offset) measured during US1 implementation — ensures spec reflects final implementation
- [X] T025 [P] Finalize all 9 caption prose strings in `plots/act/src/captions.ts` with domain-reviewed scientific language (replace any remaining placeholder text; N-values confirmed against study metadata)
- [X] T026 Update `specs/009-plot-captions/quickstart.md` with any deviations from the original plan discovered during implementation (actual card height values, toggle key names confirmed in code)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately; T001 and T002 run in parallel
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories; T003 then T004 (sequential — helper depends on types)
- **US1 (Phase 3)**: Depends on Phase 2 — T006/T007/T008/T009 run in parallel; T010/T011 sequential (same file: `hr-plot2.ts`)
- **US2 (Phase 4)**: Depends on US1 (Phase 3) — T014/T015/T016 run in parallel (different toggle callbacks); T017 after all three
- **US3 (Phase 5)**: Depends on US2 (Phase 4) — sequential audit then verification
- **US4 (Phase 6)**: Depends on US3 (Phase 5) or can start after US2 — typography review is independent of US3 audit
- **Polish (Phase 7)**: Depends on all user stories complete — T024/T025 parallel

### User Story Dependencies

- **US1 (P1)**: Requires Phase 2 complete — no other story dependency; 3 files can be done in parallel
- **US2 (P2)**: Requires US1 complete — toggle wiring builds on the caption groups created in US1
- **US3 (P3)**: Requires US2 complete — centralization audit makes sense only once all wiring is done
- **US4 (P4)**: Requires US1 complete — typography can be verified and refined once cards render

### Within Each Story

- Validation evidence defined before implementation
- Caption `<g>` append before height adjustment verification
- Static cards (T006/T007/T008) before toggled cards (T009/T010/T011) is preferred but not required
- Screenshots taken after each story's implementation tasks, not before

### Parallel Opportunities

- T001 ‖ T002 (Phase 1 — different files)
- T006 ‖ T007 ‖ T008 ‖ T009 (Phase 3 — different plot files)
- T014 ‖ T015 ‖ T016 (Phase 4 — different toggle callbacks; T015/T016 both in `hr-plot2.ts` must be sequential with each other)
- T024 ‖ T025 (Phase 7 — different files)

---

## Parallel Example: User Story 1

```text
# After T003 + T004 complete, launch these in parallel:
Task T006: Integrate renderCaption into plots/act/src/plot2.ts
Task T007: Integrate renderCaption into plots/act/src/plot3.ts
Task T008: Integrate renderCaption into plots/act/src/hr-plot1.ts
Task T009: Integrate renderCaption into plots/act/src/plot1.ts (default view only)

# Then sequentially (same file):
Task T010: Integrate renderCaption into hr-plot2.ts for HR Plot 2
Task T011: Integrate renderCaption into hr-plot2.ts for HR Plot 3

# Then validate:
Task T012: Build, open both views, capture screenshots
```

## Parallel Example: User Story 2

```text
# After T012 complete, launch:
Task T014: Wire caption swap into plot1.ts ACT toggle
Task T015: Wire caption swap into hr-plot2.ts HR Plot 2 toggle
# T016 must follow T015 (same file):
Task T016: Wire caption swap into hr-plot2.ts HR Plot 3 toggle

# Then validate:
Task T017: Build and capture all toggle-state screenshots
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Plot-spec addendum (T001, T002)
2. Complete Phase 2: Create `captions.ts` module (T003, T004) — CRITICAL
3. Complete Phase 3: Integrate captions into all 6 cards in default state (T005–T012)
4. **STOP and VALIDATE**: All 6 cards show captions — independently useful without toggle or polish
5. Demo to domain reviewer for prose feedback

### Incremental Delivery

1. Phase 1 + 2 → Module ready
2. Phase 3 (US1) → All cards have captions → Validate → Demo (MVP)
3. Phase 4 (US2) → Toggles update captions → Validate → Demo
4. Phase 5 (US3) → Centralization confirmed → Validate
5. Phase 6 (US4) → Typography polished → Validate
6. Phase 7 → Prose finalized, docs updated → Done

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in the same phase
- No automated tests — validation is screenshot capture + visual inspection per constitution Principle IV
- `hr-plot2.ts` hosts both HR Plot 2 and HR Plot 3 — tasks touching this file in the same phase must run sequentially
- Caption prose in T003 uses placeholder text from `data-model.md`; final scientific language is resolved in T025 (domain review)
- N-values in `captions.ts` are study-metadata constants; dynamic-N plots (ACT Plot 2, ACT Plot 3, HR Plot 3) use `null` annotations per `data-model.md`
- `renderCaption` MUST clear the parent `<g>` before each render — critical for correct toggle swap behavior (US2)
