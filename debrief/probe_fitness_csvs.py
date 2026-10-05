#!/usr/bin/env python3
"""Compare DebriefFitness VO2 cols vs multi-stage VO2max export; summarize adherence."""
from __future__ import annotations

import csv
from collections import Counter
from pathlib import Path

TEMP = Path(r"D:\work\HBC\temp")
OLD = TEMP / "TargetingCognitiveCo-VO2max_DATA_2026-09-17_1235.csv"
NEW = TEMP / "TargetingCognitiveCo-DebriefFitness_DATA_2026-09-17_1250.csv"
ADH = TEMP / "TargetingCognitiveCo-ExerciseTrainingAdhe_DATA_2026-09-17_1252.csv"

STAGE_PRE = [
    "submax_vo2_stage2end_pre",
    "submax_vo2_stage3end_pre",
    "submax_vo2_stage4end_pre",
    "submax_vo2_stage5end_pre",
    "submax_vo2_stage6end_pre",
]


def load(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def last_pre(row: dict[str, str]) -> tuple[int | None, float | None]:
    last_i, last_v = None, None
    for i, col in enumerate(STAGE_PRE, start=2):
        raw = (row.get(col) or "").strip()
        if raw:
            last_i, last_v = i, float(raw)
    return last_i, last_v


def main() -> int:
    old, new, adh = load(OLD), load(NEW), load(ADH)
    print("ADHERE cols:", list(adh[0].keys()))
    print("ADHERE n=", len(adh))

    old_by = {r["boost_id"]: r for r in old}
    print("\nSample: old last-stage-pre vs new fixed stage2_pre / stage4_post")
    for sid in ("8000", "8001", "8002", "8003", "8080"):
        o, n = old_by.get(sid), next((r for r in new if r["record_id"] == sid), None)
        if not o or not n:
            print(sid, "missing old/new", bool(o), bool(n))
            continue
        si, sv = last_pre(o)
        print(
            f"{sid}: old_last_stage={si} vo2={sv} | "
            f"new_pre={n['submax_vo2_stage2_pre']} new_post={n['submax_vo2_stage4_post']}"
        )

    same2 = last_not_2 = ncmp = 0
    for r in new:
        o = old_by.get(r["record_id"])
        if not o:
            continue
        ncmp += 1
        si, _ = last_pre(o)
        if si and si != 2:
            last_not_2 += 1
        try:
            np = float(r["submax_vo2_stage2_pre"])
        except ValueError:
            continue
        s2 = (o.get("submax_vo2_stage2end_pre") or "").strip()
        if s2 and abs(float(s2) - np) < 1e-6:
            same2 += 1

    print(f"\ncompared={ncmp} new_pre_matches_old_stage2end={same2}")
    print(f"subjects whose LAST filled pre stage != 2 (old report): {last_not_2}")
    print("top new_pre:", Counter(r["submax_vo2_stage2_pre"] for r in new).most_common(5))
    print("top new_post:", Counter(r["submax_vo2_stage4_post"] for r in new).most_common(5))

    # adherence: count completed sessions for 8000
    r0 = next(r for r in adh if r.get("boost_id") == "8000" or r.get("record_id") == "8000")
    sup = [c for c in r0 if c.startswith("sup_pa_ses") and c[10:].isdigit()]
    unsup = [c for c in r0 if c.startswith("unsup_pa_ses") and c[12:].isdigit()]
    print("\n8000 session flags:")
    print("  sup cols", len(sup), "nonzero", sum(1 for c in sup if (r0.get(c) or "").strip() not in ("", "0")))
    print("  unsup cols", len(unsup), "nonzero", sum(1 for c in unsup if (r0.get(c) or "").strip() not in ("", "0")))
    print("  sup_pa_start/end", r0.get("sup_pa_start"), r0.get("sup_pa_end"))
    print("  unsup_pa_start/end", r0.get("unsup_pa_start"), r0.get("unsup_pa_end"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
