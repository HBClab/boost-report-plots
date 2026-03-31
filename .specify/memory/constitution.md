<!--
Sync Impact Report
Version change: template -> 1.0.0
Modified principles:
- placeholder principle set -> I. Plot Specification Fidelity
- placeholder principle set -> II. TypeScript + D3 Implementation Standard
- placeholder principle set -> III. Read-Only Shared Data Access
- placeholder principle set -> IV. Validation by Deliverable Evidence
- placeholder principle set -> V. Incremental Data Contract Definition
Added sections:
- Project Constraints
- Delivery Workflow
Removed sections:
- None
Templates requiring updates:
- ✅ updated /home/zak/work/hbc/boost/extras/report-2/.specify/templates/plan-template.md
- ✅ updated /home/zak/work/hbc/boost/extras/report-2/.specify/templates/spec-template.md
- ✅ updated /home/zak/work/hbc/boost/extras/report-2/.specify/templates/tasks-template.md
- ✅ reviewed /home/zak/work/hbc/boost/extras/report-2/.specify/templates/agent-file-template.md
- ✅ reviewed /home/zak/work/hbc/boost/extras/report-2/README.md
- ✅ reviewed /home/zak/work/hbc/boost/extras/report-2/docs/plot-specs/act.md
- ✅ reviewed /home/zak/work/hbc/boost/extras/report-2/docs/plot-specs/hr.md
- ✅ no command templates present under /home/zak/work/hbc/boost/extras/report-2/.specify/templates/commands
Follow-up TODOs:
- None
-->
# Report Plot Generation Constitution

## Core Principles

### I. Plot Specification Fidelity
Every delivered plot MUST implement an approved specification from
`docs/plot-specs/act.md`, `docs/plot-specs/hr.md`, or a future spec added under
`docs/plot-specs/`. Changes to layout, data semantics, labels, encodings, or interaction
behavior MUST be captured by updating the relevant plot specification before implementation.
Rationale: this project exists to turn explicit reporting specs into reproducible plots, so
the specification is the contract.

### II. TypeScript + D3 Implementation Standard
All production plots MUST be implemented in TypeScript and rendered with D3. Alternative
charting libraries, generated image pipelines, or non-TypeScript runtime code MAY be used
only for throwaway exploration and MUST NOT become part of the shipped plotting pipeline.
Rationale: the project goal explicitly standardizes the implementation stack to keep plots
inspectable, customizable, and consistent.

### III. Read-Only Shared Data Access
Code in this repository MUST treat shared servers and shared upstream datasets as read-only.
Any feature that retrieves data MUST document the source system, access method, and proof that
it performs no writes, mutations, or side-effecting clean-up against shared infrastructure.
Rationale: shared research infrastructure is an external dependency and accidental writes are
an unacceptable operational risk.

### IV. Validation by Deliverable Evidence
This project does not require a standing automated test suite. Each feature MUST still define
explicit validation evidence before implementation begins: sample inputs, expected outputs,
manual verification steps, and any visual or numerical acceptance checks needed to prove the
plot is correct. Automated tests MAY be added when a feature benefits from them, but no plan,
spec, or task list may assume they are mandatory by default.
Rationale: the project is plot-delivery focused, but lack of a formal test suite does not
remove the need for demonstrable correctness.

### V. Incremental Data Contract Definition
Data retrieval and transformation contracts MUST be introduced feature by feature, beginning
with the first feature that needs them. New work MUST define the minimum input schema,
derivations, and normalization rules required for the current plot instead of inventing a
speculative general pipeline. Rationale: the retrieval layer is intentionally deferred, so
the repository must grow from concrete reporting needs rather than premature abstraction.

## Project Constraints

- The repository scope is a plotting pipeline for boost reports.
- Plot specifications currently live in `docs/plot-specs/act.md` and
  `docs/plot-specs/hr.md`; new plot families MUST add their spec alongside them.
- Shared-server interaction is limited to reading source data and metadata.
- Validation artifacts MAY include screenshots, exported SVG/HTML, metric tables, and
  manual review notes.

## Delivery Workflow

1. Start from the target plot specification and identify any missing data contract details.
2. Define or refine the feature-level retrieval and transformation contract needed for that
   plot, keeping shared systems read-only.
3. Implement the plot in TypeScript with D3.
4. Produce validation evidence that demonstrates conformance to the specification.
5. Record any intentional deviations by updating the specification and feature artifacts in
   the same change.

## Governance

This constitution overrides conflicting planning defaults in this repository. Every plan,
specification, and task list MUST include a constitution check that verifies specification
fidelity, the TypeScript + D3 implementation choice, read-only data access, and the chosen
validation evidence. Amendments require: (1) the changed constitutional text, (2) a sync pass
across dependent templates and guidance files, and (3) a version update using semantic
versioning. MAJOR versions cover incompatible governance changes or principle removals, MINOR
versions add principles or materially expand requirements, and PATCH versions clarify existing
rules without changing behavior. Compliance review happens on every feature artifact and code
review touching plot behavior, data access, or delivery workflow.

**Version**: 1.0.0 | **Ratified**: 2026-03-31 | **Last Amended**: 2026-03-31
