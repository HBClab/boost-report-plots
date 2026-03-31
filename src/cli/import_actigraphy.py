from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from src.act.importer import DEFAULT_DERIVATIVES_ROOT, import_derivatives_tree
from src.act.repository import connect, fetch_counts, fetch_lineage_rows, init_schema


DEFAULT_DB_URL = os.environ.get("ACTIGRAPHY_DB_URL", "postgresql:///boost_actigraphy")
SCHEMA_PATH = Path(__file__).resolve().parents[1] / "act" / "schema.sql"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Initialize and import GGIR actigraphy data")
    parser.add_argument("--db-url", default=DEFAULT_DB_URL, help="PostgreSQL connection string")

    subparsers = parser.add_subparsers(dest="command", required=True)

    init_parser = subparsers.add_parser("init-db", help="Initialize the local PostgreSQL schema")
    init_parser.add_argument("--schema-path", default=str(SCHEMA_PATH), help="Path to schema.sql")

    import_parser = subparsers.add_parser("import", help="Import matching GGIR day summary files")
    import_parser.add_argument(
        "--root",
        default=str(DEFAULT_DERIVATIVES_ROOT),
        help="Root derivatives directory. Change this if you want to load another study tree.",
    )
    import_parser.add_argument("--init-db", action="store_true", help="Initialize schema before importing")
    import_parser.add_argument("--json", action="store_true", help="Emit machine-readable JSON output")

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        connection = connect(args.db_url)
    except Exception as exc:  # pragma: no cover - environment dependent
        parser.error(str(exc))
        return 2

    try:
        if args.command == "init-db":
            init_schema(connection, schema_path=Path(args.schema_path))
            print(f"Initialized schema from {args.schema_path}")
            return 0

        if args.init_db:
            init_schema(connection, schema_path=SCHEMA_PATH)

        summary = import_derivatives_tree(connection, Path(args.root))
        counts = fetch_counts(connection)
        lineage = fetch_lineage_rows(connection)
    finally:
        connection.close()

    if args.json:
        print(summary.to_json())
    else:
        print(f"Matched files: {summary.matched_files}")
        print(f"Imported rows: {summary.imported_rows}")
        print(f"Refreshed rows: {summary.refreshed_rows}")
        print(f"Skipped rows: {summary.skipped_rows}")
        print(f"Subjects: {counts['subjects']}")
        print(f"Sessions: {counts['sessions']}")
        print(f"Session days: {counts['session_days']}")
        if summary.issues:
            print("Issues:")
            for issue in summary.issues:
                print(f"- {issue.source_file}: {issue.message}")
        if lineage:
            print("Lineage sample:")
            for subject_code, session_number, day_date, source_file in lineage[:5]:
                print(f"- {subject_code} ses-{session_number} {day_date} <- {source_file}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
