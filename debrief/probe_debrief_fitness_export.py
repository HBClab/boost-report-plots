#!/usr/bin/env python3
"""Sanity-check DebriefFitness export (last-stage *end* VO2 + dates)."""
from __future__ import annotations

import csv
import re
from collections import Counter
from pathlib import Path

TEMP = Path(r"D:\work\HBC\temp")
NEW = TEMP / "TargetingCognitiveCo-DebriefFitness_DATA_2026-09-17_1323.csv"
OLD = TEMP / "TargetingCognitiveCo-VO2max_DATA_2026-09-17_1235.csv"

OLD_PRE = [
    "submax_vo2_stage2end_pre",
    "submax_vo2_stage3end_pre",
    "submax_vo2_stage4end_pre",
    "submax_vo2_stage5end_pre",
    "submax_vo2_stage6end_pre",
]


def load(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def stage_num(name: str) -> int:
    m = re.search(r"stage(\d+)", name)
    return int(m.group(1)) if m else 0


def last_nonempty(row: dict[str, str], cols: list[str]) -> tuple[str | None, float | None]:
    last_c, last_v = None, None
    for c in cols:
        raw = (row.get(c) or "").strip()
        if not raw:
            continue
        try:
            last_c, last_v = c, float(raw)
        except ValueError:
            last_c, last_v = c, None
    return last_c, last_v


def main() -> int:
    if not NEW.is_file():
        print("MISSING", NEW)
        return 1
    rows = load(NEW)
    cols = list(rows[0].keys())
    end_pre = sorted([c for c in cols if "end_pre" in c], key=stage_num)
    end_post = sorted([c for c in cols if "end_post" in c], key=stage_num)
    junk = [c for c in cols if "vo2" in c and "end" not in c]

    print(f"file={NEW.name} n={len(rows)} ncols={len(cols)}")
    print("end_pre:", end_pre)
    print("end_post:", end_post)
    print("non-end vo2 (ignore):", len(junk))
    for c in ("pre_submax_date", "post_submax_date", "pre_submax_waist_circ", "post_submax_waist_circ", "pre_submax_rest_hr", "post_submax_rest_hr"):
        if c in cols:
            n = sum(1 for r in rows if (r.get(c) or "").strip())
            print(f"  fill {c}: {n}/{len(rows)}")

    print("\nsamples (last *end* only):")
    for sid in ("8000", "8001", "8002", "8003", "8080"):
        r = next((x for x in rows if x.get("record_id") == sid), None)
        if not r:
            print(" ", sid, "missing")
            continue
        pc, pv = last_nonempty(r, end_pre)
        qc, qv = last_nonempty(r, end_post)
        print(
            f"  {sid}: {r.get('pre_submax_date')}/{r.get('post_submax_date')} "
            f"pre={pc}={pv} post={qc}={qv}"
        )

    print("\nlast_pre stage dist:", Counter(last_nonempty(r, end_pre)[0] or "NONE" for r in rows))
    print("last_post stage dist:", Counter(last_nonempty(r, end_post)[0] or "NONE" for r in rows))

    if OLD.is_file():
        old = {r["boost_id"]: r for r in load(OLD)}
        match = diff = 0
        for r in rows:
            o = old.get(r["record_id"] or "")
            if not o:
                continue
            _, ov = last_nonempty(o, OLD_PRE)
            _, nv = last_nonempty(r, end_pre)
            if ov is None or nv is None:
                continue
            if abs(ov - nv) < 1e-4:
                match += 1
            else:
                diff += 1
        print(f"\nvs old VO2max last-pre: match={match} differ={diff}")
    print("\nVERDICT: use *end* cols + dates; drop non-end protocol VO2 from logic")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
