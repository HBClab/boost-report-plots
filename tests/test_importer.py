from __future__ import annotations

from pathlib import Path

from src.act import importer
from src.act.parser import SessionDayRecord


FIXTURES_ROOT = Path(__file__).parent / "fixtures" / "actigraphy"


class StubConnection:
    def __init__(self) -> None:
        self.commit_count = 0

    def commit(self) -> None:
        self.commit_count += 1


def test_discover_day_summary_files_matches_fixture_tree() -> None:
    files = importer.discover_day_summary_files(FIXTURES_ROOT)

    assert [path.name for path in files] == [
        "part5_daysummary_MM_fixture.csv",
        "part5_daysummary_MM_fixture.csv",
        "part5_daysummary_MM_invalid.csv",
    ]


def test_import_derivatives_tree_summarizes_updated_fixture_schema(monkeypatch) -> None:
    inserted: list[SessionDayRecord] = []

    def fake_upsert_session_day(connection: StubConnection, record: SessionDayRecord) -> bool:
        inserted.append(record)
        return False

    monkeypatch.setattr(importer, "upsert_session_day", fake_upsert_session_day)

    connection = StubConnection()
    summary = importer.import_derivatives_tree(connection, FIXTURES_ROOT)

    assert connection.commit_count == 1
    assert summary.matched_files == 3
    assert summary.imported_rows == 3
    assert summary.refreshed_rows == 0
    assert summary.skipped_rows == 1
    assert len(summary.issues) == 1
    assert summary.issues[0].message == "row 2: calendar_date is blank"

    assert [(record.subject_code, record.session_number) for record in inserted] == [
        ("sub-1001", 1),
        ("sub-1001", 1),
        ("sub-2002", 2),
    ]
