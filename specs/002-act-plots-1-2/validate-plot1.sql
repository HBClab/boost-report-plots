-- Validation reference query for Plot 1
-- Run against boost_actigraphy to verify browser-rendered proportions
-- Expected Intervention results documented in research.md

-- ============================================================
-- Intervention group day-type averages (NOT sub-7%)
-- ============================================================
SELECT
  'Intervention' AS grp,
  'All Days'     AS day_type,
  ROUND(AVG(sd.sleep_minutes)::numeric, 1)         AS sleep_min,
  ROUND(AVG(sd.sedentary_minutes)::numeric, 1)     AS sed_min,
  ROUND(AVG(sd.light_pa_minutes)::numeric, 1)      AS light_min,
  ROUND(AVG(sd.moderate_pa_minutes)::numeric, 1)   AS mod_min,
  ROUND(AVG(sd.vigorous_pa_minutes)::numeric, 1)   AS vig_min,
  ROUND(AVG(
    sd.sleep_minutes + sd.sedentary_minutes +
    sd.light_pa_minutes + sd.moderate_pa_minutes + sd.vigorous_pa_minutes
  )::numeric, 1) AS total_min
FROM subjects s
JOIN sessions se ON se.subject_id = s.subject_id
JOIN session_days sd ON sd.session_id = se.session_id
WHERE s.subject_code NOT LIKE 'sub-7%'

UNION ALL

SELECT
  'Intervention',
  CASE WHEN sd.weekday IN ('Saturday','Sunday') THEN 'Weekends' ELSE 'Weekdays' END,
  ROUND(AVG(sd.sleep_minutes)::numeric, 1),
  ROUND(AVG(sd.sedentary_minutes)::numeric, 1),
  ROUND(AVG(sd.light_pa_minutes)::numeric, 1),
  ROUND(AVG(sd.moderate_pa_minutes)::numeric, 1),
  ROUND(AVG(sd.vigorous_pa_minutes)::numeric, 1),
  ROUND(AVG(
    sd.sleep_minutes + sd.sedentary_minutes +
    sd.light_pa_minutes + sd.moderate_pa_minutes + sd.vigorous_pa_minutes
  )::numeric, 1)
FROM subjects s
JOIN sessions se ON se.subject_id = s.subject_id
JOIN session_days sd ON sd.session_id = se.session_id
WHERE s.subject_code NOT LIKE 'sub-7%'
GROUP BY 3

-- ============================================================
-- Observational group day-type averages (sub-7%)
-- ============================================================
UNION ALL

SELECT
  'Observational',
  'All Days',
  ROUND(AVG(sd.sleep_minutes)::numeric, 1),
  ROUND(AVG(sd.sedentary_minutes)::numeric, 1),
  ROUND(AVG(sd.light_pa_minutes)::numeric, 1),
  ROUND(AVG(sd.moderate_pa_minutes)::numeric, 1),
  ROUND(AVG(sd.vigorous_pa_minutes)::numeric, 1),
  ROUND(AVG(
    sd.sleep_minutes + sd.sedentary_minutes +
    sd.light_pa_minutes + sd.moderate_pa_minutes + sd.vigorous_pa_minutes
  )::numeric, 1)
FROM subjects s
JOIN sessions se ON se.subject_id = s.subject_id
JOIN session_days sd ON sd.session_id = se.session_id
WHERE s.subject_code LIKE 'sub-7%'

UNION ALL

SELECT
  'Observational',
  CASE WHEN sd.weekday IN ('Saturday','Sunday') THEN 'Weekends' ELSE 'Weekdays' END,
  ROUND(AVG(sd.sleep_minutes)::numeric, 1),
  ROUND(AVG(sd.sedentary_minutes)::numeric, 1),
  ROUND(AVG(sd.light_pa_minutes)::numeric, 1),
  ROUND(AVG(sd.moderate_pa_minutes)::numeric, 1),
  ROUND(AVG(sd.vigorous_pa_minutes)::numeric, 1),
  ROUND(AVG(
    sd.sleep_minutes + sd.sedentary_minutes +
    sd.light_pa_minutes + sd.moderate_pa_minutes + sd.vigorous_pa_minutes
  )::numeric, 1)
FROM subjects s
JOIN sessions se ON se.subject_id = s.subject_id
JOIN session_days sd ON sd.session_id = se.session_id
WHERE s.subject_code LIKE 'sub-7%'
GROUP BY 3

ORDER BY grp DESC, day_type;

-- ============================================================
-- Expected Intervention results (from research.md):
-- All Days:  sleep=437.6  sed=771.7  light=148.6  mod=80.0  vig=2.2  total≈1440.1
-- Weekdays:  sleep=425.7  sed=788.4  light=143.8  mod=79.8  vig=2.4  total≈1440.0
-- Weekends:  sleep=468.1  sed=728.9  light=161.1  mod=80.6  vig=1.7  total≈1440.3
--
-- Normalized proportions (All Days, Intervention):
-- Sleep 30.4% | Sed 53.6% | Light 10.3% | Mod 5.6% | Vig 0.2%
-- ============================================================
