# Data Model: Heart Rate Plots

**Branch**: `004-hr-plots` | **Phase**: 1 | **Date**: 2026-04-07

## Source Schema (Read-Only)

All feature data is read from the repository CSV file `data/zone_out.csv`. This feature performs no writes.

### `zone_out.csv`

| Column | Type | Notes |
|--------|------|-------|
| `group` | text | `"Supervised"` or `"Unsupervised"` |
| `subject` | text | Subject ID such as `sub8000` |
| `week` | integer | Study week number. Feature scope uses weeks 1–6 only |
| `session` | integer | Session number within the week |
| `time_in_allowed_s` | number | Seconds spent within the target HR zone |
| `time_above_s` | number | Seconds spent above the target HR zone |
| `time_below_s` | number | Seconds spent below the target HR zone |
| `longest_bounded_bout_s` | number | Present in source CSV but not required by this feature |
| `bounded_met` | boolean | Whether that session met the bounded adherence criterion |
| `mazd` | number | Present in source CSV but not required by this feature |

## Derived Entities (Computed, Not Stored)

### `FilteredSessionRecord`

The raw source row after applying feature scope rules.

| Field | Type | Derivation |
|-------|------|------------|
| `group` | `"Supervised"` \| `"Unsupervised"` | Direct from CSV |
| `subject` | string | Direct from CSV |
| `week` | integer 1–6 | From CSV, filtered to weeks 1–6 |
| `session` | integer | Direct from CSV |
| `time_below_s` | number | Direct from CSV |
| `time_in_allowed_s` | number | Direct from CSV |
| `time_above_s` | number | Direct from CSV |
| `bounded_met` | boolean | Direct from CSV |

### `WeeklyGroupZoneSummary`

Input to the grouped stacked bar chart. One row per group-week.

| Field | Type | Derivation |
|-------|------|------------|
| `group` | string | `"Supervised"` or `"Unsupervised"` |
| `week` | integer 1–6 | Study week |
| `mean_below_s` | number | Mean of `time_below_s` across matching sessions |
| `mean_in_zone_s` | number | Mean of `time_in_allowed_s` |
| `mean_above_s` | number | Mean of `time_above_s` |
| `session_count` | integer | Number of session rows contributing to that group-week |

**Validation rule**: `mean_below_s + mean_in_zone_s + mean_above_s` should remain close to the expected total session duration for the contributing rows.

### `WeeklyGroupAdherenceSummary`

Input to the weekly adherence trend. One row per group-week.

| Field | Type | Derivation |
|-------|------|------------|
| `group` | string | `"Supervised"` or `"Unsupervised"` |
| `week` | integer 1–6 | Study week |
| `adherence_rate` | number 0–1 | `met_sessions / total_sessions` across session rows for that group-week |
| `subject_rate_sd` | number 0–1 or null | Spread derived from per-subject weekly adherence rates |
| `total_sessions` | integer | Session rows contributing to the rate |

**Validation rule**: `adherence_rate` and display bounds derived from `subject_rate_sd` must stay within `0` and `1`.

### `WeeklySubjectAdherenceSummary`

Input to the aligned supervised and unsupervised heatmaps. One row per group-subject-week.

| Field | Type | Derivation |
|-------|------|------------|
| `group` | string | `"Supervised"` or `"Unsupervised"` |
| `subject` | string | Subject ID |
| `week` | integer 1–6 | Study week |
| `total_sessions` | integer | Count of session rows for that subject-week |
| `met_sessions` | integer | Count of rows where `bounded_met == true` |
| `adherence_ratio` | number 0–1 or null | `met_sessions / total_sessions` when `total_sessions > 0`, else null |
| `status` | `"met"` \| `"not_met"` \| `"no_data"` | `met` when ratio >= 0.75, `not_met` when ratio < 0.75, `no_data` when no rows exist |

### `AlignedSubjectRoster`

The ordered list used to align both heatmaps.

| Field | Type | Derivation |
|-------|------|------------|
| `subject` | string | Union of subject IDs observed in supervised or unsupervised weeks 1–6 |
| `row_index` | integer | Alphabetical order position |
| `has_supervised_data` | boolean | True when the subject appears in supervised weeks 1–6 |
| `has_unsupervised_data` | boolean | True when the subject appears in unsupervised weeks 1–6 |

## Relationships

- A `FilteredSessionRecord` contributes to exactly one `WeeklyGroupZoneSummary`.
- A `FilteredSessionRecord` contributes to exactly one `WeeklyGroupAdherenceSummary`.
- Multiple `FilteredSessionRecord` rows for the same group-subject-week collapse into one `WeeklySubjectAdherenceSummary`.
- Every `WeeklySubjectAdherenceSummary` is positioned by the `AlignedSubjectRoster`.

## Data Scale Reference

Observed in `data/zone_out.csv` on 2026-04-07:

| Scope | Count |
|------|-------|
| Total session rows | 1,910 |
| Total unique subjects | 50 |
| Supervised subjects | 50 |
| Unsupervised subjects | 40 |
| Overlapping subjects | 40 |
| Supervised-only subjects | 10 |
| Weeks present in source | 1–12 |
| Subject-week cells used for feature scope (weeks 1–6) | 265 |

## Column Mapping Reference

| Visual Meaning | Source Column |
|---------------|---------------|
| below-zone time | `time_below_s` |
| in-zone time | `time_in_allowed_s` |
| above-zone time | `time_above_s` |
| per-session adherence flag | `bounded_met` |
| group label | `group` |
| subject label | `subject` |
| study week | `week` |
