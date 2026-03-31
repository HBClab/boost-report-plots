# Feature Spec -> Extract Actigraphy Data
---

## Requirements
---
- initialize a small postgres db
    - may require modifications to [flake.nix]
    - no extra users required
- connect it to a main python module for act
- run a tree search through the derivatives directory to get the required files and extract the required info
- save that to a small db with the following schema


## Resources
---
***Directory where the data lives***
`/mnt/lss/Projects/BOOST/InterventionStudy/3-experiment/data/act-int-final-test-2/derivatives/GGIR-3.2.6`

***Which file to extract data from through a tree search of above directory***
`/mnt/lss/Projects/BOOST/InterventionStudy/3-experiment/data/act-int-final-test-2/derivatives/GGIR-3.2.6/sub-****/accel/ses-*/output_ses-*/results/part5_daysummary_MM_L44.8M100.6V428.8_T5A5.csv`
Where * is the directories to search

***Which columns to extract***
`weekday,calendar_date,nonwear_perc_day,dur_spt_sleep_min,dur_spt_wake_VIG_min,dur_day_IN_unbt_min,dur_day_LIG_unbt_min,dur_day_MOD_unbt_min,dur_day_VIG_unbt_min`
Make sure to log subject and session number!
nonwear_perc_day is a percentage and must be turned into minutes


***Example postgres schema (could be modified depending on research findings)***

**Tables**
- subjects
- sessions
- session_days (one row per day of accelerometer-derived data within a session)

***Example initialization***
```SQL
CREATE TABLE subjects (
    subject_id BIGSERIAL PRIMARY KEY,
    subject_code TEXT NOT NULL UNIQUE, -- e.g. "sub-1001"
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sessions (
    session_id BIGSERIAL PRIMARY KEY,
    subject_id BIGINT NOT NULL REFERENCES subjects(subject_id) ON DELETE CASCADE,
    session_number SMALLINT NOT NULL CHECK (session_number BETWEEN 1 AND 5),
    session_date DATE,  -- the first day of the calenda
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (subject_id, session_number)
);

CREATE TABLE session_days (
    session_day_id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    day_date DATE NOT NULL,

    nonwear_minutes INTEGER,
    sleep_minutes INTEGER,
    sedentary_minutes INTEGER,
    light_pa_minutes INTEGER,
    moderate_pa_minutes INTEGER,
    vigorous_pa_minutes INTEGER,
    mvpa_minutes INTEGER,

    source_file TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (session_id, day_date)
);

CREATE INDEX idx_sessions_subject_id
    ON sessions(subject_id);

CREATE INDEX idx_session_days_session_id
    ON session_days(session_id);

CREATE INDEX idx_session_days_day_date
    ON session_days(day_date);
```
