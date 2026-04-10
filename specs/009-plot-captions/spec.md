# Feature Specification: Plot Captions

**Feature Branch**: `009-plot-captions`  
**Created**: 2026-04-10  
**Status**: Draft  
**Input**: User description: "create new specification using feat/captions/captions.md"

## User Scenarios & Validation *(mandatory)*

### User Story 1 - Read Static Plot Caption (Priority: P1)

A report viewer opens the accelerometer or heart rate view and sees a descriptive caption beneath each plot on its card. The caption explains what the plot shows, why specific visual features appear (e.g., why the radial clock's SD band clamps to near-zero during sleep hours), and relevant numeric context (e.g., participant Ns per session).

**Why this priority**: The most fundamental requirement — every plot must have a caption before dynamic or toggle behavior is addressed. Delivers immediate interpretive value to all viewers.

**Independent Validation**: Render any single plot card and confirm a caption text block is visible within the card area, containing a prose description and at least one styled numeric annotation (e.g., N per group).

**Acceptance Scenarios**:

1. **Given** the ACT view is open, **When** a viewer reads the Plot 1 (Stacked Bar) card, **Then** a caption is visible on the card describing the 24-hour activity composition metric, with participant N values styled differently from the prose text.
2. **Given** the ACT view is open, **When** a viewer reads the Plot 3 (Radial Clock) card, **Then** the caption explains why the ENMO SD band clamps to near-zero during sleep hours (low variability / near-zero activity).
3. **Given** the HR view is open, **When** a viewer reads HR Plot 1 (Zone Time Allocation), **Then** a caption describes the zone-time metric and displays relevant session or participant counts in a distinct style.

---

### User Story 2 - Caption Updates on Toggle (Priority: P2)

A viewer toggles the view on a dual-plot card (e.g., ACT Plot 1 between "All Sessions" and "Baseline (S1)", HR Plot 2 between "TRIMP" and "% HR Max", or HR Plot 3 between "Adherence" and "Sessions"). The caption updates to match the active view — no shared or blended caption is shown.

**Why this priority**: Without this, captions mislead viewers who have toggled to a different plot. Three cards require this behavior: ACT Plot 1, HR Plot 2, HR Plot 3.

**Independent Validation**: Toggle ACT Plot 1 between "All Sessions" and "Baseline (S1)" and confirm the caption text and numeric annotations change to match the active view.

**Acceptance Scenarios**:

1. **Given** HR Plot 2 is showing "TRIMP", **When** the viewer toggles to "% HR Max", **Then** the caption switches to describe percent of max heart rate, not TRIMP.
2. **Given** HR Plot 3 is showing "Adherence", **When** the viewer toggles to "Sessions", **Then** the caption switches to describe session count per week, not adherence status.
3. **Given** ACT Plot 1 is showing "All Sessions", **When** toggled to "Baseline (S1)", **Then** the caption text and the N annotation update to reflect the baseline-only session.

---

### User Story 3 - Edit Captions in One Place (Priority: P3)

A researcher wants to update the wording of a caption or adjust an N value. They edit a single source-of-truth captions file and all plots reflect the change after a rebuild — no individual plot render files need to be touched.

**Why this priority**: Long-term maintainability. Without centralization, caption updates require hunting through multiple render files.

**Independent Validation**: Change a caption string in the central captions module, rebuild, and confirm the updated text appears on the correct plot card without editing any plot render file.

**Acceptance Scenarios**:

1. **Given** a caption is defined in the central captions module, **When** its prose text is updated there and the app is rebuilt, **Then** the changed text appears on the correct plot card.
2. **Given** an N annotation is defined in the captions module, **When** the value is edited there and the app rebuilt, **Then** the updated N appears on the card in its visually distinct style.

---

### User Story 4 - Visually Distinct Caption Typography (Priority: P4)

A viewer can immediately distinguish the main prose description from numeric annotations (N, disclaimers, thresholds) by their visual treatment — different font size, weight, or color — without reading all the text.

**Why this priority**: Required by the spec. Aids scannability and draws attention to key numbers.

**Independent Validation**: View any plot card and confirm at least two visually distinct text styles exist within the caption area — one for prose and at least one for numeric or supplementary information.

**Acceptance Scenarios**:

1. **Given** a plot card caption is rendered, **When** a viewer glances at it, **Then** the N value or numeric annotation is visually distinguishable from the prose text (by weight, color, or size).
2. **Given** a card includes a disclaimer note, **When** rendered, **Then** the disclaimer is styled differently from both the main caption prose and the numeric annotation.

---

### Edge Cases

- What happens when a toggle fires — does the caption update synchronously in the same render cycle or could a stale caption briefly appear?
- How does the caption area handle very long prose text that approaches or exceeds the card width?
- If an N value is missing or null for a given session or group, how is that displayed (omitted, shown as "N/A", or another treatment)?
- For ACT Plot 2 (heatmap), participant count varies with the loaded dataset — does the caption dynamically reflect actual N or use a fixed study-metadata value?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each of the six plot cards MUST display a caption within the same card as the chart.
- **FR-002**: Captions for toggled cards (ACT Plot 1, HR Plot 2, HR Plot 3) MUST update when the toggle changes — each view MUST have its own distinct caption text and numeric annotations; no single shared caption is acceptable.
- **FR-003**: All caption text and numeric annotation content MUST be defined in a single, centralized captions module; individual plot render files MUST NOT contain hardcoded caption strings.
- **FR-004**: Each caption MUST include at minimum: (a) a prose description explaining what the plot shows and any notable visual behaviors, and (b) at least one numeric annotation (e.g., participant N per group or session).
- **FR-005**: The caption area MUST use at least two visually distinct text styles — one for prose and at least one for numeric or supplementary information — consistent with the existing card typography and dark palette.
- **FR-006**: The caption for ACT Plot 3 (Radial Activity Clock) MUST explain why the ENMO SD band clamps to near-zero during sleep hours.
- **FR-007**: Captions MUST be positioned within the plot card boundary — not outside the card or in a global footer.
- **FR-008**: Feature specifications for this repository MUST state the validation evidence required to prove plot correctness, and MUST NOT require automated tests unless the feature explicitly calls for them.

### Key Entities

- **Caption**: A structured data object per plot (or per toggle-view) containing a prose string, one or more numeric annotations (e.g., `n_supervised`, `n_unsupervised`), and an optional disclaimer string.
- **Captions Module**: The single source-of-truth file exporting all caption objects, indexed by plot ID and, where applicable, toggle-view key (e.g., `"trimp"` / `"hrmax"`).
- **Toggle-aware Caption**: A caption variant bound to a specific toggle state on a dual-view card; only the active variant is rendered at any time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All six plot cards display a visible caption when either report view (ACT or HR) is opened — confirmed by visual inspection.
- **SC-002**: Toggling any dual-view card causes the caption to update within the same render cycle — no stale caption from the previous view remains visible, confirmed by toggling each of the three dual-view cards.
- **SC-003**: A caption edit in the central captions module propagates to the correct plot card after a rebuild, verified without touching any plot render file.
- **SC-004**: Caption text areas are legible at the standard card display size — prose text is readable and numeric annotations are visually distinct without requiring zoom or scroll.
- **SC-005**: All six captions accurately describe the plot's content and notable visual behaviors, as confirmed by a domain reviewer familiar with the exercise physiology data.

## Assumptions

- The six plots in scope are: ACT Plot 1 (Stacked Bar), ACT Plot 2 (Participant × Session Heatmap), ACT Plot 3 (Radial Activity Clock), HR Plot 1 (Zone Time Allocation), HR Plot 2 (Session Intensity Trend — TRIMP / % HR Max), HR Plot 3 (Weekly Adherence / Session Count Heatmaps).
- The three dual-view (toggled) cards requiring per-view captions are: ACT Plot 1 (All Sessions / Baseline), HR Plot 2 (TRIMP / % HR Max), HR Plot 3 (Adherence / Sessions).
- Caption prose content (the actual scientific explanations) will be authored or approved by the researcher; implementation provides structure and rendering — placeholder text is acceptable during development.
- N values and other numeric annotations are either sourced from known study metadata (hardcoded in the captions module) or from data already available to the render function.
- Automated tests are not required; validation is by visual inspection and domain review.
- The existing card styling (dark navy palette `#131C2E`, DM Sans/Inter fonts, 12px corner radius) is the design baseline — captions must be visually consistent with it.
- Mobile or responsive layout is out of scope; the report targets a fixed desktop canvas width of 1440px.
