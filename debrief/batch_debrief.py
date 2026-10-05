#!/usr/bin/env python3
"""Scan GGIR trees for part5-complete subjects; write reportlab PDF (stack D).

Dry-run by default (lists work). Pass --apply to write.

Usage:
  python repos/boost-report-plots/debrief/batch_debrief.py
  python repos/boost-report-plots/debrief/batch_debrief.py --study int --apply --land
  python repos/boost-report-plots/debrief/batch_debrief.py --ids 9031,9013 --apply --land
  python repos/boost-report-plots/debrief/batch_debrief.py --ids 8002,8080 --apply --land

PDF:
  {BOOST-I}/auto/Lab{lab}_BOOST{id}_ActivityReport_{date}.pdf  (group-writable)

Fitness auto-on: Targeting REDCap + HR xlsx (--no-auto-fitness to skip).
HTML path removed — reportlab only.
"""
from __future__ import annotations

import argparse
import csv
import sys
import tempfile
from pathlib import Path

TOOL_DIR = Path(__file__).resolve().parent
if str(TOOL_DIR) not in sys.path:
    sys.path.insert(0, str(TOOL_DIR))

from build_debrief import (  # noqa: E402
    DEFAULT_LAYOUT,
    _infer_cohort,
    _pick_ggir_root,
    build_debrief,
)
from debrief_pdf import build_debrief_pdf_from_data  # noqa: E402
from fitness_manual import (  # noqa: E402
    build_manual_map,
    resolve_fitness_paths,
    strip_meta,
)
from io_paths import (  # noqa: E402
    group_writable,
    land_pdf_group_writable,
    list_part5_subjects,
    part5_newest_mtime,
)


def _load_lab_map(path: str) -> dict[str, str]:
    """CSV with columns boost_id,lab_id (header required)."""
    if not path:
        return {}
    mapping: dict[str, str] = {}
    with Path(path).open(encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            bid = (row.get("boost_id") or row.get("subject") or "").strip()
            lab = (row.get("lab_id") or row.get("labID") or "").strip()
            if bid and lab:
                mapping[bid.removeprefix("sub-")] = lab
    return mapping


def _process_one(
    subject: str,
    *,
    lab_id: str,
    cohort: str,
    ggir_root: Path,
    apply: bool,
    land: bool,
    land_dir: str,
    manual: dict,
) -> str:
    p5 = part5_newest_mtime(ggir_root, subject)
    if p5 is None:
        return "no_part5"

    if not apply:
        action = "pdf_only"
        if land:
            action += "+land_pdf[reportlab]"
        print(f"DRY {subject} lab={lab_id} {action}")
        return "dry"

    if not land:
        print(f"SKIP {subject}: --apply without --land does nothing (PDF lands via --land)")
        return "noop"

    try:
        data = build_debrief(
            subject, cohort=cohort, lab_id=lab_id, ggir_root=ggir_root, manual=manual
        )
    except FileNotFoundError as exc:
        print(f"ERROR {subject}: {exc}", file=sys.stderr)
        return "build_fail"

    pdf_local = Path(tempfile.gettempdir()) / f"debrief_{subject}.pdf"
    try:
        build_debrief_pdf_from_data(data, pdf_local, engine="reportlab")
    except (FileNotFoundError, RuntimeError, ValueError, ModuleNotFoundError) as exc:
        print(f"ERROR {subject} PDF: {exc}", file=sys.stderr)
        return "pdf_fail"
    try:
        group_writable(pdf_local)
    except OSError:
        pass
    try:
        landed = land_pdf_group_writable(
            pdf_local, lab_id=lab_id, subject_id=subject, land_dir=land_dir or None
        )
    except (FileNotFoundError, OSError, PermissionError) as exc:
        print(f"ERROR {subject} land: {exc}", file=sys.stderr)
        print(f"  (local PDF still at {pdf_local})", file=sys.stderr)
        return "land_fail"
    print(f"landed {landed} sessions={len(data.wear_periods)} layout={DEFAULT_LAYOUT}")
    return "landed"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--study",
        choices=("int", "obs", "both"),
        default="int",
        help="Which GGIR tree(s) to scan (default: int — matches BOOST-I)",
    )
    ap.add_argument("--ids", default="", help="Comma subject list (skip full scan)")
    ap.add_argument("--lab-map", default="", help="CSV boost_id,lab_id")
    ap.add_argument("--apply", action="store_true", help="Write files (default dry-run)")
    ap.add_argument("--land", action="store_true", help="PDF → BOOST-I/auto/")
    ap.add_argument("--land-dir", default="", help="Override BOOST-I/auto path")
    ap.add_argument("--ggir-root", default="", help="Override single GGIR root (implies one study)")
    ap.add_argument("--manual-json", default="", help="Optional shared manual fitness JSON (all subjects)")
    ap.add_argument(
        "--auto-fitness",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Per-subject fitness from REDCap/xlsx (default: on; --no-auto-fitness to skip)",
    )
    ap.add_argument("--fitness-csv", default="", help="Override DebriefFitness CSV")
    ap.add_argument("--adherence-csv", default="", help="Override ExerciseTrainingAdhe CSV")
    ap.add_argument("--hr-xlsx", default="", help="Override BOOST HR ranges.xlsx")
    ap.add_argument("--fitness-search-dir", default="", help="Dir for newest Targeting* CSVs")
    ap.add_argument(
        "--fitness-report-id",
        default="",
        help="REDCap report id when DEBRIEF_FITNESS_TOKEN/TARGETING_TOKEN set",
    )
    ap.add_argument(
        "--adherence-report-id",
        default="",
        help="REDCap adherence report id (with targeting token)",
    )
    ap.add_argument("--limit", type=int, default=0, help="Max subjects (0 = all)")
    # Legacy HTML flags — reject clearly.
    ap.add_argument("--write-html", action="store_true", help=argparse.SUPPRESS)
    ap.add_argument("--ggir-sidecar", action="store_true", help=argparse.SUPPRESS)
    ap.add_argument("--pdf-engine", default="reportlab", help=argparse.SUPPRESS)
    ap.add_argument("--force", action="store_true", help=argparse.SUPPRESS)
    ap.add_argument("--layout", default=DEFAULT_LAYOUT, help=argparse.SUPPRESS)
    args = ap.parse_args(argv)

    if args.write_html or args.ggir_sidecar or str(args.pdf_engine).lower() in {
        "html",
        "browser",
        "chromium",
        "edge",
    }:
        print(
            "ERROR: HTML debrief path removed. Use --apply --land (reportlab PDF only).",
            file=sys.stderr,
        )
        return 2

    lab_map = _load_lab_map(args.lab_map)
    manual_shared = {}
    if args.manual_json:
        import json

        manual_shared = json.loads(Path(args.manual_json).read_text(encoding="utf-8"))
        manual_shared.pop("avg_kcal_session", None)

    fitness_by_id: dict[str, dict] = {}
    if args.auto_fitness:
        paths = resolve_fitness_paths(
            fitness_csv=args.fitness_csv,
            adherence_csv=args.adherence_csv,
            hr_xlsx=args.hr_xlsx,
            search_dir=args.fitness_search_dir,
        )
        print(
            "auto-fitness:",
            f"fitness={paths.fitness_csv}",
            f"adherence={paths.adherence_csv}",
            f"hr={paths.hr_xlsx}",
        )
        raw_map = build_manual_map(
            None,
            paths=paths,
            fitness_report_id=args.fitness_report_id,
            adherence_report_id=args.adherence_report_id,
        )
        fitness_by_id = {sid: strip_meta(m) for sid, m in raw_map.items()}
        for m in fitness_by_id.values():
            m.pop("avg_kcal_session", None)
        print(f"auto-fitness subjects loaded: {len(fitness_by_id)}")

    studies: list[str]
    if args.ggir_root:
        studies = ["custom"]
    elif args.study == "both":
        studies = ["int", "obs"]
    else:
        studies = [args.study]

    wanted = [s.strip().removeprefix("sub-") for s in args.ids.split(",") if s.strip()]

    rc = 0
    n = 0
    for study in studies:
        if study == "custom":
            ggir_root = Path(args.ggir_root)
            cohort = "int"
        else:
            ggir_root = _pick_ggir_root(study, None)
            cohort = study
        if not ggir_root.is_dir():
            print(f"WARNING: missing ggir root {ggir_root}", file=sys.stderr)
            continue

        subjects = wanted or list_part5_subjects(ggir_root)
        print(f"scan {study} root={ggir_root} candidates={len(subjects)}")

        for subject in subjects:
            if args.limit and n >= args.limit:
                break
            if part5_newest_mtime(ggir_root, subject) is None:
                print(
                    f"SKIP {subject} no_part5 under {ggir_root / f'sub-{subject}' / 'accel'}",
                    file=sys.stderr,
                )
                if wanted:
                    rc = 1
                continue
            lab_id = lab_map.get(subject, subject)
            if args.ggir_root:
                coh = _infer_cohort(subject)
            else:
                coh = cohort
            manual = dict(manual_shared)
            if subject in fitness_by_id:
                manual.update(fitness_by_id[subject])
            status = _process_one(
                subject,
                lab_id=lab_id,
                cohort=coh,
                ggir_root=ggir_root,
                apply=args.apply,
                land=args.land,
                land_dir=args.land_dir,
                manual=manual,
            )
            if status in {"pdf_fail", "land_fail", "build_fail"}:
                rc = 1
            n += 1

    if not args.apply:
        print("dry-run only; pass --apply --land to write PDFs")
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
