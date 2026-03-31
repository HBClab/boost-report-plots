from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import date
from pathlib import Path


FULL_DAY_MINUTES = 1440
REQUIRED_COLUMNS = (
    "weekday",
    "calendar_date",
    "nonwear_perc_day",
    "dur_spt_sleep_min",
    "dur_spt_wake_VIG_min",
    "dur_day_IN_unbt_min",
    "dur_day_LIG_unbt_min",
    "dur_day_MOD_unbt_min",
    "dur_day_VIG_unbt_min",
)


@dataclass(frozen=True)
class SessionDayRecord:
    subject_code: str
    session_number: int
    day_date: date
    weekday: str
    nonwear_minutes: int
    sleep_minutes: float
    wake_vigorous_minutes: float
    sedentary_minutes: float
    light_pa_minutes: float
    moderate_pa_minutes: float
    vigorous_pa_minutes: float
    mvpa_minutes: float
    source_file: str


class ParseError(ValueError):
    """Raised when a file row cannot be normalized."""


def parse_day_summary_file(
    csv_path: Path,
    *,
    subject_code: str,
    session_number: int,
) -> tuple[list[SessionDayRecord], list[str]]:
    records: list[SessionDayRecord] = []
    issues: list[str] = []
    seen_dates: set[date] = set()

    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        missing_columns = [column for column in REQUIRED_COLUMNS if column not in (reader.fieldnames or [])]
        if missing_columns:
            return [], [f"missing required columns: {', '.join(missing_columns)}"]

        for row_number, row in enumerate(reader, start=2):
            try:
                record = _parse_row(
                    row,
                    row_number=row_number,
                    csv_path=csv_path,
                    subject_code=subject_code,
                    session_number=session_number,
                )
                if record.day_date in seen_dates:
                    raise ParseError(f"duplicate calendar_date within file: {record.day_date.isoformat()}")
                seen_dates.add(record.day_date)
                records.append(record)
            except ParseError as exc:
                issues.append(f"row {row_number}: {exc}")

    return records, issues


def _parse_row(
    row: dict[str, str],
    *,
    row_number: int,
    csv_path: Path,
    subject_code: str,
    session_number: int,
) -> SessionDayRecord:
    day_date = _parse_date(row.get("calendar_date"), field_name="calendar_date")
    weekday = _require_text(row.get("weekday"), field_name="weekday")
    nonwear_percentage = _parse_percentage(row.get("nonwear_perc_day"), field_name="nonwear_perc_day")
    sleep_minutes = _parse_float(row.get("dur_spt_sleep_min"), field_name="dur_spt_sleep_min")
    wake_vigorous_minutes = _parse_float(
        row.get("dur_spt_wake_VIG_min"),
        field_name="dur_spt_wake_VIG_min",
    )
    sedentary_minutes = _parse_float(row.get("dur_day_IN_unbt_min"), field_name="dur_day_IN_unbt_min")
    light_pa_minutes = _parse_float(row.get("dur_day_LIG_unbt_min"), field_name="dur_day_LIG_unbt_min")
    moderate_pa_minutes = _parse_float(row.get("dur_day_MOD_unbt_min"), field_name="dur_day_MOD_unbt_min")
    vigorous_pa_minutes = _parse_float(row.get("dur_day_VIG_unbt_min"), field_name="dur_day_VIG_unbt_min")

    return SessionDayRecord(
        subject_code=subject_code,
        session_number=session_number,
        day_date=day_date,
        weekday=weekday,
        nonwear_minutes=int(round((nonwear_percentage / 100.0) * FULL_DAY_MINUTES)),
        sleep_minutes=sleep_minutes,
        wake_vigorous_minutes=wake_vigorous_minutes,
        sedentary_minutes=sedentary_minutes,
        light_pa_minutes=light_pa_minutes,
        moderate_pa_minutes=moderate_pa_minutes,
        vigorous_pa_minutes=vigorous_pa_minutes,
        mvpa_minutes=moderate_pa_minutes + vigorous_pa_minutes,
        source_file=str(csv_path),
    )


def _require_text(raw_value: str | None, *, field_name: str) -> str:
    value = (raw_value or "").strip()
    if not value:
        raise ParseError(f"{field_name} is blank")
    return value


def _parse_date(raw_value: str | None, *, field_name: str) -> date:
    value = _require_text(raw_value, field_name=field_name)
    try:
        return date.fromisoformat(value)
    except ValueError as exc:  # pragma: no cover - trivial branch
        raise ParseError(f"{field_name} is not a valid ISO date: {value}") from exc


def _parse_float(raw_value: str | None, *, field_name: str) -> float:
    value = _require_text(raw_value, field_name=field_name)
    try:
        return float(value)
    except ValueError as exc:
        raise ParseError(f"{field_name} is not numeric: {value}") from exc


def _parse_percentage(raw_value: str | None, *, field_name: str) -> float:
    value = _parse_float(raw_value, field_name=field_name)
    if not 0.0 <= value <= 100.0:
        raise ParseError(f"{field_name} is outside 0-100: {value}")
    return value
