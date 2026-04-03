-- Validation reference query for Plot 2
-- Run against boost_actigraphy to verify browser row count and sort order

-- ============================================================
-- Step 1: Count Intervention subjects with at least one session
-- Expected: matches the number of participant rows in Plot 2
-- ============================================================
SELECT COUNT(DISTINCT s.subject_id) AS intervention_subject_count
FROM subjects s
JOIN sessions se ON se.subject_id = s.subject_id
WHERE s.subject_code NOT LIKE 'sub-7%'
  AND se.session_number <= 4;

-- ============================================================
-- Step 2: Per-subject per-session averages + computed delta
-- Sorted to match Plot 2 row order (ascending delta_sed = greatest decrease at top)
-- ============================================================
WITH session_avgs AS (
  SELECT
    s.subject_code,
    se.session_number,
    ROUND(AVG(sd.sedentary_minutes)::numeric, 1) AS avg_sed_min,
    ROUND(AVG(sd.mvpa_minutes)::numeric, 1)      AS avg_mvpa_min
  FROM subjects s
  JOIN sessions se ON se.subject_id = s.subject_id
  JOIN session_days sd ON sd.session_id = se.session_id
  WHERE s.subject_code NOT LIKE 'sub-7%'
    AND se.session_number <= 4
  GROUP BY s.subject_code, se.session_number
),
first_last AS (
  SELECT
    subject_code,
    MIN(session_number) AS first_session,
    MAX(session_number) AS last_session
  FROM session_avgs
  GROUP BY subject_code
),
deltas AS (
  SELECT
    fl.subject_code,
    ROUND((last_row.avg_sed_min - first_row.avg_sed_min)::numeric, 1) AS delta_sed
  FROM first_last fl
  JOIN session_avgs first_row
    ON first_row.subject_code = fl.subject_code
    AND first_row.session_number = fl.first_session
  JOIN session_avgs last_row
    ON last_row.subject_code = fl.subject_code
    AND last_row.session_number = fl.last_session
)
SELECT
  d.subject_code,
  d.delta_sed,
  STRING_AGG(
    'S' || sa.session_number || ':sed=' || sa.avg_sed_min || '/mvpa=' || sa.avg_mvpa_min,
    ', '
    ORDER BY sa.session_number
  ) AS sessions
FROM deltas d
JOIN session_avgs sa ON sa.subject_code = d.subject_code
GROUP BY d.subject_code, d.delta_sed
ORDER BY d.delta_sed ASC
LIMIT 10;

-- ============================================================
-- Validation checklist:
-- 1. Step 1 count = number of rows in Plot 2
-- 2. Step 2 top 3 subjects (most negative delta_sed) appear at top of Plot 2
-- 3. Step 2 bottom 3 subjects (most positive delta_sed) appear at bottom
-- ============================================================
