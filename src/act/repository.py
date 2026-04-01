from __future__ import annotations

from pathlib import Path

from .parser import SessionDayRecord

try:
    import psycopg
except ImportError:  # pragma: no cover - environment dependent
    psycopg = None


def connect(db_url: str):
    if psycopg is None:
        raise RuntimeError("psycopg is not installed; enter the Nix shell before running the importer")
    return psycopg.connect(db_url)


def init_schema(connection, *, schema_path: Path) -> None:
    with schema_path.open("r", encoding="utf-8") as handle:
        sql = handle.read()
    with connection.cursor() as cursor:
        cursor.execute(sql)
    connection.commit()


def upsert_session_day(connection, record: SessionDayRecord) -> bool:
    subject_id = _upsert_subject(connection, record.subject_code)
    session_id = _upsert_session(connection, subject_id, record.session_number, record.day_date.isoformat())
    existed = _session_day_exists(connection, session_id, record.day_date.isoformat())
    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO session_days (
                session_id,
                day_date,
                weekday,
                nonwear_minutes,
                sleep_minutes,
                sedentary_minutes,
                light_pa_minutes,
                moderate_pa_minutes,
                vigorous_pa_minutes,
                mvpa_minutes,
                source_file
            )
            VALUES (
                %(session_id)s,
                %(day_date)s,
                %(weekday)s,
                %(nonwear_minutes)s,
                %(sleep_minutes)s,
                %(sedentary_minutes)s,
                %(light_pa_minutes)s,
                %(moderate_pa_minutes)s,
                %(vigorous_pa_minutes)s,
                %(mvpa_minutes)s,
                %(source_file)s
            )
            ON CONFLICT (session_id, day_date) DO UPDATE
            SET
                weekday = EXCLUDED.weekday,
                nonwear_minutes = EXCLUDED.nonwear_minutes,
                sleep_minutes = EXCLUDED.sleep_minutes,
                sedentary_minutes = EXCLUDED.sedentary_minutes,
                light_pa_minutes = EXCLUDED.light_pa_minutes,
                moderate_pa_minutes = EXCLUDED.moderate_pa_minutes,
                vigorous_pa_minutes = EXCLUDED.vigorous_pa_minutes,
                mvpa_minutes = EXCLUDED.mvpa_minutes,
                source_file = EXCLUDED.source_file
            """,
            {
                "session_id": session_id,
                "day_date": record.day_date.isoformat(),
                "weekday": record.weekday,
                "nonwear_minutes": record.nonwear_minutes,
                "sleep_minutes": record.sleep_minutes,
                "sedentary_minutes": record.sedentary_minutes,
                "light_pa_minutes": record.light_pa_minutes,
                "moderate_pa_minutes": record.moderate_pa_minutes,
                "vigorous_pa_minutes": record.vigorous_pa_minutes,
                "mvpa_minutes": record.mvpa_minutes,
                "source_file": record.source_file,
            },
        )
    return existed


def fetch_counts(connection) -> dict[str, int]:
    counts: dict[str, int] = {}
    with connection.cursor() as cursor:
        for table in ("subjects", "sessions", "session_days"):
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            counts[table] = int(cursor.fetchone()[0])
    return counts


def fetch_lineage_rows(connection) -> list[tuple[str, int, str, str]]:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT s.subject_code, ss.session_number, sd.day_date::text, sd.source_file
            FROM session_days sd
            JOIN sessions ss ON ss.session_id = sd.session_id
            JOIN subjects s ON s.subject_id = ss.subject_id
            ORDER BY s.subject_code, ss.session_number, sd.day_date
            """
        )
        return [(row[0], int(row[1]), row[2], row[3]) for row in cursor.fetchall()]


def _upsert_subject(connection, subject_code: str) -> int:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO subjects (subject_code)
            VALUES (%s)
            ON CONFLICT (subject_code) DO UPDATE
            SET subject_code = EXCLUDED.subject_code
            RETURNING subject_id
            """,
            (subject_code,),
        )
        return int(cursor.fetchone()[0])


def _upsert_session(connection, subject_id: int, session_number: int, session_date: str) -> int:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO sessions (subject_id, session_number, session_date)
            VALUES (%s, %s, %s)
            ON CONFLICT (subject_id, session_number) DO UPDATE
            SET session_date = CASE
                WHEN sessions.session_date IS NULL THEN EXCLUDED.session_date
                WHEN EXCLUDED.session_date IS NULL THEN sessions.session_date
                ELSE LEAST(sessions.session_date, EXCLUDED.session_date)
            END
            RETURNING session_id
            """,
            (subject_id, session_number, session_date),
        )
        return int(cursor.fetchone()[0])


def _session_day_exists(connection, session_id: int, day_date: str) -> bool:
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT 1 FROM session_days WHERE session_id = %s AND day_date = %s",
            (session_id, day_date),
        )
        return cursor.fetchone() is not None
