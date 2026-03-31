# Data Model: Extract Actigraphy Data

## Subject

- **Purpose**: Represents a participant whose actigraphy data appears in the GGIR derivatives
  tree.
- **Key fields**:
  - `subject_id`: Internal primary key
  - `subject_code`: Stable external identifier such as `sub-1001`
  - `created_at`: Record creation timestamp
- **Validation rules**:
  - `subject_code` must be present
  - `subject_code` must be unique within the local dataset
- **Relationships**:
  - One subject has many sessions

## Session

- **Purpose**: Represents one actigraphy collection session for a single subject.
- **Key fields**:
  - `session_id`: Internal primary key
  - `subject_id`: Foreign key to `Subject`
  - `session_number`: Session identifier derived from the source path
  - `session_date`: Optional first calendar date observed for the session
  - `created_at`: Record creation timestamp
- **Validation rules**:
  - `subject_id` must reference an existing subject
  - `session_number` must be present and positive
  - A subject may have only one record per `session_number`
- **Relationships**:
  - Many sessions belong to one subject
  - One session has many session days

## Session Day

- **Purpose**: Stores one day of imported actigraphy summary data for a subject session.
- **Key fields**:
  - `session_day_id`: Internal primary key
  - `session_id`: Foreign key to `Session`
  - `day_date`: Calendar date from the source row
  - `weekday`: Day label from the source row
  - `nonwear_minutes`: Derived from source percentage
  - `sleep_minutes`: Imported sleep duration
  - `sedentary_minutes`: Imported sedentary duration
  - `light_pa_minutes`: Imported light activity duration
  - `moderate_pa_minutes`: Imported moderate activity duration
  - `vigorous_pa_minutes`: Imported vigorous activity duration
  - `mvpa_minutes`: Imported MVPA duration
  - `source_file`: Matched GGIR CSV path used for the row
  - `created_at`: Record creation timestamp
- **Validation rules**:
  - `session_id` must reference an existing session
  - `day_date` must be present and valid
  - Source metric fields must be numeric when provided
  - `nonwear_minutes` must be derived from a percentage in the inclusive range 0-100
  - A session may have only one canonical record per `day_date`
- **Relationships**:
  - Many session days belong to one session

## Import Result

- **Purpose**: Captures the outcome of an import run for validation and audit workflows.
- **Key fields**:
  - `matched_files`: Count of files discovered by recursive search
  - `imported_rows`: Count of day rows successfully loaded
  - `skipped_rows`: Count of rejected or skipped rows
  - `issues`: Structured list of file-level or row-level import issues
- **Validation rules**:
  - Every matched file must end the run as either imported, partially imported with issues, or
    rejected with issues
- **Relationships**:
  - Produced by one import run; can reference many source files and day rows indirectly

## State Transitions

- **Discovered**: A file matches the approved GGIR path pattern.
- **Validated**: Required columns and path-derived metadata are present.
- **Imported**: Subject, session, and session-day records are created or refreshed locally.
- **Rejected**: The file or row is skipped with a recorded issue explaining why it was not loaded.
