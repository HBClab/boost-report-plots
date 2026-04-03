from __future__ import annotations

from pathlib import Path

from src.act.parser import FULL_DAY_MINUTES, parse_day_summary_file


FIXTURES_ROOT = Path(__file__).parent / "fixtures" / "actigraphy"


def test_parse_day_summary_file_uses_updated_required_columns() -> None:
    csv_path = (
        FIXTURES_ROOT
        / "sub-1001"
        / "accel"
        / "ses-1"
        / "output_ses-1"
        / "results"
        / "part5_daysummary_MM_fixture.csv"
    )

    records, issues = parse_day_summary_file(
        csv_path,
        subject_code="sub-1001",
        session_number=1,
    )

    assert issues == []
    assert len(records) == 2

    first = records[0]
    assert first.subject_code == "sub-1001"
    assert first.session_number == 1
    assert first.weekday == "Thursday"
    assert first.sleep_minutes == 420.0
    assert first.sedentary_minutes == 510.0
    assert first.light_pa_minutes == 300.0
    assert first.moderate_pa_minutes == 90.0
    assert first.vigorous_pa_minutes == 20.0
    assert first.mvpa_minutes == 110.0
    assert first.nonwear_minutes == int(round((5.0 / 100.0) * FULL_DAY_MINUTES))


def test_parse_day_summary_file_reports_blank_calendar_date() -> None:
    csv_path = (
        FIXTURES_ROOT
        / "sub-3003"
        / "accel"
        / "ses-1"
        / "output_ses-1"
        / "results"
        / "part5_daysummary_MM_invalid.csv"
    )

    records, issues = parse_day_summary_file(
        csv_path,
        subject_code="sub-3003",
        session_number=1,
    )

    assert records == []
    assert issues == ["row 2: calendar_date is blank"]
