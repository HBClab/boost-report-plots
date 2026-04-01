# Feature Specification: Extract Actigraphy Data

**Feature Branch**: `001-extract-actigraphy-data`  
**Created**: 2026-03-31  
**Status**: Draft  
**Input**: User description: "initialize first spec using feat/act-data.md"

## User Scenarios & Validation *(mandatory)*

### User Story 1 - Load GGIR Day Summaries (Priority: P1)

As a report developer, I want the system to discover actigraphy day-summary files in the
approved derivatives directory and load their contents into a project-managed dataset so that
report plots can use a consistent session-day source without manual file-by-file assembly.

**Why this priority**: The plotting pipeline cannot proceed until actigraphy data is available
in a reliable, queryable form.

**Independent Validation**: Run the feature against a sample derivatives tree and confirm that
all matching day-summary files are discovered, each file produces session-day records, and the
loaded records preserve the expected values for the required source columns.

**Acceptance Scenarios**:

1. **Given** a derivatives directory containing matching GGIR day-summary files,
   **When** the user runs the import,
   **Then** the system loads one record per subject/session/day with the required metrics.
2. **Given** a day-summary file in the approved directory structure,
   **When** the system imports it,
   **Then** the stored records include the subject identifier, session number, calendar date,
   and source file reference.

---

### User Story 2 - Trace Imported Records (Priority: P2)

As a report developer, I want every imported day record to remain traceable to its source
subject, session, and file so that I can investigate discrepancies before the data is used in
plots or downstream summaries.

**Why this priority**: Plotting work depends on confidence that imported values can be audited
back to their origin.

**Independent Validation**: Inspect imported records from a sample run and confirm that each
record can be traced back to the source subject, session, and matched input file.

**Acceptance Scenarios**:

1. **Given** imported actigraphy records,
   **When** the user reviews any stored day entry,
   **Then** they can identify the originating subject, session, and source file without opening
   the full derivatives tree manually.
2. **Given** an input file with multiple daily rows,
   **When** the import completes,
   **Then** each stored day entry remains linked to the same parent subject and session.

---

### User Story 3 - Refresh Without Duplicates (Priority: P3)

As a report developer, I want repeated imports to refresh the local dataset without creating
duplicate subject, session, or day records so that the extraction process can be rerun as
upstream data changes.

**Why this priority**: Upstream actigraphy outputs may be regenerated, and the local dataset
must remain usable across multiple imports.

**Independent Validation**: Run the import twice against the same sample tree and confirm that
record counts remain stable while updated source content replaces or refreshes the corresponding
local records.

**Acceptance Scenarios**:

1. **Given** a dataset that already contains imported actigraphy records,
   **When** the user reruns the import for the same source tree,
   **Then** the system does not create duplicate day entries for the same session and date.
2. **Given** a subject/session that appears in multiple import runs,
   **When** the import is repeated,
   **Then** the local dataset preserves one canonical record set for that subject/session/day
   combination.

### Edge Cases

- A matched file is missing one or more required columns.
- A file path matches the directory pattern but does not expose a usable subject identifier or
  session number.
- A source row has an invalid or missing calendar date.
- The nonwear percentage is blank, out of range, or cannot be converted into daily minutes.
- The derivatives tree contains no matching day-summary files.
- The same subject/session/day appears more than once within a source file or across multiple
  matched files.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST scan the approved actigraphy derivatives directory recursively and
  identify every source file that matches the GGIR day-summary file pattern defined for this
  feature.
- **FR-002**: The system MUST extract the required source fields for each matched daily row:
  weekday, calendar date, nonwear percentage, sleep minutes, sedentary minutes, light activity
  minutes, moderate activity minutes, vigorous activity minutes, and MVPA minutes.
- **FR-003**: The system MUST derive and store the subject identifier and session number for each
  imported daily row.
- **FR-004**: The system MUST convert nonwear percentage into nonwear minutes before storing the
  day-level record.
- **FR-005**: The system MUST organize imported data into distinct subject, session, and
  session-day records so that one subject may have multiple sessions and one session may have
  multiple daily entries.
- **FR-006**: The system MUST preserve enough source metadata to trace each imported day record
  back to the matched input file used to create it.
- **FR-007**: The system MUST prevent duplicate session-day records for the same subject,
  session, and calendar date across repeated imports.
- **FR-008**: The system MUST report files or rows that cannot be imported, including the reason
  they were skipped or rejected.
- **FR-009**: The system MUST operate without writing any changes back to the shared upstream
  server or source directory.
- **FR-010**: The feature specification and delivery artifacts MUST define validation evidence
  for import correctness and MUST NOT require automated tests unless the implementation team
  explicitly chooses them.

### Key Entities *(include if feature involves data)*

- **Subject**: A participant identified by a stable subject code and linked to one or more
  actigraphy collection sessions.
- **Session**: A numbered actigraphy collection period for a single subject, including the
  imported days associated with that session.
- **Session Day**: One day of imported actigraphy summary data for a subject session, including
  calendar date, derived nonwear minutes, activity-duration measures, and source-file lineage.
- **Import Result**: A run-level summary of matched files, imported rows, skipped rows, and
  validation issues encountered during extraction.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can import a complete derivatives tree without manually selecting individual
  actigraphy summary files.
- **SC-002**: For a representative validation sample, 100% of imported day records match the
  source file values for subject, session, calendar date, and required activity metrics.
- **SC-003**: 100% of matched files are accounted for after an import run as either successfully
  loaded or explicitly reported with an import issue.
- **SC-004**: Re-running the same import source does not increase the number of stored
  subject/session/day combinations unless new upstream data is present.

## Assumptions

- The primary users are report developers and analysts preparing actigraphy data for boost
  report plots.
- The approved derivatives directory remains readable from the local development environment.
- Session number can be derived reliably from the matched directory structure.
- Converting nonwear percentage to minutes uses the full day as the baseline unless subsequent
  research artifacts define a different rule.
- This feature covers extraction and local storage only; downstream plot rendering and broader
  data harmonization remain out of scope.
