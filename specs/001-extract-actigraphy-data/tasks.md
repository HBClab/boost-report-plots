---

description: "Task list for implementing actigraphy data extraction"
---

# Tasks: Extract Actigraphy Data

**Input**: Design documents from `/specs/001-extract-actigraphy-data/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md,
data-model.md, contracts/

**Tests/Validation**: This feature uses required validation tasks in `quickstart.md` and fixture
data. Automated tests are optional and are not required for the initial implementation.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated
independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Single project paths are used: `src/` and `tests/` at repository root
- Feature documentation lives in `specs/001-extract-actigraphy-data/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the development environment and repository structure for the importer

- [X] T001 Update Python and PostgreSQL development dependencies in `flake.nix`
- [X] T002 Create the actigraphy package skeleton in `src/act/__init__.py`, `src/act/importer.py`, `src/act/parser.py`, `src/act/repository.py`, `src/act/schema.sql`, and `src/cli/import_actigraphy.py`
- [X] T003 [P] Create fixture and validation directories in `tests/fixtures/actigraphy/.gitkeep` and `tests/fixtures/actigraphy/README.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared database, parsing, and import plumbing required by all user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Implement the PostgreSQL schema for `subjects`, `sessions`, and `session_days` in `src/act/schema.sql`
- [X] T005 [P] Implement database connection and persistence helpers for subjects and sessions in `src/act/repository.py`
- [X] T006 [P] Implement CSV row normalization utilities for required actigraphy metrics in `src/act/parser.py`
- [X] T007 Implement shared import orchestration and run-summary structures in `src/act/importer.py`
- [X] T008 Implement the CLI entrypoint and configuration handling in `src/cli/import_actigraphy.py`
- [X] T009 Align validation instructions with the scaffolded workflow in `specs/001-extract-actigraphy-data/quickstart.md`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Load GGIR Day Summaries (Priority: P1) 🎯 MVP

**Goal**: Discover GGIR day-summary files and load required session-day metrics into the local
dataset

**Independent Validation**: Run the importer against a fixture subtree and confirm matching files
are discovered and loaded as subject/session/day rows with the required metrics

### Validation for User Story 1 (REQUIRED) ⚠️

- [X] T010 [P] [US1] Add fixture import instructions and expected row outcomes to `specs/001-extract-actigraphy-data/quickstart.md`
- [X] T011 [P] [US1] Add representative GGIR fixture files and expected-results notes in `tests/fixtures/actigraphy/README.md`

### Implementation for User Story 1

- [X] T012 [US1] Implement recursive GGIR file discovery and path matching in `src/act/importer.py`
- [X] T013 [US1] Implement extraction of required CSV columns and nonwear-minute conversion in `src/act/parser.py`
- [X] T014 [US1] Implement subject/session/session-day inserts for newly discovered data in `src/act/repository.py`
- [X] T015 [US1] Wire the end-to-end import command for fixture and full-tree runs in `src/cli/import_actigraphy.py`
- [X] T016 [US1] Document the MVP import execution flow and acceptance checks in `specs/001-extract-actigraphy-data/quickstart.md`

**Checkpoint**: User Story 1 should import matching GGIR files into the local dataset and be
independently validated

---

## Phase 4: User Story 2 - Trace Imported Records (Priority: P2)

**Goal**: Preserve subject, session, and source-file lineage for every imported day record

**Independent Validation**: Review imported rows and confirm each one can be traced to the source
subject, session, and matched file without reopening the full tree manually

### Validation for User Story 2 (REQUIRED) ⚠️

- [X] T017 [P] [US2] Add lineage verification steps and sample audit queries to `specs/001-extract-actigraphy-data/quickstart.md`
- [X] T018 [P] [US2] Add lineage-focused fixture expectations in `tests/fixtures/actigraphy/README.md`

### Implementation for User Story 2

- [X] T019 [US2] Implement path-derived subject and session metadata parsing in `src/act/importer.py`
- [X] T020 [US2] Persist source-file lineage and session-date metadata in `src/act/repository.py`
- [X] T021 [US2] Extend run summaries and issue reporting with file-level and row-level trace details in `src/act/importer.py`
- [X] T022 [US2] Expose traceable import output from the CLI in `src/cli/import_actigraphy.py`

**Checkpoint**: Imported rows should retain enough lineage to audit any stored day entry back to
its source file and session context

---

## Phase 5: User Story 3 - Refresh Without Duplicates (Priority: P3)

**Goal**: Support duplicate-safe reruns that refresh canonical local records instead of appending
duplicates

**Independent Validation**: Run the same fixture import twice and confirm subject/session/day
counts stay stable while canonical records refresh correctly

### Validation for User Story 3 (REQUIRED) ⚠️

- [X] T023 [P] [US3] Add rerun and idempotency validation steps to `specs/001-extract-actigraphy-data/quickstart.md`
- [X] T024 [P] [US3] Add duplicate-input and rerun expectations to `tests/fixtures/actigraphy/README.md`

### Implementation for User Story 3

- [X] T025 [US3] Enforce natural uniqueness and conflict-handling rules for session-day refreshes in `src/act/schema.sql`
- [X] T026 [US3] Implement upsert-style refresh behavior for repeated imports in `src/act/repository.py`
- [X] T027 [US3] Implement duplicate detection and rerun-safe orchestration in `src/act/importer.py`
- [X] T028 [US3] Report rerun outcomes and unchanged-versus-refreshed counts in `src/cli/import_actigraphy.py`

**Checkpoint**: Repeated imports should preserve one canonical subject/session/day record set and
be independently validated

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finish implementation quality, documentation, and manual validation across stories

- [X] T029 [P] Document final import usage, prerequisites, and schema initialization steps in `README.md`
- [X] T030 Review code paths for read-only upstream access guarantees and error clarity in `src/act/importer.py`, `src/act/repository.py`, and `src/cli/import_actigraphy.py`
- [X] T031 Run the end-to-end quickstart validation and record outcomes in `specs/001-extract-actigraphy-data/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on Foundational completion and benefits from User Story 1 import flow
- **User Story 3 (Phase 5)**: Depends on Foundational completion and on the persistence behavior introduced in User Story 1
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - establishes the MVP import path
- **User Story 2 (P2)**: Can start after Foundational, but is simplest after User Story 1 because it extends imported-record lineage
- **User Story 3 (P3)**: Can start after Foundational, but depends logically on the canonical insert flow from User Story 1

### Within Each User Story

- Validation tasks come before implementation tasks
- Parser and repository changes precede CLI integration when both are needed
- Quickstart updates must reflect the final executable workflow before sign-off

### Parallel Opportunities

- `T003` can run in parallel with `T001` and `T002`
- `T005` and `T006` can run in parallel after `T004`
- Validation-preparation tasks within each user story can run in parallel
- Documentation updates in `quickstart.md` and fixture notes in `tests/fixtures/actigraphy/README.md` can be split across contributors

---

## Parallel Example: User Story 1

```bash
# Launch validation preparation tasks together:
Task: "Add fixture import instructions and expected row outcomes to specs/001-extract-actigraphy-data/quickstart.md"
Task: "Add representative GGIR fixture files and expected-results notes in tests/fixtures/actigraphy/README.md"

# After foundation work, split parser and repository implementation:
Task: "Implement extraction of required CSV columns and nonwear-minute conversion in src/act/parser.py"
Task: "Implement subject/session/session-day inserts for newly discovered data in src/act/repository.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Stop and validate fixture-based import behavior
5. Use the resulting local dataset as the first report-pipeline input

### Incremental Delivery

1. Setup + Foundational establishes the environment, schema, and importer skeleton
2. User Story 1 delivers the first end-to-end import path
3. User Story 2 adds auditability and traceable run output
4. User Story 3 adds duplicate-safe reruns for ongoing analyst workflows
5. Polish consolidates documentation and final manual validation

### Parallel Team Strategy

1. One developer extends `flake.nix` and repository scaffolding while another prepares fixtures
2. During Foundational work, parsing and repository layers can progress in parallel
3. After the MVP path lands, lineage and rerun behavior can be developed as separate follow-on slices

---

## Notes

- All tasks follow the required checklist format with IDs, optional `[P]` markers, story labels,
  and explicit file paths
- Suggested MVP scope: Phase 1 + Phase 2 + User Story 1
- Total tasks: 31
- User Story task counts: US1 = 7, US2 = 6, US3 = 6
