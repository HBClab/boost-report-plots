#!/usr/bin/env python3
"""Build debrief fitness ``manual`` dict from REDCap + HR xlsx.

Sources (Ali / FIELD_MAP):
  - Pre/post Submax (V2/V4): last ``*stage*end_{pre,post}`` VO2, dates, waist, RHR
  - Supervised + Unsupervised Exercise Training: session flags + date range
  - BOOST HR ranges.xlsx: Max HR → zones string at 60/70/80%% of max

kcal/session dropped (no Polar API wiring). Do not re-add without Michelle + Polar path.

Pull order for REDCap (TargetingCognitiveCo / project 13038):
  1. Report ids if ``DEBRIEF_FITNESS_REPORT_ID`` / ``DEBRIEF_ADHERENCE_REPORT_ID`` set
  2. Else form export via ``DEBRIEF_FITNESS_TOKEN`` / ``TARGETING_TOKEN`` (no report ids needed)
  3. Else newest Targeting* CSVs under ``temp/``

Usage:
  python repos/boost-report-plots/debrief/fitness_manual.py 8002 8080
  python repos/boost-report-plots/debrief/fitness_manual.py 8002 --out-dir temp/debrief_manual
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

TOOL_DIR = Path(__file__).resolve().parent


def _guess_hbc_root() -> Path:
    """HBC checkout root when present; else best-effort (LSS bundle ≠ HBC)."""
    # Layout A: HBC/repos/boost-report-plots/debrief
    if TOOL_DIR.parent.name == "tools" and TOOL_DIR.parent.parent.name == ".cursor":
        return TOOL_DIR.parents[2]
    for cand in (
        Path(os.environ.get("HBC_ROOT") or ""),
        Path.home() / "hbc-workspaces" / "HBC",
        Path.home() / "HBC",
        Path("/home/vosslab-svc/hbc-workspaces/HBC"),
        Path("/home/vosslab-svc/HBC"),
        Path("/mnt/nfs/lss/vosslabhpc/Users/bahaa/HBC"),
    ):
        if str(cand) and (cand / ".env" / ".env").is_file():
            return cand
        if str(cand) and (cand / ".cursor" / "tools" / "debrief").is_dir():
            return cand
    # LSS: …/tools/pipeline/debrief → parents[2] is tools (not HBC)
    return TOOL_DIR.parents[2]


HBC_ROOT = _guess_hbc_root()
TEMP = HBC_ROOT / "temp"


def _env_file_candidates() -> list[Path]:
    """Private env files (never under shared LSS tools/)."""
    cands: list[Path] = []
    explicit = (os.environ.get("DEBRIEF_ENV_FILE") or "").strip()
    if explicit:
        cands.append(Path(explicit))
    home = Path.home()
    cands.extend(
        [
            home / ".config" / "bahaa" / "debrief.env",
            home / ".config" / "debrief.env",
            Path("/home/vosslab-svc/.config/bahaa/debrief.env"),
            HBC_ROOT / ".env" / ".env",
            home / "hbc-workspaces" / "HBC" / ".env" / ".env",
            home / "HBC" / ".env" / ".env",
            Path("/home/vosslab-svc/hbc-workspaces/HBC/.env/.env"),
            Path("/home/vosslab-svc/HBC/.env/.env"),
        ]
    )
    # Dedupe preserving order
    seen: set[str] = set()
    out: list[Path] = []
    for p in cands:
        key = str(p)
        if key in seen:
            continue
        seen.add(key)
        out.append(p)
    return out


def _load_dotenv_keys(*keys: str) -> dict[str, str]:
    """Load selected keys from env files into os.environ if unset."""
    out: dict[str, str] = {}
    for k in keys:
        v = (os.environ.get(k) or "").strip()
        if v:
            out[k] = v
    for env_path in _env_file_candidates():
        if not env_path.is_file():
            continue
        try:
            lines = env_path.read_text(encoding="utf-8").splitlines()
        except OSError:
            continue
        for line in lines:
            raw = line.strip()
            if not raw or raw.startswith("#") or "=" not in raw:
                continue
            key, val = raw.split("=", 1)
            key = key.strip()
            if key not in keys:
                continue
            val = val.strip().strip('"').strip("'")
            if not val:
                continue
            if key not in out:
                out[key] = val
                os.environ.setdefault(key, val)
        # Prefer first file that contributed any of our keys
        if any(k in out for k in keys):
            break
    return out


DEFAULT_FITNESS_GLOBS = (
    "TargetingCognitiveCo-DebriefFitness_DATA_*.csv",
    "TargetingCognitiveCo-VO2max_DATA_*.csv",
)
DEFAULT_ADHERENCE_GLOBS = (
    "TargetingCognitiveCo-ExerciseTrainingAdhe_DATA_*.csv",
)
HR_XLSX_CANDIDATES = (
    Path(
        r"Z:\Projects\BOOST\InterventionStudy\1-projectManagement\participants"
        r"\ExerciseSessionMaterials\Intervention Materials\BOOST HR ranges.xlsx"
    ),
    Path(
        "/mnt/nfs/lss/vosslabhpc/Projects/BOOST/InterventionStudy/1-projectManagement"
        "/participants/ExerciseSessionMaterials/Intervention Materials/BOOST HR ranges.xlsx"
    ),
    Path(
        "/Shared/vosslabhpc/Projects/BOOST/InterventionStudy/1-projectManagement"
        "/participants/ExerciseSessionMaterials/Intervention Materials/BOOST HR ranges.xlsx"
    ),
)
# Form export (when report ids unset)
FITNESS_FORMS = (
    "id_numbers",
    "pretraining_submax_test_v2",
    "posttraining_submax_test_v4",
)
ADHERENCE_FORMS = (
    "id_numbers",
    "supervised_exercise_training",
    "unsupervised_exercise_training",
)

REDCAP_URL = "https://redcap.icts.uiowa.edu/redcap/api/"
_STAGE_RE = re.compile(r"stage(\d+)", re.I)


@dataclass
class FitnessPaths:
    fitness_csv: Path | None
    adherence_csv: Path | None
    hr_xlsx: Path | None


def _newest_glob(directory: Path, patterns: tuple[str, ...]) -> Path | None:
    hits: list[Path] = []
    if not directory.is_dir():
        return None
    for pat in patterns:
        hits.extend(directory.glob(pat))
    hits = [p for p in hits if p.is_file()]
    if not hits:
        return None
    return max(hits, key=lambda p: p.stat().st_mtime)


def resolve_fitness_paths(
    *,
    fitness_csv: str = "",
    adherence_csv: str = "",
    hr_xlsx: str = "",
    search_dir: str = "",
) -> FitnessPaths:
    root = Path(search_dir) if search_dir else TEMP
    fit = Path(fitness_csv) if fitness_csv else None
    adh = Path(adherence_csv) if adherence_csv else None
    hr = Path(hr_xlsx) if hr_xlsx else None

    if fit is None:
        env = (os.environ.get("DEBRIEF_FITNESS_CSV") or "").strip()
        fit = Path(env) if env else _newest_glob(root, DEFAULT_FITNESS_GLOBS)
    if adh is None:
        env = (os.environ.get("DEBRIEF_ADHERENCE_CSV") or "").strip()
        adh = Path(env) if env else _newest_glob(root, DEFAULT_ADHERENCE_GLOBS)
    if hr is None:
        env = (os.environ.get("DEBRIEF_HR_XLSX") or "").strip()
        if env:
            hr = Path(env)
        else:
            hr = next((p for p in HR_XLSX_CANDIDATES if p.is_file()), None)

    return FitnessPaths(
        fitness_csv=fit if fit and fit.is_file() else None,
        adherence_csv=adh if adh and adh.is_file() else None,
        hr_xlsx=hr if hr and hr.is_file() else None,
    )


def _read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as fh:
        return list(csv.DictReader(fh))


def _sid(row: dict[str, str]) -> str:
    for key in ("boost_id", "record_id", "subject"):
        val = (row.get(key) or "").strip()
        if val:
            return val.removeprefix("sub-")
    return ""


def _index_by_id(rows: list[dict[str, str]]) -> dict[str, dict[str, str]]:
    out: dict[str, dict[str, str]] = {}
    for row in rows:
        sid = _sid(row)
        if sid:
            out[sid] = row
    return out


def _stage_num(name: str) -> int:
    m = _STAGE_RE.search(name)
    return int(m.group(1)) if m else 0


def _end_cols(row: dict[str, str], which: str) -> list[str]:
    """which = 'pre' or 'post' → sorted stage*end_{pre,post} columns."""
    suffix = f"end_{which}"
    cols = [c for c in row.keys() if "vo2" in c.lower() and suffix in c.lower()]
    return sorted(cols, key=_stage_num)


def last_stage_vo2(row: dict[str, str], which: str) -> float | None:
    last: float | None = None
    for col in _end_cols(row, which):
        raw = (row.get(col) or "").strip()
        if not raw:
            continue
        try:
            last = float(raw)
        except ValueError:
            continue
    return last


def _fmt_date(raw: str) -> str:
    raw = (raw or "").strip()
    if not raw:
        return ""
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%Y/%m/%d", "%m-%d-%Y"):
        try:
            return datetime.strptime(raw[:10], fmt).strftime("%m/%d/%Y")
        except ValueError:
            continue
    return raw


def _fmt_num(val: float | None, digits: int = 1) -> str | float | None:
    if val is None:
        return None
    if abs(val - round(val)) < 1e-9:
        return int(round(val))
    return round(val, digits)


def _count_sessions(row: dict[str, str], prefix: str) -> int:
    """Count session flags: prefix like 'sup_pa_ses' / 'unsup_pa_ses' + digits only."""
    n = 0
    for key, val in row.items():
        if not key.startswith(prefix):
            continue
        rest = key[len(prefix) :]
        if not rest.isdigit():
            continue
        raw = (val or "").strip()
        if raw and raw not in {"0", "0.0"}:
            n += 1
    return n


def _exercise_range(row: dict[str, str]) -> str:
    starts = [
        (row.get(k) or "").strip()
        for k in ("sup_pa_start", "unsup_pa_start")
        if (row.get(k) or "").strip()
    ]
    ends = [
        (row.get(k) or "").strip()
        for k in ("sup_pa_end", "unsup_pa_end")
        if (row.get(k) or "").strip()
    ]
    if not starts and not ends:
        return ""
    start = _fmt_date(min(starts)) if starts else ""
    end = _fmt_date(max(ends)) if ends else ""
    if start and end:
        return f"{start} to {end}"
    return start or end


def _load_hr_table(path: Path) -> dict[str, dict[str, Any]]:
    try:
        import openpyxl
    except ImportError:
        print(
            "WARNING: openpyxl missing — skip HR ranges xlsx "
            f"({path}); conda activate act && pip install openpyxl",
            file=sys.stderr,
        )
        return {}

    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb[wb.sheetnames[0]]
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return {}
    header = [str(c).strip() if c is not None else "" for c in rows[0]]
    # Find Max HR column
    try:
        id_i = next(i for i, h in enumerate(header) if h.lower() in {"boost id", "boost_id", "id"})
    except StopIteration:
        id_i = 0
    try:
        max_i = next(i for i, h in enumerate(header) if "max hr" in h.lower() or h.lower() == "max_hr")
    except StopIteration:
        max_i = 3

    out: dict[str, dict[str, Any]] = {}
    for row in rows[1:]:
        if not row or row[id_i] is None:
            continue
        sid = str(row[id_i]).strip().removesuffix(".0")
        if not sid:
            continue
        max_hr = row[max_i] if max_i < len(row) else None
        try:
            max_f = float(max_hr) if max_hr is not None and str(max_hr).strip() else None
        except (TypeError, ValueError):
            max_f = None
        if max_f is None:
            continue
        out[sid] = {"hr_max": max_f}
    return out


def _zones_from_max(hr_max: float | None) -> tuple[str, str | int | None]:
    if hr_max is None:
        return "", None
    parts = []
    for pct in (60, 70, 80):
        bpm = int(round(hr_max * pct / 100.0))
        parts.append(f"{pct}% {bpm}")
    hr_disp = int(round(hr_max)) if abs(hr_max - round(hr_max)) < 0.05 else round(hr_max, 1)
    return ", ".join(parts), hr_disp


def build_manual_for_subject(
    subject_id: str,
    *,
    fitness_row: dict[str, str] | None,
    adherence_row: dict[str, str] | None,
    hr_row: dict[str, Any] | None,
) -> dict[str, Any]:
    """Return manual dict for build_debrief (omit empty keys → placeholders stay —)."""
    sid = subject_id.removeprefix("sub-")
    manual: dict[str, Any] = {}

    if fitness_row:
        pre = last_stage_vo2(fitness_row, "pre")
        post = last_stage_vo2(fitness_row, "post")
        if pre is not None:
            manual["pre_vo2"] = _fmt_num(pre, 1)
        if post is not None:
            manual["post_vo2"] = _fmt_num(post, 1)
        pre_d = _fmt_date(fitness_row.get("pre_submax_date") or "")
        post_d = _fmt_date(fitness_row.get("post_submax_date") or "")
        if pre_d:
            manual["pre_vo2_date"] = pre_d
        if post_d:
            manual["post_vo2_date"] = post_d
        # Prefer standard waist; fall back to umbilicus when blank (common on pre V2).
        wpre = (
            (fitness_row.get("pre_submax_waist_circ") or "").strip()
            or (fitness_row.get("pre_submax_waist_circ_umbilicus") or "").strip()
        )
        wpost = (
            (fitness_row.get("post_submax_waist_circ") or "").strip()
            or (fitness_row.get("post_submax_waist_circ_umbilicus") or "").strip()
        )
        if wpre:
            manual["waist_pre"] = wpre
        if wpost:
            manual["waist_post"] = wpost
        rpre = (fitness_row.get("pre_submax_rest_hr") or "").strip()
        rpost = (fitness_row.get("post_submax_rest_hr") or "").strip()
        if rpre:
            try:
                manual["resting_hr_pre"] = int(float(rpre))
            except ValueError:
                manual["resting_hr_pre"] = rpre
        if rpost:
            try:
                manual["resting_hr_post"] = int(float(rpost))
            except ValueError:
                manual["resting_hr_post"] = rpost

    if adherence_row:
        sup = _count_sessions(adherence_row, "sup_pa_ses")
        unsup = _count_sessions(adherence_row, "unsup_pa_ses")
        total = sup + unsup
        if total:
            manual["sessions_completed"] = f"{total} completed sessions"
            manual["adherence_pct"] = str(int(round(total / 60.0 * 100)))
        er = _exercise_range(adherence_row)
        if er:
            manual["exercise_range"] = er

    if hr_row:
        zones, hr_max = _zones_from_max(hr_row.get("hr_max"))
        if zones:
            manual["hr_zones"] = zones
        if hr_max is not None:
            manual["hr_max"] = hr_max

    manual["_meta"] = {
        "boost_id": sid,
        "sources": {
            "fitness": bool(fitness_row),
            "adherence": bool(adherence_row),
            "hr_xlsx": bool(hr_row),
        },
    }
    return manual


def fetch_redcap_report(token: str, report_id: str) -> list[dict[str, str]]:
    """Pull a REDCap report (TargetingCognitiveCo). Requires requests."""
    import requests

    r = requests.post(
        REDCAP_URL,
        data={
            "token": token,
            "content": "report",
            "report_id": report_id,
            "format": "json",
            "rawOrLabel": "raw",
        },
        timeout=180,
    )
    r.raise_for_status()
    data = r.json()
    if isinstance(data, dict) and data.get("error"):
        raise RuntimeError(data["error"])
    if not isinstance(data, list):
        raise RuntimeError(f"unexpected REDCap response: {type(data)}")
    return [{str(k): "" if v is None else str(v) for k, v in row.items()} for row in data]


def fetch_redcap_forms(token: str, forms: tuple[str, ...] | list[str]) -> list[dict[str, str]]:
    """Export records for one or more instruments (merged per record_id)."""
    import requests

    r = requests.post(
        REDCAP_URL,
        data={
            "token": token,
            "content": "record",
            "format": "json",
            "type": "flat",
            "rawOrLabel": "raw",
            "exportDataAccessGroups": "false",
            "forms": ",".join(forms),
        },
        timeout=300,
    )
    r.raise_for_status()
    data = r.json()
    if isinstance(data, dict) and data.get("error"):
        raise RuntimeError(data["error"])
    if not isinstance(data, list):
        raise RuntimeError(f"unexpected REDCap response: {type(data)}")
    return [{str(k): "" if v is None else str(v) for k, v in row.items()} for row in data]


def load_tables(
    paths: FitnessPaths,
    *,
    fitness_token: str = "",
    fitness_report_id: str = "",
    adherence_report_id: str = "",
) -> tuple[
    dict[str, dict[str, str]],
    dict[str, dict[str, str]],
    dict[str, dict[str, Any]],
]:
    fitness_by: dict[str, dict[str, str]] = {}
    adhere_by: dict[str, dict[str, str]] = {}
    hr_by: dict[str, dict[str, Any]] = {}

    _load_dotenv_keys(
        "DEBRIEF_FITNESS_TOKEN",
        "TARGETING_TOKEN",
        "BOOST_TOKEN",
        "DEBRIEF_FITNESS_REPORT_ID",
        "DEBRIEF_ADHERENCE_REPORT_ID",
    )
    tok = (
        fitness_token
        or os.environ.get("DEBRIEF_FITNESS_TOKEN")
        or os.environ.get("TARGETING_TOKEN")
        or ""
    ).strip()
    fit_rid = (fitness_report_id or os.environ.get("DEBRIEF_FITNESS_REPORT_ID") or "").strip()
    adh_rid = (adherence_report_id or os.environ.get("DEBRIEF_ADHERENCE_REPORT_ID") or "").strip()

    if tok and fit_rid:
        print(f"REDCap fitness via report_id={fit_rid}")
        fitness_by = _index_by_id(fetch_redcap_report(tok, fit_rid))
    elif tok:
        print(f"REDCap fitness via forms={','.join(FITNESS_FORMS)}")
        fitness_by = _index_by_id(fetch_redcap_forms(tok, FITNESS_FORMS))
    elif paths.fitness_csv:
        print(f"fitness CSV {paths.fitness_csv}")
        fitness_by = _index_by_id(_read_csv(paths.fitness_csv))
    else:
        print(
            "WARNING: no Targeting REDCap token — VO2/waist/RHR/sessions will be blank. "
            "Set TARGETING_TOKEN or DEBRIEF_FITNESS_TOKEN (or ~/.config/bahaa/debrief.env). "
            "Not the same as BOOST_TOKEN.",
            flush=True,
        )

    if tok and adh_rid:
        print(f"REDCap adherence via report_id={adh_rid}")
        adhere_by = _index_by_id(fetch_redcap_report(tok, adh_rid))
    elif tok:
        print(f"REDCap adherence via forms={','.join(ADHERENCE_FORMS)}")
        adhere_by = _index_by_id(fetch_redcap_forms(tok, ADHERENCE_FORMS))
    elif paths.adherence_csv:
        print(f"adherence CSV {paths.adherence_csv}")
        adhere_by = _index_by_id(_read_csv(paths.adherence_csv))

    if paths.hr_xlsx:
        hr_by = _load_hr_table(paths.hr_xlsx)

    return fitness_by, adhere_by, hr_by


def build_manual_map(
    subject_ids: list[str] | None = None,
    *,
    paths: FitnessPaths | None = None,
    fitness_token: str = "",
    fitness_report_id: str = "",
    adherence_report_id: str = "",
) -> dict[str, dict[str, Any]]:
    paths = paths or resolve_fitness_paths()
    fitness_by, adhere_by, hr_by = load_tables(
        paths,
        fitness_token=fitness_token,
        fitness_report_id=fitness_report_id,
        adherence_report_id=adherence_report_id,
    )
    ids = subject_ids or sorted(set(fitness_by) | set(adhere_by) | set(hr_by))
    out: dict[str, dict[str, Any]] = {}
    for sid in ids:
        sid = sid.removeprefix("sub-")
        out[sid] = build_manual_for_subject(
            sid,
            fitness_row=fitness_by.get(sid),
            adherence_row=adhere_by.get(sid),
            hr_row=hr_by.get(sid),
        )
    return out


def strip_meta(manual: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in manual.items() if not k.startswith("_")}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("subjects", nargs="*", help="BOOST IDs (default: all in fitness CSV)")
    ap.add_argument("--fitness-csv", default="")
    ap.add_argument("--adherence-csv", default="")
    ap.add_argument("--hr-xlsx", default="")
    ap.add_argument("--search-dir", default="", help="Dir to find newest Targeting* CSVs")
    ap.add_argument("--fitness-token-env", default="DEBRIEF_FITNESS_TOKEN")
    ap.add_argument("--fitness-report-id", default="")
    ap.add_argument("--adherence-report-id", default="")
    ap.add_argument("--out-dir", default="", help="Write one JSON per subject")
    ap.add_argument("--out", default="", help="Write combined JSON map")
    args = ap.parse_args(argv)

    paths = resolve_fitness_paths(
        fitness_csv=args.fitness_csv,
        adherence_csv=args.adherence_csv,
        hr_xlsx=args.hr_xlsx,
        search_dir=args.search_dir,
    )
    print(
        "paths:",
        f"fitness={paths.fitness_csv}",
        f"adherence={paths.adherence_csv}",
        f"hr={paths.hr_xlsx}",
    )
    _load_dotenv_keys("DEBRIEF_FITNESS_TOKEN", "TARGETING_TOKEN")
    token = (os.environ.get(args.fitness_token_env) or os.environ.get("TARGETING_TOKEN") or "").strip()
    manual_map = build_manual_map(
        [s.removeprefix("sub-") for s in args.subjects] or None,
        paths=paths,
        fitness_token=token,
        fitness_report_id=args.fitness_report_id,
        adherence_report_id=args.adherence_report_id,
    )
    clean = {sid: strip_meta(m) for sid, m in manual_map.items()}
    for sid, m in list(clean.items())[:5]:
        print(f"{sid}: {json.dumps(m, ensure_ascii=False)}")
    if len(clean) > 5:
        print(f"... ({len(clean)} subjects)")

    if args.out_dir:
        out_dir = Path(args.out_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        for sid, m in clean.items():
            (out_dir / f"{sid}.json").write_text(json.dumps(m, indent=2), encoding="utf-8")
        print(f"wrote {len(clean)} files → {out_dir}")
    if args.out:
        Path(args.out).write_text(json.dumps(clean, indent=2), encoding="utf-8")
        print(f"wrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
