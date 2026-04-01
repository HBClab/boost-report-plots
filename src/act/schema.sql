CREATE TABLE IF NOT EXISTS subjects (
    subject_id BIGSERIAL PRIMARY KEY,
    subject_code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
    session_id BIGSERIAL PRIMARY KEY,
    subject_id BIGINT NOT NULL REFERENCES subjects(subject_id) ON DELETE CASCADE,
    session_number SMALLINT NOT NULL CHECK (session_number > 0),
    session_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (subject_id, session_number)
);

CREATE TABLE IF NOT EXISTS session_days (
    session_day_id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    day_date DATE NOT NULL,
    weekday TEXT NOT NULL,
    nonwear_minutes INTEGER NOT NULL CHECK (nonwear_minutes >= 0 AND nonwear_minutes <= 1440),
    sleep_minutes DOUBLE PRECISION NOT NULL,
    wake_vigorous_minutes DOUBLE PRECISION NOT NULL,
    sedentary_minutes DOUBLE PRECISION NOT NULL,
    light_pa_minutes DOUBLE PRECISION NOT NULL,
    moderate_pa_minutes DOUBLE PRECISION NOT NULL,
    vigorous_pa_minutes DOUBLE PRECISION NOT NULL,
    mvpa_minutes DOUBLE PRECISION NOT NULL,
    source_file TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (session_id, day_date)
);

CREATE INDEX IF NOT EXISTS idx_sessions_subject_id ON sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_session_days_session_id ON session_days(session_id);
CREATE INDEX IF NOT EXISTS idx_session_days_day_date ON session_days(day_date);
