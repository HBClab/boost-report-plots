BEGIN;

CREATE OR REPLACE VIEW session_days_view AS
SELECT
    session_day_id,
    session_id,
    day_date,
    weekday,
    nonwear_minutes,
    sleep_minutes,
    sedentary_minutes,
    light_pa_minutes,
    moderate_pa_minutes,
    vigorous_pa_minutes,
    mvpa_minutes
FROM session_days;

COMMIT;
