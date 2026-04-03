from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Iterable

from .parser import SessionDayRecord, parse_day_summary_file
from .repository import upsert_session_day


DEFAULT_DERIVATIVES_ROOT = Path(
    "/mnt/lss/Projects/BOOST/InterventionStudy/3-experiment/data/act-int-final-test-2/derivatives/GGIR-3.2.6"
)


@dataclass
class ImportIssue:
    source_file: str
    message: str


@dataclass
class ImportSummary:
    matched_files: int = 0
    imported_rows: int = 0
    skipped_rows: int = 0
    refreshed_rows: int = 0
    issues: list[ImportIssue] = field(default_factory=list)

    def add_issue(self, source_file: Path, message: str) -> None:
        self.issues.append(ImportIssue(source_file=str(source_file), message=message))

    def to_json(self) -> str:
        return json.dumps(
            {
                "matched_files": self.matched_files,
                "imported_rows": self.imported_rows,
                "skipped_rows": self.skipped_rows,
                "refreshed_rows": self.refreshed_rows,
                "issues": [asdict(issue) for issue in self.issues],
            },
            indent=2,
            sort_keys=True,
        )


def discover_day_summary_files(root: Path) -> list[Path]:
    return sorted(
        path
        for path in root.rglob("part5_daysummary_MM_*.csv")
        if _looks_like_ggir_summary_path(path)
    )


def import_derivatives_tree(connection, root: Path) -> ImportSummary:
    summary = ImportSummary()
    for csv_path in discover_day_summary_files(root):
        summary.matched_files += 1
        try:
            subject_code = extract_subject_code(csv_path)
            session_number = extract_session_number(csv_path)
        except ValueError as exc:
            summary.add_issue(csv_path, str(exc))
            continue

        records, issues = parse_day_summary_file(
            csv_path,
            subject_code=subject_code,
            session_number=session_number,
        )

        for issue in issues:
            summary.skipped_rows += 1
            summary.add_issue(csv_path, issue)

        imported_results = _import_records(connection, records)
        summary.imported_rows += sum(1 for result in imported_results if result == "inserted")
        summary.refreshed_rows += sum(1 for result in imported_results if result == "refreshed")

    connection.commit()
    return summary


def extract_subject_code(csv_path: Path) -> str:
    for part in csv_path.parts:
        if part.startswith("sub-"):
            return part
    raise ValueError("could not derive subject_code from source path")


def extract_session_number(csv_path: Path) -> int:
    for part in csv_path.parts:
        if part.startswith("ses-"):
            suffix = part.removeprefix("ses-")
            digits = "".join(ch for ch in suffix if ch.isdigit())
            if digits:
                return int(digits)
    raise ValueError("could not derive session_number from source path")


def _looks_like_ggir_summary_path(csv_path: Path) -> bool:
    parts = csv_path.parts
    return any(part.startswith("sub-") for part in parts) and any(part.startswith("ses-") for part in parts)


def _import_records(connection, records: Iterable[SessionDayRecord]) -> list[str]:
    imported_results: list[str] = []
    for record in records:
        existed = upsert_session_day(connection, record)
        imported_results.append("refreshed" if existed else "inserted")
    return imported_results
