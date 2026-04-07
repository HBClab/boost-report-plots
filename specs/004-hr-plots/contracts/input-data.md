# Input Contract: Heart Rate Dashboard CSV

**Branch**: `004-hr-plots` | **Phase**: 1 | **Date**: 2026-04-07

The HR dashboard consumes a single read-only CSV asset from the repository dataset.

## Local Route Contract

The local server exposes the repository dataset at:

```text
GET /data/zone_out.csv
```

Behavior:

- returns the repository file `data/zone_out.csv` without modifying its contents
- responds with `200 OK` and `text/csv` when the file is available
- responds with `404 Not Found` if the file is missing
- performs no write, cleanup, or mutation against repository data

## Required Columns

The browser code requires the following columns to be present in the CSV header:

| Column | Required | Purpose |
|--------|----------|---------|
| `group` | yes | Distinguishes supervised vs unsupervised data |
| `subject` | yes | Builds the aligned subject roster |
| `week` | yes | Filters to weeks 1–6 and positions columns |
| `session` | yes | Counts weekly sessions per subject |
| `time_in_allowed_s` | yes | In-zone segment for the weekly zone-time chart |
| `time_above_s` | yes | Above-zone segment for the weekly zone-time chart |
| `time_below_s` | yes | Below-zone segment for the weekly zone-time chart |
| `bounded_met` | yes | Session-level adherence input |
| `longest_bounded_bout_s` | no | Ignored by this feature |
| `mazd` | no | Ignored by this feature |

## Browser Parsing Contract

After loading the CSV, the browser converts each row into this logical shape:

```typescript
interface HrSessionRow {
  group: 'Supervised' | 'Unsupervised';
  subject: string;
  week: number;
  session: number;
  time_in_allowed_s: number;
  time_above_s: number;
  time_below_s: number;
  bounded_met: boolean;
}
```

Parsing rules:

- `week` and `session` must parse as integers
- `time_in_allowed_s`, `time_above_s`, and `time_below_s` must parse as numbers
- `bounded_met` must parse to a boolean from the CSV string values
- rows outside weeks 1–6 are discarded after parsing but before aggregation

## Consumer Expectations

The rendering pipeline assumes:

- group values are exactly `Supervised` or `Unsupervised`
- subject IDs are stable string identifiers
- multiple rows may exist for the same group-subject-week because a week can include multiple sessions
- missing subject-week combinations are inferred from absent rows and rendered as no data

## Validation Surface

Any implementation of this feature must make it possible to inspect the served CSV directly in the browser or with `curl` so manual validation can trace rendered values back to the source dataset.
