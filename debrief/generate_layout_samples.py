#!/usr/bin/env python3
"""Build layout-D sample PDF (reportlab). HTML layout variants are archival only.

Usage:
  python repos/boost-report-plots/debrief/generate_layout_samples.py --demo
  python repos/boost-report-plots/debrief/generate_layout_samples.py 8002 --lab-id 1124 --auto-fitness
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

TOOL_DIR = Path(__file__).resolve().parent
if str(TOOL_DIR) not in sys.path:
    sys.path.insert(0, str(TOOL_DIR))

from build_debrief import (  # noqa: E402
    DEFAULT_LAYOUT,
    _infer_cohort,
    _pick_ggir_root,
    build_debrief,
    build_demo_debrief,
)
from debrief_pdf import build_debrief_pdf_from_data  # noqa: E402
from fitness_manual import build_manual_map, resolve_fitness_paths, strip_meta  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("subject", nargs="?", default="", help="BOOST subject id (omit with --demo)")
    ap.add_argument("--demo", action="store_true", help="Synthetic data (no GGIR)")
    ap.add_argument("--lab-id", default="", help="Lab ID for header")
    ap.add_argument("--cohort", choices=("obs", "int", "auto"), default="auto")
    ap.add_argument("--ggir-root", default="")
    ap.add_argument("--manual-json", default="")
    ap.add_argument("--auto-fitness", action="store_true")
    ap.add_argument(
        "--out-dir",
        type=Path,
        default=Path("temp/layout_samples"),
        help="Output directory for layout-D PDF",
    )
    args = ap.parse_args(argv)

    lab_id = args.lab_id or ("1466" if args.demo else (args.subject or "0000"))
    manual = {}
    if args.manual_json:
        manual = __import__("json").loads(Path(args.manual_json).read_text(encoding="utf-8"))
        manual.pop("avg_kcal_session", None)

    if args.demo or not args.subject:
        data = build_demo_debrief(lab_id=lab_id, manual=manual or None)
        subject = data.subject_id
        cohort = data.cohort
    else:
        subject = args.subject.removeprefix("sub-")
        cohort = _infer_cohort(subject) if args.cohort == "auto" else args.cohort
        lab_id = args.lab_id or subject
        ggir_root = _pick_ggir_root(cohort, args.ggir_root or None)
        if args.auto_fitness:
            paths = resolve_fitness_paths()
            fmap = build_manual_map([subject], paths=paths)
            if subject in fmap:
                manual.update(strip_meta(fmap[subject]))
                manual.pop("avg_kcal_session", None)
        try:
            data = build_debrief(
                subject, cohort=cohort, lab_id=lab_id, ggir_root=ggir_root, manual=manual
            )
        except FileNotFoundError as exc:
            print(f"ERROR: {exc}", file=sys.stderr)
            return 1

    out_dir = args.out_dir.resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = out_dir / f"debrief_{subject}_{DEFAULT_LAYOUT}.pdf"
    try:
        build_debrief_pdf_from_data(data, pdf_path, engine="reportlab")
    except (FileNotFoundError, RuntimeError, ValueError, ModuleNotFoundError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    index_path = out_dir / "README.md"
    index_path.write_text(
        "\n".join(
            [
                "# Debrief layout sample",
                "",
                f"Subject **{subject}** · lab **{lab_id}** · cohort **{cohort}**",
                "",
                f"Production layout: `{DEFAULT_LAYOUT}` (reportlab only; HTML variants archived).",
                "",
                f"- `{pdf_path.name}`",
                "",
            ]
        ),
        encoding="utf-8",
    )
    print(f"wrote {pdf_path}")
    print(f"wrote {index_path}")
    print(f"default layout={DEFAULT_LAYOUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
