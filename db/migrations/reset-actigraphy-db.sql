BEGIN;

DROP TABLE IF EXISTS session_days;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS subjects;

COMMIT;

\ir ../../src/act/schema.sql
