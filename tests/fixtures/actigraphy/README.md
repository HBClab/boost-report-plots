# Actigraphy Fixture Data

These fixtures mirror the GGIR derivatives path pattern expected by the importer.
They also reflect the current parser-required CSV columns:
`weekday`, `calendar_date`, `nonwear_perc_day`, `dur_spt_min`,
`dur_day_total_IN_min`, `dur_day_total_LIG_min`, `dur_day_total_MOD_min`,
and `dur_day_total_VIG_min`.

## Included fixture trees

- `sub-1001/accel/ses-1/output_ses-1/results/part5_daysummary_MM_fixture.csv`
  - 2 valid daily rows
- `sub-2002/accel/ses-2/output_ses-2/results/part5_daysummary_MM_fixture.csv`
  - 1 valid daily row
- `sub-3003/accel/ses-1/output_ses-1/results/part5_daysummary_MM_invalid.csv`
  - 1 invalid row with a blank `calendar_date`

## Expected outcomes

- Initial import should match 3 files
- Initial import should load 3 valid session-day rows
- Initial import should report 1 rejected row from the invalid fixture file
- Imported rows should preserve `subject_code`, `session_number`, `day_date`, and `source_file`
- Imported rows should persist the current canonical metric set without a wake-vigorous column
- Re-running the same import should keep the number of subject/session/day combinations stable

## Lineage checks

- `sub-1001`, session `1`, `2026-01-01` should point back to the `sub-1001` fixture file
- `sub-2002`, session `2`, `2026-02-14` should point back to the `sub-2002` fixture file
